import { Hono } from 'hono';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireAdmin } from '../middleware/admin';
import { recordAdminAction } from '../services/auditLog';
import { backupConfig, listRemoteBackups, runBackup } from '../services/backup';
import { checkStorage } from '../services/storage';

const app = new Hono();
app.use('*', requireAuth, requireAdmin);

app.get('/', async (c) => {
  const cfg = backupConfig();
  const runs = await db`SELECT id, status, object_key, size_bytes, table_count, row_count, error, trigger, duration_ms, created_at FROM backup_runs ORDER BY created_at DESC LIMIT 30`;
  const lastOk = (await db`SELECT created_at FROM backup_runs WHERE status = 'ok' ORDER BY created_at DESC LIMIT 1`)[0];
  return c.json({ configured: cfg.configured, missing: cfg.missing, last_ok: lastOk?.created_at ?? null, runs });
});

app.get('/storage-check', async (c) => c.json(await checkStorage()));

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
