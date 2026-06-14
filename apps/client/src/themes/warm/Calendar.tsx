import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { AvailableSlot } from '../types';

interface CalendarProps {
  selectedDate: Date | null;
  selectedSlot: string | null;
  availableSlots: AvailableSlot[];
  onSelectDate: (d: Date) => void;
  onSelectSlot: (s: string) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isPast = (d: Date) => {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < t;
  };

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-2xl bg-[#fdf8f3] p-5 font-['Inter'] text-[#3d2314]">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded-full p-2 text-[#8b5e3c] hover:bg-[#f5e8d8]"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-['Lora'] text-lg font-medium">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded-full p-2 text-[#8b5e3c] hover:bg-[#f5e8d8]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-[#8b5e3c]/70">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const selected = selectedDate && isSameDay(d, selectedDate);
          const disabled = isPast(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(d)}
              className={`flex aspect-square items-center justify-center rounded-full text-sm transition ${
                selected
                  ? 'bg-[#8b5e3c] text-white'
                  : disabled
                    ? 'cursor-not-allowed text-[#3d2314]/20'
                    : 'text-[#3d2314] hover:bg-[#f5e8d8]'
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div>
        <h4 className="mb-3 font-['Lora'] text-sm font-medium text-[#3d2314]/80">Available times</h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-[#3d2314]/50">No slots available. Please pick a date.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => {
              const selected = selectedSlot === slot.time;
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onSelectSlot(slot.time)}
                  className={`rounded-full px-3 py-2 text-xs transition ${
                    selected
                      ? 'bg-[#8b5e3c] text-white'
                      : slot.available
                        ? 'bg-[#f5e8d8] text-[#3d2314] hover:bg-[#8b5e3c] hover:text-white'
                        : 'cursor-not-allowed bg-[#f5e8d8]/40 text-[#3d2314]/30 line-through'
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
