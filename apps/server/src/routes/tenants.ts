import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { enrichWithUrls } from '../services/storage';
import { generateUniqueSlug, isSlugAvailable } from '../lib/slugify';
import { sendTenantWelcome, sendAdminNewSignup } from '../services/email';
import { getBaseUrl } from '../lib/baseUrl';

const app = new Hono();

const updateTenantSchema = z.object({
  company_name: z.string().min(1).optional(),
  tagline: z.string().nullable().optional(),
  logo_key: z.string().nullable().optional(),
  hero_image_key: z.string().nullable().optional(),
  favicon_key: z.string().nullable().optional(),
  mode: z.enum(['store', 'book', 'both']).optional(),
  theme_id: z.enum(['editorial', 'minimal', 'bold', 'warm', 'classic', 'bright', 'obsidian', 'aurora', 'magazine', 'brutalist', 'neon-tokyo', 'craft', 'lens']).optional(),
  brand_color: z.string().optional(),
  city: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  timezone: z.string().optional(),
  booking_mode: z.enum(['instant', 'manual']).optional(),
  show_live_calendar: z.boolean().optional(),
  currency: z.string().optional(),
  custom_domain: z.string().nullable().optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  font_pair_id: z.string().optional(),
});

const createTenantSchema = z.object({
  company_name: z.string().min(1),
  mode: z.enum(['store', 'book', 'both']).optional(),
  theme_id: z.enum(['editorial', 'minimal', 'bold', 'warm', 'classic', 'bright', 'obsidian', 'aurora', 'magazine', 'brutalist', 'neon-tokyo', 'craft', 'lens']).optional(),
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

  const tenant = result[0];

  // Send welcome + admin notification for direct self-serve signup
  const userRows = await db`SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
  const user = userRows[0];
  if (user?.email) {
    const baseUrl = getBaseUrl();
    const toName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || (user.email as string);
    sendTenantWelcome({
      toEmail: user.email as string,
      toName,
      companyName: tenant.company_name as string,
      dashboardUrl: `${baseUrl}/dashboard`,
    }).catch((err) => console.error('Self-serve welcome email error:', err));
    sendAdminNewSignup({
      companyName: tenant.company_name as string,
      ownerEmail: user.email as string,
      plan: tenant.plan as string,
    }).catch((err) => console.error('Self-serve admin signup email error:', err));
  }

  return c.json({ tenant: await enrichWithUrls(tenant) }, 201);
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

  // If slug is being changed, verify it's still available (race-condition guard)
  if (updates.slug) {
    const conflict = await db`SELECT id FROM tenants WHERE slug = ${updates.slug} AND id != ${tenant.id} LIMIT 1`;
    if (conflict[0]) {
      return c.json({ error: 'That URL is already taken. Please choose another name.' }, 409);
    }
  }

  const result = await db`
    UPDATE tenants
    SET ${db(updates as Record<string, unknown>, ...keys as string[])}, updated_at = NOW()
    WHERE id = ${tenant.id}
    RETURNING *
  `;

  return c.json({ tenant: await enrichWithUrls(result[0]) });
});

// PUT /api/tenants/me/page-content — replace entire page_content JSONB map
app.put('/me/page-content', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: 'Body must be a flat key/value object' }, 400);
  }

  // Merge into existing page_content rather than replace
  const rows = await db`
    UPDATE tenants
    SET page_content = COALESCE(page_content, '{}'::jsonb) || ${db.json(body as never)},
        updated_at = NOW()
    WHERE id = ${tenant.id}
    RETURNING page_content
  `;

  return c.json({ page_content: rows[0].page_content });
});

export default app;
