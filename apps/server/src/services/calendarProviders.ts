export type ProviderId = 'google' | 'outlook';
export interface BusyPeriod { start_time: string; end_time: string }
export interface EventInput { summary: string; description: string; startIso: string; endIso: string; timezone: string; bookingId: string }

/** The refresh token is no longer valid: the store has to reconnect */
export class ReconnectNeeded extends Error {}
/** The event we tried to change is gone from their calendar */
export class EventGone extends Error {}

const OUR_CATEGORY = 'Shop Suite Direct';

interface Access { token: string; newRefreshToken?: string }

export interface Provider {
  id: ProviderId;
  configured(): boolean;
  accessToken(refreshToken: string): Promise<Access>;
  create(access: string, ev: EventInput): Promise<string>;
  update(access: string, id: string, ev: EventInput): Promise<void>;
  remove(access: string, id: string): Promise<void>;
  busy(access: string, fromIso: string, toIso: string): Promise<BusyPeriod[]>;
}

async function readError(res: Response): Promise<string> {
  return (await res.text().catch(() => '')).slice(0, 300);
}

// ── Google ───────────────────────────────────────────────────────────────────
const G = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export const google: Provider = {
  id: 'google',
  configured: () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
  async accessToken(refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    if (!res.ok) {
      const text = await readError(res);
      if (res.status === 400 || res.status === 401) throw new ReconnectNeeded(text);
      throw new Error(`Google token refresh failed (${res.status}): ${text}`);
    }
    return { token: ((await res.json()) as { access_token: string }).access_token };
  },
  async create(access, ev) {
    const res = await fetch(G, {
      method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: ev.summary, description: ev.description, start: { dateTime: ev.startIso, timeZone: ev.timezone }, end: { dateTime: ev.endIso, timeZone: ev.timezone }, extendedProperties: { private: { ssdBookingId: ev.bookingId } } }),
    });
    if (res.status === 401 || res.status === 403) throw new ReconnectNeeded(await readError(res));
    if (!res.ok) throw new Error(`Google event create failed (${res.status}): ${await readError(res)}`);
    return ((await res.json()) as { id: string }).id;
  },
  async update(access, id, ev) {
    const res = await fetch(`${G}/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: ev.summary, description: ev.description, start: { dateTime: ev.startIso, timeZone: ev.timezone }, end: { dateTime: ev.endIso, timeZone: ev.timezone }, status: 'confirmed' }),
    });
    if (res.status === 404 || res.status === 410) throw new EventGone();
    if (res.status === 401 || res.status === 403) throw new ReconnectNeeded(await readError(res));
    if (!res.ok) throw new Error(`Google event update failed (${res.status}): ${await readError(res)}`);
  },
  async remove(access, id) {
    const res = await fetch(`${G}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${access}` } });
    if (res.status === 404 || res.status === 410 || res.ok) return;
    if (res.status === 401 || res.status === 403) throw new ReconnectNeeded(await readError(res));
    throw new Error(`Google event delete failed (${res.status}): ${await readError(res)}`);
  },
  async busy(access, fromIso, toIso) {
    const params = new URLSearchParams({ timeMin: fromIso, timeMax: toIso, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
    const res = await fetch(`${G}?${params}`, { headers: { Authorization: `Bearer ${access}` } });
    if (res.status === 401 || res.status === 403) throw new ReconnectNeeded(await readError(res));
    if (!res.ok) throw new Error(`Google events list failed (${res.status})`);
    const data = (await res.json()) as { items?: { status?: string; transparency?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; extendedProperties?: { private?: Record<string, string> } }[] };
    const out: BusyPeriod[] = [];
    for (const e of data.items ?? []) {
      if (e.status === 'cancelled' || e.transparency === 'transparent') continue; // cancelled, or shown as "free"
      if (e.extendedProperties?.private?.ssdBookingId) continue; // our own booking events are not "busy" from elsewhere
      const s = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00Z` : null);
      const en = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00Z` : null);
      if (s && en) out.push({ start_time: new Date(s).toISOString(), end_time: new Date(en).toISOString() });
    }
    return out;
  },
};

// ── Outlook / Microsoft Graph ────────────────────────────────────────────────
const M = 'https://graph.microsoft.com/v1.0/me';
const msTenant = () => process.env.MICROSOFT_TENANT_ID || 'common';

export const outlook: Provider = {
  id: 'outlook',
  configured: () => !!process.env.MICROSOFT_CLIENT_ID && !!process.env.MICROSOFT_CLIENT_SECRET,
  async accessToken(refreshToken) {
    const res = await fetch(`https://login.microsoftonline.com/${msTenant()}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: process.env.MICROSOFT_CLIENT_ID!, client_secret: process.env.MICROSOFT_CLIENT_SECRET!, refresh_token: refreshToken, grant_type: 'refresh_token', scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access' }),
    });
    if (!res.ok) {
      const text = await readError(res);
      if (res.status === 400 || res.status === 401) throw new ReconnectNeeded(text);
      throw new Error(`Microsoft token refresh failed (${res.status}): ${text}`);
    }
    const j = (await res.json()) as { access_token: string; refresh_token?: string };
    return { token: j.access_token, newRefreshToken: j.refresh_token }; // Microsoft hands out a fresh refresh token each time
  },
  async create(access, ev) {
    const res = await fetch(`${M}/events`, {
      method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: ev.summary, body: { contentType: 'Text', content: ev.description }, start: { dateTime: ev.startIso.replace(/Z$/, ''), timeZone: 'UTC' }, end: { dateTime: ev.endIso.replace(/Z$/, ''), timeZone: 'UTC' }, categories: [OUR_CATEGORY] }),
    });
    if (res.status === 401 || res.status === 403) throw new ReconnectNeeded(await readError(res));
    if (!res.ok) throw new Error(`Outlook event create failed (${res.status}): ${await readError(res)}`);
    return ((await res.json()) as { id: string }).id;
  },
  async update(access, id, ev) {
    const res = await fetch(`${M}/events/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: ev.summary, body: { contentType: 'Text', content: ev.description }, start: { dateTime: ev.startIso.replace(/Z$/, ''), timeZone: 'UTC' }, end: { dateTime: ev.endIso.replace(/Z$/, ''), timeZone: 'UTC' } }),
    });
    if (res.status === 404) throw new EventGone();
    if (res.status === 401 || res.status === 403) throw new ReconnectNeeded(await readError(res));
    if (!res.ok) throw new Error(`Outlook event update failed (${res.status}): ${await readError(res)}`);
  },
  async remove(access, id) {
    const res = await fetch(`${M}/events/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${access}` } });
    if (res.status === 404 || res.ok) return;
    if (res.status === 401 || res.status === 403) throw new ReconnectNeeded(await readError(res));
    throw new Error(`Outlook event delete failed (${res.status}): ${await readError(res)}`);
  },
  async busy(access, fromIso, toIso) {
    const params = new URLSearchParams({ startDateTime: fromIso, endDateTime: toIso, $select: 'start,end,showAs,categories,isCancelled', $top: '100' });
    const res = await fetch(`${M}/calendarView?${params}`, { headers: { Authorization: `Bearer ${access}`, Prefer: 'outlook.timezone="UTC"' } });
    if (res.status === 401 || res.status === 403) throw new ReconnectNeeded(await readError(res));
    if (!res.ok) throw new Error(`Outlook calendarView failed (${res.status})`);
    const data = (await res.json()) as { value?: { start: { dateTime: string }; end: { dateTime: string }; showAs: string; categories?: string[]; isCancelled?: boolean }[] };
    return (data.value ?? [])
      .filter((e) => !e.isCancelled && ['busy', 'tentative', 'oof'].includes(e.showAs) && !(e.categories ?? []).includes(OUR_CATEGORY))
      .map((e) => ({ start_time: new Date(`${e.start.dateTime.replace(/Z$/, '')}Z`).toISOString(), end_time: new Date(`${e.end.dateTime.replace(/Z$/, '')}Z`).toISOString() }));
  },
};

export const providers: Record<ProviderId, Provider> = { google, outlook };
