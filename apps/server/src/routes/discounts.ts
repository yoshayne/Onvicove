import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';

const app = new Hono();

const discountSchema = z.object({
  code: z.string().min(1),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().int().min(1),
  minimum_order_cents: z.number().int().min(0).optional(),
  usage_limit: z.number().int().min(1).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
});

const updateDiscountSchema = discountSchema.partial();

const validateSchema = z.object({
  code: z.string().min(1),
  subtotal_cents: z.number().int().min(0),
});

app.use('*', requireAuth, requireTenant);

// GET /api/discounts
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`
    SELECT * FROM discount_codes WHERE tenant_id = ${tenant.id} ORDER BY created_at DESC
  `;
  return c.json({ discounts: rows });
});

// GET /api/discounts/:id
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    SELECT * FROM discount_codes WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Discount not found' }, 404);
  return c.json({ discount: rows[0] });
});

// POST /api/discounts
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = discountSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const existing = await db`
    SELECT id FROM discount_codes WHERE tenant_id = ${tenant.id} AND code = ${d.code} LIMIT 1
  `;
  if (existing[0]) {
    return c.json({ error: 'A discount code with this code already exists' }, 409);
  }

  const rows = await db`
    INSERT INTO discount_codes (
      tenant_id, code, type, value, minimum_order_cents, usage_limit, expires_at, is_active
    ) VALUES (
      ${tenant.id}, ${d.code}, ${d.type}, ${d.value}, ${d.minimum_order_cents ?? 0},
      ${d.usage_limit ?? null}, ${d.expires_at ?? null}, ${d.is_active ?? true}
    )
    RETURNING *
  `;

  return c.json({ discount: rows[0] }, 201);
});

// PATCH /api/discounts/:id
app.patch('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateDiscountSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const updates = parsed.data;
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const existing = await db`SELECT * FROM discount_codes WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
    if (!existing[0]) return c.json({ error: 'Discount not found' }, 404);
    return c.json({ discount: existing[0] });
  }

  const rows = await db`
    UPDATE discount_codes
    SET ${db(updates as Record<string, unknown>, ...keys)}
    WHERE id = ${id} AND tenant_id = ${tenant.id}
    RETURNING *
  `;

  if (!rows[0]) return c.json({ error: 'Discount not found' }, 404);
  return c.json({ discount: rows[0] });
});

// DELETE /api/discounts/:id
app.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    DELETE FROM discount_codes WHERE id = ${id} AND tenant_id = ${tenant.id} RETURNING id
  `;
  if (!rows[0]) return c.json({ error: 'Discount not found' }, 404);
  return c.json({ success: true });
});

// POST /api/discounts/validate — dashboard-side validation (still tenant-scoped)
app.post('/validate', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { code, subtotal_cents } = parsed.data;

  const rows = await db`
    SELECT * FROM discount_codes
    WHERE tenant_id = ${tenant.id} AND code = ${code} AND is_active = true
    LIMIT 1
  `;
  const discount = rows[0];

  if (!discount) {
    return c.json({ valid: false, reason: 'Discount code not found' });
  }
  if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
    return c.json({ valid: false, reason: 'Discount code has expired' });
  }
  if (discount.usage_limit !== null && discount.usage_count >= discount.usage_limit) {
    return c.json({ valid: false, reason: 'Discount code usage limit reached' });
  }
  if (subtotal_cents < discount.minimum_order_cents) {
    return c.json({
      valid: false,
      reason: `Order must be at least $${(discount.minimum_order_cents / 100).toFixed(2)}`,
    });
  }

  const discountCents =
    discount.type === 'percentage'
      ? Math.round((subtotal_cents * discount.value) / 100)
      : Math.min(discount.value, subtotal_cents);

  return c.json({ valid: true, discount, discount_cents: discountCents });
});

export default app;
