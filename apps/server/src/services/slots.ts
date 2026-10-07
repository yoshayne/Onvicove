import { db } from '../db/client';
import { computeAvailableSlots, getDayUtcRange } from './availability';
import type { TimeSlot } from './availability';
import { resolveAvailability } from './businessHours';
import { addDays, format, parse } from 'date-fns';

export type SlotsReason = 'no_hours' | 'closed' | 'full' | 'blocked' | null;

export interface TenantForSlots {
  id: string;
  timezone?: string | null;
  business_hours?: unknown;
  page_content?: Record<string, unknown> | null;
}

/**
 * Bookable slots for one service on one day.
 * Hours come from the staff member if they set any, otherwise the business's booking hours.
 * A business with no staff at all is a single resource that can still take bookings.
 */
export async function slotsForService(params: {
  tenant: TenantForSlots;
  service: { duration_minutes: number; buffer_minutes?: number | null };
  date: string;
  staffId?: string | null;
}): Promise<{ slots: TimeSlot[]; staffId: string | null; timezone: string; reason: SlotsReason; cityLabel: string | null; blockedLabel: string | null }> {
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

  let staff: Record<string, unknown> | undefined;
  if (staffId) {
    const rows = await db`SELECT * FROM staff WHERE id = ${staffId} AND tenant_id = ${tenant.id} AND is_active = TRUE LIMIT 1`;
    staff = rows[0];
    if (!staff) return { slots: [], staffId: null, timezone, reason: null, cityLabel, blockedLabel: null };
  } else {
    const rows = await db`SELECT * FROM staff WHERE tenant_id = ${tenant.id} AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`;
    staff = rows[0];
  }

  const { availability, source } = resolveAvailability(staff?.availability, tenant);
  if (source === 'none') return { slots: [], staffId: (staff?.id as string) ?? null, timezone, reason: 'no_hours', cityLabel, blockedLabel: null };

  // Day plus the early hours of the next day, in case a window runs past midnight
  const { start } = getDayUtcRange(date, timezone);
  const { end } = getDayUtcRange(format(addDays(parse(date, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd'), timezone);

  const existing = staff
    ? await db`
        SELECT start_time, end_time FROM bookings
        WHERE tenant_id = ${tenant.id}
          AND (staff_id = ${staff.id as string} OR staff_id IS NULL)
          AND status NOT IN ('cancelled', 'no_show')
          AND start_time < ${end.toISOString()} AND end_time > ${start.toISOString()}`
    : await db`
        SELECT start_time, end_time FROM bookings
        WHERE tenant_id = ${tenant.id}
          AND status NOT IN ('cancelled', 'no_show')
          AND start_time < ${end.toISOString()} AND end_time > ${start.toISOString()}`;

  const args = {
    date,
    timezone,
    durationMinutes: service.duration_minutes,
    bufferMinutes: service.buffer_minutes ?? 0,
  };
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
  return { slots, staffId: (staff?.id as string) ?? null, timezone, reason, cityLabel, blockedLabel: null };
}
