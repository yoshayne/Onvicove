import { Hono } from 'hono';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { renderAnnouncementBody } from '../lib/announcementText';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

// GET /api/announcements — the "what's new" alerts shown under the dashboard bell
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`
    SELECT a.id, a.title, a.body, a.cta_label, a.cta_url, COALESCE(a.sent_at, a.started_at, a.created_at) AS sent_at, d.read_at
    FROM announcement_deliveries d JOIN announcements a ON a.id = d.announcement_id
    WHERE d.tenant_id = ${tenant.id} AND d.alert = TRUE
    ORDER BY COALESCE(a.sent_at, a.started_at, a.created_at) DESC LIMIT 20`;
  return c.json({
    announcements: rows.map((r) => ({ ...r, html: renderAnnouncementBody(r.body as string) })),
    unread: rows.filter((r) => !r.read_at).length,
  });
});

app.post('/read-all', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  await db`UPDATE announcement_deliveries SET read_at = NOW() WHERE tenant_id = ${tenant.id} AND alert = TRUE AND read_at IS NULL`;
  return c.json({ ok: true });
});

app.post('/:id/read', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  await db`UPDATE announcement_deliveries SET read_at = COALESCE(read_at, NOW()) WHERE announcement_id = ${c.req.param('id')} AND tenant_id = ${tenant.id}`;
  return c.json({ ok: true });
});

export default app;
