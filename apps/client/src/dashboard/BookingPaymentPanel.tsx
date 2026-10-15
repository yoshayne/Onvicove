import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Booking } from '../types';
import Button from '../components/shared/Button';

interface PaymentsInfo {
  amount_cents: number;
  paid_cents: number;
  card_refundable_cents: number;
  payments: { id: string; amount_cents: number; method: string; note: string | null; created_at: string }[];
  reminders: { hours_before: number; sent_at: string }[];
}

const METHODS = [
  ['cash', 'Cash'], ['check', 'Check'], ['zelle', 'Zelle'], ['venmo', 'Venmo'], ['cashapp', 'Cash App'], ['other', 'Other'],
] as const;

const money = (cents: number) => `$${(Math.abs(cents) / 100).toFixed(2)}`;

/** Payments, refunds and "send to customer" buttons for one booking (inside the Edit window) */
export default function BookingPaymentPanel({ booking, timezone }: { booking: Booking; timezone?: string }) {
  const api = useApi();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'pay' | 'refund' | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number][0]>('cash');
  const [note, setNote] = useState('');
  const [cancelToo, setCancelToo] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const info = useQuery({
    queryKey: ['bookings', booking.id, 'payments'],
    queryFn: () => api.get<PaymentsInfo>(`/bookings/${booking.id}/payments`),
  });
  const price = info.data?.amount_cents ?? booking.amount_cents ?? 0;
  const paid = info.data?.paid_cents ?? booking.deposit_paid_cents ?? 0;
  const due = Math.max(price - paid, 0);

  const done = (text: string) => {
    setMsg({ ok: true, text });
    setMode(null);
    setAmount('');
    setNote('');
    setCancelToo(false);
    qc.invalidateQueries({ queryKey: ['bookings'] });
  };
  const fail = (err: Error) => setMsg({ ok: false, text: err.message });
  const cents = Math.round(parseFloat(amount || '0') * 100);

  const record = useMutation({
    mutationFn: () => api.post(`/bookings/${booking.id}/record-payment`, { amount_cents: cents, method, note: note.trim() || null }),
    onSuccess: () => done('Payment recorded.'),
    onError: fail,
  });
  const refund = useMutation({
    mutationFn: () => api.post(`/bookings/${booking.id}/refund`, { amount_cents: cents, cancel: cancelToo }),
    onSuccess: () => done('Refund sent. The customer has been emailed.'),
    onError: fail,
  });
  const send = useMutation({
    mutationFn: (kind: 'send-payment-link' | 'resend-confirmation' | 'send-reminder') => api.post(`/bookings/${booking.id}/${kind}`, {}),
    onSuccess: (_d, kind) => {
      setMsg({ ok: true, text: kind === 'send-payment-link' ? 'Payment link sent.' : kind === 'resend-confirmation' ? 'Confirmation sent again.' : 'Reminder sent.' });
      qc.invalidateQueries({ queryKey: ['bookings', booking.id, 'payments'] });
    },
    onError: fail,
  });

  const when = (iso: string) => new Date(iso).toLocaleString(undefined, { timeZone: timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const lastAuto = (info.data?.reminders ?? []).filter((r) => r.hours_before > 0);
  const lastManual = (info.data?.reminders ?? []).find((r) => r.hours_before === 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-slate-700">Payment</p>
        <p className="text-sm text-slate-600">
          {money(paid)} paid of {money(price)}
          {due > 0 ? <span className="ml-1 font-medium text-amber-700">· {money(due)} due</span> : price > 0 ? <span className="ml-1 font-medium text-emerald-700">· paid in full</span> : null}
        </p>
      </div>

      {(info.data?.payments ?? []).length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-slate-600">
          {info.data!.payments.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span>{when(p.created_at)} · {p.amount_cents < 0 ? `Refund (${p.method})` : METHODS.find((m) => m[0] === p.method)?.[1] ?? p.method}{p.note ? ` · ${p.note}` : ''}</span>
              <span className={p.amount_cents < 0 ? 'text-red-600' : 'text-emerald-700'}>{p.amount_cents < 0 ? '−' : '+'}{money(p.amount_cents)}</span>
            </li>
          ))}
        </ul>
      )}

      {mode === null && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => { setMode('pay'); setAmount(due > 0 ? (due / 100).toFixed(2) : ''); setMsg(null); }}>Record a payment</Button>
          {paid > 0 && <Button type="button" size="sm" variant="secondary" onClick={() => { setMode('refund'); setAmount((paid / 100).toFixed(2)); setMsg(null); }}>Refund</Button>}
          {due > 0 && <Button type="button" size="sm" variant="secondary" isLoading={send.isPending && send.variables === 'send-payment-link'} onClick={() => send.mutate('send-payment-link')}>Email payment link</Button>}
        </div>
      )}

      {mode && (
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-700">{mode === 'pay' ? 'Customer paid you directly' : 'Give money back'}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm" />
            </div>
            {mode === 'pay' && (
              <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
          </div>
          {mode === 'pay' ? (
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {(info.data?.card_refundable_cents ?? 0) > 0
                  ? `Up to ${money(info.data!.card_refundable_cents)} goes back to their card through Stripe. Stripe keeps its processing fee on a refund. Anything else is recorded as returned by you.`
                  : 'This was not paid by card through Stripe, so it is recorded as returned by you.'}
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={cancelToo} onChange={(e) => setCancelToo(e.target.checked)} /> Also cancel the appointment
              </label>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>Back</Button>
            {mode === 'pay' ? (
              <Button type="button" size="sm" disabled={cents <= 0} isLoading={record.isPending} onClick={() => record.mutate()}>Save payment</Button>
            ) : (
              <Button type="button" size="sm" variant="danger" disabled={cents <= 0 || cents > paid} isLoading={refund.isPending} onClick={() => { if (window.confirm(`Refund ${money(cents)}? This can't be undone.`)) refund.mutate(); }}>Refund {cents > 0 ? money(cents) : ''}</Button>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-2">
        <p className="mb-1 text-sm font-medium text-slate-700">Email the customer</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" isLoading={send.isPending && send.variables === 'resend-confirmation'} onClick={() => send.mutate('resend-confirmation')}>Resend confirmation</Button>
          <Button type="button" size="sm" variant="secondary" isLoading={send.isPending && send.variables === 'send-reminder'} onClick={() => send.mutate('send-reminder')}>Send reminder now</Button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {lastAuto.length > 0 && <>Automatic reminders sent: {lastAuto.map((r) => `${r.hours_before}h before (${when(r.sent_at)})`).join(', ')}. </>}
          {lastManual && <>Last sent by hand {when(lastManual.sent_at)}. </>}
          {lastAuto.length === 0 && !lastManual && 'No reminders sent yet. '}
          Automatic timing is in Settings.
        </p>
      </div>

      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
    </div>
  );
}
