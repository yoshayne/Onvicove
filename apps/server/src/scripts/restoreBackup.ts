import { backupConfig, downloadBackup, listRemoteBackups, restoreBackup } from '../services/backup';
import { readFileSync } from 'fs';

/**
 * Restore a backup into a NEW, empty database (never into your live one by mistake).
 *   npm run restore-backup -- --list
 *   npm run restore-backup -- --key db/2026/10/22/shopsuite-....ssdb --to postgres://user:pass@host:5432/newdb
 *   npm run restore-backup -- --file ./downloaded.ssdb --to postgres://...
 * Needs BACKUP_ENCRYPTION_KEY (and the BACKUP_S3_* values when downloading with --key or --list).
 */
async function main() {
  const args = process.argv.slice(2);
  const get = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const cfg = backupConfig();
  if (args.includes('--list')) {
    for (const b of await listRemoteBackups()) console.log(`${b.modified}  ${(b.size / 1024).toFixed(0)} KB  ${b.key}`);
    return;
  }
  const to = get('to');
  if (!to) throw new Error('Give the NEW database with --to postgres://...');
  if (to === process.env.DATABASE_URL) throw new Error('--to is your live database. Restore into a new, empty one.');
  if (!cfg.passphrase) throw new Error('BACKUP_ENCRYPTION_KEY is not set.');
  const file = get('file');
  const key = get('key');
  const blob = file ? readFileSync(file) : key ? await downloadBackup(key) : null;
  if (!blob) throw new Error('Give --key (from the bucket) or --file (a downloaded backup).');
  const r = await restoreBackup(blob, cfg.passphrase, to);
  console.log(`Restored ${r.rows} rows across ${r.tables} tables.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
