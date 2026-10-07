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
      SELECT id, tenant_id, date_from::text AS date_from, date_to::text AS date_to, city_label, kind, created_at FROM city_schedules
      WHERE tenant_id = ${tenant.id}
        AND date_from < (${monthStart}::date + interval '1 month')
        AND date_to   >= ${monthStart}::date
      ORDER BY date_from
    `;
  } else {
    rows = await db`
      SELECT id, tenant_id, date_from::text AS date_from, date_to::text AS date_to, city_label, kind, created_at FROM city_schedules WHERE tenant_id = ${tenant.id} ORDER BY date_from
    `;
  }

  return c.json({ city_schedules: rows });
});

const createSchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['city', 'blocked']).default('city'),
  // City name for a city range; an optional note ("Vacation") for blocked time
  city_label: z.string().trim().max(120).optional(),
});

// POST /api/blocked-dates
app.post('/', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string; timezone?: string | null };
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid body', details: parsed.error.flatten() }, 400);

  const { date_from, date_to, kind } = parsed.data;
  const label = parsed.data.city_label?.trim() || null;
  if (date_to < date_from) return c.json({ error: 'date_to must be >= date_from' }, 400);
  if (kind === 'city' && !label) return c.json({ error: 'Enter the city for this range' }, 400);

  const rows = await db`
    INSERT INTO city_schedules (tenant_id, date_from, date_to, city_label, kind)
    VALUES (${tenant.id}, ${date_from}::date, ${date_to}::date, ${label}, ${kind})
    RETURNING id, tenant_id, date_from::text AS date_from, date_to::text AS date_to, city_label, kind, created_at
  `;

  // Blocking dates doesn't cancel bookings that already exist — tell the owner how many there are.
  let existingBookings = 0;
  if (kind === 'blocked') {
    const tz = tenant.timezone || 'America/New_York';
    const found = await db`
      SELECT COUNT(*)::int AS n FROM bookings
      WHERE tenant_id = ${tenant.id}
        AND status NOT IN ('cancelled', 'no_show')
        AND (start_time AT TIME ZONE ${tz})::date BETWEEN ${date_from}::date AND ${date_to}::date
    `;
    existingBookings = found[0].n as number;
  }
  return c.json({ city_schedule: rows[0], existing_bookings: existingBookings }, 201);
});

// DELETE /api/blocked-dates/:id
app.delete('/:id', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id') as string;
  await db`DELETE FROM city_schedules WHERE id = ${id} AND tenant_id = ${tenant.id}`;
  return c.json({ ok: true });
});

export default app;
