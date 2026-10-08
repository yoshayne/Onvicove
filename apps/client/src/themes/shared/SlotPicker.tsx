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

/**
 * Compact time picker: one control that opens the phone's native picker, listing ONLY the times that are
 * actually free (booked / blocked / past times are not offered at all), grouped morning / afternoon / evening.
 */
export default function SlotPicker({ slots, selectedSlot, selectedDate, onSelectSlot, tone = 'light', className = '' }: SlotPickerProps) {
  const dark = tone === 'dark';
  const free = slots.filter((s) => s.available).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const muted = dark ? 'text-white/50' : 'text-black/50';

  if (!selectedDate) return <p className={`text-sm ${muted}`}>Select a date to see available times.</p>;
  if (free.length === 0) return <p className={`text-sm ${muted}`}>No times available on this date — please pick another day.</p>;

  const options = (list: AvailableSlot[]) =>
    list.map((s) => (
      <option key={s.time} value={s.time} className="bg-white text-black">
        {s.time}
      </option>
    ));
  const grouped = GROUPS.map((g) => ({ ...g, list: free.filter((s) => minutesOf(s.time) >= g.from && minutesOf(s.time) < g.to) })).filter((g) => g.list.length);

  return (
    <div>
      <select
        value={selectedSlot ?? ''}
        onChange={(e) => e.target.value && onSelectSlot(e.target.value)}
        aria-label="Appointment time"
        className={`w-full cursor-pointer border px-3 py-3 text-base outline-none focus:border-[var(--brand-color,currentColor)] ${
          dark ? 'border-white/30 bg-white/5 text-white' : 'border-black/25 bg-white text-black'
        } ${className}`}
      >
        <option value="" disabled className="bg-white text-black">
          Choose a time ({free.length} available)
        </option>
        {grouped.length > 1
          ? grouped.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {options(g.list)}
              </optgroup>
            ))
          : options(free)}
      </select>
    </div>
  );
}
