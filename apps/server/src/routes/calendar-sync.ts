import { Hono } from 'hono';
import { db } from '../db/client';
import { requireAuth } from '../middleware/clerk';
import { requireTenant } from '../middleware/tenant';
import { sealToken, signState, verifyState } from '../lib/calendarAuth';
import { backfillTenant, calendarStatus, disconnectCalendar } from '../services/calendarSync';
import { providers, type ProviderId } from '../services/calendarProviders';

const redirectUri = (p: ProviderId) =>
  (p === 'google' ? process.env.GOOGLE_REDIRECT_URI : process.env.MICROSOFT_REDIRECT_URI) ||
  `${process.env.PUBLIC_URL || ''}/api/${p === 'google' ? 'google-cal' : 'outlook-cal'}/callback`;

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const MS_SCOPE = 'https://graph.microsoft.com/Calendars.ReadWrite offline_access';
const resultParam = (p: ProviderId) => (p === 'google' ? 'gcal' : 'outlook');

/** One OAuth connect / callback / disconnect flow, for Google or Outlook */
export function calendarOAuthRoutes(p: ProviderId) {
  const app = new Hono();

  // The browser asks for the address to send the owner to (a plain redirect could not carry their sign-in)
  app.get('/connect', requireAuth, requireTenant, async (c) => {
    const tenant = c.get('tenant') as { id: string };
    if (!providers[p].configured()) return c.json({ error: 'This calendar is not available yet.' }, 503);
    const state = signState(tenant.id, p);
    const url = p === 'google'
      ? `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(p), response_type: 'code', scope: GOOGLE_SCOPE, access_type: 'offline', prompt: 'consent', state })}`
      : `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize?${new URLSearchParams({ client_id: process.env.MICROSOFT_CLIENT_ID!, response_type: 'code', redirect_uri: redirectUri(p), response_mode: 'query', scope: MS_SCOPE, state, prompt: 'consent' })}`;
    return c.json({ url });
  });

  // Google / Microsoft send the owner back here
  app.get('/callback', async (c) => {
    const back = (r: string) => c.redirect(`/dashboard/settings?${resultParam(p)}=${r}`);
    const tenantId = verifyState(c.req.query('state'), p);
    const code = c.req.query('code');
    if (!tenantId || !code || c.req.query('error')) return back('error');

    const tokenRes = p === 'google'
      ? await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(p), grant_type: 'authorization_code', code }) })
      : await fetch(`https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.MICROSOFT_CLIENT_ID!, client_secret: process.env.MICROSOFT_CLIENT_SECRET!, redirect_uri: redirectUri(p), grant_type: 'authorization_code', code, scope: MS_SCOPE }) });
    if (!tokenRes.ok) {
      console.error(`${p} token exchange failed:`, (await tokenRes.text()).slice(0, 300));
      return back('error');
    }
    const tokens = (await tokenRes.json()) as { refresh_token?: string; scope?: string };
    // Google lets people untick the calendar permission on the consent screen: then there is nothing we can do
    if (p === 'google' && tokens.scope && !tokens.scope.includes('calendar.events')) return back('permission');
    if (!tokens.refresh_token) { console.error(`No refresh_token returned from ${p}`); return back('error'); }

    const exists = await db`SELECT 1 FROM tenants WHERE id = ${tenantId} LIMIT 1`;
    if (!exists[0]) return back('error');
    const sealed = sealToken(tokens.refresh_token);
    if (p === 'google') await db`UPDATE tenants SET google_cal_refresh_token = ${sealed}, google_cal_enabled = TRUE, google_cal_error = NULL WHERE id = ${tenantId}`;
    else await db`UPDATE tenants SET outlook_cal_refresh_token = ${sealed}, outlook_cal_enabled = TRUE, outlook_cal_error = NULL WHERE id = ${tenantId}`;
    backfillTenant(tenantId).catch((err) => console.error('Calendar backfill failed:', err));
    return back('connected');
  });

  app.delete('/disconnect', requireAuth, requireTenant, async (c) => {
    await disconnectCalendar((c.get('tenant') as { id: string }).id, p);
    return c.json({ disconnected: true });
  });

  return app;
}

// GET /api/calendar-sync/status, PATCH /api/calendar-sync/settings
const status = new Hono();
status.get('/status', requireAuth, requireTenant, async (c) => c.json(await calendarStatus((c.get('tenant') as { id: string }).id)));
status.patch('/settings', requireAuth, requireTenant, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { block_busy?: boolean };
  if (typeof body.block_busy !== 'boolean') return c.json({ error: 'Invalid request' }, 400);
  await db`UPDATE tenants SET calendar_block_busy = ${body.block_busy} WHERE id = ${(c.get('tenant') as { id: string }).id}`;
  return c.json({ ok: true });
});
export { status as calendarStatusRoutes };
