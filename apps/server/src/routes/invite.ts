import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { sendTenantWelcome, sendAdminInviteClaimed } from '../services/email';

const app = new Hono();

// GET /api/invite/:token — validate token and return tenant name (no auth required)
app.get('/:token', async (c) => {
  const token = c.req.param('token');
  console.log('[invite] GET /:token — token:', token?.slice(0, 8), '…');

  const rows = await db`
    SELECT ti.id, ti.invite_email, ti.expires_at, ti.claimed_at,
           t.id AS tenant_id, t.company_name, t.slug, t.theme_id, t.mode
    FROM tenant_invites ti
    JOIN tenants t ON t.id = ti.tenant_id
    WHERE ti.token = ${token}
    LIMIT 1
  `;

  const invite = rows[0];
  if (!invite) {
    console.log('[invite] GET /:token — not found');
    return c.json({ error: 'Invite not found or already used' }, 404);
  }
  if (invite.claimed_at) {
    console.log('[invite] GET /:token — already claimed at', invite.claimed_at);
    return c.json({ error: 'This invite has already been claimed' }, 409);
  }
  if (new Date(invite.expires_at as string) < new Date()) {
    console.log('[invite] GET /:token — expired at', invite.expires_at);
    return c.json({ error: 'This invite link has expired. Ask your site builder to resend.' }, 410);
  }
  console.log('[invite] GET /:token — valid, tenant:', invite.company_name);

  return c.json({
    invite_email: invite.invite_email,
    company_name: invite.company_name,
    slug: invite.slug,
    theme_id: invite.theme_id,
    mode: invite.mode,
  });
});

const claimSchema = z.object({ token: z.string().min(1) });

// POST /api/invite/claim — called after Clerk sign-up/in; binds clerk_user_id to the tenant
app.post('/claim', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'token is required' }, 400);

  const { token } = parsed.data;
  const clerkUserId = c.get('clerkUserId') as string;
  console.log('[invite] POST /claim — clerkUserId:', clerkUserId, '| token:', token?.slice(0, 8), '…');

  const rows = await db`
    SELECT ti.id, ti.invite_email, ti.expires_at, ti.claimed_at,
           t.id AS tenant_id, t.clerk_user_id
    FROM tenant_invites ti
    JOIN tenants t ON t.id = ti.tenant_id
    WHERE ti.token = ${token}
    LIMIT 1
  `;

  const invite = rows[0];
  if (!invite) {
    console.log('[invite] POST /claim — invite not found for token');
    return c.json({ error: 'Invite not found' }, 404);
  }
  if (invite.claimed_at) {
    console.log('[invite] POST /claim — already claimed');
    return c.json({ error: 'This invite has already been claimed' }, 409);
  }
  if (new Date(invite.expires_at as string) < new Date()) {
    console.log('[invite] POST /claim — expired');
    return c.json({ error: 'This invite link has expired' }, 410);
  }

  // Reject if this Clerk user already owns a different tenant
  const existing = await db`
    SELECT id FROM tenants WHERE clerk_user_id = ${clerkUserId} AND id != ${invite.tenant_id} LIMIT 1
  `;
  if (existing[0]) {
    console.log('[invite] POST /claim — user already owns a different tenant:', existing[0].id);
    return c.json({ error: 'Your account is already linked to a different site' }, 409);
  }
  console.log('[invite] POST /claim — proceeding to bind clerkUserId to tenant:', invite.tenant_id);

  // Claim: bind the Clerk user to the tenant, mark invite used
  await db`
    UPDATE tenants
    SET clerk_user_id = ${clerkUserId}, updated_at = NOW()
    WHERE id = ${invite.tenant_id}
  `;

  await db`
    UPDATE tenant_invites
    SET claimed_at = NOW(), claimed_by = ${clerkUserId}
    WHERE id = ${invite.id}
  `;

  // Fetch tenant + Clerk user details for notifications
  const [tenantRows, userRows] = await Promise.all([
    db`SELECT company_name, slug FROM tenants WHERE id = ${invite.tenant_id} LIMIT 1`,
    db`SELECT email, first_name, last_name FROM users WHERE clerk_user_id = ${clerkUserId} LIMIT 1`,
  ]);
  const tenant = tenantRows[0];
  const user = userRows[0];
  const baseUrl = process.env.CLIENT_URL || 'https://shopsuitedirect.com';

  if (tenant && user?.email) {
    const toName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || (user.email as string);
    // Welcome the new client
    sendTenantWelcome({
      toEmail: user.email as string,
      toName,
      companyName: tenant.company_name as string,
      dashboardUrl: `${baseUrl}/dashboard`,
    }).catch((err) => console.error('Invite claimed welcome email error:', err));
    // Notify admin
    sendAdminInviteClaimed({
      companyName: tenant.company_name as string,
      claimedByEmail: user.email as string,
      dashboardUrl: `${baseUrl}/admin/tenants/${invite.tenant_id}`,
    }).catch((err) => console.error('Invite claimed admin email error:', err));
  }

  return c.json({ claimed: true, tenant_id: invite.tenant_id });
});

export default app;
