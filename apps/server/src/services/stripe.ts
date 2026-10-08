import Stripe from 'stripe';
import { db } from '../db/client';
import { feeForPlan, getPlatformSettings } from './settings';
import { CHARGE_MODEL } from './chargeModel';

let _stripe: Stripe | undefined;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  return _stripe;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

/** Platform fee on a payment, based on the paying store's current plan (e.g. Business pays less). */
export async function computePlatformFee(totalCents: number, tenantId: string): Promise<number> {
  const [settings, rows] = await Promise.all([
    getPlatformSettings(),
    db`SELECT plan FROM tenants WHERE id = ${tenantId} LIMIT 1`,
  ]);
  const { percent, fixedCents } = feeForPlan(settings, (rows[0]?.plan as string) ?? 'starter');
  return Math.round(totalCents * percent) + fixedCents;
}

interface CreateBookingIntentArgs {
  amountCents: number;
  currency: string;
  stripeAccountId: string;
  tenantId: string;
  bookingId: string;
  referenceType: 'booking' | 'booking_balance';
  stripeCustomerId?: string | null;
  paymentMethodId?: string | null;
  offSession?: boolean;
}

/** Letters/numbers/spaces only, at most 22 chars, must contain a letter (Stripe statement descriptor rules). */
export function toStatementDescriptor(name: string): string | null {
  const cleaned = name.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[<>\\'"*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 22).trim();
  return /[A-Za-z]/.test(cleaned) && cleaned.length >= 5 ? cleaned : null;
}

/**
 * Make the connected account's public details match the store, so customers see "Booghati Visuals"
 * (not the owner's personal name) on payment screens and bank/card statements. Only fills in what's
 * missing, once per store; best effort — a failure never blocks a payment.
 */
export async function ensureConnectedProfile(tenantId: string, accountId: string): Promise<void> {
  try {
    const rows = await db`SELECT company_name, slug, stripe_profile_synced_at FROM tenants WHERE id = ${tenantId} LIMIT 1`;
    const tenant = rows[0];
    if (!tenant || tenant.stripe_profile_synced_at) return;

    const account = await stripe.accounts.retrieve(accountId);
    const update: Stripe.AccountUpdateParams = {};
    if (!account.business_profile?.name && tenant.company_name) {
      update.business_profile = { ...(update.business_profile ?? {}), name: tenant.company_name as string };
    }
    if (!account.business_profile?.url && tenant.slug) {
      update.business_profile = { ...(update.business_profile ?? {}), url: `${(process.env.CLIENT_URL || 'https://shopsuitedirect.com').replace(/\/+$/, '')}/${tenant.slug}` };
    }
    const descriptor = toStatementDescriptor((tenant.company_name as string) ?? '');
    if (descriptor && !account.settings?.payments?.statement_descriptor) {
      update.settings = { payments: { statement_descriptor: descriptor } };
    }
    if (Object.keys(update).length > 0) await stripe.accounts.update(accountId, update);
    await db`UPDATE tenants SET stripe_profile_synced_at = NOW() WHERE id = ${tenantId}`;
  } catch (err) {
    console.warn(`Could not sync Stripe profile for ${accountId}:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Create the PaymentIntent for a store's sale.
 *
 * direct (default): the charge is created ON the store's own Stripe account, so the store is the merchant —
 * customers see its name on the payment screen and statement — and our fee is `application_fee_amount`.
 * destination (STRIPE_CHARGE_MODEL=destination, rollback): charge on the platform and pay the store out.
 */
export async function createStorePaymentIntent(params: Stripe.PaymentIntentCreateParams, accountId: string) {
  if (CHARGE_MODEL === 'direct') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { transfer_data: _t, on_behalf_of: _o, ...direct } = params;
    return stripe.paymentIntents.create(
      { ...direct, metadata: { ...direct.metadata, charge_model: 'direct' } },
      { stripeAccount: accountId },
    );
  }
  if (process.env.STRIPE_ON_BEHALF_OF === 'false') return stripe.paymentIntents.create(params);
  try {
    return await stripe.paymentIntents.create({ ...params, on_behalf_of: accountId });
  } catch (err) {
    const e = err as { type?: string; message?: string };
    if (e.type === 'StripeCardError') throw err;
    console.warn(`PaymentIntent with on_behalf_of failed for ${accountId} (${e.type}: ${e.message}); retrying as a platform charge`);
    return stripe.paymentIntents.create(params);
  }
}

interface StripeIdsRow {
  stripe_customer_id?: string | null;
  stripe_payment_method_id?: string | null;
  /** Which Stripe account holds the customer / saved card. NULL = the platform (everything saved before direct charges). */
  stripe_account_id?: string | null;
}

/** The account a customer record must live on for payments to `accountId`. */
export function stripeHolderFor(accountId: string): string | null {
  return CHARGE_MODEL === 'direct' ? accountId : null;
}

/** Customer / saved-card ids that are valid for payments to `accountId` (ids from another account can't be used). */
export function usableStripeIds(row: StripeIdsRow, accountId: string) {
  const same = (row.stripe_account_id ?? null) === stripeHolderFor(accountId);
  return {
    customerId: same ? row.stripe_customer_id ?? null : null,
    paymentMethodId: same ? row.stripe_payment_method_id ?? null : null,
  };
}

/** Refund a store's payment, whichever way it was charged (older payments live on the platform, newer ones on the store). */
export async function refundStorePayment(paymentIntentId: string, accountId: string | null) {
  const onPlatform = await stripe.paymentIntents.retrieve(paymentIntentId).catch(() => null);
  if (onPlatform) {
    return stripe.refunds.create({ payment_intent: paymentIntentId, reverse_transfer: true, refund_application_fee: true });
  }
  if (!accountId) throw new Error('No connected Stripe account for this payment');
  return stripe.refunds.create({ payment_intent: paymentIntentId, refund_application_fee: true }, { stripeAccount: accountId });
}

export async function createBookingPaymentIntent(args: CreateBookingIntentArgs) {
  const platformFee = await computePlatformFee(args.amountCents, args.tenantId);
  await ensureConnectedProfile(args.tenantId, args.stripeAccountId);

  const params: Stripe.PaymentIntentCreateParams = {
    amount: args.amountCents,
    currency: args.currency.toLowerCase() || 'usd',
    application_fee_amount: platformFee,
    automatic_payment_methods: { enabled: true },
    transfer_data: { destination: args.stripeAccountId },
    metadata: {
      reference_type: args.referenceType,
      reference_id: args.bookingId,
      tenant_id: args.tenantId,
    },
  };

  if (args.stripeCustomerId) {
    params.customer = args.stripeCustomerId;
  }
  if (args.paymentMethodId) {
    params.payment_method = args.paymentMethodId;
    params.off_session = true;
    params.confirm = true;
  } else if (args.stripeCustomerId) {
    // Only cards can be saved for later; setting it on the whole intent made Cash App, Klarna etc. ask for
    // "future payments" authorisation (and reject the payment without a return_url).
    params.payment_method_options = { card: { setup_future_usage: 'off_session' } };
  }

  return createStorePaymentIntent(params, args.stripeAccountId);
}

export async function getOrCreateStripeCustomer(
  customer: { id: string; email: string; stripe_customer_id: string | null; stripe_account_id?: string | null; first_name?: string | null; last_name?: string | null },
  accountId: string,
): Promise<string> {
  const existing = usableStripeIds(customer, accountId).customerId;
  if (existing) return existing;

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || undefined;
  const holder = stripeHolderFor(accountId);
  const sc = await stripe.customers.create({ email: customer.email, name }, holder ? { stripeAccount: holder } : undefined);
  // The old customer/card (if any) belongs to another account and can't be used here
  await db`
    UPDATE customers
    SET stripe_customer_id = ${sc.id}, stripe_account_id = ${holder}, stripe_payment_method_id = NULL,
        card_brand = NULL, card_last4 = NULL, updated_at = NOW()
    WHERE id = ${customer.id}
  `;
  return sc.id;
}
