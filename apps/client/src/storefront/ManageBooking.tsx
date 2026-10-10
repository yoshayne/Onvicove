import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';

interface ManageData {
  booking: {
    id: string; status: string; service_id: string; service_name: string; staff_id: string | null; staff_name: string | null;
    start_time: string; end_time: string; customer_name: string; deposit_paid_cents: number; amount_cents: number;
  };
  business: { name: string; slug: string; timezone: string; currency: string };
  can_change: boolean;
  cancel_window_hours: number;
  change_deadline: string;
}

const card = 'w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm';
const btn = 'rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40';

function fmt(iso: string, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString('en-US', { timeZone: tz, ...opts });
}
const when = (iso: string, tz: string) => fmt(iso, tz, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

/** The private page behind the "Reschedule or cancel" link in a customer's email. */
export default function ManageBooking() {
  const { token = '' } = useParams();
  const [data, setData] = useState<ManageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'reschedule' | 'confirmCancel' | 'done'>('view');
  const [doneMsg, setDoneMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<{ start: string }[]>([]);
  const [slot, setSlot] = useState('');

  const load = () =>
    apiGet<ManageData>(`/api/public/bookings/manage/${token}`)
      .then(setData)
      .catch(() => setError('This link is not valid or has expired.'));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadSlots(d: string) {
    if (!data) return;
    setDate(d);
    setSlot('');
    setSlots([]);
    if (!d) return;
    try {
      const res = await apiGet<{ slots: { start: string }[] }>(
        `/api/public/${data.business.slug}/availability?service_id=${data.booking.service_id}&date=${d}${data.booking.staff_id ? `&staff_id=${data.booking.staff_id}` : ''}&manage_token=${token}`,
      );
      setSlots(res.slots ?? []);
    } catch {
      setSlots([]);
    }
  }

  async function act(path: 'cancel' | 'reschedule', body: object, success: string) {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/public/bookings/manage/${token}/${path}`, body);
      setDoneMsg(success);
      setMode('done');
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">{children}</div>
  );

  if (!data) return shell(<div className={card}>{error ? <p className="text-sm text-slate-700">{error}</p> : <p className="text-sm text-slate-500">Loading…</p>}</div>);

  const { booking, business } = data;
  const cancelled = booking.status === 'cancelled';

  return shell(
    <div className={card}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{business.name}</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">
        {mode === 'done' ? doneMsg : cancelled ? 'This appointment is cancelled' : 'Your appointment'}
      </h1>

      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-800">
        <p className="font-medium">{booking.service_name}{booking.staff_name ? ` with ${booking.staff_name}` : ''}</p>
        <p className="mt-1">{when(booking.start_time, business.timezone)}</p>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {mode === 'view' && !cancelled && (
        data.can_change ? (
          <div className="mt-5 flex flex-col gap-2">
            <button className={`${btn} bg-slate-900 text-white hover:bg-slate-800`} onClick={() => setMode('reschedule')}>Change the time</button>
            <button className={`${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`} onClick={() => setMode('confirmCancel')}>Cancel appointment</button>
            <p className="mt-1 text-xs text-slate-500">You can change or cancel until {when(data.change_deadline, business.timezone)}.</p>
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Changes close {data.cancel_window_hours} hours before the appointment. Please contact {business.name} directly if you need to change it.
          </p>
        )
      )}

      {mode === 'reschedule' && (
        <div className="mt-5 flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-700">
            Pick a new day
            <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => void loadSlots(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
          </label>
          {date && (
            slots.length === 0 ? (
              <p className="text-sm text-slate-500">No times are open that day. Try another day.</p>
            ) : (
              <label className="text-sm font-medium text-slate-700">
                Pick a time
                <select value={slot} onChange={(e) => setSlot(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base">
                  <option value="">Choose a time ({slots.length} open)</option>
                  {slots.map((s) => (
                    <option key={s.start} value={s.start}>{fmt(s.start, business.timezone, { hour: 'numeric', minute: '2-digit' })}</option>
                  ))}
                </select>
              </label>
            )
          )}
          <div className="flex gap-2">
            <button className={`${btn} bg-slate-900 text-white hover:bg-slate-800`} disabled={!slot || busy} onClick={() => act('reschedule', { start_time: slot }, 'Your appointment has been moved')}>
              {busy ? 'Saving…' : 'Confirm new time'}
            </button>
            <button className={`${btn} text-slate-600`} onClick={() => setMode('view')}>Back</button>
          </div>
        </div>
      )}

      {mode === 'confirmCancel' && (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-sm text-slate-700">Cancel this appointment?{booking.deposit_paid_cents > 0 ? ` You paid a deposit. Whether it's refunded is up to ${business.name}, so please contact them.` : ''}</p>
          <div className="flex gap-2">
            <button className={`${btn} bg-red-600 text-white hover:bg-red-700`} disabled={busy} onClick={() => act('cancel', {}, 'Your appointment is cancelled')}>
              {busy ? 'Cancelling…' : 'Yes, cancel it'}
            </button>
            <button className={`${btn} text-slate-600`} onClick={() => setMode('view')}>Keep it</button>
          </div>
        </div>
      )}

      {mode === 'done' && <p className="mt-4 text-sm text-slate-600">We've sent you an email about this.</p>}
    </div>,
  );
}
