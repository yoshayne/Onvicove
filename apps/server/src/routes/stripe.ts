import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { stripe, computePlatformFee, createBookingPaymentIntent, getOrCreateStripeCustomer } from '../services/stripe';
import { sendStripeConnected, sendAdminStripeConnected } from '../services/email';

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

  try {
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

    const rawBase = process.env.CLIENT_URL || 'http://localhost:5173';
    const baseUrl = rawBase.replace(/^http:\/\/(?!localhost)/, 'https://');
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${baseUrl}/dashboard/payouts`,
      return_url: `${baseUrl}/dashboard/payouts`,
    });

    return c.json({ url: link.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    console.error('Stripe connect-link error:', message);
    return c.json({ error: message }, 500);
  }
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
    if (onboarded) {
      const userRows = await db`SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`;
      const user = userRows[0];
      if (user?.email) {
        const toName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || (user.email as string);
        const baseUrl = process.env.CLIENT_URL || 'https://shopsuitedirect.com';
        Promise.all([
          sendStripeConnected({ toEmail: user.email as string, toName, companyName: tenant.company_name as string, dashboardUrl: `${baseUrl}/dashboard` }),
          sendAdminStripeConnected({ companyName: tenant.company_name as string, ownerEmail: user.email as string }),
        ]).catch((err) => console.error('Stripe connected email error:', err));
      }
    }
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

  if (reference_type === 'order') {
    const rows = await db`
      SELECT r.*, t.stripe_account_id, t.currency
      FROM orders r
      JOIN tenants t ON t.id = r.tenant_id
      WHERE r.id = ${reference_id}
      LIMIT 1
    `;
    const record = rows[0];
    if (!record) return c.json({ error: 'order not found' }, 404);
    if (!record.stripe_account_id) {
      return c.json({ error: 'This business has not connected Stripe yet' }, 400);
    }

    const totalCents = record.total_cents as number;
    const platformFee = await computePlatformFee(totalCents);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: (record.currency as string)?.toLowerCase() || 'usd',
      application_fee_amount: platformFee,
      automatic_payment_methods: { enabled: true },
      transfer_data: { destination: record.stripe_account_id as string },
      metadata: { reference_type, reference_id, tenant_id: record.tenant_id as string },
    });

    await db`
      UPDATE orders
      SET stripe_payment_intent_id = ${paymentIntent.id}, platform_fee_cents = ${platformFee}, updated_at = NOW()
      WHERE id = ${reference_id}
    `;

    return c.json({ client_secret: paymentIntent.client_secret, amount: totalCents });
  }

  const rows = await db`
    SELECT r.*, t.stripe_account_id, t.currency,
      s.requires_deposit AS service_requires_deposit, s.deposit_cents AS service_deposit_cents,
      cu.id AS customer_row_id, cu.email AS customer_row_email, cu.first_name, cu.last_name, cu.stripe_customer_id
    FROM bookings r
    JOIN tenants t ON t.id = r.tenant_id
    JOIN services s ON s.id = r.service_id
    LEFT JOIN customers cu ON cu.id = r.customer_id
    WHERE r.id = ${reference_id}
    LIMIT 1
  `;
  const record = rows[0];
  if (!record) return c.json({ error: 'booking not found' }, 404);
  if (!record.stripe_account_id) {
    return c.json({ error: 'This business has not connected Stripe yet' }, 400);
  }

  let totalCents = record.amount_cents as number;
  if (record.service_requires_deposit && record.service_deposit_cents) {
    totalCents = record.service_deposit_cents as number;
  }

  let stripeCustomerId: string | undefined;
  if (record.customer_row_id) {
    stripeCustomerId = await getOrCreateStripeCustomer({
      id: record.customer_row_id as string,
      email: record.customer_row_email as string,
      stripe_customer_id: record.stripe_customer_id as string | null,
      first_name: record.first_name as string | null,
      last_name: record.last_name as string | null,
    });
    if (!record.stripe_customer_id) {
      await db`UPDATE customers SET stripe_customer_id = ${stripeCustomerId}, updated_at = NOW() WHERE id = ${record.customer_row_id}`;
    }
  }

  const paymentIntent = await createBookingPaymentIntent({
    amountCents: totalCents,
    currency: (record.currency as string) || 'usd',
    stripeAccountId: record.stripe_account_id as string,
    tenantId: record.tenant_id as string,
    bookingId: reference_id,
    referenceType: 'booking',
    stripeCustomerId,
  });

  await db`
    UPDATE ${db(table)}
    SET stripe_payment_intent_id = ${paymentIntent.id}, platform_fee_cents = ${await computePlatformFee(totalCents)}, updated_at = NOW()
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
    const pi = event.data.object as {
      id: string;
      amount: number;
      customer: string | null;
      payment_method: string | null;
      metadata: Record<string, string>;
    };
    const { reference_type, reference_id, tenant_id } = pi.metadata || {};

    if (pi.customer && pi.payment_method) {
      try {
        const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
        await db`
          UPDATE customers
          SET stripe_payment_method_id = ${pi.payment_method}, card_brand = ${pm.card?.brand ?? null}, card_last4 = ${pm.card?.last4 ?? null}, updated_at = NOW()
          WHERE stripe_customer_id = ${pi.customer}
        `;
      } catch {
        // best-effort card-on-file save
      }
    }

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
    } else if (reference_type === 'booking_balance') {
      const piAmount = pi.amount;
      const rows = await db`
        UPDATE bookings
        SET deposit_paid_cents = COALESCE(deposit_paid_cents, 0) + ${piAmount}, updated_at = NOW()
        WHERE id = ${reference_id} RETURNING *
      `;
      const booking = rows[0];
      if (booking) {
        const platformFee = await computePlatformFee(piAmount);
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

  // Subscription lifecycle events
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const sub = event.data.object as {
      id: string;
      status: string;
      customer: string;
      items: { data: { price: { id: string } }[] };
      current_period_end: number;
      cancel_at_period_end: boolean;
    };

    const priceId = sub.items.data[0]?.price?.id;
    const proPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
    const businessPriceId = process.env.STRIPE_PRICE_BUSINESS_MONTHLY;

    let plan: string | null = null;
    if (priceId && priceId === proPriceId) plan = 'pro';
    else if (priceId && priceId === businessPriceId) plan = 'business';

    const status = sub.cancel_at_period_end ? 'canceling' : sub.status;
    const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

    if (plan) {
      await db`
        UPDATE tenants
        SET stripe_subscription_id = ${sub.id},
            stripe_subscription_status = ${status},
            plan = ${plan},
            plan_expires_at = ${periodEnd},
            updated_at = NOW()
        WHERE stripe_customer_id = ${sub.customer}
      `;
    } else {
      await db`
        UPDATE tenants
        SET stripe_subscription_id = ${sub.id},
            stripe_subscription_status = ${status},
            plan_expires_at = ${periodEnd},
            updated_at = NOW()
        WHERE stripe_customer_id = ${sub.customer}
      `;
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as { id: string; customer: string };
    await db`
      UPDATE tenants
      SET stripe_subscription_status = 'canceled',
          stripe_subscription_id = NULL,
          plan = 'starter',
          plan_expires_at = NULL,
          updated_at = NOW()
      WHERE stripe_customer_id = ${sub.customer}
    `;
  }

  if (event.type === 'invoice.payment_failed') {
    const inv = event.data.object as { customer: string; subscription: string | null };
    if (inv.subscription) {
      await db`
        UPDATE tenants SET stripe_subscription_status = 'past_due', updated_at = NOW()
        WHERE stripe_customer_id = ${inv.customer}
      `;
    }
  }

  return c.json({ received: true });
});

export default app;
