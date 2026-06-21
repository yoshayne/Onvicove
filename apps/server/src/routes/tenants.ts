import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { enrichWithUrls } from '../services/storage';
import { generateUniqueSlug, isSlugAvailable } from '../lib/slugify';

const app = new Hono();

const updateTenantSchema = z.object({
  company_name: z.string().min(1).optional(),
  tagline: z.string().nullable().optional(),
  logo_key: z.string().nullable().optional(),
  hero_image_key: z.string().nullable().optional(),
  favicon_key: z.string().nullable().optional(),
  mode: z.enum(['store', 'book', 'both']).optional(),
  theme_id: z.enum(['editorial', 'minimal', 'bold', 'warm', 'classic', 'bright', 'obsidian', 'aurora', 'magazine', 'brutalist', 'neon-tokyo', 'craft']).optional(),
  brand_color: z.string().optional(),
  city: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  timezone: z.string().optional(),
  booking_mode: z.enum(['instant', 'manual']).optional(),
  show_live_calendar: z.boolean().optional(),
  currency: z.string().optional(),
  custom_domain: z.string().nullable().optional(),
});

const createTenantSchema = z.object({
  company_name: z.string().min(1),
  mode: z.enum(['store', 'book', 'both']).optional(),
  theme_id: z.enum(['editorial', 'minimal', 'bold', 'warm', 'classic', 'bright', 'obsidian', 'aurora', 'magazine', 'brutalist', 'neon-tokyo', 'craft']).optional(),
});

// GET /api/tenants/slug-available?slug=foo
app.get('/slug-available', requireAuth, async (c) => {
  const slug = c.req.query('slug');
  if (!slug) {
    return c.json({ error: 'slug query parameter is required' }, 400);
  }
  const available = await isSlugAvailable(slug);
  return c.json({ available });
});

// POST /api/tenants/create-or-get — requireAuth only
app.post('/create-or-get', requireAuth, async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;

  const existing = await db`
    SELECT * FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `;

  if (existing[0]) {
    return c.json({ tenant: await enrichWithUrls(existing[0]) });
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const slug = await generateUniqueSlug(parsed.data.company_name);

  const result = await db`
    INSERT INTO tenants (clerk_user_id, slug, company_name, mode, theme_id)
    VALUES (
      ${clerkUserId},
      ${slug},
      ${parsed.data.company_name},
      ${parsed.data.mode || 'both'},
      ${parsed.data.theme_id || 'editorial'}
    )
    RETURNING *
  `;

  return c.json({ tenant: await enrichWithUrls(result[0]) }, 201);
});

// GET /api/tenants/me
app.get('/me', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant');
  return c.json({ tenant: await enrichWithUrls(tenant) });
});

// PATCH /api/tenants/me
app.patch('/me', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const updates = parsed.data;
  const keys = Object.keys(updates) as (keyof typeof updates)[];
  if (keys.length === 0) {
    return c.json({ tenant: await enrichWithUrls(tenant) });
  }

  const result = await db`
    UPDATE tenants
    SET ${db(updates as Record<string, unknown>, ...keys as string[])}, updated_at = NOW()
    WHERE id = ${tenant.id}
    RETURNING *
  `;

  return c.json({ tenant: await enrichWithUrls(result[0]) });
});

export default app;
