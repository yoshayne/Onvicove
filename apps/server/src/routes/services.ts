import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { enrichWithUrls } from '../services/storage';
import { checkItemLimit } from '../services/settings';

const app = new Hono();

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().min(0),
  duration_minutes: z.number().int().min(1),
  buffer_minutes: z.number().int().min(0).optional(),
  max_bookings_per_slot: z.number().int().min(1).optional(),
  image_keys: z.array(z.string()).optional(),
  category: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  requires_deposit: z.boolean().optional(),
  deposit_cents: z.number().int().nullable().optional(),
  sort_order: z.number().int().optional(),
});

const updateServiceSchema = serviceSchema.partial();

app.use('*', requireAuth, requireTenant);

// GET /api/services
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`
    SELECT * FROM services
    WHERE tenant_id = ${tenant.id}
    ORDER BY sort_order ASC, created_at DESC
  `;
  const enriched = await Promise.all(rows.map((r) => enrichWithUrls(r)));
  return c.json({ services: enriched });
});

// GET /api/services/:id
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    SELECT * FROM services WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Service not found' }, 404);
  return c.json({ service: await enrichWithUrls(rows[0]) });
});

// POST /api/services
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string; plan: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const limit = await checkItemLimit(tenant);
  if (!limit.ok) {
    return c.json({ error: `Your plan allows up to ${limit.limit} products and services. Upgrade your plan to add more.` }, 402);
  }

  const rows = await db`
    INSERT INTO services (
      tenant_id, name, description, price_cents, duration_minutes, buffer_minutes,
      max_bookings_per_slot, image_keys, category, is_active, is_featured,
      requires_deposit, deposit_cents, sort_order
    ) VALUES (
      ${tenant.id}, ${d.name}, ${d.description ?? null}, ${d.price_cents}, ${d.duration_minutes},
      ${d.buffer_minutes ?? 0}, ${d.max_bookings_per_slot ?? 1}, ${db.json(d.image_keys ?? [])},
      ${d.category ?? null}, ${d.is_active ?? true}, ${d.is_featured ?? false},
      ${d.requires_deposit ?? false}, ${d.deposit_cents ?? null}, ${d.sort_order ?? 0}
    )
    RETURNING *
  `;

  return c.json({ service: await enrichWithUrls(rows[0]) }, 201);
});

// PATCH /api/services/:id
app.patch('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const d = parsed.data;
  const updates: Record<string, unknown> = { ...d };
  if (d.image_keys !== undefined) updates.image_keys = db.json(d.image_keys);

  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const existing = await db`SELECT * FROM services WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
    if (!existing[0]) return c.json({ error: 'Service not found' }, 404);
    return c.json({ service: await enrichWithUrls(existing[0]) });
  }

  const rows = await db`
    UPDATE services
    SET ${db(updates, ...keys)}, updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenant.id}
    RETURNING *
  `;

  if (!rows[0]) return c.json({ error: 'Service not found' }, 404);
  return c.json({ service: await enrichWithUrls(rows[0]) });
});

// DELETE /api/services/:id
app.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    DELETE FROM services WHERE id = ${id} AND tenant_id = ${tenant.id} RETURNING id
  `;
  if (!rows[0]) return c.json({ error: 'Service not found' }, 404);
  return c.json({ success: true });
});

export default app;
