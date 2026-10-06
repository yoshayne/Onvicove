import cron from 'node-cron';
import { db } from '../db/client';
import { computeDomainState } from '../services/domainStatus';

// Keeps each connected domain's status honest (e.g. DNS later removed, or SSL finishing).
async function recheckDomains() {
  const rows = await db`
    SELECT id, custom_domain, custom_domain_verified, custom_domain_verify_token,
           custom_domain_cname_target, custom_domain_status
    FROM tenants
    WHERE custom_domain IS NOT NULL
      AND is_active = TRUE
      AND (custom_domain_verified = TRUE OR created_at > NOW() - INTERVAL '30 days')
  `;

  for (const row of rows) {
    try {
      const state = await computeDomainState({
        domain: row.custom_domain as string,
        verified: row.custom_domain_verified as boolean,
        token: row.custom_domain_verify_token as string | null,
        cnameTarget: row.custom_domain_cname_target as string | null,
      });
      await db`
        UPDATE tenants SET custom_domain_status = ${state.status}, custom_domain_checked_at = NOW()
        WHERE id = ${row.id}
      `;
    } catch (err) {
      console.error(`Domain recheck failed for tenant ${row.id}:`, err);
    }
  }
}

export function startDomainRecheckJob() {
  // Every 6 hours
  cron.schedule('20 */6 * * *', () => {
    recheckDomains().catch((err) => console.error('Domain recheck job error:', err));
  });
}
