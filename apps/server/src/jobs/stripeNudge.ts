import cron from 'node-cron';
import { getBaseUrl } from '../lib/baseUrl';
import { db } from '../db/client';
import { sendStripeNudge, sendStripeReminder } from '../services/email';
import { stripe } from '../services/stripe';
import { summarizeAccount } from '../services/stripeRequirements';

/** What to tell this owner: nothing started yet, or the specific items Stripe still needs (null = don't nag). */
async function nudgeContext(accountId: string | null): Promise<{ started: boolean; missing: string[] } | null> {
  if (!accountId) return { started: false, missing: [] };
  try {
    const summary = summarizeAccount(await stripe.accounts.retrieve(accountId));
    // Stripe is checking their details or reviewing the account: an email asking them to do more would just confuse
    if (summary.status === 'verifying' || summary.status === 'under_review' || summary.ready) return null;
    return { started: true, missing: summary.items.map((i) => i.label) };
  } catch {
    return { started: true, missing: [] };
  }
}

const DASHBOARD_URL = `${getBaseUrl()}/dashboard/payouts`;

async function runStripeNudges() {
  // 24-hour nudge: wizard complete, not onboarded, no nudge sent yet, account older than 24h
  const firstNudge = await db`
    SELECT t.id, t.company_name, t.stripe_account_id, u.email, u.first_name, u.last_name
    FROM tenants t
    JOIN users u ON u.clerk_user_id = t.clerk_user_id
    WHERE t.wizard_completed = TRUE
      AND t.stripe_onboarded = FALSE
      AND t.stripe_nudge_sent_at IS NULL
      AND t.created_at <= NOW() - INTERVAL '24 hours'
  `;

  for (const row of firstNudge) {
    try {
      const ctx = await nudgeContext(row.stripe_account_id as string | null);
      if (!ctx) {
        await db`UPDATE tenants SET stripe_nudge_sent_at = NOW() WHERE id = ${row.id}`;
        continue;
      }
      await sendStripeNudge({
        ...ctx,
        toEmail: row.email as string,
        toName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || (row.email as string),
        companyName: row.company_name as string,
        connectUrl: DASHBOARD_URL,
      });
      await db`UPDATE tenants SET stripe_nudge_sent_at = NOW() WHERE id = ${row.id}`;
    } catch (err) {
      console.error(`Stripe nudge failed for tenant ${row.id}:`, err);
    }
  }

  // 3-day reminder: first nudge sent, still not onboarded, no reminder sent yet
  const reminder = await db`
    SELECT t.id, t.company_name, t.stripe_account_id, u.email, u.first_name, u.last_name
    FROM tenants t
    JOIN users u ON u.clerk_user_id = t.clerk_user_id
    WHERE t.wizard_completed = TRUE
      AND t.stripe_onboarded = FALSE
      AND t.stripe_nudge_sent_at IS NOT NULL
      AND t.stripe_reminder_sent_at IS NULL
      AND t.created_at <= NOW() - INTERVAL '3 days'
  `;

  for (const row of reminder) {
    try {
      const ctx = await nudgeContext(row.stripe_account_id as string | null);
      if (!ctx) {
        await db`UPDATE tenants SET stripe_reminder_sent_at = NOW() WHERE id = ${row.id}`;
        continue;
      }
      await sendStripeReminder({
        ...ctx,
        toEmail: row.email as string,
        toName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || (row.email as string),
        companyName: row.company_name as string,
        connectUrl: DASHBOARD_URL,
      });
      await db`UPDATE tenants SET stripe_reminder_sent_at = NOW() WHERE id = ${row.id}`;
    } catch (err) {
      console.error(`Stripe reminder failed for tenant ${row.id}:`, err);
    }
  }
}

export function startStripeNudgeJob() {
  // Runs every hour at the top of the hour
  cron.schedule('0 * * * *', () => {
    runStripeNudges().catch((err) => console.error('Stripe nudge job error:', err));
  });
  console.log('Stripe nudge cron job scheduled (hourly)');
}
