import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';

const app = new Hono();

// GET /api/blocked-dates?month=YYYY-MM  (any range overlapping the month)
app.get('/', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const month = c.req.query('month');

  let rows;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const monthStart = month + '-01';
    rows = await db`
      SELECT * FROM city_schedules
      WHERE tenant_id = ${tenant.id}
        AND date_from < (${monthStart}::date + interval '1 month')
        AND date_to   >= ${monthStart}::date
      ORDER BY date_from
    `;
  } else {
    rows = await db`
      SELECT * FROM city_schedules WHERE tenant_id = ${tenant.id} ORDER BY date_from
    `;
  }

  return c.json({ city_schedules: rows });
});

const createSchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city_label: z.string().min(1),
});

// POST /api/blocked-dates
app.post('/', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);

  const { date_from, date_to, city_label } = parsed.data;
  if (date_to < date_from) return c.json({ error: 'date_to must be >= date_from' }, 400);

  const rows = await db`
    INSERT INTO city_schedules (tenant_id, date_from, date_to, city_label)
    VALUES (${tenant.id}, ${date_from}::date, ${date_to}::date, ${city_label})
    RETURNING *
  `;
  return c.json({ city_schedule: rows[0] }, 201);
});

// DELETE /api/blocked-dates/:id
app.delete('/:id', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id') as string;
  await db`DELETE FROM city_schedules WHERE id = ${id} AND tenant_id = ${tenant.id}`;
  return c.json({ ok: true });
});

export default app;
