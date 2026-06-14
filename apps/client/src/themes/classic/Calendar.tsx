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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    <div className="bg-white border border-[#1a3a5c]/20 p-6">
      <div className="flex items-center justify-between mb-6 border-b border-[#1a3a5c]/10 pb-4">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-2 text-[#1a3a5c] hover:text-[var(--brand-color,#c8a850)] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-['Merriweather'] text-lg font-bold text-[#1a3a5c]">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-2 text-[#1a3a5c] hover:text-[var(--brand-color,#c8a850)] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px mb-px text-center text-xs font-bold uppercase tracking-wide text-[#1a3a5c] bg-[#1a3a5c]/10">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-[#f5f5f5] py-2">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px mb-8 border border-[#1a3a5c]/10 bg-[#1a3a5c]/10">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="bg-white aspect-square" />;
          const isToday = isSameDay(date, today);
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(date)}
              className={`aspect-square text-sm font-serif flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-[#1a3a5c] text-white font-bold'
                  : isPast
                    ? 'bg-white text-[#1a3a5c]/30 cursor-not-allowed'
                    : isToday
                      ? 'bg-white text-[var(--brand-color,#c8a850)] font-bold border-2 border-[var(--brand-color,#c8a850)]'
                      : 'bg-white text-[#1a3a5c] hover:bg-[#f5f5f5]'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div>
        <h4 className="font-['Merriweather'] text-sm font-bold uppercase tracking-wide text-[#1a3a5c] mb-3 border-b border-[#1a3a5c]/10 pb-2">
          Available Times
        </h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-[#1a3a5c]/60 font-serif">Select a date to view available times.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => onSelectSlot(slot.time)}
                className={`py-2 px-3 text-sm font-serif border transition-colors ${
                  selectedSlot === slot.time
                    ? 'bg-[#1a3a5c] border-[#1a3a5c] text-white font-bold'
                    : slot.available
                      ? 'border-[#1a3a5c]/30 text-[#1a3a5c] hover:border-[var(--brand-color,#c8a850)] hover:text-[var(--brand-color,#c8a850)]'
                      : 'border-[#1a3a5c]/10 text-[#1a3a5c]/30 cursor-not-allowed line-through'
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
