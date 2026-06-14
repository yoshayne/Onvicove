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
