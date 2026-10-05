import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';

const app = new Hono();

// GET /api/invite/:token — validate token and return tenant name (no auth required)
app.get('/:token', async (c) => {
  const token = c.req.param('token');

  const rows = await db`
    SELECT ti.id, ti.invite_email, ti.expires_at, ti.claimed_at,
           t.id AS tenant_id, t.company_name, t.slug, t.theme_id, t.mode
    FROM tenant_invites ti
    JOIN tenants t ON t.id = ti.tenant_id
    WHERE ti.token = ${token}
    LIMIT 1
  `;

  const invite = rows[0];
  if (!invite) return c.json({ error: 'Invite not found or already used' }, 404);
  if (invite.claimed_at) return c.json({ error: 'This invite has already been claimed' }, 409);
  if (new Date(invite.expires_at as string) < new Date()) {
    return c.json({ error: 'This invite link has expired. Ask your site builder to resend.' }, 410);
  }

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

  const rows = await db`
    SELECT ti.id, ti.invite_email, ti.expires_at, ti.claimed_at,
           t.id AS tenant_id, t.clerk_user_id
    FROM tenant_invites ti
    JOIN tenants t ON t.id = ti.tenant_id
    WHERE ti.token = ${token}
    LIMIT 1
  `;

  const invite = rows[0];
  if (!invite) return c.json({ error: 'Invite not found' }, 404);
  if (invite.claimed_at) return c.json({ error: 'This invite has already been claimed' }, 409);
  if (new Date(invite.expires_at as string) < new Date()) {
    return c.json({ error: 'This invite link has expired' }, 410);
  }

  // Reject if this Clerk user already owns a different tenant
  const existing = await db`
    SELECT id FROM tenants WHERE clerk_user_id = ${clerkUserId} AND id != ${invite.tenant_id} LIMIT 1
  `;
  if (existing[0]) {
    return c.json({ error: 'Your account is already linked to a different site' }, 409);
  }

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

  return c.json({ claimed: true, tenant_id: invite.tenant_id });
});

export default app;
