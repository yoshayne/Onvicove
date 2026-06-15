import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { enrichWithUrls } from '../services/storage';
import { checkItemLimit } from '../services/settings';

const app = new Hono();

const productSchema = z.object({
  type: z.enum(['physical', 'digital', 'subscription']).default('physical'),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().min(0),
  compare_at_price_cents: z.number().int().nullable().optional(),
  sku: z.string().nullable().optional(),
  stock_quantity: z.number().int().nullable().optional(),
  track_inventory: z.boolean().optional(),
  image_keys: z.array(z.string()).optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  digital_file_key: z.string().nullable().optional(),
  subscription_interval: z.enum(['monthly', 'yearly']).nullable().optional(),
  weight_grams: z.number().int().nullable().optional(),
  requires_shipping: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const updateProductSchema = productSchema.partial();

app.use('*', requireAuth, requireTenant);

// GET /api/products
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`
    SELECT * FROM products
    WHERE tenant_id = ${tenant.id}
    ORDER BY sort_order ASC, created_at DESC
  `;
  const enriched = await Promise.all(rows.map((r) => enrichWithUrls(r)));
  return c.json({ products: enriched });
});

// GET /api/products/:id
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Product not found' }, 404);
  return c.json({ product: await enrichWithUrls(rows[0]) });
});

// POST /api/products
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string; plan: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const limit = await checkItemLimit(tenant);
  if (!limit.ok) {
    return c.json({ error: `Your plan allows up to ${limit.limit} products and services. Upgrade your plan to add more.` }, 402);
  }

  const rows = await db`
    INSERT INTO products (
      tenant_id, type, name, description, price_cents, compare_at_price_cents,
      sku, stock_quantity, track_inventory, image_keys, category, tags,
      is_active, is_featured, digital_file_key, subscription_interval,
      weight_grams, requires_shipping, sort_order
    ) VALUES (
      ${tenant.id}, ${d.type}, ${d.name}, ${d.description ?? null}, ${d.price_cents},
      ${d.compare_at_price_cents ?? null}, ${d.sku ?? null}, ${d.stock_quantity ?? null},
      ${d.track_inventory ?? false}, ${JSON.stringify(d.image_keys ?? [])},
      ${d.category ?? null}, ${JSON.stringify(d.tags ?? [])}, ${d.is_active ?? true},
      ${d.is_featured ?? false}, ${d.digital_file_key ?? null}, ${d.subscription_interval ?? null},
      ${d.weight_grams ?? null}, ${d.requires_shipping ?? false}, ${d.sort_order ?? 0}
    )
    RETURNING *
  `;

  return c.json({ product: await enrichWithUrls(rows[0]) }, 201);
});

// PATCH /api/products/:id
app.patch('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const d = parsed.data;
  const updates: Record<string, unknown> = { ...d };
  if (d.image_keys !== undefined) updates.image_keys = JSON.stringify(d.image_keys);
  if (d.tags !== undefined) updates.tags = JSON.stringify(d.tags);

  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const existing = await db`SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
    if (!existing[0]) return c.json({ error: 'Product not found' }, 404);
    return c.json({ product: await enrichWithUrls(existing[0]) });
  }

  const rows = await db`
    UPDATE products
    SET ${db(updates, ...keys)}, updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenant.id}
    RETURNING *
  `;

  if (!rows[0]) return c.json({ error: 'Product not found' }, 404);
  return c.json({ product: await enrichWithUrls(rows[0]) });
});

// DELETE /api/products/:id
app.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`
    DELETE FROM products WHERE id = ${id} AND tenant_id = ${tenant.id} RETURNING id
  `;
  if (!rows[0]) return c.json({ error: 'Product not found' }, 404);
  return c.json({ success: true });
});

export default app;
