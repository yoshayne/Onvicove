import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Order, Booking } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';

function formatCents(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function Overview() {
  const api = useApi();

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<{ orders: Order[] }>('/orders'),
  });
  const bookingsQuery = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get<{ bookings: Booking[] }>('/bookings'),
  });

  if (ordersQuery.isLoading || bookingsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (ordersQuery.isError || bookingsQuery.isError) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        Failed to load dashboard data.
      </div>
    );
  }

  const orders = ordersQuery.data?.orders ?? [];
  const bookings = bookingsQuery.data?.bookings ?? [];

  const totalRevenue = orders
    .filter((o) => o.status === 'paid' || o.status === 'fulfilled')
    .reduce((sum, o) => sum + o.total_cents, 0);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Orders" value={orders.length.toString()} />
        <StatCard label="Total Bookings" value={bookings.length.toString()} />
        <StatCard label="Revenue" value={formatCents(totalRevenue)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-900">#{o.order_number}</p>
                    <p className="text-slate-500">{o.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700">{formatCents(o.total_cents)}</span>
                    <Badge>{o.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent Bookings</h2>
          {recentBookings.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{b.customer_name}</p>
                    <p className="text-slate-500">
                      {new Date(b.start_time).toLocaleString()}
                    </p>
                  </div>
                  <Badge>{b.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
