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
    <div className="p-6" style={{ background: '#eeece7', border: '1px solid #d0cdc8' }}>
      <div className="flex items-center justify-between mb-6">
        <button type="button" aria-label="Previous month" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 text-[#1a1a1a]/40 hover:text-[#1a1a1a]"><ChevronLeft size={18} /></button>
        <span className="font-['Playfair_Display'] text-base text-[#1a1a1a]">{monthLabel}</span>
        <button type="button" aria-label="Next month" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 text-[#1a1a1a]/40 hover:text-[#1a1a1a]"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs text-[#1a1a1a]/40 uppercase tracking-widest">
        {WEEKDAYS.map((w, i) => <div key={`${w}-${i}`}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2 mb-8">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          return (
            <button key={date.toISOString()} type="button" disabled={isPast} onClick={() => onSelectDate(date)}
              className={`aspect-square text-sm flex items-center justify-center transition-colors ${isSelected ? 'bg-[#1a1a1a] text-white font-semibold' : isPast ? 'text-[#1a1a1a]/20 cursor-not-allowed' : 'text-[#1a1a1a]/70 hover:bg-[#1a1a1a]/10'}`}>
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div>
        <h4 className="text-xs uppercase tracking-widest text-[#1a1a1a]/40 mb-3">Available Times</h4>
        {availableSlots.length === 0 ? (
          <p className="text-sm text-[#1a1a1a]/40">Select a date first.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => (
              <button key={slot.time} type="button" disabled={!slot.available} onClick={() => onSelectSlot(slot.time)}
                className={`py-2 px-2 text-xs border transition-colors ${selectedSlot === slot.time ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white font-semibold' : slot.available ? 'border-[#1a1a1a]/30 text-[#1a1a1a]/70 hover:border-[#1a1a1a]' : 'border-[#1a1a1a]/10 text-[#1a1a1a]/20 cursor-not-allowed line-through'}`}>
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
