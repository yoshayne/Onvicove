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
    <div className="bg-white text-[#111111] p-6 border border-[#111111]/10">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-2 text-[#111111]/40 hover:text-[#111111] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-medium text-lg">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-2 text-[#111111]/40 hover:text-[#111111] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs uppercase tracking-widest text-[#111111]/40 font-medium">
        {WEEKDAYS.map((w, i) => (
          <div key={`${w}-${i}`}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-8">
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
              className={`aspect-square rounded-full text-sm flex items-center justify-center transition-colors font-light ${
                isSelected
                  ? 'bg-[#111111] text-white font-medium'
                  : isPast
                    ? 'text-[#111111]/20 cursor-not-allowed'
                    : 'text-[#111111]/80 hover:bg-[#f8f8f8]'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-widest text-[#111111]/40 font-medium mb-3">Available Times</h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-[#111111]/40 font-light">Select a date to view available times.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => onSelectSlot(slot.time)}
                className={`w-full text-left py-3 px-4 text-sm border transition-colors ${
                  selectedSlot === slot.time
                    ? 'bg-[#111111] border-[#111111] text-white font-medium'
                    : slot.available
                      ? 'border-[#111111]/10 text-[#111111]/80 hover:border-[#111111] font-light'
                      : 'border-[#111111]/5 text-[#111111]/20 cursor-not-allowed line-through font-light'
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
