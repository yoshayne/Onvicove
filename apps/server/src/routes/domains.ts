import { Hono } from 'hono';
import { randomBytes } from 'node:crypto';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { domainCache } from '../services/domainCache';
import { isRailwayConfigured, railwayAddDomain, railwayRemoveDomain, type DnsRecordInstruction } from '../services/railway';
import { checkTxt, computeDomainState } from '../services/domainStatus';
import { stripe } from '../services/stripe';
import { isBlockedCustomDomain, isValidDomain, sanitizeDomain } from '../lib/hosts';
import { rateLimit } from '../lib/rateLimit';

const app = new Hono();

// Custom domains are a Business-plan feature. Stores that already had one keep it.
export const CUSTOM_DOMAIN_PLANS = ['business'];

interface DomainTenant {
  id: string;
  slug: string;
  plan: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_verify_token: string | null;
  custom_domain_railway_id: string | null;
  custom_domain_cname_target: string | null;
  custom_domain_records: DnsRecordInstruction[] | null;
  custom_domain_status: string | null;
}

function isApex(domain: string): boolean {
  return domain.split('.').length === 2;
}

async function removeFromRailway(railwayId: string | null | undefined) {
  if (!railwayId || !isRailwayConfigured()) return;
  try {
    await railwayRemoveDomain(railwayId);
  } catch (err) {
    console.error(`Railway domain removal failed (id ${railwayId}) — remove it manually in Railway:`, err);
  }
}

// Best effort: lets Apple Pay / Google Pay work for checkout on the custom domain.
async function registerWalletDomain(domain: string) {
  try {
    await stripe.applePayDomains.create({ domain_name: domain });
  } catch (err) {
    console.warn(`Wallet domain registration skipped for ${domain}:`, err instanceof Error ? err.message : err);
  }
}

function present(t: DomainTenant) {
  return {
    domain: t.custom_domain,
    verified: t.custom_domain_verified,
    status: t.custom_domain_status,
    token: t.custom_domain_verify_token,
    cnameTarget: t.custom_domain_cname_target,
    records: t.custom_domain_records ?? [],
    apex: t.custom_domain ? isApex(t.custom_domain) : false,
  };
}

// POST /api/domains/request — save domain, reserve it on Railway, generate TXT verify token
app.post('/request', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as unknown as DomainTenant;
  if (!(await rateLimit(`domain-request:${tenant.id}`, 20, 3600))) {
    return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const domain = sanitizeDomain((body.domain ?? '') as string);

  if (!domain || !isValidDomain(domain)) {
    return c.json({ error: 'Invalid domain format. Use something like www.example.com' }, 400);
  }
  if (isBlockedCustomDomain(domain)) {
    return c.json({ error: 'That address belongs to the platform and can\'t be used as a custom domain.' }, 400);
  }

  if (tenant.custom_domain === domain && tenant.custom_domain_verified) {
    return c.json({ ...present(tenant), message: 'This domain is already connected.' });
  }

  const alreadyHasDomain = tenant.custom_domain && tenant.custom_domain_verified;
  if (!CUSTOM_DOMAIN_PLANS.includes(tenant.plan) && !alreadyHasDomain) {
    return c.json({ error: 'Custom domains are available on the Business plan. Upgrade to connect your own domain.' }, 402);
  }

  // Another store holding a verified claim blocks us only while its TXT proof is still published.
  const holders = await db`
    SELECT id, custom_domain_verify_token FROM tenants
    WHERE custom_domain = ${domain} AND custom_domain_verified = TRUE AND id != ${tenant.id} LIMIT 1
  `;
  if (holders[0] && await checkTxt(domain, holders[0].custom_domain_verify_token as string)) {
    return c.json({ error: 'This domain is already connected to another store.' }, 409);
  }

  // Replacing a previous domain: release the old one first.
  if (tenant.custom_domain && tenant.custom_domain !== domain) {
    domainCache.invalidate(tenant.custom_domain);
    await removeFromRailway(tenant.custom_domain_railway_id);
  }

  let railwayId: string | null = tenant.custom_domain === domain ? tenant.custom_domain_railway_id : null;
  let cnameTarget: string | null = tenant.custom_domain === domain ? tenant.custom_domain_cname_target : null;
  let records: DnsRecordInstruction[] = tenant.custom_domain === domain ? (tenant.custom_domain_records ?? []) : [];

  if (!railwayId && isRailwayConfigured()) {
    try {
      const added = await railwayAddDomain(domain);
      railwayId = added.id;
      cnameTarget = added.cnameTarget;
      records = added.records;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Railway domain provisioning failed:', err);
      if (/already|exists|taken|in use/i.test(message)) {
        return c.json({ error: 'This domain is already registered with our hosting provider by someone else. Contact support if it is yours.' }, 409);
      }
      // Otherwise continue; the dashboard will show the generic target and keep polling.
    }
  }
  cnameTarget = cnameTarget || process.env.RAILWAY_PUBLIC_DOMAIN || null;

  const token = tenant.custom_domain === domain && tenant.custom_domain_verify_token
    ? tenant.custom_domain_verify_token
    : `onvicove-verify=${randomBytes(16).toString('hex')}`;

  await db`
    UPDATE tenants
    SET custom_domain = ${domain},
        custom_domain_verified = FALSE,
        custom_domain_status = 'awaiting_txt',
        custom_domain_verify_token = ${token},
        custom_domain_railway_id = ${railwayId},
        custom_domain_cname_target = ${cnameTarget},
        custom_domain_records = ${records.length ? db.json(records as unknown as never) : null},
        custom_domain_checked_at = NOW(),
        updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  domainCache.invalidate(domain);

  return c.json({ domain, token, cnameTarget, records, apex: isApex(domain), status: 'awaiting_txt' });
});

async function currentTenant(id: string): Promise<DomainTenant> {
  const rows = await db`SELECT * FROM tenants WHERE id = ${id} LIMIT 1`;
  return rows[0] as unknown as DomainTenant;
}

async function saveStatus(id: string, status: string) {
  await db`UPDATE tenants SET custom_domain_status = ${status}, custom_domain_checked_at = NOW() WHERE id = ${id}`;
}

// POST /api/domains/verify — check TXT ownership, claim the domain, then report routing/SSL state
app.post('/verify', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as unknown as DomainTenant;

  if (!tenant.custom_domain || !tenant.custom_domain_verify_token) {
    return c.json({ error: 'No domain pending verification.' }, 400);
  }
  if (!(await rateLimit(`domain-verify:${tenant.id}`, 30, 600))) {
    return c.json({ error: 'Too many checks. Wait a few minutes and try again.' }, 429);
  }

  const domain = tenant.custom_domain;

  if (!tenant.custom_domain_verified) {
    if (!(await checkTxt(domain, tenant.custom_domain_verify_token))) {
      const state = await computeDomainState({
        domain, verified: false, token: tenant.custom_domain_verify_token, cnameTarget: tenant.custom_domain_cname_target,
      });
      await saveStatus(tenant.id, state.status);
      return c.json({ verified: false, status: state.status, message: state.message, checks: state.checks });
    }

    // Ownership proven. If another store still holds the domain but no longer publishes its
    // own proof, it has lapsed and the new owner takes over.
    const holders = await db`
      SELECT id, slug, custom_domain_verify_token, custom_domain_railway_id FROM tenants
      WHERE custom_domain = ${domain} AND custom_domain_verified = TRUE AND id != ${tenant.id} LIMIT 1
    `;
    const holder = holders[0];
    if (holder) {
      if (await checkTxt(domain, holder.custom_domain_verify_token as string)) {
        return c.json({ error: 'This domain is already connected to another store.' }, 409);
      }
      await db`
        UPDATE tenants
        SET custom_domain = NULL, custom_domain_verified = FALSE, custom_domain_status = NULL,
            custom_domain_verify_token = NULL, custom_domain_railway_id = NULL,
            custom_domain_cname_target = NULL, custom_domain_records = NULL, updated_at = NOW()
        WHERE id = ${holder.id}
      `;
      await removeFromRailway(holder.custom_domain_railway_id as string | null);
    }

    try {
      await db`
        UPDATE tenants SET custom_domain_verified = TRUE, updated_at = NOW() WHERE id = ${tenant.id}
      `;
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        return c.json({ error: 'This domain was just connected to another store.' }, 409);
      }
      throw err;
    }
    domainCache.set(domain, tenant.id, tenant.slug);
  }

  const fresh = await currentTenant(tenant.id);
  const state = await computeDomainState({
    domain, verified: true, token: fresh.custom_domain_verify_token, cnameTarget: fresh.custom_domain_cname_target,
  });
  await saveStatus(tenant.id, state.status);
  if (state.status === 'active' && fresh.custom_domain_status !== 'active') void registerWalletDomain(domain);

  return c.json({
    verified: true,
    status: state.status,
    message: state.message,
    checks: state.checks,
    domain,
    cnameTarget: fresh.custom_domain_cname_target,
    records: fresh.custom_domain_records ?? [],
  });
});

// GET /api/domains/status — current state of the connected domain (polled by the dashboard)
app.get('/status', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as unknown as DomainTenant;
  if (!tenant.custom_domain) return c.json({ domain: null });
  if (!(await rateLimit(`domain-status:${tenant.id}`, 120, 600))) {
    return c.json({ error: 'Slow down — try again in a moment.' }, 429);
  }

  const state = await computeDomainState({
    domain: tenant.custom_domain,
    verified: tenant.custom_domain_verified,
    token: tenant.custom_domain_verify_token,
    cnameTarget: tenant.custom_domain_cname_target,
  });
  await saveStatus(tenant.id, state.status);
  if (state.status === 'active' && tenant.custom_domain_status !== 'active') void registerWalletDomain(tenant.custom_domain);

  return c.json({
    ...present({ ...tenant, custom_domain_status: state.status }),
    message: state.message,
    checks: state.checks,
  });
});

// DELETE /api/domains — remove domain + clean up Railway
app.delete('/', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as unknown as DomainTenant;

  domainCache.invalidate(tenant.custom_domain);
  await removeFromRailway(tenant.custom_domain_railway_id);

  await db`
    UPDATE tenants
    SET custom_domain = NULL,
        custom_domain_verified = FALSE,
        custom_domain_status = NULL,
        custom_domain_verify_token = NULL,
        custom_domain_railway_id = NULL,
        custom_domain_cname_target = NULL,
        custom_domain_records = NULL,
        updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  return c.json({ removed: true });
});

export default app;
