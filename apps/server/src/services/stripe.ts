import Stripe from 'stripe';
import { db } from '../db/client';
import { feeForPlan, getPlatformSettings } from './settings';

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
 * Create a PaymentIntent that pays out to a store's connected account. `on_behalf_of` makes the store the
 * business customers see (name on the payment screen and statement). If Stripe rejects that for an account
 * (e.g. a missing capability) we fall back to charging as the platform rather than failing the payment.
 */
export async function createStorePaymentIntent(params: Stripe.PaymentIntentCreateParams, accountId: string) {
  try {
    return await stripe.paymentIntents.create({ ...params, on_behalf_of: accountId });
  } catch (err) {
    const e = err as { type?: string; message?: string };
    if (e.type === 'StripeInvalidRequestError' && /on_behalf_of|capabilit/i.test(e.message ?? '')) {
      console.warn(`on_behalf_of rejected for ${accountId}, charging as the platform:`, e.message);
      return stripe.paymentIntents.create(params);
    }
    throw err;
  }
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
  customer: { id: string; email: string; stripe_customer_id: string | null; first_name?: string | null; last_name?: string | null }
): Promise<string> {
  if (customer.stripe_customer_id) return customer.stripe_customer_id;

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || undefined;
  const sc = await stripe.customers.create({ email: customer.email, name });
  return sc.id;
}

