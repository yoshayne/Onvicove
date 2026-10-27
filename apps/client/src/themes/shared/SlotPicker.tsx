import { useState } from 'react';
import type { AvailableSlot } from '../types';

interface SlotPickerProps {
  slots: AvailableSlot[];
  selectedSlot: string | null;
  selectedDate: Date | null;
  onSelectSlot: (s: string) => void;
  /** Match the theme: dark backgrounds get light text. */
  tone?: 'light' | 'dark';
  /** Extra classes for the control (rounded corners, font...). */
  className?: string;
}

// "09:00 AM" / "9:30 PM" -> minutes since midnight (unparseable times sort last)
function minutesOf(time: string): number {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  let h = parseInt(m[1], 10) % 12;
  if ((m[3] ?? '').toUpperCase() === 'PM') h += 12;
  if (!m[3] && parseInt(m[1], 10) >= 12) h = parseInt(m[1], 10);
  return h * 60 + parseInt(m[2], 10);
}

const GROUPS = [
  { label: 'Morning', from: 0, to: 12 * 60 },
  { label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
  { label: 'Evening', from: 17 * 60, to: 24 * 60 + 1 },
];

/** The day laid out at the booking step (smallest gap between free times), so the taken ones show as gaps */
function layoutDay(free: AvailableSlot[]): { time: string; available: boolean }[] {
  const mins = free.map((s) => minutesOf(s.time));
  let step = 0;
  for (let i = 1; i < mins.length; i++) {
    const gap = mins[i] - mins[i - 1];
    if (gap > 0 && (step === 0 || gap < step)) step = gap;
  }
  if (step < 15 || step > 120) return free.map((s) => ({ time: s.time, available: true }));
  const byMinute = new Map(free.map((s) => [minutesOf(s.time), s.time]));
  const label = (m: number) => {
    const h = Math.floor(m / 60), mm = m % 60;
    return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const out: { time: string; available: boolean }[] = [];
  for (let m = mins[0]; m <= mins[mins.length - 1]; m += step) {
    const real = byMinute.get(m);
    out.push({ time: real ?? label(m), available: !!real });
  }
  return out;
}

/**
 * Time picker: Morning / Afternoon / Evening tabs over a grid of times. Times that are booked, blocked or
 * past stay on the grid but are grayed out and can't be chosen, so there is no long list to scroll.
 */
export default function SlotPicker({ slots, selectedSlot, selectedDate, onSelectSlot, tone = 'light', className = '' }: SlotPickerProps) {
  const dark = tone === 'dark';
  const free = slots.filter((s) => s.available).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const muted = dark ? 'text-white/50' : 'text-black/50';
  const [tab, setTab] = useState<string | null>(null);
  if (!selectedDate) return <div><p className={`text-sm ${muted}`}>Select a date to see available times.</p></div>;
  if (free.length === 0) return <div><p className={`text-sm ${muted}`}>No times available on this date. Please pick another day.</p></div>;

  const day = layoutDay(free);
  const periods = GROUPS.map((g) => {
    const list = day.filter((s) => minutesOf(s.time) >= g.from && minutesOf(s.time) < g.to);
    return { ...g, list, open: list.filter((s) => s.available).length };
  }).filter((g) => g.list.length);
  const selectedPeriod = selectedSlot ? periods.find((g) => g.list.some((s) => s.time === selectedSlot))?.label : undefined;
  const active = periods.find((g) => g.label === (tab ?? selectedPeriod)) ?? periods.find((g) => g.open > 0) ?? periods[0];
  const line = dark ? 'border-white/25' : 'border-black/20';

  return (
    <div>
      {periods.length > 1 && (
        <div role="tablist" className={`mb-2 flex border ${line} ${className}`}>
          {periods.map((g) => {
            const on = g.label === active.label;
            return (
              <button
                key={g.label}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(g.label)}
                className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors ${on ? 'bg-[var(--brand-color,#111)] text-white' : dark ? 'text-white/70 hover:bg-white/10' : 'text-black/70 hover:bg-black/5'} ${g.open === 0 ? 'opacity-50' : ''}`}
              >
                {g.label} <span className="font-normal opacity-70">({g.open})</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" role="group" aria-label="Appointment time">
        {active.list.map((s) => {
          const picked = s.available && s.time === selectedSlot;
          return (
            <button
              key={s.time}
              type="button"
              disabled={!s.available}
              aria-pressed={picked}
              onClick={() => onSelectSlot(s.time)}
              title={s.available ? undefined : 'Not available'}
              className={`border px-1 py-2 text-sm transition-colors ${className} ${
                picked
                  ? 'border-[var(--brand-color,#111)] bg-[var(--brand-color,#111)] font-semibold text-white'
                  : s.available
                    ? `${line} ${dark ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`
                    : `cursor-not-allowed border-transparent line-through ${dark ? 'bg-white/5 text-white/25' : 'bg-black/5 text-black/25'}`
              }`}
            >
              {s.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
