import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { sendTransacEmail } from '../services/email';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

// GET /api/email-log
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const type = c.req.query('type');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50'), 100);
  const offset = parseInt(c.req.query('offset') ?? '0');

  const conditions = [db`tenant_id = ${tenant.id}`];
  if (type) conditions.push(db`type = ${type}`);
  const where = conditions.reduce((a, b) => db`${a} AND ${b}`);

  const rows = await db`
    SELECT id, type, to_email, to_name, subject, status, error_message,
           reference_type, reference_id, created_at
    FROM email_log
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRows = await db`SELECT COUNT(*)::int AS total FROM email_log WHERE ${where}`;

  return c.json({ emails: rows, total: countRows[0].total });
});

// GET /api/email-log/:id — full record including html_content for preview
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    SELECT * FROM email_log WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Not found' }, 404);
  return c.json({ email: rows[0] });
});

// POST /api/email-log/:id/resend
app.post('/:id/resend', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const schema = z.object({ to_email: z.string().email().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);

  const rows = await db`
    SELECT * FROM email_log WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Not found' }, 404);
  const log = rows[0];

  const toEmail = parsed.data.to_email ?? (log.to_email as string);
  const toName = (log.to_name as string) ?? '';

  await sendTransacEmail(
    {
      to: [{ email: toEmail, name: toName }],
      subject: log.subject as string,
      htmlContent: log.html_content as string,
    },
    {
      tenantId: tenant.id,
      type: `${log.type as string}_resend`,
      referenceType: log.reference_type as string ?? undefined,
      referenceId: log.reference_id as string ?? undefined,
    }
  );

  return c.json({ ok: true });
});

export default app;
