/**
 * How store payments are charged on Stripe:
 *  - 'direct'      the STORE is the merchant (charge lives on its connected account). Customers see the store's
 *                  name; the store pays Stripe's processing fee; the platform takes a small application fee on top.
 *  - 'destination' the PLATFORM is the merchant and pays the store out (the original setup; the platform pays
 *                  Stripe's fee out of a larger platform fee). Kept as an instant rollback: STRIPE_CHARGE_MODEL=destination.
 */
export type ChargeModel = 'direct' | 'destination';

export const CHARGE_MODEL: ChargeModel = process.env.STRIPE_CHARGE_MODEL === 'destination' ? 'destination' : 'direct';

/** What Stripe charges for a card payment (US). Used for estimates and the fee shown to stores. */
export const STRIPE_CARD_FEE = { percent: 0.029, fixedCents: 30 };
