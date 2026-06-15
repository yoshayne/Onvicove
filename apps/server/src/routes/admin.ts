import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireAdmin } from '../middleware/admin';
import { stripe } from '../services/stripe';

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

  const rows = await db`
    UPDATE tenants
    SET ${db(updates as Record<string, unknown>, ...keys)}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return c.json({ error: 'Tenant not found' }, 404);

  await logAdminAction(c, 'update_tenant', 'tenant', id, updates);

  return c.json({ tenant: rows[0] });
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

  return c.json({ refunded: true, refund_id: refund.id });
});

export default app;
