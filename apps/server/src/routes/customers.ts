import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';

const app = new Hono();

const upsertCustomerSchema = z.object({
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

app.use('*', requireAuth, requireTenant);

// GET /api/customers
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const search = c.req.query('search');

  const rows = search
    ? await db`
        SELECT
  c.*,
  -- Real figures from paid orders / live bookings (the stored counters also counted unpaid attempts)
  COALESCE((SELECT SUM(o.total_cents) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid', 'fulfilled')), 0)::int
    + COALESCE((SELECT SUM(b.deposit_paid_cents) FROM bookings b WHERE b.customer_id = c.id AND b.status NOT IN ('cancelled', 'awaiting_payment')), 0)::int AS total_spent_cents,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid', 'fulfilled'))::int AS order_count,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.status IN ('pending', 'confirmed', 'completed'))::int AS booking_count
        FROM customers c
        WHERE c.tenant_id = ${tenant.id}
        AND (c.email ILIKE ${'%' + search + '%'} OR c.first_name ILIKE ${'%' + search + '%'} OR c.last_name ILIKE ${'%' + search + '%'})
        ORDER BY c.created_at DESC
      `
    : await db`
        SELECT
  c.*,
  -- Real figures from paid orders / live bookings (the stored counters also counted unpaid attempts)
  COALESCE((SELECT SUM(o.total_cents) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid', 'fulfilled')), 0)::int
    + COALESCE((SELECT SUM(b.deposit_paid_cents) FROM bookings b WHERE b.customer_id = c.id AND b.status NOT IN ('cancelled', 'awaiting_payment')), 0)::int AS total_spent_cents,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid', 'fulfilled'))::int AS order_count,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.status IN ('pending', 'confirmed', 'completed'))::int AS booking_count
        FROM customers c
        WHERE c.tenant_id = ${tenant.id}
        ORDER BY c.created_at DESC
      `;

  return c.json({ customers: rows });
});

// GET /api/customers/:id
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    SELECT
  c.*,
  -- Real figures from paid orders / live bookings (the stored counters also counted unpaid attempts)
  COALESCE((SELECT SUM(o.total_cents) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid', 'fulfilled')), 0)::int
    + COALESCE((SELECT SUM(b.deposit_paid_cents) FROM bookings b WHERE b.customer_id = c.id AND b.status NOT IN ('cancelled', 'awaiting_payment')), 0)::int AS total_spent_cents,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('paid', 'fulfilled'))::int AS order_count,
  (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.status IN ('pending', 'confirmed', 'completed'))::int AS booking_count
    FROM customers c WHERE c.id = ${id} AND c.tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Customer not found' }, 404);
  return c.json({ customer: rows[0] });
});

// POST /api/customers (upsert by tenant_id + email)
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = upsertCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const rows = await db`
    INSERT INTO customers (tenant_id, email, first_name, last_name, phone, notes, tags)
    VALUES (
      ${tenant.id}, ${d.email}, ${d.first_name ?? null}, ${d.last_name ?? null},
      ${d.phone ?? null}, ${d.notes ?? null}, ${JSON.stringify(d.tags ?? [])}
    )
    ON CONFLICT (tenant_id, email) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, customers.first_name),
      last_name = COALESCE(EXCLUDED.last_name, customers.last_name),
      phone = COALESCE(EXCLUDED.phone, customers.phone),
      notes = COALESCE(EXCLUDED.notes, customers.notes),
      tags = EXCLUDED.tags,
      updated_at = NOW()
    RETURNING *
  `;

  return c.json({ customer: rows[0] }, 201);
});

export default app;
