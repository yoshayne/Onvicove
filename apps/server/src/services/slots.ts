import { db } from '../db/client';
import { computeAvailableSlots, getDayUtcRange } from './availability';
import type { TimeSlot } from './availability';
import { resolveAvailability } from './businessHours';
import { addDays, format, parse } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Bookings that currently hold their time. Cancelled / no-show ones don't, and neither does an unpaid attempt
 * (awaiting_payment) once it is 30 minutes old: abandoned checkouts must not block the calendar forever.
 */
export const UNPAID_HOLD_MINUTES = 30;
export const holdsTime = () =>
  db`(status NOT IN ('cancelled', 'no_show') AND NOT (status = 'awaiting_payment' AND created_at < NOW() - INTERVAL '30 minutes'))`;

export type SlotsReason = 'no_hours' | 'closed' | 'full' | 'blocked' | null;

export interface TenantForSlots {
  id: string;
  timezone?: string | null;
  business_hours?: unknown;
  page_content?: Record<string, unknown> | null;
  /** Earliest a customer can book from now (minutes). Default 60. */
  booking_notice_minutes?: number | null;
}

export type SlotsResult = {
  slots: TimeSlot[];
  staffId: string | null;
  timezone: string;
  reason: SlotsReason;
  cityLabel: string | null;
  blockedLabel: string | null;
};

type StaffRow = Record<string, unknown>;

/** Active staff who can do this service. A person with no services ticked does everything; otherwise only what's ticked. */
export async function eligibleStaff(tenantId: string, serviceId?: string): Promise<StaffRow[]> {
  const all = await db`SELECT * FROM staff WHERE tenant_id = ${tenantId} AND is_active = TRUE ORDER BY created_at ASC`;
  if (!serviceId || all.length === 0) return all;
  const links = await db`SELECT staff_id, service_id FROM staff_services WHERE staff_id = ANY(${all.map((st) => st.id as string)})`;
  const byStaff = new Map<string, Set<string>>();
  for (const l of links) {
    const set = byStaff.get(l.staff_id as string) ?? new Set<string>();
    set.add(l.service_id as string);
    byStaff.set(l.staff_id as string, set);
  }
  return all.filter((st) => {
    const set = byStaff.get(st.id as string);
    return !set || set.size === 0 || set.has(serviceId);
  });
}

/** Slots for one person (or, with no staff, the whole business) on one day. Does not apply "not in the past". */
async function slotsForResource(
  tenant: TenantForSlots,
  service: { duration_minutes: number; buffer_minutes?: number | null },
  date: string,
  staff: StaffRow | undefined,
  excludeBookingId?: string | null,
): Promise<{ slots: TimeSlot[]; reason: SlotsReason }> {
  const timezone = tenant.timezone || 'America/New_York';
  const { availability, source } = resolveAvailability(staff?.availability, tenant);
  if (source === 'none') return { slots: [], reason: 'no_hours' };

  // Day plus the early hours of the next day, in case a window runs past midnight
  const { start } = getDayUtcRange(date, timezone);
  const { end } = getDayUtcRange(format(addDays(parse(date, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd'), timezone);

  const existing = staff
    ? await db`
        SELECT start_time, end_time FROM bookings
        WHERE tenant_id = ${tenant.id}
          AND (staff_id = ${staff.id as string} OR staff_id IS NULL)
          AND id <> ${excludeBookingId ?? '00000000-0000-0000-0000-000000000000'}
          AND ${holdsTime()}
          AND start_time < ${end.toISOString()} AND end_time > ${start.toISOString()}`
    : await db`
        SELECT start_time, end_time FROM bookings
        WHERE tenant_id = ${tenant.id}
          AND id <> ${excludeBookingId ?? '00000000-0000-0000-0000-000000000000'}
          AND ${holdsTime()}
          AND start_time < ${end.toISOString()} AND end_time > ${start.toISOString()}`;

  const args = { date, timezone, durationMinutes: service.duration_minutes, bufferMinutes: service.buffer_minutes ?? 0 };
  const slots = computeAvailableSlots({
    ...args,
    availability,
    existingBookings: existing.map((b) => ({ start_time: b.start_time as string, end_time: b.end_time as string })),
  });

  let reason: SlotsReason = null;
  if (slots.length === 0) {
    const open = computeAvailableSlots({ ...args, availability, existingBookings: [] });
    reason = open.length === 0 ? 'closed' : 'full';
  }
  return { slots, reason };
}

/**
 * Bookable slots for one service on one day.
 * - A specific staffId: that person's hours and bookings.
 * - No staffId ("any available"): the combined open times of everyone who can do the service, so a slot shows if
 *   at least one of them is free. A business with no staff is a single resource.
 * Times that have already started, or start sooner than the minimum notice, are never offered.
 */
export async function slotsForService(params: {
  tenant: TenantForSlots;
  service: { id?: string; duration_minutes: number; buffer_minutes?: number | null };
  date: string;
  staffId?: string | null;
  /** Skip the "not in the past" filter (owner-made bookings) */
  allowPast?: boolean;
  /** A booking being moved: its own time doesn't count as taken */
  excludeBookingId?: string | null;
}): Promise<SlotsResult> {
  const { tenant, service, date, staffId } = params;
  const timezone = tenant.timezone || 'America/New_York';

  // Calendar ranges covering this date: blocked time off wins over a city range
  const ranges = await db`
    SELECT kind, city_label FROM city_schedules
    WHERE tenant_id = ${tenant.id} AND date_from <= ${date}::date AND date_to >= ${date}::date
    ORDER BY (kind = 'blocked') DESC, date_from
    LIMIT 1
  `;
  const range = ranges[0] as { kind: string; city_label: string | null } | undefined;
  const cityLabel = range?.kind === 'city' ? range.city_label : null;
  if (range?.kind === 'blocked') {
    return { slots: [], staffId: null, timezone, reason: 'blocked', cityLabel: null, blockedLabel: range.city_label };
  }

  let pool: (StaffRow | undefined)[];
  if (staffId) {
    const rows = await db`SELECT * FROM staff WHERE id = ${staffId} AND tenant_id = ${tenant.id} AND is_active = TRUE LIMIT 1`;
    if (!rows[0]) return { slots: [], staffId: null, timezone, reason: null, cityLabel, blockedLabel: null };
    pool = [rows[0]];
  } else {
    const people = await eligibleStaff(tenant.id, service.id);
    if (people.length > 0) pool = people;
    else {
      // Staff exist but none can do this service -> nothing to offer; no staff at all -> the business itself
      const anyStaff = await db`SELECT 1 FROM staff WHERE tenant_id = ${tenant.id} AND is_active = TRUE LIMIT 1`;
      if (anyStaff[0]) return { slots: [], staffId: null, timezone, reason: 'closed', cityLabel, blockedLabel: null };
      pool = [undefined];
    }
  }

  const results = await Promise.all(pool.map((st) => slotsForResource(tenant, service, date, st, params.excludeBookingId)));
  const merged = new Map<string, TimeSlot>();
  for (const r of results) for (const sl of r.slots) if (!merged.has(sl.start)) merged.set(sl.start, sl);
  let slots = [...merged.values()].sort((a, b) => a.start.localeCompare(b.start));

  if (!params.allowPast) {
    const notice = tenant.booking_notice_minutes ?? 60;
    const earliest = Date.now() + notice * 60_000;
    slots = slots.filter((sl) => new Date(sl.start).getTime() >= earliest);
  }

  let reason: SlotsReason = null;
  if (slots.length === 0) {
    if (results.every((r) => r.reason === 'no_hours')) reason = 'no_hours';
    else if (results.every((r) => r.reason === 'closed') && results.some((r) => r.slots.length === 0)) reason = 'closed';
    else reason = 'full';
  }
  return { slots, staffId: pool.length === 1 ? ((pool[0]?.id as string | undefined) ?? null) : null, timezone, reason, cityLabel, blockedLabel: null };
}

/**
 * Which person takes a booking at this time. A chosen staffId must be free; "any" picks the first eligible person
 * who is. Returns null if nobody is free (or the time isn't actually offered). A business with no staff returns
 * { staffId: null }.
 */
export async function pickStaffForSlot(params: {
  tenant: TenantForSlots;
  service: { id?: string; duration_minutes: number; buffer_minutes?: number | null };
  startISO: string;
  staffId?: string | null;
  allowPast?: boolean;
  excludeBookingId?: string | null;
}): Promise<{ staffId: string | null } | null> {
  const { tenant, service, startISO, staffId } = params;
  const timezone = tenant.timezone || 'America/New_York';
  const date = formatInTimeZone(new Date(startISO), timezone, 'yyyy-MM-dd');
  const candidates: (string | null)[] = [];
  if (staffId) candidates.push(staffId);
  else {
    const people = await eligibleStaff(tenant.id, service.id);
    if (people.length === 0) candidates.push(null);
    else for (const p of people) candidates.push(p.id as string);
  }
  const wanted = new Date(startISO).getTime();
  // A window that runs past midnight lists its after-midnight times under the previous day, so look at both
  const prevDate = format(addDays(parse(date, 'yyyy-MM-dd', new Date()), -1), 'yyyy-MM-dd');
  for (const id of candidates) {
    for (const d of [date, prevDate]) {
      const r = await slotsForService({ tenant, service, date: d, staffId: id, allowPast: params.allowPast, excludeBookingId: params.excludeBookingId });
      if (r.slots.some((sl) => new Date(sl.start).getTime() === wanted)) return { staffId: id };
    }
  }
  return null;
}
