import { Hono } from 'hono';
import { z } from 'zod';
import { getBaseUrl } from '../lib/baseUrl';
import { domainCache } from '../services/domainCache';
import { isRailwayConfigured, railwayRemoveDomain } from '../services/railway';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireAdmin } from '../middleware/admin';
import { stripe, refundStorePayment } from '../services/stripe';
import { refreshStripeStatuses } from '../services/stripeAccounts';
import { getPlatformSettings, savePlatformSettings, DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '../services/settings';
import {
  sendPlanUpgraded, sendPlanDowngraded, sendAccountSuspended, sendAccountReactivated,
  sendOrderRefunded, sendBookingRefunded, sendAdminRefund,
  sendInvite,
} from '../services/email';
import { generateImpersonationToken } from '../lib/impersonate-token';
import { randomBytes } from 'crypto';

const app = new Hono();

app.use('*', requireAuth, requireAdmin);

async function logAdminAction(c: { get: (k: string) => unknown }, action: string, targetType: string, targetId: string | null, details: Record<string, unknown> = {}) {
  const adminEmail = c.get('adminEmail') as string;
  await db`
    INSERT INTO admin_audit_log (admin_email, action, target_type, target_id, details)
    VALUES (${adminEmail}, ${action}, ${targetType}, ${targetId}, ${db.json(details as never)})
  `;
}

// GET /api/admin/stats — platform-wide overview
app.get('/stats', async (c) => {
  await refreshStripeStatuses();
  const [tenantCounts] = await db`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_active) AS active,
      COUNT(*) FILTER (WHERE plan = 'starter') AS starter,
      COUNT(*) FILTER (WHERE plan = 'pro') AS pro,
      COUNT(*) FILTER (WHERE plan = 'business') AS business,
      COUNT(*) FILTER (WHERE stripe_onboarded) AS stripe_onboarded,
      COUNT(*) FILTER (WHERE stripe_account_id IS NOT NULL AND NOT COALESCE(stripe_onboarded, FALSE)) AS stripe_needs_info,
      COUNT(*) FILTER (WHERE plan IN ('pro','business') AND stripe_subscription_status IN ('active','trialing','past_due')) AS paid_subscriptions,
      COUNT(*) FILTER (WHERE plan = 'pro' AND stripe_subscription_status IN ('active','trialing','past_due')) AS paid_pro,
      COUNT(*) FILTER (WHERE plan = 'business' AND stripe_subscription_status IN ('active','trialing','past_due')) AS paid_business
    FROM tenants
  `;

  const [revenue] = await db`
    SELECT
      COALESCE(SUM(platform_fee_cents), 0) AS platform_fee_cents,
      COALESCE(SUM(gross_amount_cents), 0) AS gross_amount_cents,
      COALESCE(SUM(net_to_tenant_cents), 0) AS net_to_tenant_cents,
      COUNT(*) FILTER (WHERE gross_amount_cents > 0) AS transaction_count
    FROM platform_transactions
  `;

  const recentTenants = await db`
    SELECT id, company_name, slug, plan, is_active, created_at
    FROM tenants ORDER BY created_at DESC LIMIT 5
  `;

  // Subscription income: paying Pro / Business stores x their plan price (this is separate from per-sale fees below)
  const settings = await getPlatformSettings();
  const mrrCents = Number(tenantCounts.paid_pro) * settings.plans.pro.price_cents + Number(tenantCounts.paid_business) * settings.plans.business.price_cents;

  return c.json({ tenants: tenantCounts, revenue, recent_tenants: recentTenants, mrr_cents: mrrCents });
});

// GET /api/admin/tenants?search=&plan=&status=
app.get('/tenants', async (c) => {
  await refreshStripeStatuses();
  const search = c.req.query('search');
  const plan = c.req.query('plan');
  const status = c.req.query('status'); // 'active' | 'inactive'

  const conditions = [db`1=1`];
  if (search) {
    conditions.push(db`(company_name ILIKE ${'%' + search + '%'} OR slug ILIKE ${'%' + search + '%'})`);
  }
  if (plan) conditions.push(db`plan = ${plan}`);
  if (status === 'active') conditions.push(db`is_active = TRUE`);
  if (status === 'inactive') conditions.push(db`is_active = FALSE`);

  const whereClause = conditions.reduce((acc, cond) => db`${acc} AND ${cond}`);

  const tenants = await db`
    SELECT t.id, t.company_name, t.slug, t.plan, t.plan_expires_at, t.is_active,
           t.stripe_onboarded, (t.stripe_account_id IS NOT NULL) AS stripe_started, t.stripe_subscription_status, t.industry, t.city, t.created_at,
           t.created_by_admin, t.admin_created_by,
           (t.clerk_user_id IS NULL) AS unclaimed,
           (SELECT ti.invite_email FROM tenant_invites ti WHERE ti.tenant_id = t.id AND ti.claimed_at IS NULL AND ti.expires_at > NOW() ORDER BY ti.created_at DESC LIMIT 1) AS pending_invite_email
    FROM tenants t
    WHERE ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT 100
  `;

  return c.json({ tenants });
});

// GET /api/admin/tenants/:id
app.get('/tenants/:id', async (c) => {
  const id = c.req.param('id');
  await refreshStripeStatuses();
  const rows = await db`SELECT * FROM tenants WHERE id = ${id} LIMIT 1`;
  const tenant = rows[0];
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  const [counts] = await db`
    SELECT
      (SELECT COUNT(*) FROM products WHERE tenant_id = ${id}) AS products,
      (SELECT COUNT(*) FROM services WHERE tenant_id = ${id}) AS services,
      (SELECT COUNT(*) FROM orders WHERE tenant_id = ${id}) AS orders,
      (SELECT COUNT(*) FROM bookings WHERE tenant_id = ${id}) AS bookings,
      (SELECT COUNT(*) FROM customers WHERE tenant_id = ${id}) AS customers
  `;

  return c.json({ tenant, counts });
});

const updateTenantSchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']).optional(),
  plan_expires_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /api/admin/tenants/:id
app.patch('/tenants/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const updates = parsed.data;
  const keys = Object.keys(updates);
  if (keys.length === 0) return c.json({ error: 'No updates provided' }, 400);

  const beforeRows = await db`SELECT t.*, u.email, u.first_name, u.last_name FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id WHERE t.id = ${id} LIMIT 1`;
  if (!beforeRows[0]) return c.json({ error: 'Tenant not found' }, 404);
  const before = beforeRows[0];

  const rows = await db`
    UPDATE tenants
    SET ${db(updates as Record<string, unknown>, ...keys)}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return c.json({ error: 'Tenant not found' }, 404);

  await logAdminAction(c, 'update_tenant', 'tenant', id, updates);

  // Suspending/reactivating or renaming changes whether/where the custom domain resolves
  domainCache.invalidate(before.custom_domain as string | null);
  domainCache.invalidate(rows[0].custom_domain as string | null);
  domainCache.invalidateSlug(before.slug as string);
  domainCache.invalidateSlug(rows[0].slug as string);

  const baseUrl = getBaseUrl();
  const ownerEmail = before.email as string | null;
  if (ownerEmail) {
    const toName = `${before.first_name ?? ''} ${before.last_name ?? ''}`.trim() || ownerEmail;
    const companyName = before.company_name as string;

    if (updates.plan && updates.plan !== before.plan) {
      const PLAN_RANK: Record<string, number> = { starter: 0, pro: 1, business: 2 };
      const wasUpgrade = (PLAN_RANK[updates.plan] ?? 0) > (PLAN_RANK[before.plan as string] ?? 0);
      const fn = wasUpgrade ? sendPlanUpgraded : sendPlanDowngraded;
      fn({ toEmail: ownerEmail, toName, companyName, newPlan: updates.plan, dashboardUrl: `${baseUrl}/dashboard` })
        .catch((err) => console.error('Plan change email error:', err));
    }

    if (updates.is_active === false && before.is_active !== false) {
      sendAccountSuspended({ toEmail: ownerEmail, toName, companyName })
        .catch((err) => console.error('Suspended email error:', err));
    }
    if (updates.is_active === true && before.is_active === false) {
      sendAccountReactivated({ toEmail: ownerEmail, toName, companyName, dashboardUrl: `${baseUrl}/dashboard` })
        .catch((err) => console.error('Reactivated email error:', err));
    }
  }

  return c.json({ tenant: rows[0] });
});

// DELETE /api/admin/tenants/:id
app.delete('/tenants/:id', async (c) => {
  const id = c.req.param('id');
  const rows = await db`SELECT t.company_name, u.email, u.first_name, u.last_name FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id WHERE t.id = ${id} LIMIT 1`;
  if (!rows[0]) return c.json({ error: 'Tenant not found' }, 404);

  // Manually delete in dependency order — some FKs lack CASCADE on older deployments
  await db`DELETE FROM platform_transactions WHERE tenant_id = ${id}`;
  await db`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = ${id})`;
  await db`DELETE FROM order_items WHERE tenant_id = ${id}`;
  await db`DELETE FROM ai_photo_generations WHERE session_id IN (SELECT id FROM ai_photo_sessions WHERE tenant_id = ${id})`;
  await db`DELETE FROM bookings WHERE tenant_id = ${id}`;
  await db`DELETE FROM orders WHERE tenant_id = ${id}`;
  await db`DELETE FROM product_variants WHERE tenant_id = ${id}`;
  await db`DELETE FROM ai_photo_sessions WHERE tenant_id = ${id}`;
  await db`DELETE FROM products WHERE tenant_id = ${id}`;
  await db`DELETE FROM services WHERE tenant_id = ${id}`;
  await db`DELETE FROM staff WHERE tenant_id = ${id}`;
  await db`DELETE FROM customers WHERE tenant_id = ${id}`;
  await db`DELETE FROM page_sections WHERE tenant_id = ${id}`;
  await db`DELETE FROM discount_codes WHERE tenant_id = ${id}`;
  const doomed = await db`SELECT slug, custom_domain, custom_domain_railway_id FROM tenants WHERE id = ${id} LIMIT 1`;
  domainCache.invalidate(doomed[0]?.custom_domain as string | null);
  domainCache.invalidateSlug(doomed[0]?.slug as string | null);
  if (doomed[0]?.custom_domain_railway_id && isRailwayConfigured()) {
    await railwayRemoveDomain(doomed[0].custom_domain_railway_id as string).catch((err) => console.error('Railway domain cleanup failed:', err));
  }
  await db`DELETE FROM tenants WHERE id = ${id}`;
  await logAdminAction(c, 'delete_tenant', 'tenant', id, { company_name: rows[0].company_name });

  return c.json({ deleted: true });
});

// DELETE /api/admin/tenants — delete ALL tenants
app.delete('/tenants', async (c) => {
  const tenants = await db`SELECT id, company_name FROM tenants`;
  for (const t of tenants) {
    await db`DELETE FROM platform_transactions WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = ${t.id})`;
    await db`DELETE FROM order_items WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM ai_photo_generations WHERE session_id IN (SELECT id FROM ai_photo_sessions WHERE tenant_id = ${t.id})`;
    await db`DELETE FROM bookings WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM orders WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM product_variants WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM ai_photo_sessions WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM products WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM services WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM staff WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM customers WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM page_sections WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM discount_codes WHERE tenant_id = ${t.id}`;
    await db`DELETE FROM tenants WHERE id = ${t.id}`;
  }
  await logAdminAction(c, 'delete_all_tenants', 'tenant', null, { count: tenants.length });
  return c.json({ deleted: tenants.length });
});

// GET /api/admin/audit-log
app.get('/audit-log', async (c) => {
  const targetType = c.req.query('target_type');
  const conditions = [db`1=1`];
  if (targetType) conditions.push(db`target_type = ${targetType}`);
  const whereClause = conditions.reduce((acc, cond) => db`${acc} AND ${cond}`);

  const logs = await db`
    SELECT * FROM admin_audit_log
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT 200
  `;

  return c.json({ logs });
});

// GET /api/admin/transactions?tenant_id=&reference_type=&date_from=&date_to=&page=
// Every sale / refund in the ledger, newest first, 50 per page, with totals for the whole filter (not just the page).
app.get('/transactions', async (c) => {
  const tenantId = c.req.query('tenant_id');
  const referenceType = c.req.query('reference_type');
  const dateFrom = c.req.query('date_from');
  const dateTo = c.req.query('date_to');
  const page = Math.max(0, parseInt(c.req.query('page') ?? '0', 10) || 0);
  const PAGE_SIZE = 50;

  const conditions = [db`1=1`];
  if (tenantId) conditions.push(db`pt.tenant_id = ${tenantId}`);
  if (referenceType) conditions.push(db`pt.reference_type = ${referenceType}`);
  if (dateFrom) conditions.push(db`pt.created_at >= ${dateFrom}::date`);
  if (dateTo) conditions.push(db`pt.created_at < (${dateTo}::date + 1)`);
  const whereClause = conditions.reduce((acc, cond) => db`${acc} AND ${cond}`);

  const transactions = await db`
    SELECT pt.*, t.company_name, t.slug, t.currency,
      CASE pt.reference_type
        WHEN 'order' THEN (SELECT '#' || o.order_number FROM orders o WHERE o.id = pt.reference_id)
        WHEN 'booking' THEN (SELECT s.name FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.id = pt.reference_id)
        ELSE 'AI photo'
      END AS reference_label,
      CASE pt.reference_type
        WHEN 'order' THEN (SELECT o.customer_name FROM orders o WHERE o.id = pt.reference_id)
        WHEN 'booking' THEN (SELECT b.customer_name FROM bookings b WHERE b.id = pt.reference_id)
        ELSE NULL
      END AS customer_name,
      EXISTS (SELECT 1 FROM platform_transactions r WHERE r.refund_of = pt.id) AS refunded
    FROM platform_transactions pt
    JOIN tenants t ON t.id = pt.tenant_id
    WHERE ${whereClause}
    ORDER BY pt.created_at DESC
    LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}
  `;

  const [summary] = await db`
    SELECT
      COUNT(*) FILTER (WHERE pt.gross_amount_cents > 0)::int AS sales_count,
      COUNT(*) FILTER (WHERE pt.gross_amount_cents < 0)::int AS refund_count,
      COALESCE(SUM(pt.gross_amount_cents), 0)::bigint AS gross_cents,
      COALESCE(SUM(pt.platform_fee_cents), 0)::bigint AS platform_fee_cents,
      COALESCE(SUM(pt.stripe_fee_cents), 0)::bigint AS stripe_fee_cents,
      COALESCE(SUM(pt.net_to_tenant_cents), 0)::bigint AS net_to_tenant_cents
    FROM platform_transactions pt
    WHERE ${whereClause}
  `;

  return c.json({ transactions, summary, page, page_size: PAGE_SIZE });
});

const refundSchema = z.object({
  transaction_id: z.string().uuid(),
});

// POST /api/admin/refunds — refund the order/booking associated with a platform transaction
app.post('/refunds', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { transaction_id } = parsed.data;

  const txRows = await db`SELECT * FROM platform_transactions WHERE id = ${transaction_id} LIMIT 1`;
  const tx = txRows[0];
  if (!tx) return c.json({ error: 'Transaction not found' }, 404);
  if ((tx.gross_amount_cents as number) <= 0) {
    return c.json({ error: 'This transaction has already been refunded' }, 400);
  }
  const already = await db`SELECT 1 FROM platform_transactions WHERE refund_of = ${transaction_id} LIMIT 1`;
  if (already[0]) return c.json({ error: 'This transaction has already been refunded' }, 400);

  const referenceType = tx.reference_type as string;
  const table = referenceType === 'order' ? 'orders' : 'bookings';

  const refRows = await db`
    SELECT * FROM ${db(table)} WHERE id = ${tx.reference_id} AND tenant_id = ${tx.tenant_id} LIMIT 1
  `;
  const record = refRows[0];
  if (!record) return c.json({ error: `${referenceType} not found` }, 404);
  if (!record.stripe_payment_intent_id) {
    return c.json({ error: 'No payment intent found for this transaction' }, 400);
  }

  let refund;
  let directCharge = false;
  try {
    const owner = await db`SELECT stripe_account_id FROM tenants WHERE id = ${tx.tenant_id} LIMIT 1`;
    const result = await refundStorePayment(record.stripe_payment_intent_id as string, (owner[0]?.stripe_account_id as string | null) ?? null);
    refund = result.refund;
    directCharge = result.direct;
  } catch (err) {
    return c.json({ error: `Stripe refund failed: ${String(err)}` }, 502);
  }

  if (referenceType === 'order') {
    await db`UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = ${tx.reference_id}`;
  } else {
    await db`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = ${tx.reference_id}`;
  }

  await db`
    INSERT INTO platform_transactions (
      tenant_id, reference_id, reference_type, gross_amount_cents,
      platform_fee_cents, stripe_fee_cents, net_to_tenant_cents, stripe_transfer_id, refund_of
    ) VALUES (
      ${tx.tenant_id}, ${tx.reference_id}, ${referenceType},
      ${-(tx.gross_amount_cents as number)}, ${-(tx.platform_fee_cents as number)},
      ${directCharge ? 0 : -(tx.stripe_fee_cents as number)},
      ${directCharge ? -((tx.gross_amount_cents as number) - (tx.platform_fee_cents as number)) : -(tx.net_to_tenant_cents as number)}, ${refund.id}, ${transaction_id}
    )
  `;

  // Direct charge: Stripe keeps its processing fee on a refund, so the store is out that amount (net stays -stripe fee)
  await logAdminAction(c, 'refund', referenceType, tx.reference_id as string, {
    transaction_id,
    refund_id: refund.id,
    amount_cents: tx.gross_amount_cents,
  });

  // Notify customer and admin — best-effort
  const tenantRows = await db`SELECT company_name FROM tenants WHERE id = ${tx.tenant_id} LIMIT 1`;
  const companyName = (tenantRows[0]?.company_name as string) ?? 'the business';
  const amountCents = tx.gross_amount_cents as number;

  if (referenceType === 'order') {
    Promise.all([
      sendOrderRefunded({
        toEmail: record.customer_email as string,
        toName: record.customer_name as string,
        orderNumber: record.order_number as string,
        totalCents: amountCents,
        companyName,
      }),
      sendAdminRefund({ companyName, referenceType, referenceId: tx.reference_id as string, amountCents }),
    ]).catch((err) => console.error('Refund email error:', err));
  } else {
    const svcRows = await db`SELECT name FROM services WHERE id = ${record.service_id} LIMIT 1`;
    const serviceName = (svcRows[0]?.name as string) ?? 'your appointment';
    Promise.all([
      sendBookingRefunded({
        toEmail: record.customer_email as string,
        toName: record.customer_name as string,
        serviceName,
        amountCents,
        companyName,
      }),
      sendAdminRefund({ companyName, referenceType, referenceId: tx.reference_id as string, amountCents }),
    ]).catch((err) => console.error('Refund email error:', err));
  }

  return c.json({ refunded: true, refund_id: refund.id });
});

const planConfigSchema = z.object({
  name: z.string().min(1),
  price_cents: z.number().int().min(0),
  product_limit: z.number().int().min(0).nullable(),
  service_limit: z.number().int().min(0).nullable(),
  ai_credits: z.number().int().min(0),
  platform_fee_percent: z.number().min(0).max(1).nullable().optional(),
  platform_fee_fixed_cents: z.number().int().min(0).nullable().optional(),
});

const platformSettingsSchema = z.object({
  plans: z.object({
    starter: planConfigSchema,
    pro: planConfigSchema,
    business: planConfigSchema,
  }),
  ai_photo_cost_cents: z.number().int().min(0),
  platform_fee_percent: z.number().min(0).max(1),
  platform_fee_fixed_cents: z.number().int().min(0),
});

// GET /api/admin/settings
app.get('/settings', async (c) => {
  return c.json({ settings: await getPlatformSettings(), defaults: DEFAULT_PLATFORM_SETTINGS });
});

// PUT /api/admin/settings
app.put('/settings', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = platformSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  // A client that doesn't send the per-plan fee fields (undefined) keeps the current ones; explicit null = "use the platform default"
  const current = await getPlatformSettings();
  const keep = <T,>(sent: T | null | undefined, now: T | null): T | null => (sent === undefined ? now : sent);
  const plans = Object.fromEntries(
    (['starter', 'pro', 'business'] as const).map((id) => [id, {
      ...parsed.data.plans[id],
      platform_fee_percent: keep(parsed.data.plans[id].platform_fee_percent, current.plans[id].platform_fee_percent),
      platform_fee_fixed_cents: keep(parsed.data.plans[id].platform_fee_fixed_cents, current.plans[id].platform_fee_fixed_cents),
    }]),
  ) as PlatformSettings['plans'];
  const next: PlatformSettings = { ...parsed.data, plans };

  await savePlatformSettings(next);
  await logAdminAction(c, 'update_settings', 'platform_settings', null, next as unknown as Record<string, unknown>);

  return c.json({ settings: next });
});

// GET /api/admin/coupons
app.get('/coupons', async (c) => {
  const coupons = await db`SELECT * FROM platform_coupons ORDER BY created_at DESC`;
  return c.json({ coupons });
});

const createCouponSchema = z.object({
  code: z.string().min(1).max(40),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().int().min(1),
  applies_to_plan: z.enum(['starter', 'pro', 'business']).nullable().optional(),
  max_redemptions: z.number().int().min(1).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

// POST /api/admin/coupons
app.post('/coupons', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createCouponSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const code = d.code.trim().toUpperCase();
  const existing = await db`SELECT id FROM platform_coupons WHERE code = ${code} LIMIT 1`;
  if (existing[0]) return c.json({ error: 'A coupon with this code already exists' }, 409);

  const rows = await db`
    INSERT INTO platform_coupons (code, type, value, applies_to_plan, max_redemptions, expires_at)
    VALUES (${code}, ${d.type}, ${d.value}, ${d.applies_to_plan ?? null}, ${d.max_redemptions ?? null}, ${d.expires_at ?? null})
    RETURNING *
  `;

  await logAdminAction(c, 'create_coupon', 'platform_coupon', rows[0].id as string, { code });

  return c.json({ coupon: rows[0] }, 201);
});

const updateCouponSchema = z.object({
  is_active: z.boolean().optional(),
});

// PATCH /api/admin/coupons/:id
app.patch('/coupons/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateCouponSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const updates = parsed.data;
  const keys = Object.keys(updates);
  if (keys.length === 0) return c.json({ error: 'No updates provided' }, 400);

  const rows = await db`
    UPDATE platform_coupons SET ${db(updates as Record<string, unknown>, ...keys)} WHERE id = ${id} RETURNING *
  `;
  if (!rows[0]) return c.json({ error: 'Coupon not found' }, 404);

  await logAdminAction(c, 'update_coupon', 'platform_coupon', id, updates);

  return c.json({ coupon: rows[0] });
});

// DELETE /api/admin/coupons/:id
app.delete('/coupons/:id', async (c) => {
  const id = c.req.param('id');
  const rows = await db`DELETE FROM platform_coupons WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return c.json({ error: 'Coupon not found' }, 404);

  await logAdminAction(c, 'delete_coupon', 'platform_coupon', id);

  return c.json({ deleted: true });
});

// POST /api/admin/tenants/:id/impersonate — generate a short-lived token to act as this tenant
app.post('/tenants/:id/impersonate', async (c) => {
  const id = c.req.param('id');
  const rows = await db`SELECT id, company_name, slug FROM tenants WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return c.json({ error: 'Tenant not found' }, 404);

  await logAdminAction(c, 'impersonate_start', 'tenant', id, {
    company_name: rows[0].company_name,
  });

  const adminEmail = (c as unknown as { get: (k: string) => unknown }).get('adminEmail') as string;
  const token = generateImpersonationToken(id, adminEmail);

  return c.json({ token, tenant: rows[0] });
});

const createTenantSchema = z.object({
  company_name: z.string().min(1).max(200),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  mode: z.enum(['store', 'book', 'both']).default('both'),
  theme_id: z.enum(['editorial','minimal','bold','warm','classic','bright','obsidian','aurora','magazine','brutalist','neon-tokyo','craft','lens']).default('editorial'),
  brand_color: z.string().optional(),
  city: z.string().optional(),
  industry: z.string().optional(),
  plan: z.enum(['starter', 'pro', 'business']).default('starter'),
});

// POST /api/admin/tenants — create an unclaimed tenant on behalf of a client
app.post('/tenants', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;

  const existing = await db`SELECT id FROM tenants WHERE slug = ${d.slug} LIMIT 1`;
  if (existing[0]) return c.json({ error: 'A tenant with this slug already exists' }, 409);

  const adminEmailAddr = (c as unknown as { get: (k: string) => unknown }).get('adminEmail') as string;

  const rows = await db`
    INSERT INTO tenants (
      slug, company_name, mode, theme_id, brand_color, city, industry, plan,
      created_by_admin, admin_created_by, wizard_completed
    ) VALUES (
      ${d.slug}, ${d.company_name}, ${d.mode}, ${d.theme_id},
      ${d.brand_color ?? '#3D4F7C'}, ${d.city ?? null}, ${d.industry ?? null}, ${d.plan},
      TRUE, ${adminEmailAddr}, TRUE
    )
    RETURNING *
  `;

  await logAdminAction(c, 'create_tenant', 'tenant', rows[0].id as string, {
    company_name: d.company_name, slug: d.slug, mode: d.mode,
  });

  return c.json({ tenant: rows[0] }, 201);
});

const inviteSchema = z.object({
  invite_email: z.string().email(),
});

// POST /api/admin/tenants/:id/invite — generate (or re-send) a client claim invite
app.post('/tenants/:id/invite', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { invite_email } = parsed.data;

  const rows = await db`SELECT id, company_name FROM tenants WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return c.json({ error: 'Tenant not found' }, 404);
  const tenant = rows[0];

  // Expire any existing unclaimed invites for this tenant
  await db`
    UPDATE tenant_invites
    SET expires_at = NOW()
    WHERE tenant_id = ${id} AND claimed_at IS NULL
  `;

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db`
    INSERT INTO tenant_invites (tenant_id, invite_email, token, expires_at)
    VALUES (${id}, ${invite_email}, ${token}, ${expiresAt})
  `;

  const baseUrl = getBaseUrl();
  const claimUrl = `${baseUrl}/claim/${token}`;
  const adminEmailAddr = (c as unknown as { get: (k: string) => unknown }).get('adminEmail') as string;

  sendInvite({
    toEmail: invite_email,
    companyName: tenant.company_name as string,
    inviteUrl: claimUrl,
  }).catch((err: unknown) => console.error('Invite email error:', err));

  await logAdminAction(c, 'send_invite', 'tenant', id, {
    invite_email, admin: adminEmailAddr,
  });

  return c.json({ invite_email, claim_url: claimUrl, expires_at: expiresAt });
});

// GET /api/admin/tenants/:id/invites — list invites for a tenant
app.get('/tenants/:id/invites', async (c) => {
  const id = c.req.param('id');
  const invites = await db`
    SELECT id, invite_email, expires_at, claimed_at, claimed_by, created_at
    FROM tenant_invites
    WHERE tenant_id = ${id}
    ORDER BY created_at DESC
  `;
  return c.json({ invites });
});

export default app;
