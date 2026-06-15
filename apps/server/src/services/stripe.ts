import Stripe from 'stripe';

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

const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '0.049');
const PLATFORM_FEE_FIXED_CENTS = parseInt(process.env.PLATFORM_FEE_FIXED_CENTS || '30');

export function computePlatformFee(totalCents: number): number {
  return Math.round(totalCents * PLATFORM_FEE_PERCENT) + PLATFORM_FEE_FIXED_CENTS;
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

export async function createBookingPaymentIntent(args: CreateBookingIntentArgs) {
  const platformFee = computePlatformFee(args.amountCents);

  const params: Stripe.PaymentIntentCreateParams = {
    amount: args.amountCents,
    currency: args.currency.toLowerCase() || 'usd',
    application_fee_amount: platformFee,
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
    params.setup_future_usage = 'off_session';
  }

  return stripe.paymentIntents.create(params);
}

export async function getOrCreateStripeCustomer(
  customer: { id: string; email: string; stripe_customer_id: string | null; first_name?: string | null; last_name?: string | null }
): Promise<string> {
  if (customer.stripe_customer_id) return customer.stripe_customer_id;

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || undefined;
  const sc = await stripe.customers.create({ email: customer.email, name });
  return sc.id;
}

