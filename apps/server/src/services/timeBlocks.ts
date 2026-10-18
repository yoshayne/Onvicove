import { z } from 'zod';
import { fromZonedTime } from 'date-fns-tz';
import { formatInTimeZone } from 'date-fns-tz';
import { db } from '../db/client';
import { getDayUtcRange } from './availability';

export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** One piece of repeating or part-of-day time off */
export const timeBlockInput = z.object({
  /** 0 = Sunday ... 6 = Saturday; leave out for every day */
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).nullable().optional(),
  start: hhmm.nullable().optional(),
  end: hhmm.nullable().optional(),
  date_from: ymd,
  /** null or missing = ongoing */
  date_to: ymd.nullable().optional(),
  label: z.string().trim().max(120).nullable().optional(),
}).refine((b) => (b.start == null) === (b.end == null), { message: 'Give both a start and an end time, or neither' })
  .refine((b) => b.start == null || b.end == null || b.start < b.end, { message: 'The end time must be after the start time' })
  .refine((b) => !b.date_to || b.date_to >= b.date_from, { message: 'The end date must be on or after the start date' });
export type TimeBlockInput = z.infer<typeof timeBlockInput>;

export interface TimeBlockRow {
  id: string;
  weekdays: number[] | null;
  start_time: string | null;
  end_time: string | null;
  date_from: string;
  date_to: string | null;
  label: string | null;
  created_via: string;
}

const parseDays = (s: string | null): number[] | null => (s ? [...new Set(s.split(',').map(Number).filter((n) => n >= 0 && n <= 6))].sort() : null);

function toRow(r: Record<string, unknown>): TimeBlockRow {
  return {
    id: r.id as string,
    weekdays: parseDays(r.weekdays as string | null),
    start_time: r.start_time as string | null,
    end_time: r.end_time as string | null,
    date_from: r.date_from as string,
    date_to: (r.date_to as string | null) ?? null,
    label: (r.label as string | null) ?? null,
    created_via: r.created_via as string,
  };
}

const COLS = db`id, weekdays, start_time, end_time, date_from::text AS date_from, date_to::text AS date_to, label, created_via`;

export async function listTimeBlocks(tenantId: string): Promise<TimeBlockRow[]> {
  const rows = await db`SELECT ${COLS} FROM time_blocks WHERE tenant_id = ${tenantId} AND (date_to IS NULL OR date_to >= CURRENT_DATE) ORDER BY date_from, start_time NULLS FIRST`;
  return rows.map(toRow);
}

export async function createTimeBlock(tenantId: string, b: TimeBlockInput, via: 'manual' | 'assistant'): Promise<TimeBlockRow> {
  const days = b.weekdays?.length ? [...new Set(b.weekdays)].sort().join(',') : null;
  const rows = await db`
    INSERT INTO time_blocks (tenant_id, weekdays, start_time, end_time, date_from, date_to, label, created_via)
    VALUES (${tenantId}, ${days}, ${b.start ?? null}, ${b.end ?? null}, ${b.date_from}::date, ${b.date_to ?? null}, ${b.label?.trim() || null}, ${via})
    RETURNING ${COLS}
  `;
  return toRow(rows[0]);
}

/** Blocks that could apply on this date (before the weekday check) */
export async function blocksOnDate(tenantId: string, date: string): Promise<TimeBlockRow[]> {
  const rows = await db`SELECT ${COLS} FROM time_blocks WHERE tenant_id = ${tenantId} AND date_from <= ${date}::date AND (date_to IS NULL OR date_to >= ${date}::date)`;
  return rows.map(toRow);
}

/** Does the block apply on this calendar date? */
export function appliesOn(b: Pick<TimeBlockRow, 'weekdays' | 'date_from' | 'date_to'>, date: string): boolean {
  if (date < b.date_from || (b.date_to && date > b.date_to)) return false;
  if (!b.weekdays) return true;
  return b.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}

/** The blocked stretches of one local day, as UTC instants (whole-day blocks cover the whole day) */
export function blockIntervals(blocks: TimeBlockRow[], date: string, timezone: string): { start_time: string; end_time: string }[] {
  const out: { start_time: string; end_time: string }[] = [];
  for (const b of blocks) {
    if (!appliesOn(b, date)) continue;
    if (b.start_time && b.end_time) {
      out.push({
        start_time: fromZonedTime(`${date} ${b.start_time}:00`, timezone).toISOString(),
        end_time: fromZonedTime(`${date} ${b.end_time}:00`, timezone).toISOString(),
      });
    } else {
      const r = getDayUtcRange(date, timezone);
      out.push({ start_time: r.start.toISOString(), end_time: r.end.toISOString() });
    }
  }
  return out;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function clock(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`;
}

function dateLabel(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function daysLabel(days: number[] | null): string {
  if (!days || days.length === 7) return 'Every day';
  const sorted = [...days].sort();
  // Collapse a run like Mon-Fri
  const mondayFirst = sorted.map((d) => (d + 6) % 7).sort((a, b) => a - b);
  const isRun = mondayFirst.every((d, i) => i === 0 || d === mondayFirst[i - 1] + 1);
  if (isRun && sorted.length >= 3) return `${SHORT[(mondayFirst[0] + 1) % 7]} to ${SHORT[(mondayFirst[mondayFirst.length - 1] + 1) % 7]}`;
  return sorted.map((d) => (sorted.length === 1 ? DAY_NAMES[d] + 's' : SHORT[d])).join(', ');
}

/** Plain-English description, written by us (never by the AI) */
export function describeBlock(b: Pick<TimeBlockRow, 'weekdays' | 'start_time' | 'end_time' | 'date_from' | 'date_to'>): string {
  const when = b.start_time && b.end_time ? `${clock(b.start_time)} to ${clock(b.end_time)}` : 'all day';
  const single = b.date_to && b.date_to === b.date_from;
  const days = single && !b.weekdays ? dateLabel(b.date_from) : daysLabel(b.weekdays);
  const span = single ? '' : b.date_to ? `, ${dateLabel(b.date_from)} to ${dateLabel(b.date_to)}` : `, starting ${dateLabel(b.date_from)}, ongoing`;
  return `${days}, ${when}${span}`;
}

/** Upcoming bookings that fall inside a block (blocking never cancels them: the owner is told) */
export async function blockConflicts(tenantId: string, timezone: string, b: TimeBlockInput): Promise<{ count: number; examples: string[] }> {
  const bookings = await db`
    SELECT b.start_time, b.end_time, b.customer_name FROM bookings b
    WHERE b.tenant_id = ${tenantId} AND b.status NOT IN ('cancelled', 'no_show') AND b.end_time > NOW()
    ORDER BY b.start_time LIMIT 2000
  `;
  const out: string[] = [];
  let count = 0;
  for (const bk of bookings) {
    const date = formatInTimeZone(new Date(bk.start_time as string), timezone, 'yyyy-MM-dd');
    if (!appliesOn({ weekdays: b.weekdays?.length ? [...b.weekdays].sort() : null, date_from: b.date_from, date_to: b.date_to ?? null }, date)) continue;
    if (b.start && b.end) {
      const s = fromZonedTime(`${date} ${b.start}:00`, timezone).getTime();
      const e = fromZonedTime(`${date} ${b.end}:00`, timezone).getTime();
      if (!(new Date(bk.start_time as string).getTime() < e && new Date(bk.end_time as string).getTime() > s)) continue;
    }
    count++;
    if (out.length < 3) out.push(`${bk.customer_name as string}, ${formatInTimeZone(new Date(bk.start_time as string), timezone, 'EEE MMM d, h:mm a')}`);
  }
  return { count, examples: out };
}
