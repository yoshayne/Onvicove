import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { stripe } from '../services/stripe';

const app = new Hono();
app.use('*', requireAuth);

const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
  business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
};

async function getOrCreateStripeCustomerForTenant(tenantId: string, clerkUserId: string): Promise<string> {
  const rows = await db`SELECT stripe_customer_id FROM tenants WHERE id = ${tenantId} LIMIT 1`;
  if (rows[0]?.stripe_customer_id) return rows[0].stripe_customer_id as string;

  const userRows = await db`SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
  const user = userRows[0];

  const customer = await stripe.customers.create({
    email: user?.email as string | undefined,
    name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined,
    metadata: { tenant_id: tenantId },
  });

  await db`UPDATE tenants SET stripe_customer_id = ${customer.id}, updated_at = NOW() WHERE id = ${tenantId}`;
  return customer.id;
}

// GET /api/subscriptions/status
app.get('/status', async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const rows = await db`
    SELECT plan, plan_expires_at, stripe_subscription_id, stripe_subscription_status
    FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `;
  if (!rows[0]) return c.json({ error: 'Tenant not found' }, 404);
  return c.json({ subscription: rows[0] });
});

// POST /api/subscriptions/create — create or upgrade subscription
app.post('/create', async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const body = await c.req.json().catch(() => ({}));
  const parsed = z.object({ plan: z.enum(['pro', 'business']) }).safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid plan' }, 400);

  const { plan } = parsed.data;
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return c.json({ error: `Stripe price not configured for plan "${plan}". Set STRIPE_PRICE_${plan.toUpperCase()}_MONTHLY.` }, 500);
  }

  const tenantRows = await db`SELECT id, stripe_subscription_id FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
  const tenant = tenantRows[0];
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  const customerId = await getOrCreateStripeCustomerForTenant(tenant.id as string, clerkUserId);

  // If tenant already has a subscription, update it instead
  if (tenant.stripe_subscription_id) {
    const existing = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id as string);
    if (existing.status !== 'canceled') {
      const updated = await stripe.subscriptions.update(tenant.stripe_subscription_id as string, {
        items: [{ id: existing.items.data[0].id, price: priceId }],
        proration_behavior: 'always_invoice',
      });
      await db`
        UPDATE tenants SET plan = ${plan}, stripe_subscription_status = ${updated.status}, updated_at = NOW()
        WHERE id = ${tenant.id}
      `;
      return c.json({ upgraded: true, status: updated.status });
    }
  }

  // Create new subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });

  const invoice = subscription.latest_invoice as { payment_intent?: { client_secret: string | null } } | null;
  const clientSecret = invoice?.payment_intent?.client_secret ?? null;

  await db`
    UPDATE tenants
    SET stripe_subscription_id = ${subscription.id}, stripe_subscription_status = ${subscription.status},
        plan = ${plan}, updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  return c.json({ clientSecret, subscriptionId: subscription.id, status: subscription.status });
});

// POST /api/subscriptions/cancel
app.post('/cancel', async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const rows = await db`SELECT id, stripe_subscription_id FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
  const tenant = rows[0];
  if (!tenant?.stripe_subscription_id) return c.json({ error: 'No active subscription' }, 400);

  await stripe.subscriptions.update(tenant.stripe_subscription_id as string, {
    cancel_at_period_end: true,
  });

  await db`UPDATE tenants SET stripe_subscription_status = 'canceling', updated_at = NOW() WHERE id = ${tenant.id}`;
  return c.json({ success: true });
});

// POST /api/subscriptions/portal — Stripe billing portal session
app.post('/portal', async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const rows = await db`SELECT stripe_customer_id FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
  const tenant = rows[0];
  if (!tenant?.stripe_customer_id) return c.json({ error: 'No billing account found' }, 400);

  const rawBase = process.env.CLIENT_URL || 'http://localhost:5173';
  const baseUrl = rawBase.replace(/^http:\/\/(?!localhost)/, 'https://');

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id as string,
    return_url: `${baseUrl}/dashboard/billing`,
  });

  return c.json({ url: session.url });
});

export default app;
