import { db, redis } from '../db/client';
import { openToken, sealToken } from '../lib/calendarAuth';
import { EventGone, ReconnectNeeded, providers, type BusyPeriod, type EventInput, type ProviderId } from './calendarProviders';

type Row = Record<string, unknown>;
const IDS: ProviderId[] = ['google', 'outlook'];
const col = (p: ProviderId, what: 'refresh_token' | 'enabled' | 'error') => `${p}_cal_${what}`;

const isConnected = (t: Row, p: ProviderId) => !!t[col(p, 'enabled')] && !!t[col(p, 'refresh_token')] && !t[col(p, 'error')];

async function markError(tenantId: string, p: ProviderId, error: string | null) {
  await db`UPDATE tenants SET ${db(col(p, 'error'))} = ${error} WHERE id = ${tenantId}`;
}

/** A working access token for the store's calendar, or null if it must reconnect */
async function accessFor(t: Row, p: ProviderId): Promise<string | null> {
  const refresh = openToken(t[col(p, 'refresh_token')] as string | null);
  if (!refresh) { await markError(t.id as string, p, 'reconnect'); return null; }
  try {
    const a = await providers[p].accessToken(refresh);
    if (a.newRefreshToken) await db`UPDATE tenants SET ${db(col(p, 'refresh_token'))} = ${sealToken(a.newRefreshToken)} WHERE id = ${t.id as string}`;
    return a.token;
  } catch (err) {
    if (err instanceof ReconnectNeeded) { await markError(t.id as string, p, 'reconnect'); return null; }
    throw err;
  }
}

// ── Booking → their calendar ────────────────────────────────────────────────
export async function syncBooking(bookingId: string): Promise<void> {
  const lock = await redis.set(`calsync:${bookingId}`, '1', 'EX', 30, 'NX').catch(() => 'OK');
  if (!lock) return;
  const b = (await db`SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.id = ${bookingId}`)[0];
  if (!b) return;
  const t = (await db`SELECT * FROM tenants WHERE id = ${b.tenant_id as string}`)[0];
  if (!t) return;

  const wanted = b.status === 'confirmed';
  const ev: EventInput = {
    summary: `${b.service_name as string}: ${b.customer_name as string}`,
    description: [`Customer: ${b.customer_name as string}`, `Email: ${b.customer_email as string}`, b.customer_phone ? `Phone: ${b.customer_phone as string}` : '', b.notes ? `Notes: ${b.notes as string}` : '', '', 'Booked through Shop Suite Direct'].filter((l, i) => l !== '' || i > 0).join('\n'),
    startIso: new Date(b.start_time as string).toISOString(),
    endIso: new Date(b.end_time as string).toISOString(),
    timezone: (t.timezone as string) || 'America/New_York',
    bookingId,
  };

  let allOk = true;
  for (const p of IDS) {
    if (!isConnected(t, p)) continue;
    const idCol = `${p}_event_id`;
    const existing = b[idCol] as string | null;
    if (!wanted && !existing) continue;
    try {
      const access = await accessFor(t, p);
      if (!access) { allOk = false; continue; }
      if (wanted) {
        if (!existing) {
          const id = await providers[p].create(access, ev);
          await db`UPDATE bookings SET ${db(idCol)} = ${id} WHERE id = ${bookingId}`;
        } else {
          try {
            await providers[p].update(access, existing, ev);
          } catch (err) {
            if (!(err instanceof EventGone)) throw err;
            const id = await providers[p].create(access, ev); // they deleted it by hand: put it back
            await db`UPDATE bookings SET ${db(idCol)} = ${id} WHERE id = ${bookingId}`;
          }
        }
      } else {
        await providers[p].remove(access, existing!);
        await db`UPDATE bookings SET ${db(idCol)} = NULL WHERE id = ${bookingId}`;
      }
    } catch (err) {
      allOk = false;
      if (err instanceof ReconnectNeeded) await markError(t.id as string, p, 'reconnect');
      else console.error(`Calendar sync (${p}) failed for booking ${bookingId}:`, err instanceof Error ? err.message : err);
    }
  }
  if (allOk) await db`UPDATE bookings SET calendar_synced_at = NOW() WHERE id = ${bookingId}`;
}

/** Fire and forget: never lets a calendar problem affect a booking */
export function queueCalendarSync(bookingId: string): void {
  syncBooking(bookingId).catch((err) => console.error('Calendar sync error:', err));
}

/** Bookings that still need to reach their calendar (new, changed, or missed): run every few minutes */
export async function syncPendingBookings(limit = 150): Promise<number> {
  const rows = await db`
    SELECT b.id FROM bookings b JOIN tenants t ON t.id = b.tenant_id
    WHERE ((t.google_cal_enabled AND t.google_cal_error IS NULL) OR (t.outlook_cal_enabled AND t.outlook_cal_error IS NULL))
      AND (b.calendar_synced_at IS NULL OR b.updated_at > b.calendar_synced_at)
      AND b.start_time > NOW() - INTERVAL '1 day'
    ORDER BY b.updated_at DESC LIMIT ${limit}`;
  for (const r of rows) {
    try { await syncBooking(r.id as string); } catch (err) { console.error('Pending calendar sync failed:', err); }
  }
  return rows.length;
}

/** Just connected: send every upcoming booking across */
export async function backfillTenant(tenantId: string): Promise<void> {
  await db`UPDATE bookings SET calendar_synced_at = NULL WHERE tenant_id = ${tenantId} AND start_time > NOW()`;
  await syncPendingBookings(200);
}

// ── Their calendar → our availability ───────────────────────────────────────
/** Times blocked by events already on the store's own calendars. A calendar problem never stops bookings (it just shows nothing). */
export async function externalBusy(tenantId: string, fromIso: string, toIso: string): Promise<BusyPeriod[]> {
  const t = (await db`SELECT id, calendar_block_busy, google_cal_enabled, google_cal_refresh_token, google_cal_error, outlook_cal_enabled, outlook_cal_refresh_token, outlook_cal_error FROM tenants WHERE id = ${tenantId}`)[0];
  if (!t || !t.calendar_block_busy || !IDS.some((p) => isConnected(t, p))) return [];
  const key = `calbusy:${tenantId}:${fromIso}:${toIso}`;
  const cached = await redis.get(key).catch(() => null);
  if (cached) return JSON.parse(cached) as BusyPeriod[];
  const out: BusyPeriod[] = [];
  let failed = false;
  for (const p of IDS) {
    if (!isConnected(t, p)) continue;
    try {
      const access = await accessFor(t, p);
      if (access) out.push(...(await providers[p].busy(access, fromIso, toIso)));
    } catch (err) {
      failed = true;
      console.error(`Calendar busy lookup (${p}) failed:`, err instanceof Error ? err.message : err);
    }
  }
  await redis.set(key, JSON.stringify(out), 'EX', failed ? 60 : 120).catch(() => undefined);
  return out;
}

// ── Connection state for the dashboard ──────────────────────────────────────
export async function calendarStatus(tenantId: string) {
  const t = (await db`SELECT google_cal_enabled, google_cal_refresh_token, google_cal_error, outlook_cal_enabled, outlook_cal_refresh_token, outlook_cal_error, calendar_block_busy FROM tenants WHERE id = ${tenantId}`)[0] ?? {};
  const state = (p: ProviderId) => ({
    available: providers[p].configured(),
    connected: !!t[col(p, 'enabled')] && !!t[col(p, 'refresh_token')],
    needs_reconnect: !!t[col(p, 'error')],
  });
  return { google: state('google'), outlook: state('outlook'), block_busy: t.calendar_block_busy !== false };
}

export async function disconnectCalendar(tenantId: string, p: ProviderId): Promise<void> {
  const t = (await db`SELECT * FROM tenants WHERE id = ${tenantId}`)[0];
  const refresh = openToken(t?.[col(p, 'refresh_token')] as string | null);
  if (p === 'google' && refresh) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh)}`, { method: 'POST' }).catch(() => undefined);
  await db`UPDATE tenants SET ${db(col(p, 'refresh_token'))} = NULL, ${db(col(p, 'enabled'))} = FALSE, ${db(col(p, 'error'))} = NULL WHERE id = ${tenantId}`;
}
