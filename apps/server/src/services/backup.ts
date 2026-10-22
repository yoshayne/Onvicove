import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { gunzipSync, gzipSync } from 'zlib';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../db/client';
import { sendTransacEmail } from './email';

/**
 * Backup format (everything encrypted, so the storage provider can read nothing):
 *   "SSDB1" | salt(16) | iv(12) | AES-256-GCM ciphertext | auth tag(16)
 * The plaintext is gzip of: a JSON header line, then for each table a JSON line {table, bytes} followed by that
 * many bytes of Postgres COPY text. Restoring = run schema.sql, then COPY each table back in.
 */
const MAGIC = Buffer.from('SSDB1');

export function backupConfig() {
  const c = {
    endpoint: process.env.BACKUP_S3_ENDPOINT,
    bucket: process.env.BACKUP_S3_BUCKET,
    accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
    passphrase: process.env.BACKUP_ENCRYPTION_KEY,
    region: process.env.BACKUP_S3_REGION || 'auto',
  };
  const missing = Object.entries({ BACKUP_S3_ENDPOINT: c.endpoint, BACKUP_S3_BUCKET: c.bucket, BACKUP_S3_ACCESS_KEY_ID: c.accessKeyId, BACKUP_S3_SECRET_ACCESS_KEY: c.secretAccessKey, BACKUP_ENCRYPTION_KEY: c.passphrase })
    .filter(([, v]) => !v).map(([k]) => k);
  return { ...c, missing, configured: missing.length === 0 };
}

function client() {
  const c = backupConfig();
  return new S3Client({
    endpoint: c.endpoint, region: c.region, forcePathStyle: true,
    credentials: { accessKeyId: c.accessKeyId!, secretAccessKey: c.secretAccessKey! },
    // Some S3-compatible stores (including R2 in some setups) reject the extra checksum headers newer SDKs add
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

export function encrypt(plain: Buffer, passphrase: string): Buffer {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, body, cipher.getAuthTag()]);
}

export function decrypt(blob: Buffer, passphrase: string): Buffer {
  if (blob.length < MAGIC.length + 44 || !blob.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('This is not a Shop Suite Direct backup file.');
  const salt = blob.subarray(5, 21);
  const iv = blob.subarray(21, 33);
  const tag = blob.subarray(blob.length - 16);
  const body = blob.subarray(33, blob.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]);
  } catch {
    throw new Error('Could not decrypt: wrong encryption key, or the file is damaged.');
  }
}

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

/** Every table's rows, as one encrypted file in memory */
export async function buildBackup(passphrase: string): Promise<{ blob: Buffer; tables: number; rows: number }> {
  const tables = (await db`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> 'backup_runs' ORDER BY table_name`).map((r) => r.table_name as string);
  const parts: Buffer[] = [Buffer.from(`${JSON.stringify({ format: 1, created_at: new Date().toISOString(), tables })}\n`)];
  let rows = 0;
  for (const t of tables) {
    const data = await readAll(await db`COPY ${db(t)} TO STDOUT`.readable());
    rows += data.toString('utf8').split('\n').filter(Boolean).length;
    parts.push(Buffer.from(`${JSON.stringify({ table: t, bytes: data.length })}\n`), data);
  }
  return { blob: encrypt(gzipSync(Buffer.concat(parts)), passphrase), tables: tables.length, rows };
}

/** Put a backup's rows into an (empty) database: build the tables from schema.sql, then load each one */
export async function restoreBackup(blob: Buffer, passphrase: string, targetUrl: string): Promise<{ tables: number; rows: number }> {
  const plain = gunzipSync(decrypt(blob, passphrase));
  let pos = plain.indexOf(10);
  const header = JSON.parse(plain.subarray(0, pos).toString('utf8')) as { tables: string[] };
  pos += 1;
  const target = postgres(targetUrl, { max: 1, onnotice: () => {} });
  try {
    await target.unsafe(readFileSync(join(__dirname, '../db/schema.sql'), 'utf-8'));
    // Load in any order: skip foreign-key checks while loading (needs the database owner's rights)
    await target`SET session_replication_role = replica`;
    // Clear everything first, in ONE statement (clearing one table at a time would also wipe tables loaded before it)
    await target.unsafe(`TRUNCATE ${header.tables.map((t) => `"${t.replace(/"/g, '""')}"`).join(', ')} CASCADE`);
    let rows = 0;
    while (pos < plain.length) {
      const eol = plain.indexOf(10, pos);
      const { table, bytes } = JSON.parse(plain.subarray(pos, eol).toString('utf8')) as { table: string; bytes: number };
      const data = plain.subarray(eol + 1, eol + 1 + bytes);
      pos = eol + 1 + bytes;
      if (!header.tables.includes(table)) continue;
      if (bytes > 0) {
        const w = await target`COPY ${target(table)} FROM STDIN`.writable();
        await new Promise<void>((resolve, reject) => { w.on('error', reject); w.on('finish', resolve); w.end(data); });
        rows += data.toString('utf8').split('\n').filter(Boolean).length;
      }
    }
    await target`SET session_replication_role = DEFAULT`;
    return { tables: header.tables.length, rows };
  } finally {
    await target.end();
  }
}

export const backupKey = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `db/${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}/shopsuite-${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}.ssdb`;
};

async function alertFailure(message: string) {
  const to = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)[0];
  if (!to) return;
  await sendTransacEmail({
    to: [{ email: to, name: to }],
    subject: 'Shop Suite Direct: database backup FAILED',
    htmlContent: `<p>The nightly database backup did not complete.</p><p><strong>Reason:</strong> ${message.replace(/</g, '&lt;')}</p><p>Open Admin → Backups to try again. If this keeps failing, your newest backup is getting older.</p>`,
  }).catch((err) => console.error('Backup failure email error:', err));
}

/** Make a backup, upload it, record the result. Never throws. */
export async function runBackup(trigger: 'schedule' | 'manual'): Promise<{ ok: boolean; error?: string; key?: string; sizeBytes?: number }> {
  const cfg = backupConfig();
  if (!cfg.configured) return { ok: false, error: `Backups are not set up yet (missing ${cfg.missing.join(', ')}).` };
  const started = Date.now();
  try {
    const { blob, tables, rows } = await buildBackup(cfg.passphrase!);
    const key = backupKey();
    await client().send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: blob, ContentType: 'application/octet-stream' }));
    await db`INSERT INTO backup_runs (status, object_key, size_bytes, table_count, row_count, trigger, duration_ms) VALUES ('ok', ${key}, ${blob.length}, ${tables}, ${rows}, ${trigger}, ${Date.now() - started})`;
    return { ok: true, key, sizeBytes: blob.length };
  } catch (err) {
    const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    const status = e.$metadata?.httpStatusCode;
    const hint = status === 403 ? ' (access denied: check the R2 token has Object Read & Write on this bucket, and the key values)'
      : status === 404 || e.name === 'NoSuchBucket' ? ' (bucket not found: check BACKUP_S3_BUCKET and BACKUP_S3_ENDPOINT)'
      : e.name === 'TimeoutError' || /ENOTFOUND|ECONN/.test(e.message ?? '') ? ' (could not reach the endpoint: check BACKUP_S3_ENDPOINT)' : '';
    const message = `${e.name && e.name !== 'Error' ? `${e.name}: ` : ''}${e.message ?? String(err)}${status ? ` [HTTP ${status}]` : ''}${hint}`;
    console.error('Backup failed:', message);
    await db`INSERT INTO backup_runs (status, error, trigger, duration_ms) VALUES ('failed', ${message.slice(0, 500)}, ${trigger}, ${Date.now() - started})`.catch(() => undefined);
    await alertFailure(message);
    return { ok: false, error: message };
  }
}

export async function listRemoteBackups(): Promise<{ key: string; size: number; modified: string }[]> {
  const cfg = backupConfig();
  if (!cfg.configured) return [];
  const out = await client().send(new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: 'db/', MaxKeys: 200 }));
  return (out.Contents ?? []).map((o) => ({ key: o.Key!, size: o.Size ?? 0, modified: (o.LastModified ?? new Date()).toISOString() })).sort((a, b) => b.modified.localeCompare(a.modified));
}

export async function downloadBackup(key: string): Promise<Buffer> {
  const cfg = backupConfig();
  const res = await client().send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  return readAll(res.Body as Readable);
}
