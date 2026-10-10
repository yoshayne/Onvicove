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
          const closed = !!isDateClosed?.(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              title={closed ? 'Unavailable' : undefined}
              disabled={isPast || closed}
              onClick={() => onSelectDate(date)}
              className={`h-9 sm:h-auto sm:aspect-square rounded-full text-sm flex items-center justify-center transition-colors font-light ${
                isSelected && !closed
                  ? 'bg-[#111111] text-white font-medium'
                  : closed
                    ? 'text-[#111111]/20 cursor-not-allowed line-through'
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
      {hasClosed && (
        <p className="-mt-6 mb-8 text-[10px] text-[#111111]/40">Struck-through dates are unavailable.</p>
      )}

      <div>
        <h4 className="text-xs uppercase tracking-widest text-[#111111]/40 font-medium mb-3">Available Times</h4>
        <SlotPicker slots={availableSlots} selectedSlot={selectedSlot} selectedDate={selectedDate} onSelectSlot={onSelectSlot} tone="light" />
      </div>
    </div>
  );
}
