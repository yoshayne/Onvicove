import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';

interface Plan {
  id: string; customer_name: string; customer_email: string; service_name: string; kind: 'membership' | 'appointment'; frequency: string | null;
  amount_cents: number; status: 'active' | 'past_due' | 'canceled' | 'incomplete'; failed_attempts: number; cancel_at_period_end: boolean;
  current_period_end: string | null; created_at: string; canceled_at: string | null; ended_reason: string | null; paid_cents: number;
}

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

function StatusPill({ p }: { p: Plan }) {
  const [text, cls] =
    p.status === 'canceled' ? [p.ended_reason === 'payment_failed' ? 'Ended: payment failed' : 'Cancelled', 'bg-slate-100 text-slate-600']
    : p.status === 'past_due' ? [`Payment failed (${p.failed_attempts}/3)`, 'bg-red-100 text-red-700']
    : p.cancel_at_period_end ? [`Ends ${date(p.current_period_end)}`, 'bg-amber-100 text-amber-700']
    : ['Active', 'bg-emerald-100 text-emerald-700'];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

/** Customers' monthly plans: who is subscribed, who failed to pay, cancel, and refund at your discretion */
export default function RecurringPlans() {
  const api = useApi();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refunding, setRefunding] = useState<Plan | null>(null);
  const [refundAmount, setRefundAmount] = useState('');

  const q = useQuery({ queryKey: ['recurring'], queryFn: () => api.get<{ plans: Plan[] }>('/recurring') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['recurring'] });

  const cancel = useMutation({
    mutationFn: ({ id, immediately }: { id: string; immediately: boolean }) => api.post<{ ends_on: string | null }>(`/recurring/${id}/cancel`, { immediately }),
    onSuccess: (r) => { setMsg({ ok: true, text: r.ends_on ? `Cancelled. It ends on ${r.ends_on}.` : 'Cancelled right away.' }); refresh(); },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });
  const refund = useMutation({
    mutationFn: ({ id, cents }: { id: string; cents?: number }) => api.post<{ refunded_cents: number }>(`/recurring/${id}/refund`, cents ? { amount_cents: cents } : {}),
    onSuccess: (r) => { setMsg({ ok: true, text: `Refunded ${money(r.refunded_cents)} to the customer's card.` }); setRefunding(null); setRefundAmount(''); refresh(); },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });

  const plans = q.data?.plans ?? [];
  const live = plans.filter((p) => p.status !== 'canceled');
  const mrr = live.filter((p) => !p.cancel_at_period_end).reduce((n, p) => n + p.amount_cents, 0);

  if (q.isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monthly plans</h1>
        <p className="text-sm text-slate-500">Memberships and recurring appointments. Turn a service into a monthly plan on the Services page.</p>
      </div>
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Active plans</p><p className="text-2xl font-bold">{live.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Monthly revenue</p><p className="text-2xl font-bold">{money(mrr)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Need attention</p><p className="text-2xl font-bold">{plans.filter((p) => p.status === 'past_due').length}</p></div>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No monthly plans yet. When a customer signs up for one, it shows here.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500"><tr>
              <th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Next charge</th><th className="px-4 py-3 font-medium">Paid so far</th><th className="px-4 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3"><p className="font-medium text-slate-900">{p.customer_name}</p><p className="text-xs text-slate-500">{p.customer_email}</p></td>
                  <td className="px-4 py-3 text-slate-700">{p.service_name}<p className="text-xs text-slate-500">{money(p.amount_cents)}/month · {p.kind === 'appointment' ? (p.frequency === 'biweekly' ? 'every 2 weeks' : 'weekly') + ' session' : 'membership'}</p></td>
                  <td className="px-4 py-3"><StatusPill p={p} /></td>
                  <td className="px-4 py-3 text-slate-700">{p.status === 'canceled' || p.cancel_at_period_end ? '—' : date(p.current_period_end)}</td>
                  <td className="px-4 py-3 text-slate-700">{money(p.paid_cents)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {p.paid_cents > 0 && <Button size="sm" variant="secondary" onClick={() => { setRefunding(p); setRefundAmount(''); setMsg(null); }}>Refund</Button>}
                      {p.status !== 'canceled' && !p.cancel_at_period_end && (
                        <Button size="sm" variant="secondary" isLoading={cancel.isPending} onClick={() => { if (window.confirm(`Cancel ${p.customer_name}'s plan at the end of the period they paid for?`)) cancel.mutate({ id: p.id, immediately: false }); }}>Cancel</Button>
                      )}
                      {p.status !== 'canceled' && (
                        <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`End ${p.customer_name}'s plan right now? Future sessions are removed. No money is refunded unless you refund separately.`)) cancel.mutate({ id: p.id, immediately: true }); }}>End now</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {refunding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRefunding(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Refund {refunding.customer_name}</h2>
            <p className="mt-1 text-sm text-slate-500">Paid so far: {money(refunding.paid_cents)}. Leave the amount empty to refund the latest payment. Stripe keeps its processing fee on a refund.</p>
            <div className="relative mt-3">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
              <input type="number" min="0" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder={(refunding.amount_cents / 100).toFixed(2)} className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRefunding(null)}>Back</Button>
              <Button variant="danger" size="sm" isLoading={refund.isPending} onClick={() => { if (window.confirm("Refund this payment? This can't be undone.")) refund.mutate({ id: refunding.id, cents: refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined }); }}>Refund</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
