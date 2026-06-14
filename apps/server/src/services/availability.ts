import { addMinutes, format, isBefore, parse, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export interface AvailabilityWindow {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export type WeeklyAvailability = Record<string, AvailabilityWindow[]>;

export interface ExistingBooking {
  start_time: Date | string;
  end_time: Date | string;
}

export interface TimeSlot {
  start: string; // ISO UTC
  end: string;   // ISO UTC
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Computes available booking slots for a given date, staff availability,
 * service duration + buffer, and existing bookings — all in the tenant's timezone.
 */
export function computeAvailableSlots(params: {
  date: string; // "yyyy-MM-dd"
  timezone: string;
  availability: WeeklyAvailability;
  durationMinutes: number;
  bufferMinutes: number;
  existingBookings: ExistingBooking[];
  slotIntervalMinutes?: number;
}): TimeSlot[] {
  const {
    date,
    timezone,
    availability,
    durationMinutes,
    bufferMinutes,
    existingBookings,
    slotIntervalMinutes = 15,
  } = params;

  const dayDate = parse(date, 'yyyy-MM-dd', new Date());
  const weekdayKey = WEEKDAY_KEYS[dayDate.getDay()];
  const windows = availability[weekdayKey] || [];

  if (windows.length === 0) return [];

  const totalDuration = durationMinutes + bufferMinutes;

  // Convert existing bookings to UTC Date objects for overlap checks
  const bookedRanges = existingBookings.map((b) => ({
    start: new Date(b.start_time),
    end: new Date(b.end_time),
  }));

  const slots: TimeSlot[] = [];

  for (const window of windows) {
    // Build local datetime strings, e.g. "2026-06-14 09:00:00"
    const windowStartLocal = `${date} ${window.start}:00`;
    const windowEndLocal = `${date} ${window.end}:00`;

    // Convert local (tenant timezone) wall-clock time to a real UTC instant
    let cursor = fromZonedTime(windowStartLocal, timezone);
    const windowEnd = fromZonedTime(windowEndLocal, timezone);

    while (true) {
      const slotEnd = addMinutes(cursor, durationMinutes);
      const slotEndWithBuffer = addMinutes(cursor, totalDuration);

      if (isBefore(windowEnd, slotEndWithBuffer)) break;

      const overlaps = bookedRanges.some(
        (b) => cursor < b.end && slotEnd > b.start
      );

      if (!overlaps) {
        slots.push({
          start: cursor.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      cursor = addMinutes(cursor, slotIntervalMinutes);
    }
  }

  return slots;
}

/**
 * Helper: returns the start/end of a given local date (in tenant timezone) as UTC Date range,
 * useful for querying existing bookings for that day.
 */
export function getDayUtcRange(date: string, timezone: string): { start: Date; end: Date } {
  const dayStart = startOfDay(parse(date, 'yyyy-MM-dd', new Date()));
  const localStart = format(dayStart, 'yyyy-MM-dd') + ' 00:00:00';
  const localEnd = format(dayStart, 'yyyy-MM-dd') + ' 23:59:59';

  return {
    start: fromZonedTime(localStart, timezone),
    end: fromZonedTime(localEnd, timezone),
  };
}

// re-export for convenience in route handlers
export { toZonedTime };
