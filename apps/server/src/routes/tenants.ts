import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { getOrFetchUser } from '../services/users';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { enrichWithUrls } from '../services/storage';
import { generateUniqueSlug, isSlugAvailable, RESERVED_SLUGS } from '../lib/slugify';
import { sendTenantWelcome, sendAdminNewSignup } from '../services/email';
import { getBaseUrl } from '../lib/baseUrl';
import { domainCache } from '../services/domainCache';
import { resolveAvailability } from '../services/businessHours';
import { PREMIUM_THEMES } from '../services/subscriptions';

const app = new Hono();

const hourWindowSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/),
});
const weeklyHoursSchema = z.object({
  mon: z.array(hourWindowSchema).max(6).optional(),
  tue: z.array(hourWindowSchema).max(6).optional(),
  wed: z.array(hourWindowSchema).max(6).optional(),
  thu: z.array(hourWindowSchema).max(6).optional(),
  fri: z.array(hourWindowSchema).max(6).optional(),
  sat: z.array(hourWindowSchema).max(6).optional(),
  sun: z.array(hourWindowSchema).max(6).optional(),
});

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
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  business_hours: weeklyHoursSchema.nullable().optional(),
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
  const user = await getOrFetchUser(clerkUserId);
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

  const { business_hours: businessHours, ...updates } = parsed.data;
  const keys = Object.keys(updates) as (keyof typeof updates)[];

  // JSONB column needs db.json(), so it's written on its own
  if (businessHours !== undefined) {
    await db`UPDATE tenants SET business_hours = ${businessHours === null ? null : db.json(businessHours as never)}, updated_at = NOW() WHERE id = ${tenant.id}`;
  }
  if (keys.length === 0) {
    const fresh = await db`SELECT * FROM tenants WHERE id = ${tenant.id} LIMIT 1`;
    return c.json({ tenant: await enrichWithUrls(fresh[0] ?? tenant) });
  }

  // Premium themes are a paid-plan feature (a store already using one may keep it)
  if (updates.theme_id && PREMIUM_THEMES.has(updates.theme_id)) {
    const t = tenant as unknown as { plan?: string; theme_id?: string };
    if (t.plan === 'starter' && t.theme_id !== updates.theme_id) {
      return c.json({ error: 'This theme is available on the Pro and Business plans. Upgrade to use it.' }, 402);
    }
  }

  // If slug is being changed, verify it's still available (race-condition guard)
  if (updates.slug) {
    const conflict = await db`SELECT id FROM tenants WHERE slug = ${updates.slug} AND id != ${tenant.id} LIMIT 1`;
    if (conflict[0] || RESERVED_SLUGS.has(updates.slug)) {
      return c.json({ error: 'That URL is already taken. Please choose another name.' }, 409);
    }
  }

  const result = await db`
    UPDATE tenants
    SET ${db(updates as Record<string, unknown>, ...keys as string[])}, updated_at = NOW()
    WHERE id = ${tenant.id}
    RETURNING *
  `;

  if (updates.slug) {
    const before = tenant as unknown as { slug?: string; custom_domain?: string | null };
    domainCache.invalidateSlug(before.slug);
    domainCache.invalidateSlug(updates.slug);
    domainCache.invalidate(before.custom_domain);
  }

  return c.json({ tenant: await enrichWithUrls(result[0]) });
});

// GET /api/tenants/me/booking-hours — the weekly hours bookings are currently taken against
// (business hours if saved, otherwise read from the "Business hours" text) and where they came from.
app.get('/me/booking-hours', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { business_hours?: unknown; page_content?: Record<string, unknown> | null };
  const { availability, source } = resolveAvailability(null, tenant);
  return c.json({ availability, source });
});

// PUT /api/tenants/me/page-content — replace entire page_content JSONB map
app.put('/me/page-content', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: 'Body must be a flat key/value object' }, 400);
  }

  // The Page Builder sends { page_content: {...} }; older callers send the flat map directly.
  const wrapped = (body as Record<string, unknown>).page_content;
  const content = wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped) ? wrapped : body;

  // Merge into existing page_content rather than replace
  const rows = await db`
    UPDATE tenants
    SET page_content = COALESCE(page_content, '{}'::jsonb) || ${db.json(content as never)},
        updated_at = NOW()
    WHERE id = ${tenant.id}
    RETURNING page_content
  `;

  return c.json({ page_content: rows[0].page_content });
});

export default app;
