import { useWizardStore, type DayKey, type TimeRange } from '../wizardStore';

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
    setDayRanges(
      day,
      availability[day].filter((_, i) => i !== index)
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Set your weekly availability</h2>
        <p className="mt-1 text-sm text-gray-500">
          This becomes the default schedule for your staff. You can fine-tune it later.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {DAYS.map(({ key, label }) => {
          const ranges = availability[key];
          const isOpen = ranges.length > 0;

          return (
            <div key={key} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{label}</span>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => toggleDay(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  {isOpen ? 'Open' : 'Closed'}
                </label>
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
                    + Add another time range
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
