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

export default function Calendar({ selectedDate, selectedSlot, availableSlots, onSelectDate, onSelectSlot }: CalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="p-6 bg-black text-white" style={{ border: '3px solid #000' }}>
      <div className="flex items-center justify-between mb-6 border-b-2 border-white pb-4">
        <button type="button" aria-label="Previous month" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 text-white hover:text-[var(--brand-color,#0000ff)] font-black text-lg">←</button>
        <span className="font-black text-sm tracking-[0.2em]">{monthLabel}</span>
        <button type="button" aria-label="Next month" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 text-white hover:text-[var(--brand-color,#0000ff)] font-black text-lg">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-black text-white/50">
        {WEEKDAYS.map((w, i) => <div key={`${w}-${i}`}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-8">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button key={date.toISOString()} type="button" disabled={isPast} onClick={() => onSelectDate(date)}
              className={`aspect-square text-sm flex items-center justify-center font-black border-2 transition-colors ${isSelected ? 'bg-[var(--brand-color,#0000ff)] border-[var(--brand-color,#0000ff)] text-white' : isPast ? 'border-white/10 text-white/20 cursor-not-allowed' : 'border-white/30 text-white hover:border-[var(--brand-color,#0000ff)] hover:text-[var(--brand-color,#0000ff)]'}`}>
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div>
        <h4 className="text-xs font-black tracking-[0.2em] text-white/50 mb-3">AVAILABLE TIMES</h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-white/50 font-mono">SELECT A DATE</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => (
              <button key={slot.time} type="button" disabled={!slot.available} onClick={() => onSelectSlot(slot.time)}
                className={`py-2 px-2 text-xs font-black border-2 transition-colors ${selectedSlot === slot.time ? 'bg-[var(--brand-color,#0000ff)] border-[var(--brand-color,#0000ff)] text-white' : slot.available ? 'border-white/40 text-white hover:border-[var(--brand-color,#0000ff)] hover:text-[var(--brand-color,#0000ff)]' : 'border-white/10 text-white/20 cursor-not-allowed line-through'}`}>
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
