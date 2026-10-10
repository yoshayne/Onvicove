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

export default function Calendar({ selectedDate, selectedSlot, availableSlots, onSelectDate, onSelectSlot, isDateClosed }: CalendarProps) {
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
          const closed = !!isDateClosed?.(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button key={date.toISOString()} type="button" title={closed ? 'Unavailable' : undefined} disabled={isPast || closed} onClick={() => onSelectDate(date)}
              className={`h-9 sm:h-auto sm:aspect-square text-sm flex items-center justify-center font-black border-2 transition-colors ${isSelected && !closed ? 'bg-[var(--brand-color,#0000ff)] border-[var(--brand-color,#0000ff)] text-white' : closed ? 'border-white/10 text-white/20 cursor-not-allowed line-through' : isPast ? 'border-white/10 text-white/20 cursor-not-allowed' : 'border-white/30 text-white hover:border-[var(--brand-color,#0000ff)] hover:text-[var(--brand-color,#0000ff)]'}`}>
              {date.getDate()}
            </button>
          );
        })}
      </div>
      {hasClosed && (
        <p className="-mt-6 mb-8 text-[10px] text-white/50 font-mono">Struck-through dates are unavailable.</p>
      )}
      <div>
        <h4 className="text-xs font-black tracking-[0.2em] text-white/50 mb-3">AVAILABLE TIMES</h4>
        <SlotPicker slots={availableSlots} selectedSlot={selectedSlot} selectedDate={selectedDate} onSelectSlot={onSelectSlot} tone="dark" />
      </div>
    </div>
  );
}
