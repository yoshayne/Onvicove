import { db } from '../db/client';

export type PaidPlan = 'pro' | 'business';

// Statuses in which the customer is entitled to the paid plan. past_due keeps access while Stripe retries the card.
export const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);
// Statuses in which the subscription is over for good.
export const ENDED_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired']);

export const PREMIUM_THEMES = new Set(['obsidian', 'aurora', 'magazine', 'brutalist', 'neon-tokyo', 'craft']);

export function priceIdFor(plan: PaidPlan): string | undefined {
  return plan === 'pro' ? process.env.STRIPE_PRICE_PRO_MONTHLY : process.env.STRIPE_PRICE_BUSINESS_MONTHLY;
}

export function planForPrice(priceId: string | undefined | null): PaidPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY) return 'business';
  return null;
}

export interface StripeSubscriptionLike {
  id: string;
  status: string;
  customer: string | { id: string };
  items: { data: { price: { id: string } }[] };
  current_period_end: number;
  cancel_at_period_end: boolean;
}

/**
 * Makes the tenant's plan match what Stripe says. The plan only changes when the subscription is paid
 * (or Stripe is still retrying it) — never because a subscription was merely created — and an ended
 * subscription drops the tenant back to Starter. Events for a subscription that is no longer the
 * tenant's current one are ignored so a stale event can't undo a newer upgrade.
 */
export async function applySubscription(sub: StripeSubscriptionLike): Promise<{ plan: string | null; status: string }> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const status = sub.status;
  const priceId = sub.items.data[0]?.price?.id;
  const plan = planForPrice(priceId);
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  const rows = await db`SELECT id, plan, stripe_subscription_id FROM tenants WHERE stripe_customer_id = ${customerId} LIMIT 1`;
  const tenant = rows[0];
  if (!tenant) return { plan: null, status };

  const currentSubId = tenant.stripe_subscription_id as string | null;
  if (currentSubId && currentSubId !== sub.id) return { plan: tenant.plan as string, status }; // stale subscription

  if (ENDED_STATUSES.has(status)) {
    await db`
      UPDATE tenants
      SET plan = 'starter', plan_expires_at = NULL, stripe_subscription_id = NULL,
          stripe_subscription_status = ${status === 'incomplete_expired' ? 'none' : status}, updated_at = NOW()
      WHERE id = ${tenant.id}
    `;
    return { plan: 'starter', status };
  }

  if (ENTITLED_STATUSES.has(status) && plan) {
    const display = sub.cancel_at_period_end && status === 'active' ? 'canceling' : status;
    await db`
      UPDATE tenants
      SET plan = ${plan}, stripe_subscription_id = ${sub.id}, stripe_subscription_status = ${display},
          plan_expires_at = ${periodEnd}, updated_at = NOW()
      WHERE id = ${tenant.id}
    `;
    return { plan, status: display };
  }

  // incomplete (payment not made yet) or an unknown price: remember the subscription, leave the plan alone
  await db`
    UPDATE tenants SET stripe_subscription_id = ${sub.id}, stripe_subscription_status = ${status}, updated_at = NOW()
    WHERE id = ${tenant.id}
  `;
  return { plan: tenant.plan as string, status };
}
