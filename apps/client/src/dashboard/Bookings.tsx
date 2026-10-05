import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Booking, BookingStatus, Tenant } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import PaymentModal from './PaymentModal';
import NewBookingModal from './NewBookingModal';

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
