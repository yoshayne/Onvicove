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
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 rounded-2xl text-white" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(167,139,250,0.2)' }}>
      <div className="flex items-center justify-between mb-6">
        <button type="button" aria-label="Previous month" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 text-white/50 hover:text-[var(--brand-color,#a78bfa)]"><ChevronLeft size={18} /></button>
        <span className="text-base font-semibold text-[var(--brand-color,#a78bfa)]">{monthLabel}</span>
        <button type="button" aria-label="Next month" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 text-white/50 hover:text-[var(--brand-color,#a78bfa)]"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs text-white/30">
        {WEEKDAYS.map((w, i) => <div key={`${w}-${i}`}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2 mb-8">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button key={date.toISOString()} type="button" disabled={isPast} onClick={() => onSelectDate(date)}
              className={`aspect-square rounded-full text-sm flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--brand-color,#a78bfa)] text-black font-semibold' : isPast ? 'text-white/20 cursor-not-allowed' : 'text-white/70 hover:bg-white/10'}`}>
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div>
        <h4 className="text-xs text-white/30 mb-3 uppercase tracking-widest">Available Times</h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-white/30">Select a date first.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => (
              <button key={slot.time} type="button" disabled={!slot.available} onClick={() => onSelectSlot(slot.time)}
                className={`py-2 px-2 text-xs rounded-lg border transition-all ${selectedSlot === slot.time ? 'bg-[var(--brand-color,#a78bfa)] border-[var(--brand-color,#a78bfa)] text-black font-semibold' : slot.available ? 'border-white/20 text-white/70 hover:border-[var(--brand-color,#a78bfa)]' : 'border-white/5 text-white/20 cursor-not-allowed line-through'}`}>
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
