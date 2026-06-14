import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AvailableSlot } from '../types';

interface CalendarProps {
  selectedDate: Date | null;
  selectedSlot: string | null;
  availableSlots: AvailableSlot[];
  onSelectDate: (d: Date) => void;
  onSelectSlot: (s: string) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Calendar({
  selectedDate,
  selectedSlot,
  availableSlots,
  onSelectDate,
  onSelectSlot,
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

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-[#f0f0ff] text-[#111111] p-6 rounded-3xl font-['Poppins']">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-2 text-[#111111]/50 hover:text-[var(--brand-color,#ff3cac)] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-['Poppins'] font-semibold text-lg tracking-wide">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-2 text-[#111111]/50 hover:text-[var(--brand-color,#ff3cac)] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs uppercase tracking-widest text-[#111111]/40 font-semibold">
        {WEEKDAYS.map((w, i) => (
          <div key={`${w}-${i}`}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 mb-8">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(date)}
              className={`aspect-square rounded-full text-sm flex items-center justify-center transition-colors font-medium ${
                isSelected
                  ? 'bg-[var(--brand-color,#ff3cac)] text-white font-bold shadow-md'
                  : isPast
                    ? 'text-[#111111]/20 cursor-not-allowed'
                    : 'text-[#111111]/70 hover:bg-white'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-widest text-[#111111]/40 font-semibold mb-3">Available Times</h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-[#111111]/40">Select a date to view available times.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {availableSlots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => onSelectSlot(slot.time)}
                className={`py-2 px-3 text-sm rounded-full border-2 font-medium transition-colors ${
                  selectedSlot === slot.time
                    ? 'bg-[var(--brand-color,#ff3cac)] border-[var(--brand-color,#ff3cac)] text-white font-bold'
                    : slot.available
                      ? 'border-[var(--brand-color,#ff3cac)]/20 bg-white text-[#111111]/80 hover:border-[var(--brand-color,#ff3cac)] hover:text-[var(--brand-color,#ff3cac)]'
                      : 'border-transparent bg-white/40 text-[#111111]/20 cursor-not-allowed line-through'
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
