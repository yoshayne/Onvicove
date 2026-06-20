import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { stripe } from '../services/stripe';
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
  const parts = domain.split('.');
  const tld = parts.slice(1).join('.').toLowerCase();
  const sld = parts[parts.length - 1]?.toLowerCase() ?? '';
  return TLD_PRICES[tld] ?? TLD_PRICES[sld] ?? DEFAULT_PRICE;
}

// GET /api/domain-purchases/check?domain=example.com
app.get('/check', requireAuth, async (c) => {
  const domain = (c.req.query('domain') ?? '').trim().toLowerCase();
  if (!domain || domain.length < 3) return c.json({ error: 'Invalid domain' }, 400);

  const apiKey = process.env.WHOISXML_API_KEY;
  if (!apiKey) return c.json({ error: 'Availability check not configured' }, 503);

  try {
    const url = `https://domain-availability.whoisxmlapi.com/api/v1?apiKey=${apiKey}&domainName=${encodeURIComponent(domain)}&credits=DA`;
    const res = await fetch(url);
    const json = await res.json() as { DomainInfo?: { domainAvailability?: string } };
    const available = json.DomainInfo?.domainAvailability === 'AVAILABLE';
    const price_cents = available ? getTldPrice(domain) : null;
    return c.json({ domain, available, price_cents });
  } catch {
    return c.json({ error: 'Check failed' }, 502);
  }
});

// POST /api/domain-purchases/checkout — create Stripe Checkout session, redirect to pay
const checkoutSchema = z.object({ domain: z.string().min(3).max(253) });

app.post('/checkout', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string; company_name: string; clerk_user_id: string };
  const body = await c.req.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid domain' }, 400);

  const domain = parsed.data.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  // Block duplicate paid/pending requests
  const existing = await db`
    SELECT id FROM domain_purchase_requests
    WHERE tenant_id = ${tenant.id} AND domain = ${domain} AND status IN ('pending', 'purchased')
    LIMIT 1
  `;
  if (existing[0]) return c.json({ error: 'You already have an active request for this domain.' }, 409);

  const price_cents = getTldPrice(domain);
  const clientUrl = process.env.CLIENT_URL ?? 'https://shopsuitedirect.com';

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

function isAdmin(clerkId: string) {
  const ids = (process.env.ADMIN_CLERK_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(clerkId);
}

// GET /api/domain-purchases/admin/pending
app.get('/admin/pending', requireAuth, async (c) => {
  if (!isAdmin(c.get('clerkUserId') as string)) return c.json({ error: 'Forbidden' }, 403);

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
  if (!isAdmin(c.get('clerkUserId') as string)) return c.json({ error: 'Forbidden' }, 403);

  const id = c.req.param('id') ?? '';
  const body = await c.req.json().catch(() => ({}));
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid body' }, 400);

  const rows = await db`
    UPDATE domain_purchase_requests
    SET status = ${parsed.data.status},
        notes = ${parsed.data.notes ?? null},
        price_cents = ${parsed.data.price_cents ?? null},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  if (!rows[0]) return c.json({ error: 'Not found' }, 404);
  const req = rows[0];

  if (parsed.data.status === 'purchased') {
    const tenantRows = await db`SELECT * FROM tenants WHERE id = ${req.tenant_id} LIMIT 1`;
    const tenant = tenantRows[0];
    if (tenant) {
      await db`
        UPDATE tenants
        SET custom_domain = ${req.domain},
            custom_domain_verified = TRUE,
            custom_domain_cname_target = NULL,
            updated_at = NOW()
        WHERE id = ${req.tenant_id}
      `;

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
          domain: req.domain as string,
          dashboardUrl: `${process.env.CLIENT_URL ?? 'https://shopsuitedirect.com'}/dashboard`,
        }).catch(console.error);
      }
    }
  }

  return c.json({ request: req });
});

export { getTldPrice };
export default app;
