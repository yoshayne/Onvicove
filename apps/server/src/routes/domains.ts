import { Hono } from 'hono';
import { resolveTxt } from 'node:dns/promises';
import { randomBytes } from 'node:crypto';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { domainCache } from '../services/domainCache';
import { railwayAddDomain, railwayRemoveDomain } from '../services/railway';

const app = new Hono();

function sanitizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function isValidDomain(domain: string): boolean {
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);
}

// POST /api/domains/request — save domain + generate TXT verify token
app.post('/request', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const raw = (body.domain ?? '') as string;
  const domain = sanitizeDomain(raw);

  if (!domain || !isValidDomain(domain)) {
    return c.json({ error: 'Invalid domain format. Use: www.example.com' }, 400);
  }

  const conflict = await db`
    SELECT id FROM tenants WHERE custom_domain = ${domain} AND id != ${tenant.id} LIMIT 1
  `;
  if (conflict[0]) {
    return c.json({ error: 'This domain is already connected to another store.' }, 409);
  }

  const token = `onvicove-verify=${randomBytes(16).toString('hex')}`;

  await db`
    UPDATE tenants
    SET custom_domain = ${domain},
        custom_domain_verified = FALSE,
        custom_domain_verify_token = ${token},
        custom_domain_railway_id = NULL,
        custom_domain_cname_target = NULL,
        updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  domainCache.invalidate(domain);

  return c.json({ domain, token });
});

// POST /api/domains/verify — check TXT record, then provision SSL via Railway
app.post('/verify', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as {
    id: string;
    custom_domain: string | null;
    custom_domain_verify_token: string | null;
    custom_domain_railway_id: string | null;
  };

  if (!tenant.custom_domain || !tenant.custom_domain_verify_token) {
    return c.json({ error: 'No domain pending verification.' }, 400);
  }

  // Step 1 — confirm TXT record exists
  const lookupHost = `_onvicove-verify.${tenant.custom_domain}`;
  let txtVerified = false;

  try {
    const records = await resolveTxt(lookupHost);
    txtVerified = records.flat().includes(tenant.custom_domain_verify_token);
  } catch {
    txtVerified = false;
  }

  if (!txtVerified) {
    return c.json({
      verified: false,
      message: `TXT record not found yet at ${lookupHost}. DNS changes can take a few minutes to propagate — try again shortly.`,
    });
  }

  // Step 2 — provision SSL on Railway (idempotent: skip if already done)
  let railwayId = tenant.custom_domain_railway_id;
  let cnameTarget = process.env.RAILWAY_PUBLIC_DOMAIN ?? '';

  if (!railwayId && process.env.RAILWAY_TOKEN) {
    try {
      const result = await railwayAddDomain(tenant.custom_domain);
      railwayId = result.id;
      cnameTarget = result.cnameTarget;
    } catch (err) {
      console.error('Railway domain provisioning failed:', err);
      // Don't block verification — domain still works via Railway's catch-all
    }
  }

  await db`
    UPDATE tenants
    SET custom_domain_verified = TRUE,
        custom_domain_railway_id = ${railwayId ?? null},
        custom_domain_cname_target = ${cnameTarget || null},
        updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  domainCache.set(tenant.custom_domain, tenant.id);

  return c.json({
    verified: true,
    domain: tenant.custom_domain,
    cnameTarget,
  });
});

// DELETE /api/domains — remove domain + clean up Railway
app.delete('/', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as {
    id: string;
    custom_domain: string | null;
    custom_domain_railway_id: string | null;
  };

  if (tenant.custom_domain) {
    domainCache.invalidate(tenant.custom_domain);
  }

  // Remove from Railway if it was provisioned there
  if (tenant.custom_domain_railway_id && process.env.RAILWAY_TOKEN) {
    try {
      await railwayRemoveDomain(tenant.custom_domain_railway_id);
    } catch (err) {
      console.error('Railway domain removal failed:', err);
    }
  }

  await db`
    UPDATE tenants
    SET custom_domain = NULL,
        custom_domain_verified = FALSE,
        custom_domain_verify_token = NULL,
        custom_domain_railway_id = NULL,
        custom_domain_cname_target = NULL,
        updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  return c.json({ removed: true });
});

export default app;
