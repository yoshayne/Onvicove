import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AvailableSlot } from '../types';
import SlotPicker from '../shared/SlotPicker';

interface CalendarProps {
  selectedDate: Date | null;
  selectedSlot: string | null;
  availableSlots: AvailableSlot[];
  onSelectDate: (d: Date) => void;
  onSelectSlot: (s: string) => void;
  isDateClosed?: (d: Date) => boolean;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Calendar({
  selectedDate,
  selectedSlot,
  availableSlots,
  onSelectDate,
  onSelectSlot,
  isDateClosed,
}: CalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  const hasClosed = isDateClosed ? cells.some((c) => c && isDateClosed(c)) : false;

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-[#111] border border-white/10 p-5">
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1.5 text-white/40 hover:text-[var(--brand-color,#c8b8a2)] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs tracking-[0.2em] uppercase text-white/70">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 text-white/40 hover:text-[var(--brand-color,#c8b8a2)] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={`${w}-${i}`} className="text-[10px] uppercase tracking-widest text-white/30 pb-2">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 mb-6">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const closed = !!isDateClosed?.(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              title={closed ? 'Unavailable' : undefined}
              disabled={isPast || closed}
              onClick={() => onSelectDate(date)}
              className={`h-9 sm:h-auto sm:aspect-square text-xs flex items-center justify-center transition-all ${
                isSelected && !closed
                  ? 'bg-[var(--brand-color,#c8b8a2)] text-[#0d0d0d] font-semibold'
                  : closed
                  ? 'text-white/15 cursor-not-allowed line-through'
                  : isPast
                  ? 'text-white/15 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      {hasClosed && (
        <p className="-mt-4 mb-6 text-[10px] text-white/30">Struck-through dates are unavailable.</p>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">Times</p>
        <SlotPicker slots={availableSlots} selectedSlot={selectedSlot} selectedDate={selectedDate} onSelectSlot={onSelectSlot} tone="dark" />
      </div>
    </div>
  );
}
