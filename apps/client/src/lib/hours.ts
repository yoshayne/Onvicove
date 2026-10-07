import type { WeeklyAvailability } from '../types';

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

export const EMPTY_WEEK: WeeklyAvailability = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

export const WEEKDAY_9_TO_5: WeeklyAvailability = {
  ...EMPTY_WEEK,
  mon: [{ start: '09:00', end: '17:00' }],
  tue: [{ start: '09:00', end: '17:00' }],
  wed: [{ start: '09:00', end: '17:00' }],
  thu: [{ start: '09:00', end: '17:00' }],
  fri: [{ start: '09:00', end: '17:00' }],
};

export function withAllDays(av: Partial<WeeklyAvailability> | null | undefined): WeeklyAvailability {
  return { ...EMPTY_WEEK, ...(av ?? {}) };
}

export function hasAnyHours(av: Partial<WeeklyAvailability> | null | undefined): boolean {
  return !!av && Object.values(av).some((w) => Array.isArray(w) && w.length > 0);
}

function fmtTime(t: string): string {
  if (t === '24:00') return '12am';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

/** "Mon–Fri 9am–5pm, Sat 10am–2pm" — consecutive days with identical hours are grouped. */
export function describeHours(av: Partial<WeeklyAvailability> | null | undefined): string {
  if (!av) return '';
  const rows: { label: string; hours: string }[] = [];
  let i = 0;
  while (i < DAY_KEYS.length) {
    const windows = av[DAY_KEYS[i]] ?? [];
    if (windows.length === 0) { i++; continue; }
    const hours = windows.map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`).join(' & ');
    let j = i;
    while (j + 1 < DAY_KEYS.length && JSON.stringify(av[DAY_KEYS[j + 1]] ?? []) === JSON.stringify(windows)) j++;
    const label = j === i ? DAY_LABELS[DAY_KEYS[i]] : j === i + 1 ? `${DAY_LABELS[DAY_KEYS[i]]}, ${DAY_LABELS[DAY_KEYS[j]]}` : `${DAY_LABELS[DAY_KEYS[i]]}–${DAY_LABELS[DAY_KEYS[j]]}`;
    rows.push({ label, hours });
    i = j + 1;
  }
  return rows.map((r) => `${r.label} ${r.hours}`).join(', ');
}
