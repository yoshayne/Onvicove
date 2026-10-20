import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireAdmin } from '../middleware/admin';
import { recordAdminAction } from '../services/auditLog';
import { renderAnnouncementBody } from '../lib/announcementText';
import { announcementInput, audienceCounts, audienceSchema, draftFromNotes, runAnnouncement, sendTest } from '../services/announcements';

const app = new Hono();
app.use('*', requireAuth, requireAdmin);

const adminEmail = (c: unknown) => (c as { get: (k: string) => unknown }).get('adminEmail') as string;
const COLS = db`id, title, body, cta_label, cta_url, send_email, send_alert, audience, status, scheduled_for, started_at, sent_at, recipient_count, emailed_count, failed_count, created_by, created_at, updated_at`;

app.get('/', async (c) => {
  const rows = await db`SELECT ${COLS} FROM announcements ORDER BY created_at DESC LIMIT 100`;
  return c.json({ announcements: rows });
});

app.post('/count', async (c) => {
  const parsed = audienceSchema.safeParse((await c.req.json().catch(() => ({}))).audience ?? {});
  if (!parsed.success) return c.json({ error: 'Invalid audience' }, 400);
  return c.json(await audienceCounts(parsed.data));
});

app.post('/preview', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { body?: string };
  return c.json({ html: renderAnnouncementBody(String(body.body ?? '')) });
});

app.post('/draft', async (c) => {
  const parsed = z.object({ notes: z.string().trim().min(10).max(6000) }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Paste a few notes about what changed (at least a sentence).' }, 400);
  try {
    return c.json(await draftFromNotes(parsed.data.notes));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Could not draft' }, 503);
  }
});

app.post('/', async (c) => {
  const parsed = announcementInput.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid announcement' }, 400);
  const d = parsed.data;
  const rows = await db`
    INSERT INTO announcements (title, body, cta_label, cta_url, send_email, send_alert, audience, created_by)
    VALUES (${d.title}, ${d.body}, ${d.cta_label ?? null}, ${d.cta_url || null}, ${d.send_email}, ${d.send_alert}, ${db.json(d.audience as never)}, ${adminEmail(c)})
    RETURNING ${COLS}`;
  return c.json({ announcement: rows[0] }, 201);
});

// Only drafts and scheduled ones can be edited
app.put('/:id', async (c) => {
  const parsed = announcementInput.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid announcement' }, 400);
  const d = parsed.data;
  const rows = await db`
    UPDATE announcements SET title = ${d.title}, body = ${d.body}, cta_label = ${d.cta_label ?? null}, cta_url = ${d.cta_url || null},
      send_email = ${d.send_email}, send_alert = ${d.send_alert}, audience = ${db.json(d.audience as never)}, updated_at = NOW()
    WHERE id = ${c.req.param('id')} AND status IN ('draft', 'scheduled') RETURNING ${COLS}`;
  if (!rows[0]) return c.json({ error: 'This announcement can no longer be edited.' }, 409);
  return c.json({ announcement: rows[0] });
});

app.delete('/:id', async (c) => {
  const rows = await db`DELETE FROM announcements WHERE id = ${c.req.param('id')} AND status IN ('draft', 'scheduled') RETURNING id`;
  if (!rows[0]) return c.json({ error: 'Only drafts and scheduled announcements can be deleted.' }, 409);
  return c.json({ ok: true });
});

app.post('/:id/test', async (c) => {
  const a = (await db`SELECT title, body, cta_label, cta_url FROM announcements WHERE id = ${c.req.param('id')}`)[0];
  if (!a) return c.json({ error: 'Not found' }, 404);
  try {
    await sendTest(a as never, adminEmail(c));
    return c.json({ ok: true, sent_to: adminEmail(c) });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Could not send the test' }, 502);
  }
});

app.post('/:id/send', async (c) => {
  const id = c.req.param('id');
  const a = (await db`SELECT status, send_email, send_alert FROM announcements WHERE id = ${id}`)[0];
  if (!a) return c.json({ error: 'Not found' }, 404);
  if (!['draft', 'scheduled', 'paused'].includes(a.status as string)) return c.json({ error: 'This announcement was already sent.' }, 409);
  if (!a.send_email && !a.send_alert) return c.json({ error: 'Choose email, a dashboard alert, or both.' }, 400);
  await db`UPDATE announcements SET status = 'sending', updated_at = NOW() WHERE id = ${id}`;
  await recordAdminAction(adminEmail(c), 'announcement_send', 'announcement', id, {});
  runAnnouncement(id).catch((err) => console.error('Announcement run failed:', err));
  return c.json({ ok: true });
});

app.post('/:id/schedule', async (c) => {
  const parsed = z.object({ scheduled_for: z.string().datetime() }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Choose a date and time.' }, 400);
  if (new Date(parsed.data.scheduled_for).getTime() < Date.now() + 60_000) return c.json({ error: 'Pick a time in the future.' }, 400);
  const rows = await db`UPDATE announcements SET status = 'scheduled', scheduled_for = ${parsed.data.scheduled_for}, updated_at = NOW() WHERE id = ${c.req.param('id')} AND status IN ('draft', 'scheduled') RETURNING id`;
  if (!rows[0]) return c.json({ error: 'This announcement can no longer be scheduled.' }, 409);
  await recordAdminAction(adminEmail(c), 'announcement_schedule', 'announcement', c.req.param('id'), { scheduled_for: parsed.data.scheduled_for });
  return c.json({ ok: true });
});

app.post('/:id/unschedule', async (c) => {
  await db`UPDATE announcements SET status = 'draft', scheduled_for = NULL, updated_at = NOW() WHERE id = ${c.req.param('id')} AND status = 'scheduled'`;
  return c.json({ ok: true });
});

app.post('/:id/pause', async (c) => {
  const rows = await db`UPDATE announcements SET status = 'paused', updated_at = NOW() WHERE id = ${c.req.param('id')} AND status = 'sending' RETURNING id`;
  if (!rows[0]) return c.json({ error: 'It is not sending right now.' }, 409);
  await recordAdminAction(adminEmail(c), 'announcement_pause', 'announcement', c.req.param('id'), {});
  return c.json({ ok: true });
});

app.get('/:id/failures', async (c) => {
  const rows = await db`
    SELECT t.company_name, u.email, d.email_error FROM announcement_deliveries d JOIN tenants t ON t.id = d.tenant_id LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id
    WHERE d.announcement_id = ${c.req.param('id')} AND d.email_status = 'failed' LIMIT 100`;
  return c.json({ failures: rows });
});

export default app;
