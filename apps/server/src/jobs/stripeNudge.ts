import cron from 'node-cron';
import { db } from '../db/client';
import { sendStripeNudge, sendStripeReminder } from '../services/email';

const DASHBOARD_URL = `${process.env.CLIENT_URL || 'https://shopsuitedirect.com'}/dashboard/payouts`;

async function runStripeNudges() {
  // 24-hour nudge: wizard complete, not onboarded, no nudge sent yet, account older than 24h
  const firstNudge = await db`
    SELECT t.id, t.company_name, u.email, u.first_name, u.last_name
    FROM tenants t
    JOIN users u ON u.clerk_user_id = t.clerk_user_id
    WHERE t.wizard_completed = TRUE
      AND t.stripe_onboarded = FALSE
      AND t.stripe_nudge_sent_at IS NULL
      AND t.created_at <= NOW() - INTERVAL '24 hours'
  `;

  for (const row of firstNudge) {
    try {
      await sendStripeNudge({
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
    SELECT t.id, t.company_name, u.email, u.first_name, u.last_name
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
      await sendStripeReminder({
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
