import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { isAdminUser } from '../middleware/admin';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { stripe } from '../services/stripe';
import { rateLimit } from '../lib/rateLimit';
import { getBaseUrl } from '../lib/baseUrl';
import { isBlockedCustomDomain, isValidDomain, sanitizeDomain } from '../lib/hosts';
import { domainCache } from '../services/domainCache';
import { isRailwayConfigured, railwayAddDomain, railwayRemoveDomain } from '../services/railway';
import { CUSTOM_DOMAIN_PLANS } from './domains';
import {
  sendAdminDomainPurchaseRequest,
  sendTenantDomainRequestReceived,
  sendTenantDomainPurchased,
} from '../services/email';

const app = new Hono();

// Our retail price map per TLD (in cents). You buy wholesale on Railway, keep the margin.
const TLD_PRICES: Record<string, number> = {
  com: 2500,
  net: 2500,
  org: 2500,
  co: 3500,
  io: 6500,
  dev: 2000,
  app: 2000,
  ai: 9000,   // 2-yr minimum on Railway; charge 1yr equivalent
  store: 3000,
  shop: 3000,
  pro: 2500,
  bio: 2500,
  me: 2500,
  info: 2000,
  tech: 8500,
  design: 3500,
  studio: 3500,
  cloud: 3500,
  art: 2000,
  run: 1500,
  world: 1500,
  today: 1500,
  one: 1500,
  now: 5500,
  sh: 4500,
  build: 3500,
  software: 3000,
  digital: 3000,
  engineer: 2500,
  global: 6500,
};
const DEFAULT_PRICE = 3500;

function getTldPrice(domain: string): number {
  const parts = domain.toLowerCase().split('.');
  // Longest matching suffix wins (e.g. "co.uk" before "uk")
  for (let i = 1; i < parts.length; i++) {
    const price = TLD_PRICES[parts.slice(i).join('.')];
    if (price !== undefined) return price;
  }
  return DEFAULT_PRICE;
}

async function isDomainAvailable(domain: string): Promise<boolean | null> {
  const apiKey = process.env.WHOISXML_API_KEY;
  if (!apiKey) return null;
  const url = `https://domain-availability.whoisxmlapi.com/api/v1?apiKey=${apiKey}&domainName=${encodeURIComponent(domain)}&credits=DA`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const json = await res.json() as { DomainInfo?: { domainAvailability?: string } };
  return json.DomainInfo?.domainAvailability === 'AVAILABLE';
}

// GET /api/domain-purchases/check?domain=example.com
app.get('/check', requireAuth, async (c) => {
  const domain = sanitizeDomain(c.req.query('domain') ?? '');
  if (!domain || !isValidDomain(domain)) return c.json({ error: 'Invalid domain' }, 400);
  if (!(await rateLimit(`domain-check:${c.get('clerkUserId')}`, 30, 3600))) {
    return c.json({ error: 'Too many searches. Try again in a bit.' }, 429);
  }
  if (!process.env.WHOISXML_API_KEY) return c.json({ error: 'Availability check not configured' }, 503);

  try {
    const available = await isDomainAvailable(domain);
    const price_cents = available ? getTldPrice(domain) : null;
    return c.json({ domain, available, price_cents });
  } catch {
    return c.json({ error: 'Check failed' }, 502);
  }
});

// POST /api/domain-purchases/checkout — create Stripe Checkout session, redirect to pay
const checkoutSchema = z.object({ domain: z.string().min(3).max(253) });

app.post('/checkout', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as unknown as { id: string; plan: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid domain' }, 400);

  const domain = sanitizeDomain(parsed.data.domain);
  if (!domain || !isValidDomain(domain) || isBlockedCustomDomain(domain)) {
    return c.json({ error: 'Invalid domain' }, 400);
  }
  if (!CUSTOM_DOMAIN_PLANS.includes(tenant.plan)) {
    return c.json({ error: 'Custom domains are available on the Business plan. Upgrade to buy a domain.' }, 402);
  }

  // Block duplicate paid/pending requests (any store) and domains already connected elsewhere
  const existing = await db`
    SELECT id FROM domain_purchase_requests
    WHERE domain = ${domain} AND status IN ('pending', 'purchased')
    LIMIT 1
  `;
  if (existing[0]) return c.json({ error: 'This domain already has an active purchase request.' }, 409);
  const connected = await db`SELECT id FROM tenants WHERE custom_domain = ${domain} AND custom_domain_verified = TRUE LIMIT 1`;
  if (connected[0]) return c.json({ error: 'This domain is already connected to a store.' }, 409);

  // Availability can change between the search and paying — check again before charging
  try {
    const available = await isDomainAvailable(domain);
    if (available === false) return c.json({ error: 'Sorry, that domain is no longer available.' }, 409);
  } catch {
    return c.json({ error: 'Could not confirm availability. Please try again.' }, 502);
  }

  const price_cents = getTldPrice(domain);
  const clientUrl = getBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: price_cents,
          product_data: {
            name: `Domain: ${domain}`,
            description: '1-year registration. Your domain will be active within 24–48 hours.',
          },
        },
      },
    ],
    metadata: {
      type: 'domain_purchase',
      tenant_id: tenant.id,
      domain,
    },
    success_url: `${clientUrl}/dashboard/settings?domain_paid=1`,
    cancel_url: `${clientUrl}/dashboard/settings`,
  });

  return c.json({ url: session.url });
});

// POST /api/domain-purchases/webhook-fulfill — called internally after Stripe checkout.session.completed
// (handled in stripe webhook route — see stripe.ts)

// GET /api/domain-purchases/my — tenant's own requests
app.get('/my', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const rows = await db`
    SELECT * FROM domain_purchase_requests
    WHERE tenant_id = ${tenant.id}
    ORDER BY created_at DESC
  `;
  return c.json({ requests: rows });
});

// DELETE /api/domain-purchases/:id — tenant cancels a pending (unpurchased) request
app.delete('/:id', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };
  const id = c.req.param('id') ?? '';

  const rows = await db`
    UPDATE domain_purchase_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenant.id} AND status = 'pending'
    RETURNING id
  `;
  if (!rows[0]) return c.json({ error: 'Request not found or already processed' }, 404);
  return c.json({ cancelled: true });
});

// ── Admin routes ──────────────────────────────────────────────────────────────

const isAdmin = isAdminUser;

// GET /api/domain-purchases/admin/pending
app.get('/admin/pending', requireAuth, async (c) => {
  if (!(await isAdmin(c.get('clerkUserId') as string))) return c.json({ error: 'Forbidden' }, 403);

  const rows = await db`
    SELECT dpr.*, t.company_name, t.slug
    FROM domain_purchase_requests dpr
    JOIN tenants t ON t.id = dpr.tenant_id
    WHERE dpr.status = 'pending'
    ORDER BY dpr.created_at ASC
  `;
  return c.json({ requests: rows });
});

// PATCH /api/domain-purchases/admin/:id — mark as purchased or rejected
const adminUpdateSchema = z.object({
  status: z.enum(['purchased', 'rejected']),
  notes: z.string().optional(),
  price_cents: z.number().int().min(0).optional(),
});

app.patch('/admin/:id', requireAuth, async (c) => {
  if (!(await isAdmin(c.get('clerkUserId') as string))) return c.json({ error: 'Forbidden' }, 403);

  const id = c.req.param('id') ?? '';
  const body = await c.req.json().catch(() => ({}));
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid body' }, 400);

  const pending = await db`SELECT * FROM domain_purchase_requests WHERE id = ${id} AND status = 'pending' LIMIT 1`;
  const request = pending[0];
  if (!request) return c.json({ error: 'Request not found or already processed' }, 404);

  const domain = request.domain as string;
  const tenantRows = await db`SELECT * FROM tenants WHERE id = ${request.tenant_id} LIMIT 1`;
  const tenant = tenantRows[0];

  if (parsed.data.status === 'purchased') {
    if (!tenant) return c.json({ error: 'Tenant no longer exists' }, 404);

    const taken = await db`
      SELECT id FROM tenants WHERE custom_domain = ${domain} AND custom_domain_verified = TRUE AND id != ${tenant.id} LIMIT 1
    `;
    if (taken[0]) return c.json({ error: 'That domain is now connected to a different store.' }, 409);

    // Release any previous domain this store had, then connect the purchased one on Railway.
    if (tenant.custom_domain && tenant.custom_domain !== domain) {
      domainCache.invalidate(tenant.custom_domain as string);
      if (tenant.custom_domain_railway_id && isRailwayConfigured()) {
        await railwayRemoveDomain(tenant.custom_domain_railway_id as string)
          .catch((err) => console.error('Railway removal of replaced domain failed:', err));
      }
    }

    let railwayId = tenant.custom_domain === domain ? (tenant.custom_domain_railway_id as string | null) : null;
    let cnameTarget: string | null = process.env.RAILWAY_PUBLIC_DOMAIN ?? null;
    let records: unknown[] = [];
    if (!railwayId && isRailwayConfigured()) {
      try {
        const added = await railwayAddDomain(domain);
        railwayId = added.id;
        cnameTarget = added.cnameTarget ?? cnameTarget;
        records = added.records;
      } catch (err) {
        console.error('Railway provisioning for purchased domain failed:', err);
      }
    }

    await db`
      UPDATE tenants
      SET custom_domain = ${domain},
          custom_domain_verified = TRUE,
          custom_domain_status = 'awaiting_dns',
          custom_domain_verify_token = NULL,
          custom_domain_railway_id = ${railwayId},
          custom_domain_cname_target = ${cnameTarget},
          custom_domain_records = ${records.length ? db.json(records as never) : null},
          updated_at = NOW()
      WHERE id = ${tenant.id}
    `;
    domainCache.set(domain, tenant.id as string, tenant.slug as string);
  }

  let refundedAt: Date | null = null;
  if (parsed.data.status === 'rejected' && request.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({ payment_intent: request.stripe_payment_intent_id as string });
      refundedAt = new Date();
    } catch (err) {
      console.error('Refund for rejected domain request failed:', err);
      return c.json({ error: 'Could not refund the payment. Refund it in Stripe, then reject again.' }, 502);
    }
  }

  const rows = await db`
    UPDATE domain_purchase_requests
    SET status = ${parsed.data.status},
        notes = ${parsed.data.notes ?? null},
        price_cents = ${parsed.data.price_cents ?? request.price_cents ?? null},
        refunded_at = ${refundedAt},
        expires_at = ${parsed.data.status === 'purchased' ? db`NOW() + INTERVAL '1 year'` : null},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  if (parsed.data.status === 'purchased' && tenant) {
    const users = await db`
      SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${tenant.clerk_user_id} LIMIT 1
    `;
    const user = users[0];
    const ownerEmail = user?.email as string ?? '';
    const ownerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || tenant.company_name as string;

    if (ownerEmail) {
      await sendTenantDomainPurchased({
        toEmail: ownerEmail,
        toName: ownerName,
        domain,
        dashboardUrl: `${getBaseUrl()}/dashboard/settings`,
      }).catch(console.error);
    }
  }

  return c.json({ request: rows[0] });
});

export { getTldPrice };
export default app;
