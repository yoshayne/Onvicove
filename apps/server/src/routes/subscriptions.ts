import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { stripe } from '../services/stripe';
import { getBaseUrl } from '../lib/baseUrl';
import { feeForPlan, getPlatformSettings } from '../services/settings';
import { CHARGE_MODEL, STRIPE_CARD_FEE } from '../services/chargeModel';
import {
  applySubscription, ENDED_STATUSES, ENTITLED_STATUSES, priceIdFor, type StripeSubscriptionLike,
} from '../services/subscriptions';

const app = new Hono();
app.use('*', requireAuth, requireTenant);

interface SubTenant {
  id: string;
  clerk_user_id: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

async function getOrCreateStripeCustomer(tenant: SubTenant): Promise<string> {
  if (tenant.stripe_customer_id) return tenant.stripe_customer_id;

  const userRows = await db`SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${tenant.clerk_user_id} LIMIT 1`;
  const user = userRows[0];

  const customer = await stripe.customers.create({
    email: user?.email as string | undefined,
    name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined,
    metadata: { tenant_id: tenant.id },
  });

  await db`UPDATE tenants SET stripe_customer_id = ${customer.id}, updated_at = NOW() WHERE id = ${tenant.id}`;
  return customer.id;
}

// GET /api/subscriptions/plans — what each plan costs and the platform fee a store on it pays
app.get('/plans', async (c) => {
  const settings = await getPlatformSettings();
  const plans = Object.fromEntries(
    (['starter', 'pro', 'business'] as const).map((id) => {
      const fee = feeForPlan(settings, id);
      return [id, { name: settings.plans[id].name, price_cents: settings.plans[id].price_cents, fee_percent: fee.percent, fee_fixed_cents: fee.fixedCents }];
    }),
  );
  return c.json({
    plans,
    charge_model: CHARGE_MODEL,
    stripe_fee: { percent: STRIPE_CARD_FEE.percent, fixed_cents: STRIPE_CARD_FEE.fixedCents },
  });
});

// GET /api/subscriptions/status
app.get('/status', async (c) => {
  const tenant = c.get('tenant') as unknown as { id: string };
  const rows = await db`
    SELECT plan, plan_expires_at, stripe_customer_id IS NOT NULL AS has_billing_account,
           stripe_subscription_id, stripe_subscription_status
    FROM tenants WHERE id = ${tenant.id} LIMIT 1
  `;
  return c.json({ subscription: rows[0] });
});

// POST /api/subscriptions/sync — pull the subscription's real state from Stripe and apply it. The dashboard calls
// this right after a payment so the plan updates without waiting for the webhook (which also keeps it in sync).
app.post('/sync', async (c) => {
  const tenant = c.get('tenant') as unknown as SubTenant;
  if (!tenant.stripe_customer_id) return c.json({ plan: tenant.plan, status: 'none' });

  let sub: StripeSubscriptionLike | undefined;
  if (tenant.stripe_subscription_id) {
    sub = (await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)) as unknown as StripeSubscriptionLike;
  } else {
    // We lost track of the subscription (e.g. a dropped webhook): find the customer's live one.
    const list = await stripe.subscriptions.list({ customer: tenant.stripe_customer_id, status: 'all', limit: 5 });
    sub = list.data.find((s) => ENTITLED_STATUSES.has(s.status)) as unknown as StripeSubscriptionLike | undefined;
    if (sub) await db`UPDATE tenants SET stripe_subscription_id = ${sub.id} WHERE id = ${tenant.id}`;
  }
  if (!sub) return c.json({ plan: tenant.plan, status: 'none' });

  const result = await applySubscription(sub);
  return c.json(result);
});

// POST /api/subscriptions/create — start or change a paid plan
app.post('/create', async (c) => {
  const tenant = c.get('tenant') as unknown as SubTenant;
  const body = await c.req.json().catch(() => ({}));
  const parsed = z.object({ plan: z.enum(['pro', 'business']) }).safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid plan' }, 400);

  const { plan } = parsed.data;
  const priceId = priceIdFor(plan);
  if (!priceId) {
    return c.json({ error: `Stripe price not configured for plan "${plan}". Set STRIPE_PRICE_${plan.toUpperCase()}_MONTHLY.` }, 500);
  }

  const customerId = await getOrCreateStripeCustomer(tenant);

  if (tenant.stripe_subscription_id) {
    const existing = (await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)) as unknown as StripeSubscriptionLike & { pending_update?: unknown };
    const existingItem = existing.items.data[0] as { id: string; price: { id: string } };

    // Live subscription: change the price (and undo a scheduled cancellation)
    if (ENTITLED_STATUSES.has(existing.status)) {
      if (existing.status === 'past_due') {
        return c.json({ error: 'Your last payment failed. Update your payment method under "Manage billing" first.' }, 409);
      }
      if (existingItem.price.id === priceId && !existing.cancel_at_period_end) {
        return c.json({ upgraded: true, status: existing.status, plan });
      }
      const updated = (await stripe.subscriptions.update(existing.id, {
        items: [{ id: existingItem.id, price: priceId }],
        cancel_at_period_end: false,
        proration_behavior: 'always_invoice',
        // Only switch the price if the prorated invoice is actually paid
        payment_behavior: 'pending_if_incomplete',
      })) as unknown as StripeSubscriptionLike & { pending_update?: unknown };

      if (updated.pending_update) {
        return c.json({ error: 'We couldn\'t charge your card for the upgrade. Update your payment method under "Manage billing" and try again.' }, 402);
      }
      const applied = await applySubscription(updated);
      return c.json({ upgraded: true, status: applied.status, plan: applied.plan });
    }

    // Abandoned checkout: reuse it if it's for this plan, otherwise cancel it and start fresh
    if (existing.status === 'incomplete') {
      if (existingItem.price.id === priceId) {
        const full = await stripe.subscriptions.retrieve(existing.id, { expand: ['latest_invoice.payment_intent'] });
        const pi = (full.latest_invoice as { payment_intent?: { client_secret: string | null; status: string } } | null)?.payment_intent;
        if (pi?.client_secret && ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(pi.status)) {
          return c.json({ clientSecret: pi.client_secret, subscriptionId: existing.id, status: 'incomplete' });
        }
      }
      await stripe.subscriptions.cancel(existing.id).catch(() => undefined);
      await db`UPDATE tenants SET stripe_subscription_id = NULL, stripe_subscription_status = 'none' WHERE id = ${tenant.id}`;
    } else if (!ENDED_STATUSES.has(existing.status)) {
      return c.json({ error: `Your subscription is ${existing.status}. Use "Manage billing" to fix it.` }, 409);
    }
  }

  // New subscription. The plan is NOT granted here — it's granted once Stripe reports the payment succeeded.
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
    UPDATE tenants SET stripe_subscription_id = ${subscription.id}, stripe_subscription_status = ${subscription.status}, updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  return c.json({ clientSecret, subscriptionId: subscription.id, status: subscription.status });
});

// POST /api/subscriptions/cancel — cancel at the end of the paid period
app.post('/cancel', async (c) => {
  const tenant = c.get('tenant') as unknown as SubTenant;
  if (!tenant.stripe_subscription_id) return c.json({ error: 'No active subscription' }, 400);

  await stripe.subscriptions.update(tenant.stripe_subscription_id, { cancel_at_period_end: true });
  await db`UPDATE tenants SET stripe_subscription_status = 'canceling', updated_at = NOW() WHERE id = ${tenant.id}`;
  return c.json({ success: true });
});

// POST /api/subscriptions/resume — undo a scheduled cancellation
app.post('/resume', async (c) => {
  const tenant = c.get('tenant') as unknown as SubTenant;
  if (!tenant.stripe_subscription_id) return c.json({ error: 'No subscription to resume' }, 400);

  const sub = (await stripe.subscriptions.update(tenant.stripe_subscription_id, { cancel_at_period_end: false })) as unknown as StripeSubscriptionLike;
  const result = await applySubscription(sub);
  return c.json({ success: true, ...result });
});

// POST /api/subscriptions/portal — Stripe billing portal session
app.post('/portal', async (c) => {
  const tenant = c.get('tenant') as unknown as SubTenant;
  if (!tenant.stripe_customer_id) return c.json({ error: 'No billing account found' }, 400);

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${getBaseUrl()}/dashboard/billing`,
  });

  return c.json({ url: session.url });
});

export default app;
