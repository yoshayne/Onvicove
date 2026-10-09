import { db } from '../db/client';
import { stripe } from './stripe';

/** Writes the real Stripe state (can take card payments + details submitted) onto the tenant. */
export async function recordAccountState(accountId: string, account: { charges_enabled?: boolean; details_submitted?: boolean }) {
  const ready = !!account.charges_enabled && !!account.details_submitted;
  await db`UPDATE tenants SET stripe_onboarded = ${ready}, updated_at = NOW() WHERE stripe_account_id = ${accountId} AND stripe_onboarded IS DISTINCT FROM ${ready}`;
  return ready;
}

const checkedAt = new Map<string, number>();
const TTL_MS = 5 * 60 * 1000;

/**
 * Admin views show each store's Stripe status. The stored flag only changed when an owner opened their Payouts page,
 * so it went stale (e.g. "connected" while Stripe says payments are paused). Re-read it from Stripe, at most every
 * 5 minutes per account. Read-only toward Stripe; best effort.
 */
export async function refreshStripeStatuses(limit = 25): Promise<void> {
  const rows = await db`SELECT stripe_account_id FROM tenants WHERE stripe_account_id IS NOT NULL ORDER BY updated_at DESC LIMIT ${limit}`;
  const now = Date.now();
  const due = rows.map((r) => r.stripe_account_id as string).filter((id) => now - (checkedAt.get(id) ?? 0) > TTL_MS);
  await Promise.all(
    due.map(async (id) => {
      try {
        const acct = await stripe.accounts.retrieve(id);
        await recordAccountState(id, acct);
        checkedAt.set(id, now);
      } catch (err) {
        console.warn(`Could not refresh Stripe status for ${id}:`, err instanceof Error ? err.message : err);
      }
    }),
  );
}
