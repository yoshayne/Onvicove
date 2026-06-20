import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { enrichWithUrls } from '../services/storage';
import { checkItemLimit } from '../services/settings';

const app = new Hono();

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  option_type: z.enum(['size', 'color', 'custom']),
  name: z.string().min(1),
  option_name: z.string().nullable().optional(),
  color_hex: z.string().nullable().optional(),
});

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
  variants: z.array(variantSchema).optional(),
});

const updateProductSchema = productSchema.partial();

app.use('*', requireAuth, requireTenant);

async function saveVariants(productId: string, tenantId: string, variants: z.infer<typeof variantSchema>[]) {
  await db`DELETE FROM product_variants WHERE product_id = ${productId}`;
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    await db`
      INSERT INTO product_variants (product_id, tenant_id, name, option_type, option_name, color_hex, sort_order)
      VALUES (${productId}, ${tenantId}, ${v.name}, ${v.option_type}, ${v.option_name ?? null}, ${v.color_hex ?? null}, ${i})
    `;
  }
}

async function attachVariants(products: Record<string, unknown>[]) {
  if (products.length === 0) return products;
  const ids = products.map((p) => p.id as string);
  const variants = await db`
    SELECT * FROM product_variants WHERE product_id = ANY(${ids}::uuid[]) ORDER BY sort_order ASC
  `;
  return products.map((p) => ({
    ...p,
    variants: variants.filter((v) => v.product_id === p.id),
  }));
}

// GET /api/products
app.get('/', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`
    SELECT * FROM products WHERE tenant_id = ${tenant.id} ORDER BY sort_order ASC, created_at DESC
  `;
  const enriched = await Promise.all(rows.map((r) => enrichWithUrls(r)));
  const withVariants = await attachVariants(enriched);
  return c.json({ products: withVariants });
});

// GET /api/products/:id
app.get('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
  if (!rows[0]) return c.json({ error: 'Product not found' }, 404);
  const enriched = await enrichWithUrls(rows[0]);
  const [withVariants] = await attachVariants([enriched]);
  return c.json({ product: withVariants });
});

// POST /api/products
app.post('/', async (c) => {
  const tenant = c.get('tenant') as { id: string; plan: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  const d = parsed.data;

  const limit = await checkItemLimit(tenant);
  if (!limit.ok) return c.json({ error: `Your plan allows up to ${limit.limit} products and services. Upgrade your plan to add more.` }, 402);

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
    ) RETURNING *
  `;

  if (d.variants?.length) await saveVariants(rows[0].id as string, tenant.id, d.variants);

  const enriched = await enrichWithUrls(rows[0]);
  const [withVariants] = await attachVariants([enriched]);
  return c.json({ product: withVariants }, 201);
});

// PATCH /api/products/:id
app.patch('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);

  const { variants, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (rest.image_keys !== undefined) updates.image_keys = JSON.stringify(rest.image_keys);
  if (rest.tags !== undefined) updates.tags = JSON.stringify(rest.tags);

  let productRow: Record<string, unknown>;

  if (Object.keys(updates).length > 0) {
    const rows = await db`
      UPDATE products SET ${db(updates, ...Object.keys(updates))}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenant.id} RETURNING *
    `;
    if (!rows[0]) return c.json({ error: 'Product not found' }, 404);
    productRow = rows[0];
  } else {
    const rows = await db`SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenant.id} LIMIT 1`;
    if (!rows[0]) return c.json({ error: 'Product not found' }, 404);
    productRow = rows[0];
  }

  if (variants !== undefined) await saveVariants(id, tenant.id, variants);

  const enriched = await enrichWithUrls(productRow);
  const [withVariants] = await attachVariants([enriched]);
  return c.json({ product: withVariants });
});

// DELETE /api/products/:id
app.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id');
  const rows = await db`DELETE FROM products WHERE id = ${id} AND tenant_id = ${tenant.id} RETURNING id`;
  if (!rows[0]) return c.json({ error: 'Product not found' }, 404);
  return c.json({ success: true });
});

export default app;
