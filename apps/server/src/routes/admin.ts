import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireAdmin } from '../middleware/admin';
import { stripe } from '../services/stripe';
import { getPlatformSettings, savePlatformSettings, DEFAULT_PLATFORM_SETTINGS } from '../services/settings';
import {
  sendPlanUpgraded, sendPlanDowngraded, sendAccountSuspended,
  sendOrderRefunded, sendBookingRefunded, sendAdminRefund,
} from '../services/email';

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
  const [tenantCounts] = await db`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_active) AS active,
      COUNT(*) FILTER (WHERE plan = 'starter') AS starter,
      COUNT(*) FILTER (WHERE plan = 'pro') AS pro,
      COUNT(*) FILTER (WHERE plan = 'business') AS business,
      COUNT(*) FILTER (WHERE stripe_onboarded) AS stripe_onboarded
    FROM tenants
  `;

  const [revenue] = await db`
    SELECT
      COALESCE(SUM(platform_fee_cents), 0) AS platform_fee_cents,
      COALESCE(SUM(gross_amount_cents), 0) AS gross_amount_cents,
      COALESCE(SUM(net_to_tenant_cents), 0) AS net_to_tenant_cents,
      COUNT(*) AS transaction_count
    FROM platform_transactions
  `;

  const recentTenants = await db`
    SELECT id, company_name, slug, plan, is_active, created_at
    FROM tenants ORDER BY created_at DESC LIMIT 5
  `;

  return c.json({ tenants: tenantCounts, revenue, recent_tenants: recentTenants });
});

// GET /api/admin/tenants?search=&plan=&status=
app.get('/tenants', async (c) => {
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
    SELECT id, company_name, slug, plan, plan_expires_at, is_active, stripe_onboarded, industry, city, created_at
    FROM tenants
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return c.json({ tenants });
});

// GET /api/admin/tenants/:id
app.get('/tenants/:id', async (c) => {
  const id = c.req.param('id');
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

  const baseUrl = process.env.CLIENT_URL || 'https://shopsuitedirect.com';
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

// GET /api/admin/transactions?tenant_id=&reference_type=
app.get('/transactions', async (c) => {
  const tenantId = c.req.query('tenant_id');
  const referenceType = c.req.query('reference_type');

  const conditions = [db`1=1`];
  if (tenantId) conditions.push(db`pt.tenant_id = ${tenantId}`);
  if (referenceType) conditions.push(db`pt.reference_type = ${referenceType}`);
  const whereClause = conditions.reduce((acc, cond) => db`${acc} AND ${cond}`);

  const transactions = await db`
    SELECT pt.*, t.company_name, t.slug
    FROM platform_transactions pt
    JOIN tenants t ON t.id = pt.tenant_id
    WHERE ${whereClause}
    ORDER BY pt.created_at DESC
    LIMIT 200
  `;

  return c.json({ transactions });
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
  try {
    refund = await stripe.refunds.create({
      payment_intent: record.stripe_payment_intent_id as string,
      reverse_transfer: true,
      refund_application_fee: true,
    });
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
      platform_fee_cents, stripe_fee_cents, net_to_tenant_cents, stripe_transfer_id
    ) VALUES (
      ${tx.tenant_id}, ${tx.reference_id}, ${referenceType},
      ${-(tx.gross_amount_cents as number)}, ${-(tx.platform_fee_cents as number)},
      ${-(tx.stripe_fee_cents as number)}, ${-(tx.net_to_tenant_cents as number)}, ${refund.id}
    )
  `;

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
  item_limit: z.number().int().min(0).nullable(),
  ai_credits: z.number().int().min(0),
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

  await savePlatformSettings(parsed.data);
  await logAdminAction(c, 'update_settings', 'platform_settings', null, parsed.data as Record<string, unknown>);

  return c.json({ settings: parsed.data });
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

export default app;
