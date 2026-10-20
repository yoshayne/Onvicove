import { randomUUID } from 'crypto';
import { addDays, format, parse } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { db } from '../db/client';
import { getCustomerBaseUrl } from '../lib/baseUrl';
import { newManageToken } from './bookingManage';
import { CHARGE_MODEL } from './chargeModel';
import { pickStaffForSlot } from './slots';
import { computePlatformFee, getOrCreateStripeCustomer, stripe } from './stripe';
import { sendRecurringEnded, sendRecurringPaymentFailed, sendRecurringRenewed, sendRecurringStarted, sendTenantRecurringNotice } from './email';

/** After this many failed charges the plan ends (Stripe's own retries are then stopped) */
export const MAX_PAYMENT_ATTEMPTS = 3;
/** How far ahead recurring appointments are kept on the calendar */
const HORIZON_DAYS = 56;
export const AUTH_TERMS_VERSION = 'v1';

type Row = Record<string, unknown>;

/** The few Stripe actions we take on a plan, replaceable in tests */
export const stripeOps = {
  async cancelNow(subId: string, accountId: string) { await stripe.subscriptions.cancel(subId, {}, { stripeAccount: accountId }); },
  async cancelAtPeriodEnd(subId: string, accountId: string) { await stripe.subscriptions.update(subId, { cancel_at_period_end: true }, { stripeAccount: accountId }); },
};

// ── Starting a plan (the customer is checking out) ──────────────────────────
export interface StartInput {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  startTime?: string | null; // recurring appointment: the first session
  staffId?: string | null;
  authorizationText: string;
  ip?: string | null;
  userAgent?: string | null;
}

export class RecurringError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function startRecurringCheckout(tenant: Row, service: Row, input: StartInput): Promise<{ recurringId: string; clientSecret: string; amountCents: number; stripeAccountId: string; manageToken: string }> {
  if (CHARGE_MODEL !== 'direct') throw new RecurringError('Monthly plans are not available right now.', 503);
  const accountId = tenant.stripe_account_id as string | null;
  if (!accountId || !tenant.stripe_onboarded) throw new RecurringError('This business has not finished setting up payments yet.');
  if (service.billing_type !== 'recurring') throw new RecurringError('This service is not a monthly plan.');
  const amount = service.price_cents as number;
  if (amount < 50) throw new RecurringError('This plan has no price set yet.');
  const kind = (service.recurring_kind as 'membership' | 'appointment') ?? 'membership';
  const tz = (tenant.timezone as string) || 'America/New_York';

  let staffId: string | null = null;
  let start: Date | null = null;
  if (kind === 'appointment') {
    if (!input.startTime) throw new RecurringError('Please choose your first session time.');
    start = new Date(input.startTime);
    const pick = await pickStaffForSlot({
      tenant: tenant as never,
      service: { id: service.id as string, duration_minutes: service.duration_minutes as number, buffer_minutes: service.buffer_minutes as number | null },
      startISO: start.toISOString(),
      staffId: input.staffId ?? null,
    });
    if (!pick) throw new RecurringError('That time is no longer available. Please pick another.', 409);
    staffId = pick.staffId;
  }

  const [first, ...rest] = input.customerName.trim().split(/\s+/);
  const customer = (await db`
    INSERT INTO customers (tenant_id, email, first_name, last_name, phone)
    VALUES (${tenant.id as string}, ${input.customerEmail}, ${first}, ${rest.join(' ') || null}, ${input.customerPhone ?? null})
    ON CONFLICT (tenant_id, email) DO UPDATE SET phone = COALESCE(${input.customerPhone ?? null}, customers.phone)
    RETURNING *`)[0];
  const stripeCustomerId = await getOrCreateStripeCustomer(customer as never, accountId);

  const id = randomUUID();
  const token = newManageToken();
  const currency = ((tenant.currency as string) || 'usd').toLowerCase();
  const consent = {
    version: AUTH_TERMS_VERSION,
    accepted_at: new Date().toISOString(),
    authorization_text: input.authorizationText.slice(0, 1000),
    amount_cents: amount,
    interval: 'month',
    ip: input.ip ?? null,
    user_agent: input.userAgent?.slice(0, 300) ?? null,
  };
  await db`
    INSERT INTO recurring_subscriptions (
      id, tenant_id, service_id, customer_id, customer_name, customer_email, customer_phone, service_name, kind, amount_cents, currency,
      stripe_account_id, stripe_customer_id, status, frequency, first_start, duration_minutes, staff_id, manage_token, consent
    ) VALUES (
      ${id}, ${tenant.id as string}, ${service.id as string}, ${customer.id as string}, ${input.customerName.trim()}, ${input.customerEmail}, ${input.customerPhone ?? null},
      ${service.name as string}, ${kind}, ${amount}, ${currency}, ${accountId}, ${stripeCustomerId}, 'incomplete',
      ${kind === 'appointment' ? ((service.appointment_frequency as string) ?? 'weekly') : null}, ${start ? start.toISOString() : null},
      ${kind === 'appointment' ? (service.duration_minutes as number) : null}, ${staffId}, ${token}, ${db.json(consent as never)}
    )`;

  try {
    const fee = await computePlatformFee(amount, tenant.id as string);
    const feePercent = fee > 0 ? Math.round((fee / amount) * 10000) / 100 : 0;
    // One Stripe product per service on the store's own account
    let productId = service.stripe_product_account === accountId ? (service.stripe_product_id as string | null) : null;
    if (!productId) {
      const product = await stripe.products.create({ name: (service.name as string).slice(0, 120) }, { stripeAccount: accountId });
      productId = product.id;
      await db`UPDATE services SET stripe_product_id = ${productId}, stripe_product_account = ${accountId} WHERE id = ${service.id as string}`;
    }
    const sub = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price_data: { currency, unit_amount: amount, recurring: { interval: 'month' }, product: productId } }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      ...(feePercent > 0 ? { application_fee_percent: feePercent } : {}),
      metadata: { recurring_id: id, tenant_id: tenant.id as string },
      expand: ['latest_invoice.payment_intent'],
    }, { stripeAccount: accountId });
    const invoice = sub.latest_invoice as unknown as { payment_intent?: { client_secret?: string } } | null;
    const clientSecret = invoice?.payment_intent?.client_secret;
    if (!clientSecret) throw new Error('Stripe did not return a payment to confirm');
    await db`UPDATE recurring_subscriptions SET stripe_subscription_id = ${sub.id}, updated_at = NOW() WHERE id = ${id}`;

    // Hold the first session while they pay (an unpaid hold lapses after 30 minutes like any other booking)
    if (kind === 'appointment' && start) {
      const end = new Date(start.getTime() + (service.duration_minutes as number) * 60_000);
      await db`
        INSERT INTO bookings (tenant_id, service_id, staff_id, customer_id, customer_name, customer_email, customer_phone, start_time, end_time, status, amount_cents, platform_fee_cents, recurring_id)
        VALUES (${tenant.id as string}, ${service.id as string}, ${staffId}, ${customer.id as string}, ${input.customerName.trim()}, ${input.customerEmail}, ${input.customerPhone ?? null}, ${start.toISOString()}, ${end.toISOString()}, 'awaiting_payment', 0, 0, ${id})
        ON CONFLICT DO NOTHING`;
    }
    void tz;
    return { recurringId: id, clientSecret, amountCents: amount, stripeAccountId: accountId, manageToken: token };
  } catch (err) {
    await db`DELETE FROM recurring_subscriptions WHERE id = ${id}`;
    console.error('Recurring checkout failed:', err);
    throw new RecurringError('We could not start the plan. Please try again.', 502);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function findBySubscription(subscriptionId: string | null | undefined, accountId: string): Promise<Row | null> {
  if (!subscriptionId) return null;
  const rows = await db`SELECT * FROM recurring_subscriptions WHERE stripe_subscription_id = ${subscriptionId} AND stripe_account_id = ${accountId} LIMIT 1`;
  return rows[0] ?? null;
}

async function tenantFor(tenantId: string): Promise<Row> {
  return (await db`SELECT t.*, u.email AS owner_email FROM tenants t LEFT JOIN users u ON u.clerk_user_id = t.clerk_user_id WHERE t.id = ${tenantId} LIMIT 1`)[0];
}

export const manageUrlForPlan = (tenant: Row, token: string) => `${getCustomerBaseUrl(tenant)}/manage/plan/${token}`;

function emailBase(sub: Row, tenant: Row) {
  return {
    toEmail: sub.customer_email as string,
    toName: sub.customer_name as string,
    serviceName: sub.service_name as string,
    amountCents: sub.amount_cents as number,
    companyName: tenant.company_name as string,
    manageUrl: manageUrlForPlan(tenant, sub.manage_token as string),
    tenantId: tenant.id as string,
    referenceId: sub.id as string,
  };
}

async function notifyOwner(tenant: Row, subject: string, lines: string[]) {
  if (!tenant.owner_email) return;
  await sendTenantRecurringNotice({ tenantEmail: tenant.owner_email as string, companyName: tenant.company_name as string, subject, lines })
    .catch((err) => console.error('Recurring owner notice error:', err));
}

/** Future sessions of a plan are taken off the calendar (past ones stay as history) */
export async function cancelFutureBookings(recurringId: string, from: Date): Promise<number> {
  const rows = await db`
    UPDATE bookings SET status = 'cancelled', updated_at = NOW()
    WHERE recurring_id = ${recurringId} AND start_time > ${from.toISOString()} AND status NOT IN ('cancelled', 'completed', 'no_show')
    RETURNING id`;
  return rows.length;
}

// ── Keeping recurring appointments on the calendar ──────────────────────────
/** Local wall-clock time of the first session, repeated every 7 or 14 days (DST-safe) */
export function occurrences(firstStart: Date, frequency: 'weekly' | 'biweekly', timezone: string, until: Date): Date[] {
  const stepDays = frequency === 'biweekly' ? 14 : 7;
  const firstLocalDate = formatInTimeZone(firstStart, timezone, 'yyyy-MM-dd');
  const time = formatInTimeZone(firstStart, timezone, 'HH:mm');
  const out: Date[] = [];
  for (let n = 0; n < 400; n++) {
    const day = format(addDays(parse(firstLocalDate, 'yyyy-MM-dd', new Date()), n * stepDays), 'yyyy-MM-dd');
    const at = fromZonedTime(`${day} ${time}:00`, timezone);
    if (at > until) break;
    out.push(at);
  }
  return out;
}

/** Make sure the next few weeks of a recurring-appointment plan are booked; tell the owner about any date that can't be */
export async function generateRecurringBookings(recurringId: string): Promise<{ created: number; skipped: number }> {
  const sub = (await db`SELECT * FROM recurring_subscriptions WHERE id = ${recurringId}`)[0];
  if (!sub || sub.kind !== 'appointment' || !['active', 'past_due'].includes(sub.status as string) || !sub.first_start || !sub.frequency) return { created: 0, skipped: 0 };
  const tenant = await tenantFor(sub.tenant_id as string);
  const tz = (tenant.timezone as string) || 'America/New_York';
  let until = new Date(Date.now() + HORIZON_DAYS * 86_400_000);
  if (sub.cancel_at_period_end && sub.current_period_end) {
    const end = new Date(sub.current_period_end as string);
    if (end < until) until = end;
  }
  const notified = new Set<string>((sub.skipped as string[]) ?? []);
  let created = 0;
  const newlySkipped: string[] = [];
  const minutes = sub.duration_minutes as number;
  for (const at of occurrences(new Date(sub.first_start as string), sub.frequency as 'weekly' | 'biweekly', tz, until)) {
    if (at.getTime() < Date.now()) continue;
    const iso = at.toISOString();
    const exists = await db`SELECT 1 FROM bookings WHERE recurring_id = ${recurringId} AND start_time = ${iso} LIMIT 1`;
    if (exists[0]) continue;
    const pick = await pickStaffForSlot({
      tenant: tenant as never,
      service: { id: sub.service_id as string, duration_minutes: minutes },
      startISO: iso,
      staffId: sub.staff_id as string | null,
      allowPast: true,
    });
    if (!pick) {
      if (!notified.has(iso)) newlySkipped.push(iso);
      continue;
    }
    const end = new Date(at.getTime() + minutes * 60_000);
    await db`
      INSERT INTO bookings (tenant_id, service_id, staff_id, customer_id, customer_name, customer_email, customer_phone, start_time, end_time, status, amount_cents, platform_fee_cents, recurring_id)
      VALUES (${sub.tenant_id as string}, ${sub.service_id as string}, ${pick.staffId}, ${sub.customer_id as string | null}, ${sub.customer_name as string}, ${sub.customer_email as string}, ${sub.customer_phone as string | null}, ${iso}, ${end.toISOString()}, 'confirmed', 0, 0, ${recurringId})
      ON CONFLICT DO NOTHING`;
    created++;
  }
  if (newlySkipped.length) {
    await db`UPDATE recurring_subscriptions SET skipped = ${db.json([...notified, ...newlySkipped] as never)} WHERE id = ${recurringId}`;
    const when = newlySkipped.map((d) => formatInTimeZone(new Date(d), tz, 'EEE MMM d, h:mm a')).join('; ');
    await notifyOwner(tenant, `Could not book ${sub.customer_name as string}'s recurring session`, [
      `${sub.customer_name as string} has a ${sub.frequency === 'biweekly' ? 'every-2-weeks' : 'weekly'} plan for ${sub.service_name as string}, but these times are no longer open on your calendar: ${when}.`,
      'Those sessions were not booked. Please contact the customer to arrange another time.',
    ]);
  }
  return { created, skipped: newlySkipped.length };
}

export async function generateAllRecurringBookings(): Promise<void> {
  const subs = await db`SELECT id FROM recurring_subscriptions WHERE kind = 'appointment' AND status IN ('active', 'past_due')`;
  for (const s of subs) {
    try { await generateRecurringBookings(s.id as string); } catch (err) { console.error('Recurring bookings failed for', s.id, err); }
  }
}

// ── Stripe events (all idempotent: Stripe may send an event more than once) ──
interface InvoiceLike {
  id: string;
  subscription?: string | null;
  payment_intent?: string | null;
  amount_paid?: number;
  attempt_count?: number;
  billing_reason?: string;
  hosted_invoice_url?: string | null;
  lines?: { data?: { period?: { end?: number } }[] };
}

export async function handleInvoicePaid(invoice: InvoiceLike, accountId: string): Promise<'applied' | 'duplicate' | 'ignored'> {
  const sub = await findBySubscription(invoice.subscription, accountId);
  if (!sub) return 'ignored';
  const tenant = await tenantFor(sub.tenant_id as string);
  const amount = invoice.amount_paid ?? 0;
  const periodEnd = invoice.lines?.data?.[0]?.period?.end ? new Date(invoice.lines.data[0].period!.end! * 1000).toISOString() : null;

  if (amount > 0 && invoice.payment_intent) {
    const fee = await computePlatformFee(amount, sub.tenant_id as string);
    const stripeFee = Math.round(amount * 0.029) + 30;
    const ins = await db`
      INSERT INTO platform_transactions (tenant_id, reference_id, reference_type, gross_amount_cents, platform_fee_cents, stripe_fee_cents, net_to_tenant_cents, stripe_transfer_id)
      VALUES (${sub.tenant_id as string}, ${sub.id as string}, 'subscription', ${amount}, ${fee}, ${stripeFee}, ${amount - fee - stripeFee}, ${invoice.payment_intent})
      ON CONFLICT (stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL DO NOTHING
      RETURNING id`;
    if (!ins[0]) return 'duplicate';
  }

  await db`
    UPDATE recurring_subscriptions
    SET status = 'active', failed_attempts = 0, current_period_end = COALESCE(${periodEnd}, current_period_end), updated_at = NOW()
    WHERE id = ${sub.id as string} AND status <> 'canceled'`;

  const first = invoice.billing_reason === 'subscription_create';
  if (sub.kind === 'appointment') {
    // The first session was held while they paid: it is theirs now
    await db`UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE recurring_id = ${sub.id as string} AND status = 'awaiting_payment'`;
    await generateRecurringBookings(sub.id as string);
  }
  const base = emailBase(sub, tenant);
  if (first) {
    let appointmentLine: string | undefined;
    if (sub.kind === 'appointment' && sub.first_start) {
      const tz = (tenant.timezone as string) || 'America/New_York';
      appointmentLine = `Your first session is ${formatInTimeZone(new Date(sub.first_start as string), tz, "EEEE, MMM d 'at' h:mm a")}, and it repeats ${sub.frequency === 'biweekly' ? 'every 2 weeks' : 'every week'} at the same time.`;
    }
    await sendRecurringStarted({ ...base, appointmentLine }).catch((err) => console.error('Recurring started email error:', err));
    await notifyOwner(tenant, `New monthly plan: ${sub.customer_name as string}`, [`${sub.customer_name as string} (${sub.customer_email as string}) started "${sub.service_name as string}" at $${((sub.amount_cents as number) / 100).toFixed(2)} per month.`]);
  } else {
    await sendRecurringRenewed(base).catch((err) => console.error('Recurring renewal email error:', err));
  }
  return 'applied';
}

export async function handleInvoiceFailed(invoice: InvoiceLike, accountId: string): Promise<void> {
  const sub = await findBySubscription(invoice.subscription, accountId);
  if (!sub || invoice.billing_reason === 'subscription_create') return; // trouble at sign-up is shown to the customer in the payment form
  if (sub.status === 'canceled') return;
  const attempt = invoice.attempt_count ?? 1;
  const tenant = await tenantFor(sub.tenant_id as string);
  const prior = sub.failed_attempts as number;
  if (attempt <= prior) return; // the same failure delivered twice
  await db`UPDATE recurring_subscriptions SET status = 'past_due', failed_attempts = ${attempt}, updated_at = NOW() WHERE id = ${sub.id as string}`;
  const base = emailBase(sub, tenant);

  if (attempt >= MAX_PAYMENT_ATTEMPTS) {
    try { await stripeOps.cancelNow(sub.stripe_subscription_id as string, accountId); } catch (err) { console.error('Could not cancel subscription after failed payments:', err); }
    await endPlan(sub.id as string, 'payment_failed');
    await sendRecurringEnded({ ...base, reason: 'payment_failed' }).catch((err) => console.error('Recurring ended email error:', err));
    await notifyOwner(tenant, `Plan ended: ${sub.customer_name as string}`, [`${sub.customer_name as string}'s plan for "${sub.service_name as string}" ended after ${MAX_PAYMENT_ATTEMPTS} failed payments.`]);
  } else {
    await sendRecurringPaymentFailed({ ...base, attempt, maxAttempts: MAX_PAYMENT_ATTEMPTS, payUrl: invoice.hosted_invoice_url ?? null }).catch((err) => console.error('Recurring failed email error:', err));
  }
}

async function endPlan(id: string, reason: string) {
  await db`UPDATE recurring_subscriptions SET status = 'canceled', canceled_at = COALESCE(canceled_at, NOW()), ended_reason = COALESCE(ended_reason, ${reason}), updated_at = NOW() WHERE id = ${id}`;
  await cancelFutureBookings(id, new Date());
}

interface SubscriptionLike { id: string; status: string; cancel_at_period_end?: boolean; current_period_end?: number }

export async function handleSubscriptionChanged(sub: SubscriptionLike, accountId: string, deleted: boolean): Promise<void> {
  const row = await findBySubscription(sub.id, accountId);
  if (!row) return;
  const tenant = await tenantFor(row.tenant_id as string);
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
  await db`UPDATE recurring_subscriptions SET cancel_at_period_end = ${!!sub.cancel_at_period_end}, current_period_end = COALESCE(${periodEnd}, current_period_end), updated_at = NOW() WHERE id = ${row.id as string} AND status <> 'canceled'`;

  if (sub.status === 'incomplete_expired') {
    // Never paid: just clear it away
    await db`UPDATE recurring_subscriptions SET status = 'canceled', ended_reason = 'abandoned', canceled_at = NOW() WHERE id = ${row.id as string} AND status = 'incomplete'`;
    await db`UPDATE bookings SET status = 'cancelled' WHERE recurring_id = ${row.id as string} AND status = 'awaiting_payment'`;
    return;
  }
  if (deleted || sub.status === 'canceled') {
    if (row.status === 'canceled') return; // already handled (for example after repeated failed payments)
    await endPlan(row.id as string, row.cancel_at_period_end ? 'canceled' : 'canceled');
    await sendRecurringEnded({ ...emailBase(row, tenant), reason: 'canceled' }).catch((err) => console.error('Recurring ended email error:', err));
    return;
  }
  if (sub.status === 'active' && row.status === 'past_due') {
    await db`UPDATE recurring_subscriptions SET status = 'active' WHERE id = ${row.id as string}`;
  }
}

// ── Safety net: ask Stripe whether a plan's first payment went through (in case the webhook was missed) ──
export async function confirmRecurringPayment(recurringId: string): Promise<'active' | 'pending' | 'unknown'> {
  const sub = (await db`SELECT * FROM recurring_subscriptions WHERE id = ${recurringId}`)[0];
  if (!sub || !sub.stripe_subscription_id) return 'unknown';
  if (sub.status === 'active') return 'active';
  try {
    const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id as string, { expand: ['latest_invoice'] }, { stripeAccount: sub.stripe_account_id as string });
    const inv = s.latest_invoice as unknown as { status?: string; payment_intent?: string | { id: string } | null; [k: string]: unknown } | null;
    if (inv && inv.status === 'paid') {
      const rawPi = inv.payment_intent;
      const pi = rawPi && typeof rawPi === 'object' ? rawPi.id : (rawPi ?? null);
      await handleInvoicePaid({ ...inv, subscription: s.id, payment_intent: pi, billing_reason: 'subscription_create', lines: { data: [{ period: { end: s.current_period_end } }] } } as InvoiceLike, sub.stripe_account_id as string);
      return 'active';
    }
    return 'pending';
  } catch (err) {
    console.error('confirmRecurringPayment failed:', err);
    return 'unknown';
  }
}

/** Plans still waiting on their first payment: check them with Stripe */
export async function confirmPendingPlans(): Promise<void> {
  const rows = await db`SELECT id FROM recurring_subscriptions WHERE status = 'incomplete' AND stripe_subscription_id IS NOT NULL AND created_at < NOW() - INTERVAL '3 minutes' AND created_at > NOW() - INTERVAL '2 days' LIMIT 100`;
  for (const r of rows) await confirmRecurringPayment(r.id as string);
}

// ── Updating the card on a plan ─────────────────────────────────────────────
export async function getPlanCard(planId: string): Promise<{ brand: string; last4: string } | null> {
  const sub = (await db`SELECT stripe_subscription_id, stripe_account_id FROM recurring_subscriptions WHERE id = ${planId}`)[0];
  if (!sub?.stripe_subscription_id) return null;
  try {
    const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id as string, { expand: ['default_payment_method'] }, { stripeAccount: sub.stripe_account_id as string });
    const pm = s.default_payment_method as { card?: { brand: string; last4: string } } | null;
    return pm?.card ? { brand: pm.card.brand, last4: pm.card.last4 } : null;
  } catch {
    return null;
  }
}

/** A Stripe SetupIntent the customer's browser uses to save a new card on their own plan */
export async function createCardSetup(planId: string): Promise<{ clientSecret: string; stripeAccountId: string }> {
  const sub = (await db`SELECT * FROM recurring_subscriptions WHERE id = ${planId}`)[0];
  if (!sub || sub.status === 'canceled' || !sub.stripe_customer_id) throw new RecurringError('This plan can no longer be changed.', 409);
  const si = await stripe.setupIntents.create(
    { customer: sub.stripe_customer_id as string, usage: 'off_session', payment_method_types: ['card'], metadata: { recurring_id: planId } },
    { stripeAccount: sub.stripe_account_id as string },
  );
  if (!si.client_secret) throw new RecurringError('We could not start the card update.', 502);
  return { clientSecret: si.client_secret, stripeAccountId: sub.stripe_account_id as string };
}

/** The new card was saved: make it the plan's card, and if a payment is overdue try it right now */
export async function applyNewCard(planId: string, setupIntentId: string): Promise<{ status: 'updated' | 'paid' | 'declined'; message?: string }> {
  const sub = (await db`SELECT * FROM recurring_subscriptions WHERE id = ${planId}`)[0];
  if (!sub || sub.status === 'canceled') throw new RecurringError('This plan can no longer be changed.', 409);
  const account = sub.stripe_account_id as string;
  const si = await stripe.setupIntents.retrieve(setupIntentId, {}, { stripeAccount: account });
  // The card must really have been saved for THIS customer
  if (si.status !== 'succeeded' || si.customer !== sub.stripe_customer_id || si.metadata?.recurring_id !== planId || !si.payment_method) {
    throw new RecurringError('We could not confirm the new card. Please try again.', 400);
  }
  const pm = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method.id;
  await stripe.subscriptions.update(sub.stripe_subscription_id as string, { default_payment_method: pm }, { stripeAccount: account });
  await stripe.customers.update(sub.stripe_customer_id as string, { invoice_settings: { default_payment_method: pm } }, { stripeAccount: account });

  if (sub.status === 'past_due') {
    const open = await stripe.invoices.list({ subscription: sub.stripe_subscription_id as string, status: 'open', limit: 1 }, { stripeAccount: account });
    const inv = open.data[0];
    if (inv) {
      try {
        const paid = await stripe.invoices.pay(inv.id, { payment_method: pm }, { stripeAccount: account });
        if (paid.status === 'paid') {
          const rawPi = paid.payment_intent;
          await handleInvoicePaid({
            id: paid.id, subscription: sub.stripe_subscription_id as string, payment_intent: rawPi && typeof rawPi === 'object' ? rawPi.id : (rawPi as string | null),
            amount_paid: paid.amount_paid, billing_reason: 'subscription_cycle', lines: { data: [{ period: { end: paid.lines.data[0]?.period?.end } }] },
          } as InvoiceLike, account);
          return { status: 'paid' };
        }
      } catch (err) {
        return { status: 'declined', message: err instanceof Error ? err.message : 'The new card was declined.' };
      }
    }
  }
  return { status: 'updated' };
}

// ── Cancelling (customer or owner) ──────────────────────────────────────────
export async function cancelRecurring(id: string, opts: { immediately: boolean; by: 'customer' | 'owner' }): Promise<{ endsOn: string | null }> {
  const sub = (await db`SELECT * FROM recurring_subscriptions WHERE id = ${id}`)[0];
  if (!sub || sub.status === 'canceled') throw new RecurringError('This plan is already cancelled.', 409);
  const tenant = await tenantFor(sub.tenant_id as string);
  const account = sub.stripe_account_id as string;
  const tz = (tenant.timezone as string) || 'America/New_York';

  if (opts.immediately || !sub.current_period_end || sub.status === 'incomplete') {
    if (sub.stripe_subscription_id) await stripeOps.cancelNow(sub.stripe_subscription_id as string, account);
    await endPlan(id, opts.by === 'owner' ? 'canceled_by_store' : 'canceled');
    await sendRecurringEnded({ ...emailBase(sub, tenant), reason: 'canceled' }).catch((err) => console.error('Recurring ended email error:', err));
    return { endsOn: null };
  }
  await stripeOps.cancelAtPeriodEnd(sub.stripe_subscription_id as string, account);
  await db`UPDATE recurring_subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() WHERE id = ${id}`;
  // Sessions after the paid period are taken off now
  await cancelFutureBookings(id, new Date(sub.current_period_end as string));
  const endsOn = formatInTimeZone(new Date(sub.current_period_end as string), tz, 'MMMM d, yyyy');
  await sendRecurringEnded({ ...emailBase(sub, tenant), reason: 'canceled', endsOn }).catch((err) => console.error('Recurring ended email error:', err));
  if (opts.by === 'customer') await notifyOwner(tenant, `Plan cancelled: ${sub.customer_name as string}`, [`${sub.customer_name as string} cancelled "${sub.service_name as string}". It ends on ${endsOn}.`]);
  return { endsOn };
}
