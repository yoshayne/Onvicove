import { Hono } from 'hono';
import type Stripe from 'stripe';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { getBaseUrl, getCustomerBaseUrl, getStoreUrl } from '../lib/baseUrl';
import { applySubscription, type StripeSubscriptionLike } from '../services/subscriptions';
import { stripe, computePlatformFee, createBookingPaymentIntent, createStorePaymentIntent, ensureConnectedProfile, getOrCreateStripeCustomer } from '../services/stripe';
import {
  sendStripeConnected, sendAdminStripeConnected,
  sendAdminDomainPurchaseRequest, sendTenantDomainRequestReceived,
  sendOrderConfirmation, sendTenantNewOrder,
  sendBookingConfirmation, sendTenantNewBooking,
  sendPaymentFailed,
} from '../services/email';

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
        business_profile: {
          name: tenant.company_name as string,
          url: `${(process.env.CLIENT_URL || 'https://shopsuitedirect.com').replace(/\/+$/, '')}/${tenant.slug}`,
        },
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
    const platformFee = await computePlatformFee(totalCents, record.tenant_id as string);

    await ensureConnectedProfile(record.tenant_id as string, record.stripe_account_id as string);
    const paymentIntent = await createStorePaymentIntent({
      amount: totalCents,
      currency: (record.currency as string)?.toLowerCase() || 'usd',
      application_fee_amount: platformFee,
      automatic_payment_methods: { enabled: true },
      transfer_data: { destination: record.stripe_account_id as string },
      metadata: { reference_type, reference_id, tenant_id: record.tenant_id as string },
    }, record.stripe_account_id as string);

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
      cu.id AS customer_row_id, cu.email AS customer_row_email, cu.first_name, cu.last_name, cu.stripe_customer_id, cu.stripe_account_id AS customer_stripe_account_id
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
      stripe_account_id: record.customer_stripe_account_id as string | null,
      first_name: record.first_name as string | null,
      last_name: record.last_name as string | null,
    }, record.stripe_account_id as string);
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
    SET stripe_payment_intent_id = ${paymentIntent.id}, platform_fee_cents = ${await computePlatformFee(totalCents, record.tenant_id as string)}, updated_at = NOW()
    WHERE id = ${reference_id}
  `;

  return c.json({ client_secret: paymentIntent.client_secret, amount: totalCents });
});

// POST /webhooks/stripe — Stripe webhook handler (raw body, signature verified)
app.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  // Two Stripe endpoints point here, each with its own signing secret: the platform's own events (subscriptions,
  // domain purchases...) and "events on connected accounts" (stores' customer payments).
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter((x): x is string => !!x);
  if (!sig || secrets.length === 0) {
    return c.json({ error: 'Missing webhook signature or secret' }, 400);
  }

  const rawBody = await c.req.raw.text();

  let event: Stripe.Event | undefined;
  let lastError = '';
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
      break;
    } catch (err) {
      lastError = String(err);
    }
  }
  if (!event) {
    return c.json({ error: `Webhook signature verification failed: ${lastError}` }, 400);
  }

  // Events from a store's own Stripe account: only its customer payments matter here. Anything else (e.g. the
  // store's own subscriptions) must never touch our tenants, and the payment must really belong to that store.
  const connectAccount = event.account as string | undefined;
  if (connectAccount) {
    if (event.type !== 'payment_intent.succeeded' && event.type !== 'payment_intent.payment_failed') {
      return c.json({ received: true, ignored: event.type });
    }
    const metadata = (event.data.object as { metadata?: Record<string, string> }).metadata ?? {};
    const owner = metadata.tenant_id
      ? await db`SELECT 1 FROM tenants WHERE id = ${metadata.tenant_id} AND stripe_account_id = ${connectAccount} LIMIT 1`
      : [];
    if (!owner[0]) return c.json({ received: true, ignored: 'unknown account/tenant' });
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
        const pm = await stripe.paymentMethods.retrieve(pi.payment_method, connectAccount ? { stripeAccount: connectAccount } : undefined);
        await db`
          UPDATE customers
          SET stripe_payment_method_id = ${pi.payment_method}, card_brand = ${pm.card?.brand ?? null}, card_last4 = ${pm.card?.last4 ?? null}, updated_at = NOW()
          WHERE stripe_customer_id = ${pi.customer} AND stripe_account_id IS NOT DISTINCT FROM ${connectAccount ?? null}
        `;
      } catch {
        // best-effort card-on-file save
      }
    }

    const baseUrl = process.env.CLIENT_URL || 'https://shopsuitedirect.com';

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
        // Notify customer and tenant
        const tenantRows = await db`SELECT t.company_name, u.email AS owner_email FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id WHERE t.id = ${tenant_id} LIMIT 1`;
        const t = tenantRows[0];
        Promise.all([
          sendOrderConfirmation({
            toEmail: order.customer_email as string,
            toName: order.customer_name as string,
            orderNumber: order.order_number as string,
            totalCents: order.total_cents as number,
            companyName: (t?.company_name as string) ?? '',
          }).catch(() => {}),
          t?.owner_email
            ? sendTenantNewOrder({
                tenantEmail: t.owner_email as string,
                companyName: t.company_name as string,
                orderNumber: order.order_number as string,
                customerName: order.customer_name as string,
                customerEmail: order.customer_email as string,
                totalCents: order.total_cents as number,
                dashboardUrl: `${baseUrl}/dashboard/orders`,
              }).catch(() => {})
            : Promise.resolve(),
        ]).catch(() => {});
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
        const platformFee = await computePlatformFee(piAmount, booking.tenant_id as string);
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
        // Confirm the customer and notify the tenant
        const svcRow = await db`SELECT name FROM services WHERE id = ${booking.service_id} LIMIT 1`;
        const tenantRows = await db`SELECT t.company_name, u.email AS owner_email FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id WHERE t.id = ${tenant_id} LIMIT 1`;
        const t = tenantRows[0];
        const serviceName = (svcRow[0]?.name as string) ?? 'your appointment';
        const startFmt = new Date(booking.start_time as string).toLocaleString();
        const endFmt = new Date(booking.end_time as string).toLocaleString();
        Promise.all([
          sendBookingConfirmation({
            toEmail: booking.customer_email as string,
            toName: booking.customer_name as string,
            serviceName,
            startTime: startFmt,
            endTime: endFmt,
            companyName: (t?.company_name as string) ?? '',
          }).catch(() => {}),
          t?.owner_email
            ? sendTenantNewBooking({
                tenantEmail: t.owner_email as string,
                companyName: t.company_name as string,
                serviceName,
                customerName: booking.customer_name as string,
                customerEmail: booking.customer_email as string,
                startTime: startFmt,
                endTime: endFmt,
                dashboardUrl: `${baseUrl}/dashboard/bookings`,
              }).catch(() => {})
            : Promise.resolve(),
        ]).catch(() => {});
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as {
      amount: number;
      metadata: Record<string, string>;
      last_payment_error?: { message?: string } | null;
    };
    const { reference_type, reference_id } = pi.metadata || {};
    if (reference_type === 'order' && reference_id) {
      const rows = await db`SELECT customer_email, customer_name, total_cents FROM orders WHERE id = ${reference_id} LIMIT 1`;
      const order = rows[0];
      if (order) {
        const tenantRows = await db`
          SELECT company_name, slug, custom_domain, custom_domain_verified, custom_domain_status
          FROM tenants WHERE id = ${pi.metadata.tenant_id} LIMIT 1
        `;
        const retryUrl = tenantRows[0] ? getStoreUrl(tenantRows[0]) : getBaseUrl();
        sendPaymentFailed({
          toEmail: order.customer_email as string,
          toName: order.customer_name as string,
          companyName: (tenantRows[0]?.company_name as string) ?? '',
          amountCents: order.total_cents as number,
          retryUrl,
        }).catch(() => {});
      }
    } else if ((reference_type === 'booking' || reference_type === 'booking_balance') && reference_id) {
      const rows = await db`
        SELECT b.customer_email, b.customer_name, b.amount_cents, b.id, s.name AS service_name
        FROM bookings b JOIN services s ON s.id = b.service_id
        WHERE b.id = ${reference_id} LIMIT 1
      `;
      const booking = rows[0];
      if (booking) {
        const tenantRows = await db`
          SELECT company_name, slug, custom_domain, custom_domain_verified, custom_domain_status
          FROM tenants WHERE id = ${pi.metadata.tenant_id} LIMIT 1
        `;
        const baseUrl2 = tenantRows[0] ? getCustomerBaseUrl(tenantRows[0]) : getBaseUrl();
        sendPaymentFailed({
          toEmail: booking.customer_email as string,
          toName: booking.customer_name as string,
          companyName: (tenantRows[0]?.company_name as string) ?? '',
          amountCents: booking.amount_cents as number,
          retryUrl: `${baseUrl2}/pay/booking/${reference_id}`,
        }).catch(() => {});
      }
    }
  }

  // Subscription lifecycle events — the plan follows Stripe's subscription status (see services/subscriptions.ts)
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const sub = event.data.object as unknown as StripeSubscriptionLike;
    await applySubscription(event.type === 'customer.subscription.deleted' ? { ...sub, status: 'canceled' } : sub);
  }

  // Domain purchase payment completed — create the request record and notify admin
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      amount_total: number | null;
      payment_intent: string | null;
      metadata: Record<string, string>;
    };
    if (session.metadata?.type === 'domain_purchase') {
      const { tenant_id, domain } = session.metadata;
      const tld = domain.split('.').slice(1).join('.');

      // Stripe retries webhooks; the unique session id makes this insert idempotent.
      const rows = await db`
        INSERT INTO domain_purchase_requests (tenant_id, domain, tld, status, price_cents, stripe_session_id, stripe_payment_intent_id)
        VALUES (${tenant_id}, ${domain}, ${tld}, 'pending', ${session.amount_total ?? null}, ${session.id}, ${session.payment_intent ?? null})
        ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING
        RETURNING *
      `;
      const request = rows[0];

      if (request) {
        const tenantRows = await db`
          SELECT t.company_name, t.clerk_user_id FROM tenants t WHERE t.id = ${tenant_id} LIMIT 1
        `;
        const tenant = tenantRows[0];
        if (tenant) {
          const users = await db`
            SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${tenant.clerk_user_id} LIMIT 1
          `;
          const user = users[0];
          const ownerEmail = user?.email as string ?? '';
          const ownerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || tenant.company_name as string;
          const adminUrl = `${getBaseUrl()}/admin/domain-requests`;

          await Promise.allSettled([
            sendAdminDomainPurchaseRequest({
              companyName: tenant.company_name as string,
              ownerEmail,
              domain,
              requestId: request.id as string,
              adminUrl,
            }),
            ownerEmail
              ? sendTenantDomainRequestReceived({ toEmail: ownerEmail, toName: ownerName, domain })
              : Promise.resolve(),
          ]);
        }
      }
    }
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
