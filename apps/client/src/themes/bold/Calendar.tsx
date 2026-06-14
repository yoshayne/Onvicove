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

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="bg-[#0a0a0a] border-2 border-[#e8ff00] p-4 text-white">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded-full border border-white/30 p-1 hover:border-[#e8ff00] hover:text-[#e8ff00]"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-black uppercase tracking-widest">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded-full border border-white/30 p-1 hover:border-[#e8ff00] hover:text-[#e8ff00]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-black uppercase tracking-wide text-white/50">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-7 gap-1">
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
              className={`aspect-square text-sm font-bold uppercase transition ${
                selected
                  ? 'bg-[#e8ff00] text-[#0a0a0a]'
                  : disabled
                    ? 'cursor-not-allowed text-white/20'
                    : 'border border-white/20 text-white hover:border-[#e8ff00] hover:text-[#e8ff00]'
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-black uppercase tracking-widest text-white/70">Available Slots</h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-white/40">No slots available. Pick a date.</p>
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
                  className={`border-2 px-2 py-2 text-xs font-black uppercase tracking-wide transition ${
                    selected
                      ? 'border-[#e8ff00] bg-[#e8ff00] text-[#0a0a0a]'
                      : slot.available
                        ? 'border-white/30 text-white hover:border-[#e8ff00] hover:text-[#e8ff00]'
                        : 'cursor-not-allowed border-white/10 text-white/20 line-through'
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
