import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Booking, BookingStatus, Tenant } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import PaymentModal from './PaymentModal';
import NewBookingModal from './NewBookingModal';

interface CitySchedule {
  id: string;
  date_from: string;
  date_to: string;
  city_label: string;
}

const RANGE_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-orange-500',
];

function CityScheduleCalendar() {
  const api = useApi();
  const queryClient = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [pendingRange, setPendingRange] = useState<{ from: string; to: string } | null>(null);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const { data } = useQuery({
    queryKey: ['city-schedules', monthStr],
    queryFn: () => api.get<{ city_schedules: CitySchedule[] }>(`/blocked-dates?month=${monthStr}`),
  });

  const schedules = data?.city_schedules ?? [];

  const addMutation = useMutation({
    mutationFn: (body: { date_from: string; date_to: string; city_label: string }) =>
      api.post('/blocked-dates', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['city-schedules'] });
      setPendingRange(null);
      setCityInput('');
      setShowForm(false);
      setRangeStart(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/blocked-dates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['city-schedules'] }),
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
    if (!rangeStart) {
      setRangeStart(dateStr);
    } else {
      const from = rangeStart <= dateStr ? rangeStart : dateStr;
      const to = rangeStart <= dateStr ? dateStr : rangeStart;
      setPendingRange({ from, to });
      setShowForm(true);
      setRangeStart(null);
    }
  }

  function handleSave() {
    if (!pendingRange || !cityInput.trim()) return;
    addMutation.mutate({ date_from: pendingRange.from, date_to: pendingRange.to, city_label: cityInput.trim() });
  }

  function getScheduleForDay(dateStr: string): { schedule: CitySchedule; colorIdx: number } | null {
    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (dateStr >= s.date_from && dateStr <= s.date_to) {
        return { schedule: s, colorIdx: i % RANGE_COLORS.length };
      }
    }
    return null;
  }

  const days: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">City Schedule</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">‹</button>
          <span className="text-sm font-medium text-slate-700 w-36 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">›</button>
        </div>
      </div>

      {rangeStart && (
        <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Start: <strong>{rangeStart}</strong> — now click the end date
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const match = getScheduleForDay(dateStr);
          const isStart = rangeStart === dateStr;
          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              title={match ? `${match.schedule.city_label} (${match.schedule.date_from} → ${match.schedule.date_to})` : 'Click to start a range'}
              className={`rounded py-1.5 text-sm font-medium transition-colors leading-none ${
                isStart
                  ? 'ring-2 ring-blue-500 bg-blue-100 text-blue-800'
                  : match
                  ? `${RANGE_COLORS[match.colorIdx]} text-white hover:opacity-80`
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {showForm && pendingRange && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-slate-800 mb-2">
            {pendingRange.from} → {pendingRange.to}
          </p>
          <input
            type="text"
            placeholder="City (e.g. Columbia, SC)"
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm mb-2"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setShowForm(false); setPendingRange(null); } }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!cityInput.trim() || addMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setShowForm(false); setPendingRange(null); setCityInput(''); }}
              className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {schedules.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4 flex flex-col gap-1.5">
          {schedules.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-slate-50">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${RANGE_COLORS[i % RANGE_COLORS.length]}`} />
                <span className="font-medium text-slate-800">{s.city_label}</span>
                <span className="text-slate-400">{s.date_from} → {s.date_to}</span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(s.id)}
                className="text-slate-400 hover:text-red-500 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400">Click a start date then an end date to add a city range.</p>
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

      <CityScheduleCalendar />

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
