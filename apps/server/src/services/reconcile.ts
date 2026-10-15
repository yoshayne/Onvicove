import { db } from '../db/client';
import { stripe } from './stripe';
import { applySucceededPayment, type SucceededPayment } from './paymentSucceeded';

/** Ask Stripe about one payment (on the store's own account first; older payments live on the platform). */
async function fetchPayment(paymentIntentId: string, accountId: string | null) {
  if (accountId) {
    try {
      return { pi: await stripe.paymentIntents.retrieve(paymentIntentId, undefined, { stripeAccount: accountId }), account: accountId as string | undefined };
    } catch (err) {
      if ((err as { code?: string }).code !== 'resource_missing') throw err;
    }
  }
  try {
    return { pi: await stripe.paymentIntents.retrieve(paymentIntentId), account: undefined as string | undefined };
  } catch (err) {
    if ((err as { code?: string }).code === 'resource_missing') return null;
    throw err;
  }
}

/** If Stripe says this payment succeeded, make our records agree. Returns true when something was fixed. */
export async function settleIfPaid(paymentIntentId: string, accountId: string | null): Promise<boolean> {
  const found = await fetchPayment(paymentIntentId, accountId);
  if (!found || found.pi.status !== 'succeeded') return false;
  const { pi, account } = found;
  const payment: SucceededPayment = {
    id: pi.id,
    amount: pi.amount_received || pi.amount,
    customer: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null,
    payment_method: typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id ?? null,
    metadata: (pi.metadata ?? {}) as Record<string, string>,
  };
  return (await applySucceededPayment(payment, account)) === 'applied';
}

/**
 * Safety net for payments Stripe's webhook didn't deliver (or we couldn't process): look at every booking still
 * "awaiting payment" and every order still "pending" that has a payment on file, ask Stripe, and settle the ones
 * that were actually paid. Limited to one store, or all of them (the background job).
 */
export async function reconcilePayments(opts: { tenantId?: string; days?: number } = {}): Promise<number> {
  const days = opts.days ?? 30;
  const tenantFilter = opts.tenantId ?? null;
  const bookings = await db`
    SELECT b.stripe_payment_intent_id AS pi, t.stripe_account_id AS account
    FROM bookings b JOIN tenants t ON t.id = b.tenant_id
    WHERE b.status = 'awaiting_payment' AND b.stripe_payment_intent_id IS NOT NULL
      AND b.created_at > NOW() - (${days} || ' days')::interval
      AND (${tenantFilter}::uuid IS NULL OR b.tenant_id = ${tenantFilter}::uuid)
    ORDER BY b.created_at DESC LIMIT 100
  `;
  const orders = await db`
    SELECT o.stripe_payment_intent_id AS pi, t.stripe_account_id AS account
    FROM orders o JOIN tenants t ON t.id = o.tenant_id
    WHERE o.status = 'pending' AND o.stripe_payment_intent_id IS NOT NULL
      AND o.created_at > NOW() - (${days} || ' days')::interval
      AND (${tenantFilter}::uuid IS NULL OR o.tenant_id = ${tenantFilter}::uuid)
    ORDER BY o.created_at DESC LIMIT 100
  `;
  let fixed = 0;
  for (const row of [...bookings, ...orders]) {
    try {
      if (await settleIfPaid(row.pi as string, (row.account as string | null) ?? null)) fixed++;
    } catch (err) {
      console.warn(`Payment check failed for ${row.pi}:`, err instanceof Error ? err.message : err);
    }
  }
  if (fixed > 0) console.log(`[reconcile] settled ${fixed} payment(s) the webhook had not applied`);
  return fixed;
}
