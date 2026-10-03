import { Hono } from 'hono';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';

const app = new Hono();

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

function getRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI || `${process.env.PUBLIC_URL}/api/google-cal/callback`;
}

// GET /api/google-cal/connect — redirect to Google OAuth consent
app.get('/connect', requireAuth, requireTenant, async (c) => {
  const clerkUserId = c.get('clerkUserId') as string;
  const state = Buffer.from(clerkUserId).toString('base64');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/google-cal/callback — exchange code, store tokens
app.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error || !code || !state) {
    return c.redirect('/dashboard/settings?gcal=error');
  }

  // Decode clerk user id from state
  let clerkUserId: string;
  try {
    clerkUserId = Buffer.from(state, 'base64').toString('utf-8');
  } catch {
    return c.redirect('/dashboard/settings?gcal=error');
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', await tokenRes.text());
    return c.redirect('/dashboard/settings?gcal=error');
  }

  const tokenData = await tokenRes.json() as { refresh_token?: string; access_token: string };
  const refreshToken = tokenData.refresh_token;

  if (!refreshToken) {
    console.error('No refresh_token returned from Google');
    return c.redirect('/dashboard/settings?gcal=error');
  }

  // Find tenant by clerk user id
  const tenantRows = await db`
    SELECT t.id FROM tenants t
    JOIN users u ON u.id = t.owner_id
    WHERE u.clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  if (!tenantRows[0]) {
    return c.redirect('/dashboard/settings?gcal=error');
  }

  await db`
    UPDATE tenants
    SET google_cal_refresh_token = ${refreshToken}, google_cal_enabled = TRUE
    WHERE id = ${tenantRows[0].id}
  `;

  return c.redirect('/dashboard/settings?gcal=connected');
});

// DELETE /api/google-cal/disconnect
app.delete('/disconnect', requireAuth, requireTenant, async (c) => {
  const tenant = c.get('tenant') as { id: string };

  await db`
    UPDATE tenants
    SET google_cal_refresh_token = NULL, google_cal_enabled = FALSE
    WHERE id = ${tenant.id}
  `;

  return c.json({ disconnected: true });
});

export default app;
