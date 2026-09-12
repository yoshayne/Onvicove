import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';

const app = new Hono();

// GET /api/blocked-dates?month=YYYY-MM
app.get('/', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const month = c.req.query('month'); // e.g. "2024-03"

  let rows;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    rows = await db`
      SELECT * FROM blocked_dates
      WHERE tenant_id = ${tenant.id}
        AND date >= ${month + '-01'}::date
        AND date < (${month + '-01'}::date + interval '1 month')
      ORDER BY date
    `;
  } else {
    rows = await db`
      SELECT * FROM blocked_dates WHERE tenant_id = ${tenant.id} ORDER BY date
    `;
  }

  return c.json({ blocked_dates: rows });
});

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city_label: z.string().nullable().optional(),
});

// POST /api/blocked-dates
app.post('/', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid body' }, 400);

  const { date, city_label } = parsed.data;
  const label: string | null = city_label ?? null;
  const rows = await db`
    INSERT INTO blocked_dates (tenant_id, date, city_label)
    VALUES (${tenant.id}, ${date}::date, ${label})
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET city_label = EXCLUDED.city_label
    RETURNING *
  `;
  return c.json({ blocked_date: rows[0] }, 201);
});

// DELETE /api/blocked-dates/:id
app.delete('/:id', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  await db`DELETE FROM blocked_dates WHERE id = ${id} AND tenant_id = ${tenant.id}`;
  return c.json({ ok: true });
});

export default app;
