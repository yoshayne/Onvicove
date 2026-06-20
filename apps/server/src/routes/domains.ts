import { Hono } from 'hono';
import { resolveTxt } from 'node:dns/promises';
import { randomBytes } from 'node:crypto';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { domainCache } from '../services/domainCache';

const app = new Hono();

function sanitizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function isValidDomain(domain: string): boolean {
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);
}

// POST /api/domains/request — set domain + generate TXT verify token
app.post('/request', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const body = await c.req.json().catch(() => ({}));
  const raw = (body.domain ?? '') as string;
  const domain = sanitizeDomain(raw);

  if (!domain || !isValidDomain(domain)) {
    return c.json({ error: 'Invalid domain format. Use: www.example.com' }, 400);
  }

  // Check domain not already claimed by another tenant
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
        updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  domainCache.invalidate(domain);

  return c.json({
    domain,
    token,
    instructions: {
      type: 'TXT',
      host: `_onvicove-verify.${domain}`,
      value: token,
      note: 'Add this TXT record to your DNS, then click Verify. Changes can take up to 48 hours to propagate, but usually happen within minutes.',
    },
  });
});

// POST /api/domains/verify — check DNS TXT record
app.post('/verify', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as {
    id: string;
    custom_domain: string | null;
    custom_domain_verify_token: string | null;
  };

  if (!tenant.custom_domain || !tenant.custom_domain_verify_token) {
    return c.json({ error: 'No domain pending verification.' }, 400);
  }

  const lookupHost = `_onvicove-verify.${tenant.custom_domain}`;
  let verified = false;

  try {
    const records = await resolveTxt(lookupHost);
    const flat = records.flat();
    verified = flat.includes(tenant.custom_domain_verify_token);
  } catch {
    // DNS lookup failed — record doesn't exist yet
    verified = false;
  }

  if (!verified) {
    return c.json({
      verified: false,
      message: `TXT record not found yet for ${lookupHost}. DNS changes can take up to 48 hours. Try again shortly.`,
    });
  }

  await db`
    UPDATE tenants
    SET custom_domain_verified = TRUE, updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  domainCache.set(tenant.custom_domain, tenant.id);

  return c.json({ verified: true, domain: tenant.custom_domain });
});

// DELETE /api/domains — remove custom domain
app.delete('/', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string; custom_domain: string | null };

  if (tenant.custom_domain) {
    domainCache.invalidate(tenant.custom_domain);
  }

  await db`
    UPDATE tenants
    SET custom_domain = NULL,
        custom_domain_verified = FALSE,
        custom_domain_verify_token = NULL,
        updated_at = NOW()
    WHERE id = ${tenant.id}
  `;

  return c.json({ removed: true });
});

export default app;
