import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { stripe, computePlatformFee } from '../services/stripe';

const app = new Hono();

// POST /api/stripe/connect-link — create/refresh Stripe Connect Express onboarding link
app.post('/connect-link', requireAuth, async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;

  const rows = await db`
    SELECT * FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `;
  const tenant = rows[0];
  if (!tenant) return c.json({ error: 'No tenant account found' }, 404);

  let accountId = tenant.stripe_account_id as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      business_type: 'individual',
      email: undefined,
    });
    accountId = account.id;
    await db`
      UPDATE tenants SET stripe_account_id = ${accountId}, updated_at = NOW()
      WHERE id = ${tenant.id}
    `;
  }

  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${baseUrl}/dashboard/payouts`,
    return_url: `${baseUrl}/dashboard/payouts`,
  });

  return c.json({ url: link.url });
});

// GET /api/stripe/account-status
app.get('/account-status', requireAuth, async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const rows = await db`
    SELECT * FROM tenants WHERE clerk_user_id = ${clerkUserId} LIMIT 1
  `;
  const tenant = rows[0];
  if (!tenant) return c.json({ error: 'No tenant account found' }, 404);

  if (!tenant.stripe_account_id) {
    return c.json({ connected: false, onboarded: false });
  }

  const account = await stripe.accounts.retrieve(tenant.stripe_account_id as string);
  const onboarded = !!account.charges_enabled && !!account.details_submitted;

  if (onboarded !== tenant.stripe_onboarded) {
    await db`
      UPDATE tenants SET stripe_onboarded = ${onboarded}, updated_at = NOW()
      WHERE id = ${tenant.id}
    `;
  }

  return c.json({ connected: true, onboarded });
});

const paymentIntentSchema = z.object({
  reference_type: z.enum(['order', 'booking']),
  reference_id: z.string().uuid(),
});

// POST /api/stripe/payment-intent — create a PaymentIntent on the tenant's Connect account
app.post('/payment-intent', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = paymentIntentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }
  const { reference_type, reference_id } = parsed.data;

  const table = reference_type === 'order' ? 'orders' : 'bookings';
  const rows = reference_type === 'order'
    ? await db`
        SELECT r.*, t.stripe_account_id, t.currency
        FROM orders r
        JOIN tenants t ON t.id = r.tenant_id
        WHERE r.id = ${reference_id}
        LIMIT 1
      `
    : await db`
        SELECT r.*, t.stripe_account_id, t.currency,
          s.requires_deposit AS service_requires_deposit, s.deposit_cents AS service_deposit_cents
        FROM bookings r
        JOIN tenants t ON t.id = r.tenant_id
        JOIN services s ON s.id = r.service_id
        WHERE r.id = ${reference_id}
        LIMIT 1
      `;
  const record = rows[0];
  if (!record) return c.json({ error: `${reference_type} not found` }, 404);
  if (!record.stripe_account_id) {
    return c.json({ error: 'This business has not connected Stripe yet' }, 400);
  }

  let totalCents = (record.total_cents ?? record.amount_cents) as number;
  if (reference_type === 'booking' && record.service_requires_deposit && record.service_deposit_cents) {
    totalCents = record.service_deposit_cents as number;
  }
  const platformFee = computePlatformFee(totalCents);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: (record.currency as string)?.toLowerCase() || 'usd',
    application_fee_amount: platformFee,
    transfer_data: {
      destination: record.stripe_account_id as string,
    },
    metadata: {
      reference_type,
      reference_id,
      tenant_id: record.tenant_id as string,
    },
  });

  await db`
    UPDATE ${db(table)}
    SET stripe_payment_intent_id = ${paymentIntent.id}, platform_fee_cents = ${platformFee}, updated_at = NOW()
    WHERE id = ${reference_id}
  `;

  return c.json({ client_secret: paymentIntent.client_secret, amount: totalCents });
});

// POST /webhooks/stripe — Stripe webhook handler (raw body, signature verified)
app.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return c.json({ error: 'Missing webhook signature or secret' }, 400);
  }

  const rawBody = await c.req.raw.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    return c.json({ error: `Webhook signature verification failed: ${String(err)}` }, 400);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as { id: string; metadata: Record<string, string> };
    const { reference_type, reference_id, tenant_id } = pi.metadata || {};

    if (reference_type === 'order') {
      const rows = await db`
        UPDATE orders SET status = 'paid', stripe_charge_id = ${pi.id}, updated_at = NOW()
        WHERE id = ${reference_id} RETURNING *
      `;
      const order = rows[0];
      if (order) {
        const platformFee = order.platform_fee_cents as number;
        const stripeFee = Math.round((order.total_cents as number) * 0.029) + 30;
        await db`
          INSERT INTO platform_transactions (
            tenant_id, reference_id, reference_type, gross_amount_cents,
            platform_fee_cents, stripe_fee_cents, net_to_tenant_cents
          ) VALUES (
            ${tenant_id}, ${reference_id}, 'order', ${order.total_cents},
            ${platformFee}, ${stripeFee}, ${(order.total_cents as number) - platformFee - stripeFee}
          )
        `;
      }
    } else if (reference_type === 'booking') {
      const piAmount = (pi as unknown as { amount: number }).amount;
      const rows = await db`
        UPDATE bookings
        SET status = 'confirmed', stripe_payment_intent_id = ${pi.id}, deposit_paid_cents = ${piAmount}, updated_at = NOW()
        WHERE id = ${reference_id} RETURNING *
      `;
      const booking = rows[0];
      if (booking) {
        const platformFee = booking.platform_fee_cents as number;
        const stripeFee = Math.round(piAmount * 0.029) + 30;
        await db`
          INSERT INTO platform_transactions (
            tenant_id, reference_id, reference_type, gross_amount_cents,
            platform_fee_cents, stripe_fee_cents, net_to_tenant_cents
          ) VALUES (
            ${tenant_id}, ${reference_id}, 'booking', ${piAmount},
            ${platformFee}, ${stripeFee}, ${piAmount - platformFee - stripeFee}
          )
        `;
      }
    }
  }

  return c.json({ received: true });
});

export default app;
