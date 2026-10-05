import cron from 'node-cron';
import { db } from '../db/client';
import { sendInviteFollowUp, sendAdminInviteExpired } from '../services/email';

const BASE_URL = process.env.CLIENT_URL || 'https://shopsuitedirect.com';

async function runInviteNudges() {
  // 3-day follow-up: unclaimed, not expired yet, sent 3+ days ago, no follow-up sent
  const needFollowup = await db`
    SELECT ti.id, ti.invite_email, ti.token, t.company_name, t.id AS tenant_id
    FROM tenant_invites ti
    JOIN tenants t ON t.id = ti.tenant_id
    WHERE ti.claimed_at IS NULL
      AND ti.expires_at > NOW()
      AND ti.created_at <= NOW() - INTERVAL '3 days'
      AND ti.followup_sent_at IS NULL
  `;

  for (const row of needFollowup) {
    try {
      await sendInviteFollowUp({
        toEmail: row.invite_email as string,
        companyName: row.company_name as string,
        inviteUrl: `${BASE_URL}/claim/${row.token}`,
      });
      await db`UPDATE tenant_invites SET followup_sent_at = NOW() WHERE id = ${row.id}`;
    } catch (err) {
      console.error(`Invite follow-up failed for invite ${row.id}:`, err);
    }
  }

  // Expiry notice to admin: just expired, unclaimed, not yet notified
  const expired = await db`
    SELECT ti.id, ti.invite_email, t.company_name, t.id AS tenant_id
    FROM tenant_invites ti
    JOIN tenants t ON t.id = ti.tenant_id
    WHERE ti.claimed_at IS NULL
      AND ti.expires_at <= NOW()
      AND ti.expires_at >= NOW() - INTERVAL '25 hours'
      AND ti.expiry_notified_at IS NULL
  `;

  for (const row of expired) {
    try {
      await sendAdminInviteExpired({
        companyName: row.company_name as string,
        inviteEmail: row.invite_email as string,
        adminUrl: `${BASE_URL}/admin/tenants/${row.tenant_id}`,
      });
      await db`UPDATE tenant_invites SET expiry_notified_at = NOW() WHERE id = ${row.id}`;
    } catch (err) {
      console.error(`Invite expiry notice failed for invite ${row.id}:`, err);
    }
  }
}

export function startInviteNudgeJob() {
  // Runs every hour at :15
  cron.schedule('15 * * * *', () => {
    runInviteNudges().catch((err) => console.error('Invite nudge job error:', err));
  });
  console.log('Invite nudge cron job scheduled (hourly)');
}
