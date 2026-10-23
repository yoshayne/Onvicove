import { Hono } from 'hono';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireAdmin } from '../middleware/admin';
import { recordAdminAction } from '../services/auditLog';
import { backupConfig, listRemoteBackups, runBackup } from '../services/backup';
import { checkStorage, flushPhotoLinkCache } from '../services/storage';

const app = new Hono();
app.use('*', requireAuth, requireAdmin);

app.get('/', async (c) => {
  const cfg = backupConfig();
  const runs = await db`SELECT id, status, object_key, size_bytes, table_count, row_count, error, trigger, duration_ms, created_at FROM backup_runs ORDER BY created_at DESC LIMIT 30`;
  const lastOk = (await db`SELECT created_at FROM backup_runs WHERE status = 'ok' ORDER BY created_at DESC LIMIT 1`)[0];
  return c.json({ configured: cfg.configured, missing: cfg.missing, last_ok: lastOk?.created_at ?? null, runs });
});

// Is the server running a Node.js version with the October 2026 security fixes? (minimum patched: 22.23.4, 24.22.1, 26.12.1)
const PATCHED: Record<number, [number, number, number]> = { 22: [22, 23, 4], 24: [24, 22, 1], 26: [26, 12, 1] };
export function nodeStatus(version = process.version) {
  const [maj, min, pat] = version.replace(/^v/, '').split('.').map((n) => parseInt(n, 10));
  const need = PATCHED[maj];
  const patched = need ? (min > need[1] || (min === need[1] && pat >= need[2])) : maj > 26;
  return { version, patched, needs: need ? need.join('.') : maj < 22 ? 'upgrade to Node 22 or newer (older versions get no fix)' : 'a newer release' };
}
app.get('/system', (c) => c.json(nodeStatus()));

app.get('/storage-check', async (c) => c.json(await checkStorage()));
app.post('/flush-photo-links', async (c) => c.json({ removed: await flushPhotoLinkCache() }));

app.get('/remote', async (c) => {
  try { return c.json({ files: await listRemoteBackups() }); } catch (err) { return c.json({ error: err instanceof Error ? err.message : 'Could not list' }, 502); }
});

app.post('/run', async (c) => {
  const r = await runBackup('manual');
  await recordAdminAction((c as unknown as { get: (k: string) => unknown }).get('adminEmail') as string, 'backup_run', 'system', null, { ok: r.ok });
  if (!r.ok) return c.json({ error: r.error }, 502);
  return c.json({ ok: true, size_bytes: r.sizeBytes });
});

export default app;
