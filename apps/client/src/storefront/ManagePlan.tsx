import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';

interface PlanData {
  plan: {
    service_name: string; kind: 'membership' | 'appointment'; amount_cents: number; currency: string; status: string;
    cancel_at_period_end: boolean; current_period_end: string | null; frequency: string | null; customer_name: string; canceled_at: string | null;
  };
  business: { name: string; slug: string; timezone: string };
}

const money = (c: number, cur: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur.toUpperCase() }).format(c / 100);

/** The private page behind the "Manage or cancel my plan" link in a customer's email */
export default function ManagePlan() {
  const { token = '' } = useParams();
  const [data, setData] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => apiGet<PlanData>(`/api/public/plans/manage/${token}`).then(setData).catch(() => setError('This link is not valid or has expired.'));
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  async function cancel() {
    setBusy(true);
    try {
      const r = await apiPost<{ ends_on: string | null }>(`/api/public/plans/manage/${token}/cancel`, {});
      setMsg(r.ends_on ? `Your plan is cancelled. You keep it until ${r.ends_on}, and you won't be charged again.` : "Your plan is cancelled and you won't be charged again.");
      setConfirming(false);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'We could not cancel. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><p className="text-slate-600">{error}</p></div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-slate-400">Loading…</p></div>;

  const p = data.plan;
  const tz = data.business.timezone;
  const endDate = p.current_period_end ? new Date(p.current_period_end).toLocaleDateString('en-US', { timeZone: tz, month: 'long', day: 'numeric', year: 'numeric' }) : null;
  const ended = p.status === 'canceled';
  const ending = !ended && p.cancel_at_period_end;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{data.business.name}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{p.service_name}</h1>
        <p className="mt-1 text-slate-600">{money(p.amount_cents, p.currency)} per month{p.kind === 'appointment' ? `, ${p.frequency === 'biweekly' ? 'a session every 2 weeks' : 'a session every week'}` : ''}</p>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {ended && <>This plan has ended. You will not be charged again.</>}
          {ending && <>Cancelled. You keep your plan until <strong>{endDate}</strong> and will not be charged again.</>}
          {!ended && !ending && <>{p.status === 'past_due' ? 'Your last payment did not go through. ' : ''}Active{endDate ? <>. Next charge on <strong>{endDate}</strong>.</> : '.'}</>}
        </div>

        {msg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}

        {!ended && !ending && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} className="mt-5 w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">Cancel my plan</button>
        )}
        {confirming && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">Cancel this plan? You keep it until {endDate ?? 'the end of this period'}. Payments already made are not refunded automatically.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={cancel} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Cancelling…' : 'Yes, cancel'}</button>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Keep my plan</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
