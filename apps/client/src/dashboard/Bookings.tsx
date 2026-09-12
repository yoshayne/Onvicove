import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Booking, BookingStatus, Tenant } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import PaymentModal from './PaymentModal';
import NewBookingModal from './NewBookingModal';

interface BlockedDate {
  id: string;
  date: string;
  city_label: string | null;
}

function BlockedDatesCalendar() {
  const api = useApi();
  const queryClient = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [labelInput, setLabelInput] = useState<Record<string, string>>({});

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const { data } = useQuery({
    queryKey: ['blocked-dates', monthStr],
    queryFn: () => api.get<{ blocked_dates: BlockedDate[] }>(`/blocked-dates?month=${monthStr}`),
  });

  const blockedMap = new Map<string, BlockedDate>(
    (data?.blocked_dates ?? []).map((d) => [d.date, d])
  );

  const blockMutation = useMutation({
    mutationFn: ({ date, city_label }: { date: string; city_label?: string }) =>
      api.post('/blocked-dates', { date, city_label: city_label || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocked-dates'] }),
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/blocked-dates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocked-dates'] }),
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  }

  function handleDayClick(dateStr: string) {
    const existing = blockedMap.get(dateStr);
    if (existing) {
      unblockMutation.mutate(existing.id);
    } else {
      blockMutation.mutate({ date: dateStr, city_label: labelInput['__global__'] || undefined });
    }
  }

  const days: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Block Dates</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">‹</button>
          <span className="text-sm font-medium text-slate-700 w-36 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const blocked = blockedMap.get(dateStr);
          return (
            <div key={dateStr} className="flex flex-col items-center">
              <button
                onClick={() => handleDayClick(dateStr)}
                title={blocked ? `Unblock${blocked.city_label ? ` (${blocked.city_label})` : ''}` : 'Block this date'}
                className={`w-full rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  blocked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {day}
                {blocked?.city_label && (
                  <div className="truncate px-0.5 text-[9px] leading-tight opacity-90">{blocked.city_label}</div>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500 mb-1">Optional city label applied when blocking a date:</p>
        <input
          type="text"
          placeholder="e.g. New York, LA, Chicago…"
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          value={labelInput['__global__'] ?? ''}
          onChange={(e) => setLabelInput({ '__global__': e.target.value })}
        />
        <p className="mt-2 text-[11px] text-slate-400">Red = blocked (storefront hides all slots). Click a red date to unblock it.</p>
      </div>
    </div>
  );
}

const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];

const STATUS_TONES: Record<BookingStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'default',
};

function formatCents(cents: number | null) {
  if (cents == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function Bookings() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  const query = params.toString();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookings', statusFilter, dateFrom, dateTo],
    queryFn: () => api.get<{ bookings: Booking[] }>(`/bookings${query ? `?${query}` : ''}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      api.patch<{ booking: Booking }>(`/bookings/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const { data: tenantData } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me'),
  });

  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <Button onClick={() => setShowNewBooking(true)}>+ New booking</Button>
      </div>

      <BlockedDatesCalendar />

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load bookings.</div>
      ) : !data?.bookings.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No bookings found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{b.customer_name}</div>
                    <div className="text-xs text-slate-400">{b.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(b.start_time).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(b.end_time).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatCents(b.amount_cents)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONES[b.status]}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {b.status !== 'confirmed' && b.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateMutation.mutate({ id: b.id, status: 'confirmed' })}
                        >
                          Confirm
                        </Button>
                      )}
                      {b.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateMutation.mutate({ id: b.id, status: 'completed' })}
                        >
                          Complete
                        </Button>
                      )}
                      {b.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => updateMutation.mutate({ id: b.id, status: 'cancelled' })}
                        >
                          Cancel
                        </Button>
                      )}
                      {b.status === 'completed' &&
                        (b.amount_cents ?? 0) > (b.deposit_paid_cents ?? 0) && (
                          <Button size="sm" variant="secondary" onClick={() => setPaymentBooking(b)}>
                            Payment
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewBookingModal isOpen={showNewBooking} onClose={() => setShowNewBooking(false)} />

      {paymentBooking && (
        <PaymentModal
          booking={paymentBooking}
          stripeAccountId={tenantData?.tenant.stripe_account_id ?? undefined}
          currency={tenantData?.tenant.currency}
          onClose={() => setPaymentBooking(null)}
        />
      )}
    </div>
  );
}
