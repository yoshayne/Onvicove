import { Hono } from 'hono';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';

const app = new Hono();

const SCOPES = 'https://graph.microsoft.com/Calendars.ReadWrite offline_access User.Read';

function getTenantId(): string {
  return process.env.MICROSOFT_TENANT_ID || 'common';
}

function getRedirectUri(): string {
  return process.env.MICROSOFT_REDIRECT_URI || `${process.env.PUBLIC_URL}/api/outlook-cal/callback`;
}

// GET /api/outlook-cal/connect — redirect to Microsoft OAuth consent
app.get('/connect', requireAuth, requireTenant, async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const state = Buffer.from(clerkUserId).toString('base64');

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    response_mode: 'query',
    scope: SCOPES,
    state,
    prompt: 'consent',
  });

  return c.redirect(
    `https://login.microsoftonline.com/${getTenantId()}/oauth2/v2.0/authorize?${params.toString()}`
  );
});

// GET /api/outlook-cal/callback — exchange code, store tokens
app.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error || !code || !state) {
    return c.redirect('/dashboard/settings?outlook=error');
  }

  let clerkUserId: string;
  try {
    clerkUserId = Buffer.from(state, 'base64').toString('utf-8');
  } catch {
    return c.redirect('/dashboard/settings?outlook=error');
  }

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${getTenantId()}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code',
        code,
        scope: SCOPES,
      }),
    }
  );

  if (!tokenRes.ok) {
    console.error('Microsoft token exchange failed:', await tokenRes.text());
    return c.redirect('/dashboard/settings?outlook=error');
  }

  const tokenData = await tokenRes.json() as { refresh_token?: string; access_token: string };
  const refreshToken = tokenData.refresh_token;

  if (!refreshToken) {
    console.error('No refresh_token returned from Microsoft');
    return c.redirect('/dashboard/settings?outlook=error');
  }

  // Find tenant by clerk user id
  const tenantRows = await db`
    SELECT t.id FROM tenants t
    JOIN users u ON u.id = t.owner_id
    WHERE u.clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  if (!tenantRows[0]) {
    return c.redirect('/dashboard/settings?outlook=error');
  }

  await db`
    UPDATE tenants
    SET outlook_cal_refresh_token = ${refreshToken}, outlook_cal_enabled = TRUE
    WHERE id = ${tenantRows[0].id}
  `;

  return c.redirect('/dashboard/settings?outlook=connected');
});

// DELETE /api/outlook-cal/disconnect
app.delete('/disconnect', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };

  await db`
    UPDATE tenants
    SET outlook_cal_refresh_token = NULL, outlook_cal_enabled = FALSE
    WHERE id = ${tenant.id}
  `;

  return c.json({ disconnected: true });
});

export default app;
