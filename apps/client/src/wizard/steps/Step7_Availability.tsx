import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWizardStore, DEFAULT_AVAILABILITY, type DayKey, type TimeRange } from '../wizardStore';

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const DEFAULT_RANGE: TimeRange = { start: '09:00', end: '17:00' };

export default function Step7_Availability() {
  const availability = useWizardStore((s) => s.availability);
  const setDayRanges = useWizardStore((s) => s.setDayRanges);
  const staff = useWizardStore((s) => s.staff);
  const addStaff = useWizardStore((s) => s.addStaff);
  const removeStaff = useWizardStore((s) => s.removeStaff);
  const businessName = useWizardStore((s) => s.businessName);

  // Ensure at least one staff member exists when this step loads
  useEffect(() => {
    if (staff.length === 0) {
      addStaff({ id: uuidv4(), name: businessName || '', email: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const primaryStaff = staff[0];

  function updateStaffName(name: string) {
    if (!primaryStaff) return;
    removeStaff(primaryStaff.id);
    addStaff({ ...primaryStaff, name });
  }

  function toggleDay(day: DayKey, isOpen: boolean) {
    setDayRanges(day, isOpen ? [DEFAULT_RANGE] : []);
  }

  function updateRange(day: DayKey, index: number, updates: Partial<TimeRange>) {
    const ranges = availability[day];
    const next = ranges.map((r, i) => (i === index ? { ...r, ...updates } : r));
    setDayRanges(day, next);
  }

  function addRange(day: DayKey) {
    setDayRanges(day, [...availability[day], { ...DEFAULT_RANGE }]);
  }

  function removeRange(day: DayKey, index: number) {
    setDayRanges(day, availability[day].filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Set up your booking availability</h2>
        <p className="mt-1 text-sm text-gray-500">
          Tell us who's taking bookings and when they're available.
        </p>
      </div>

      {/* Staff name */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-sm font-semibold text-gray-900">Who's taking bookings?</label>
        <p className="text-xs text-slate-500">
          This creates your first staff member. You can add more from the dashboard later.
        </p>
        <input
          type="text"
          value={primaryStaff?.name ?? ''}
          onChange={(e) => updateStaffName(e.target.value)}
          placeholder="e.g. Jane Smith or your business name"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {/* Availability schedule */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-900">Weekly hours</p>
        <p className="text-xs text-slate-500">
          Customers can only book during these hours. Toggle days closed to block them off.
        </p>
        <div className="flex flex-col gap-2">
          {DAYS.map(({ key, label }) => {
            const ranges = availability[key];
            const isOpen = ranges.length > 0;

            return (
              <div key={key} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                  <button
                    type="button"
                    onClick={() => toggleDay(key, !isOpen)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      isOpen ? 'bg-gray-900' : 'bg-gray-200'
                    }`}
                    aria-label={isOpen ? 'Close this day' : 'Open this day'}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        isOpen ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-3 flex flex-col gap-2">
                    {ranges.map((range, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={range.start}
                          onChange={(e) => updateRange(key, index, { start: e.target.value })}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                        <span className="text-sm text-gray-400">to</span>
                        <input
                          type="time"
                          value={range.end}
                          onChange={(e) => updateRange(key, index, { end: e.target.value })}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                        {ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRange(key, index)}
                            className="text-sm text-gray-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRange(key)}
                      className="self-start text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      + Add break
                    </button>
                  </div>
                )}

                {!isOpen && (
                  <p className="mt-1 text-xs text-gray-400">Closed — no bookings</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
