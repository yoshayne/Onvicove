import type { WeeklyAvailability } from './availability';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const DAY_ALIASES: Record<string, (typeof DAY_KEYS)[number]> = {
  mon: 'mon', monday: 'mon',
  tue: 'tue', tues: 'tue', tuesday: 'tue',
  wed: 'wed', weds: 'wed', wednesday: 'wed',
  thu: 'thu', thur: 'thu', thurs: 'thu', thursday: 'thu',
  fri: 'fri', friday: 'fri',
  sat: 'sat', saturday: 'sat',
  sun: 'sun', sunday: 'sun',
};

export function hasAnyWindow(av: unknown): av is WeeklyAvailability {
  if (!av || typeof av !== 'object') return false;
  return Object.values(av as Record<string, unknown>).some(
    (windows) => Array.isArray(windows) && windows.some((w) => w && typeof w.start === 'string' && typeof w.end === 'string'),
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

interface ParsedTime { hour: number; minute: number; meridiem: 'am' | 'pm' | null }

function parseTimeToken(raw: string): ParsedTime | null {
  const s = raw.trim().toLowerCase().replace(/\./g, '');
  if (s === 'noon') return { hour: 12, minute: 0, meridiem: 'pm' };
  if (s === 'midnight') return { hour: 12, minute: 0, meridiem: 'am' };
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  if (hour > 24 || minute > 59) return null;
  return { hour, minute, meridiem: (m[3] as 'am' | 'pm' | undefined) ?? null };
}

function to24h(t: ParsedTime, meridiem: 'am' | 'pm' | null): number {
  let h = t.hour;
  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  return h;
}

/** Resolves a start/end pair, inferring missing am/pm ("9-5" -> 09:00-17:00). */
function resolveRange(a: ParsedTime, b: ParsedTime): { start: string; end: string } | null {
  let startM = a.meridiem;
  let endM = b.meridiem;
  if (!startM && !endM) {
    // Bare numbers: treat as a daytime range, wrapping the end past noon if needed
    const sh = a.hour;
    const eh = b.hour;
    if (sh >= 13 || eh >= 13 || a.hour === 0) return fmtRange(a.hour, a.minute, b.hour, b.minute);
    startM = 'am';
    endM = eh <= sh ? 'pm' : sh < 7 ? 'pm' : 'am'; // "9-5" -> pm; "10-11" -> am
    if (sh < 7) startM = 'pm';
  } else if (!startM) {
    startM = endM === 'pm' && a.hour <= b.hour ? 'am' : endM;
  } else if (!endM) {
    endM = startM === 'am' && b.hour < a.hour ? 'pm' : startM;
  }
  return fmtRange(to24h(a, startM), a.minute, to24h(b, endM), b.minute);
}

function fmtRange(sh: number, sm: number, eh: number, em: number): { start: string; end: string } | null {
  if (sh > 23) return null;
  const start = `${pad(sh)}:${pad(sm)}`;
  const end = eh >= 24 ? '24:00' : `${pad(eh)}:${pad(em)}`;
  return { start, end };
}

const DAY_WORD = '(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:s|nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)';
const RANGE_SEP = '(?:\\s*(?:-|–|—|to|thru|through)\\s*)';
const DAY_SPEC =
  `(?:daily|every\\s*day|${DAY_WORD}(?:${RANGE_SEP}${DAY_WORD})?(?:\\s*(?:,|&|and|\\+)\\s*${DAY_WORD}(?:${RANGE_SEP}${DAY_WORD})?)*)`;
const TIME_WORD = '(?:\\d{1,2}(?::\\d{2})?\\s*(?:[ap]\\.?m\\.?)?|noon|midnight)';
const ALL_DAY_RE = new RegExp(`(?:(${DAY_SPEC})\\s*[:,]?\\s*(?:open\\s+)?(?:all\\s*day|24\\s*(?:hours?|hrs?|h)\\b)|\\b24\\s*/\\s*7\\b)`, 'gi');
const HOURS_RE = new RegExp(`(${DAY_SPEC})\\s*[:,]?\\s*(${TIME_WORD})\\s*(?:-|–|—|to|until)\\s*(${TIME_WORD})`, 'gi');

function expandDays(spec: string): (typeof DAY_KEYS)[number][] {
  const lower = spec.toLowerCase();
  if (/daily|every\s*day/.test(lower)) return [...DAY_KEYS];
  const out = new Set<(typeof DAY_KEYS)[number]>();
  // pieces separated by commas / & / and / +, each either a day or a day-range
  for (const piece of lower.split(/\s*(?:,|&|\band\b|\+)\s*/)) {
    const days = piece.match(new RegExp(DAY_WORD, 'g'));
    if (!days) continue;
    const keys = days.map((d) => DAY_ALIASES[d]).filter(Boolean);
    if (keys.length === 1) out.add(keys[0]);
    else if (keys.length >= 2) {
      let i = DAY_KEYS.indexOf(keys[0]);
      const end = DAY_KEYS.indexOf(keys[keys.length - 1]);
      for (let guard = 0; guard < 8; guard++) {
        out.add(DAY_KEYS[i]);
        if (i === end) break;
        i = (i + 1) % 7;
      }
    }
  }
  return [...out];
}

/**
 * Best-effort reading of free-text hours such as "Mon–Fri 9am–6pm, Sat 10am–4pm" or
 * "Mon-Sun 12pm-12am". Returns null when nothing recognisable is found.
 */
export function parseHoursText(text: string | null | undefined): WeeklyAvailability | null {
  if (!text) return null;
  const result: WeeklyAvailability = {};
  let found = false;
  // "Mon-Sun open 24 hours", "Daily: all day", "24/7"
  for (const m of text.matchAll(ALL_DAY_RE)) {
    for (const day of m[1] ? expandDays(m[1]) : [...DAY_KEYS]) {
      result[day] = [{ start: '00:00', end: '24:00' }];
      found = true;
    }
  }
  for (const m of text.matchAll(HOURS_RE)) {
    const a = parseTimeToken(m[2]);
    const b = parseTimeToken(m[3]);
    if (!a || !b) continue;
    const range = resolveRange(a, b);
    if (!range) continue;
    for (const day of expandDays(m[1])) {
      result[day] = [range];
      found = true;
    }
  }
  return found ? result : null;
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** A window as minutes from midnight; one that ends at/before its start (or at 24:00) runs into the next day */
function span(w: { start: string; end: string }): [number, number] {
  const a = toMinutes(w.start);
  let b = w.end === '24:00' ? 1440 : toMinutes(w.end);
  if (b <= a) b += 1440;
  return [a, b];
}

/** Only the times that are in both lists of windows (per day) */
function intersectAvailability(staff: WeeklyAvailability, business: WeeklyAvailability): WeeklyAvailability {
  const out: WeeklyAvailability = {};
  for (const day of DAY_KEYS) {
    const windows: { start: string; end: string }[] = [];
    for (const sw of staff[day] ?? []) {
      for (const bw of business[day] ?? []) {
        const [s1, e1] = span(sw);
        const [s2, e2] = span(bw);
        const start = Math.max(s1, s2);
        const end = Math.min(e1, e2);
        if (end <= start) continue;
        windows.push({ start: fromMinutes(start), end: end === 1440 ? '24:00' : fromMinutes(end % 1440 === 0 ? 0 : end > 1440 ? end - 1440 : end) });
      }
    }
    out[day] = windows;
  }
  return out;
}

/**
 * Hours to book against. The business's booking hours apply to everyone: a day the business is closed is closed
 * for every staff member, even one with hours of their own. A staff member's own hours can only narrow them.
 * Without business hours, the staff member's own hours are used; failing both, whatever the hours text says.
 */
export function resolveAvailability(
  staffAvailability: unknown,
  tenant: { business_hours?: unknown; page_content?: Record<string, unknown> | null },
): { availability: WeeklyAvailability; source: 'staff' | 'business' | 'text' | 'none' } {
  const hasStaff = hasAnyWindow(staffAvailability);
  const hasBusiness = hasAnyWindow(tenant.business_hours);
  if (hasStaff && hasBusiness) {
    return { availability: intersectAvailability(staffAvailability as WeeklyAvailability, tenant.business_hours as WeeklyAvailability), source: 'staff' };
  }
  if (hasStaff) return { availability: staffAvailability as WeeklyAvailability, source: 'staff' };
  if (hasBusiness) return { availability: tenant.business_hours as WeeklyAvailability, source: 'business' };
  const parsed = parseHoursText(tenant.page_content?.['contact.hours'] as string | undefined);
  if (parsed) return { availability: parsed, source: 'text' };
  return { availability: {}, source: 'none' };
}
