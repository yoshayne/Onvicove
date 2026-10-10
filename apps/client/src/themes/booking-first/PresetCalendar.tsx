import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AvailableSlot } from '../types';
import SlotPicker from '../shared/SlotPicker';
import type { BookingFirstPreset } from './presets';

interface Props {
  preset: BookingFirstPreset;
  selectedDate: Date | null;
  selectedSlot: string | null;
  availableSlots: AvailableSlot[];
  onSelectDate: (d: Date) => void;
  onSelectSlot: (s: string) => void;
  isDateClosed?: (d: Date) => boolean;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const accent = (p: BookingFirstPreset) => `var(--brand-color, ${p.accent})`;

export default function PresetCalendar({ preset: p, selectedDate, selectedSlot, availableSlots, onSelectDate, onSelectSlot, isDateClosed }: Props) {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const y = view.getFullYear();
  const m = view.getMonth();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < new Date(y, m, 1).getDay(); i++) cells.push(null);
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) cells.push(new Date(y, m, d));
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dark = p.id !== 'studio';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setView(new Date(y, m - 1, 1))} className="p-2" style={{ color: p.muted }}>
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold" style={{ fontFamily: p.headingFont, textTransform: p.uppercaseHeadings ? 'uppercase' : undefined, letterSpacing: p.uppercaseHeadings ? '0.08em' : undefined }}>
          {view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" aria-label="Next month" onClick={() => setView(new Date(y, m + 1, 1))} className="p-2" style={{ color: p.muted }}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px]" style={{ color: p.muted }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="mb-5 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const past = date < startOfToday;
          const closed = !!isDateClosed?.(date);
          const sel = !!selectedDate && same(date, selectedDate);
          const off = past || closed;
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={off}
              title={closed ? 'Unavailable' : undefined}
              onClick={() => onSelectDate(date)}
              className="aspect-square text-sm transition-colors"
              style={{
                borderRadius: Math.min(p.radius, 999),
                background: sel ? accent(p) : 'transparent',
                color: sel ? p.onAccent : off ? p.muted : p.text,
                opacity: off ? 0.35 : 1,
                textDecoration: closed ? 'line-through' : undefined,
                border: !sel && same(date, today) ? `1px solid ${accent(p)}` : '1px solid transparent',
                fontWeight: sel ? 700 : 500,
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mb-2 text-xs uppercase tracking-widest" style={{ color: p.muted }}>Available times</div>
      <SlotPicker slots={availableSlots} selectedSlot={selectedSlot} selectedDate={selectedDate} onSelectSlot={onSelectSlot} tone={dark ? 'dark' : 'light'} className={p.radius === 0 ? '' : 'rounded-lg'} />
    </div>
  );
}
