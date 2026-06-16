import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { generateUniqueSlug } from '../lib/slugify';
import { sendTenantWelcome, sendSiteLive, sendAdminNewSignup } from '../services/email';

const app = new Hono();

app.use('*', requireAuth);

// GET /api/wizard/progress
app.get('/progress', async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const rows = await db`
    SELECT wizard_step, wizard_data, wizard_completed, slug
    FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `;

  if (!rows[0]) {
    return c.json({ wizard_step: 0, wizard_data: {}, wizard_completed: false });
  }

  return c.json(rows[0]);
});

const saveProgressSchema = z.object({
  wizard_step: z.number().int().min(0).optional(),
  wizard_data: z.record(z.unknown()),
});

// POST /api/wizard/save — upsert progress (creates a draft tenant if none exists)
app.post('/save', async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const body = await c.req.json().catch(() => ({}));
  const parsed = saveProgressSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { wizard_step, wizard_data } = parsed.data;

  const existing = await db`
    SELECT id FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `;

  if (existing[0]) {
    const rows = await db`
      UPDATE tenants
      SET wizard_data = wizard_data || ${db.json(JSON.parse(JSON.stringify(wizard_data)))},
          wizard_step = COALESCE(${wizard_step ?? null}, wizard_step),
          updated_at = NOW()
      WHERE id = ${existing[0].id}
      RETURNING wizard_step, wizard_data, wizard_completed
    `;
    return c.json(rows[0]);
  }

  const companyName = (wizard_data.businessName as string) || 'My Business';
  const slug = await generateUniqueSlug(companyName);

  const rows = await db`
    INSERT INTO tenants (clerk_user_id, slug, company_name, wizard_step, wizard_data)
    VALUES (${clerkUserId}, ${slug}, ${companyName}, ${wizard_step ?? 0}, ${db.json(JSON.parse(JSON.stringify(wizard_data)))})
    RETURNING wizard_step, wizard_data, wizard_completed
  `;
  return c.json(rows[0], 201);
});

// POST /api/wizard/complete — finalize tenant from wizard_data
app.post('/complete', async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;

  const rows = await db`
    SELECT * FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `;
  const tenant = rows[0];
  if (!tenant) return c.json({ error: 'No wizard progress found' }, 404);

  const data = (tenant.wizard_data || {}) as Record<string, any>;

  const updated = await db`
    UPDATE tenants
    SET company_name = ${data.businessName || tenant.company_name},
        tagline = ${data.tagline ?? tenant.tagline},
        mode = ${data.mode || tenant.mode},
        theme_id = ${data.themeId || tenant.theme_id},
        brand_color = ${data.brandColor ?? tenant.brand_color},
        city = ${data.city ?? tenant.city},
        industry = ${data.industry ?? tenant.industry},
        logo_key = ${data.logoKey ?? tenant.logo_key},
        hero_image_key = ${data.heroImageKey ?? tenant.hero_image_key},
        plan = ${data.plan || tenant.plan},
        wizard_completed = TRUE,
        updated_at = NOW()
    WHERE id = ${tenant.id}
    RETURNING *
  `;

  const result = updated[0];

  // Persist products
  if (Array.isArray(data.products)) {
    for (const p of data.products) {
      await db`
        INSERT INTO products (tenant_id, name, description, price_cents, image_keys, type)
        VALUES (
          ${result.id}, ${p.name}, ${p.description ?? null}, ${p.priceCents ?? 0},
          ${db.json(p.imageKeys ?? [])}, ${p.type ?? 'physical'}
        )
      `;
    }
  }

  // Persist services
  if (Array.isArray(data.services)) {
    for (const s of data.services) {
      await db`
        INSERT INTO services (tenant_id, name, description, price_cents, duration_minutes, image_keys, requires_deposit, deposit_cents)
        VALUES (
          ${result.id}, ${s.name}, ${s.description ?? null}, ${s.priceCents ?? 0},
          ${s.durationMinutes ?? 30}, ${db.json(s.imageKeys ?? [])},
          ${s.requiresDeposit ?? false}, ${s.requiresDeposit ? s.depositCents ?? 0 : null}
        )
      `;
    }
  }

  // Persist staff
  if (Array.isArray(data.staff)) {
    for (const st of data.staff) {
      await db`
        INSERT INTO staff (tenant_id, name, email, availability)
        VALUES (${result.id}, ${st.name}, ${st.email ?? null}, ${db.json(st.availability ?? {})})
      `;
    }
  }

  // Fire welcome emails — best-effort, don't fail the response
  const userRows = await db`SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
  const user = userRows[0];
  if (user?.email) {
    const toName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || (user.email as string);
    const baseUrl = process.env.CLIENT_URL || 'https://shopsuitedirect.com';
    Promise.all([
      sendTenantWelcome({ toEmail: user.email as string, toName, companyName: result.company_name as string, dashboardUrl: `${baseUrl}/dashboard` }),
      sendSiteLive({ toEmail: user.email as string, toName, companyName: result.company_name as string, storefrontUrl: `${baseUrl}/${result.slug}` }),
      sendAdminNewSignup({ companyName: result.company_name as string, ownerEmail: user.email as string, plan: result.plan as string }),
    ]).catch((err) => console.error('Welcome email error:', err));
  }

  return c.json({ tenant: result });
});

export default app;
