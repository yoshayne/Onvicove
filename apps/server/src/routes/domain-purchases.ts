import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import {
  sendAdminDomainPurchaseRequest,
  sendTenantDomainRequestReceived,
  sendTenantDomainPurchased,
} from '../services/email';

const app = new Hono();

const requestSchema = z.object({
  domain: z.string().min(3).max(253),
});

// GET /api/domain-purchases/check?domain=example.com — availability check via WhoisXML
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
    return c.json({ domain, available });
  } catch {
    return c.json({ error: 'Check failed' }, 502);
  }
});

// POST /api/domain-purchases/request — tenant submits a domain they want bought
app.post('/request', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as {
    id: string;
    company_name: string;
    clerk_user_id: string;
  };

  const body = await c.req.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid domain' }, 400);
  }

  const domain = parsed.data.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const tld = domain.split('.').slice(1).join('.');

  // Check no existing pending request for this domain
  const existing = await db`
    SELECT id FROM domain_purchase_requests
    WHERE tenant_id = ${tenant.id} AND domain = ${domain} AND status = 'pending'
    LIMIT 1
  `;
  if (existing[0]) {
    return c.json({ error: 'You already have a pending request for this domain.' }, 409);
  }

  // Get tenant's email from users table
  const users = await db`
    SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${tenant.clerk_user_id} LIMIT 1
  `;
  const user = users[0];
  const ownerEmail = user?.email as string ?? '';
  const ownerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || tenant.company_name;

  const rows = await db`
    INSERT INTO domain_purchase_requests (tenant_id, domain, tld, status)
    VALUES (${tenant.id}, ${domain}, ${tld}, 'pending')
    RETURNING *
  `;
  const request = rows[0];

  const adminUrl = `${process.env.CLIENT_URL ?? 'https://shopsuitedirect.com'}/admin/domain-requests`;

  // Notify admin + confirm to tenant (non-blocking)
  await Promise.allSettled([
    sendAdminDomainPurchaseRequest({
      companyName: tenant.company_name,
      ownerEmail,
      domain,
      requestId: request.id as string,
      adminUrl,
    }),
    ownerEmail
      ? sendTenantDomainRequestReceived({ toEmail: ownerEmail, toName: ownerName, domain })
      : Promise.resolve(),
  ]);

  return c.json({ request }, 201);
});

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

// DELETE /api/domain-purchases/:id — tenant cancels a pending request
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

// ── Admin routes ─────────────────────────────────────────────────────────────

// GET /api/domain-purchases/admin/pending
app.get('/admin/pending', requireAuth, async (c) => {
  const clerkId = c.get('clerkUserId') as string;
  const adminIds = (process.env.ADMIN_CLERK_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!adminIds.includes(clerkId)) return c.json({ error: 'Forbidden' }, 403);

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
  const clerkId = c.get('clerkUserId') as string;
  const adminIds = (process.env.ADMIN_CLERK_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!adminIds.includes(clerkId)) return c.json({ error: 'Forbidden' }, 403);

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

  // If purchased — notify tenant + update their custom_domain + verified
  if (parsed.data.status === 'purchased') {
    const tenantRows = await db`SELECT * FROM tenants WHERE id = ${req.tenant_id} LIMIT 1`;
    const tenant = tenantRows[0];
    if (tenant) {
      // Activate the domain on the tenant record (Railway handles DNS/SSL automatically)
      await db`
        UPDATE tenants
        SET custom_domain = ${req.domain},
            custom_domain_verified = TRUE,
            custom_domain_cname_target = NULL,
            updated_at = NOW()
        WHERE id = ${req.tenant_id}
      `;

      // Get owner contact
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

export default app;
