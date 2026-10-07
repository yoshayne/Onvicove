import type { AvailabilitySlot, WeeklyAvailability } from '../../types';
import { DAY_KEYS, DAY_LABELS, withAllDays } from '../../lib/hours';

/** Weekly open/closed toggles with one or more time windows per day. */
export default function WeeklyHoursEditor({
  value,
  onChange,
}: {
  value: WeeklyAvailability;
  onChange: (next: WeeklyAvailability) => void;
}) {
  const week = withAllDays(value);

  function setDay(day: keyof WeeklyAvailability, slots: AvailabilitySlot[]) {
    onChange({ ...week, [day]: slots });
  }

  return (
    <div className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
      {DAY_KEYS.map((key) => {
        const slots = week[key];
        const isOpen = slots.length > 0;
        return (
          <div key={key} className="flex flex-wrap items-start gap-3 px-3 py-2.5 bg-white">
            <div className="flex items-center gap-2 w-28 pt-0.5 shrink-0">
              <span className="text-sm font-medium text-slate-700 w-8">{DAY_LABELS[key]}</span>
              <button
                type="button"
                onClick={() => setDay(key, isOpen ? [] : [{ start: '09:00', end: '17:00' }])}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isOpen ? 'bg-blue-500' : 'bg-slate-200'}`}
                aria-label={isOpen ? `Close ${DAY_LABELS[key]}` : `Open ${DAY_LABELS[key]}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${isOpen ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              <span className="text-xs text-slate-400">{isOpen ? 'Open' : 'Closed'}</span>
            </div>

            {isOpen ? (
              <div className="flex flex-1 flex-col gap-1.5">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.start}
                      onChange={(e) => setDay(key, slots.map((s, j) => (j === i ? { ...s, start: e.target.value } : s)))}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-slate-400">–</span>
                    <input
                      type="time"
                      value={slot.end}
                      onChange={(e) => setDay(key, slots.map((s, j) => (j === i ? { ...s, end: e.target.value } : s)))}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                    {slot.end <= slot.start && <span className="text-[11px] text-slate-400">next day</span>}
                    {slots.length > 1 && (
                      <button type="button" onClick={() => setDay(key, slots.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline">×</button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDay(key, [...slots, { start: '09:00', end: '17:00' }])}
                  className="self-start text-xs text-blue-600 hover:underline"
                >
                  + Add break
                </button>
              </div>
            ) : (
              <span className="pt-0.5 text-xs text-slate-400 italic">Closed — no bookings accepted</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
