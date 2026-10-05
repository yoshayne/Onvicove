import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Order, Booking } from '../types';
import Spinner from '../components/shared/Spinner';

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

interface MonthBucket {
  label: string;
  total: number;
}

function bucketByMonth(orders: Order[]): MonthBucket[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'paid' && o.status !== 'fulfilled') continue;
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + o.total_cents);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, total]) => {
      const [year, month] = key.split('-');
      const d = new Date(Number(year), Number(month) - 1);
      return { label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), total };
    });
}

export default function Analytics() {
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
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load analytics.</div>
    );
  }

  const orders = ordersQuery.data?.orders ?? [];
  const bookings = bookingsQuery.data?.bookings ?? [];

  const revenueByMonth = bucketByMonth(orders);
  const maxRevenue = Math.max(1, ...revenueByMonth.map((m) => m.total));

  const productCounts = new Map<string, number>();
  for (const o of orders) {
    for (const item of o.items ?? []) {
      productCounts.set(item.name, (productCounts.get(item.name) ?? 0) + item.quantity);
    }
  }
  const topProducts = Array.from(productCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const serviceCounts = new Map<string, number>();
  for (const b of bookings) {
    const name = b.service_name ?? 'Unknown service';
    serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
  }
  const topServices = Array.from(serviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxServiceCount = Math.max(1, ...topServices.map(([, count]) => count));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Revenue over time</h2>
        {revenueByMonth.length === 0 ? (
          <p className="text-sm text-slate-500">No revenue data yet.</p>
        ) : (
          <div className="flex items-end gap-4" style={{ height: 160 }}>
            {revenueByMonth.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-slate-900"
                  style={{ height: `${Math.max(4, (m.total / maxRevenue) * 130)}px` }}
                />
                <span className="text-xs text-slate-500">{m.label}</span>
                <span className="text-xs font-medium text-slate-700">{formatCents(m.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Top products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-500">No product sales yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1">Product</th>
                  <th className="py-1 text-right">Units sold</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map(([name, count]) => (
                  <tr key={name} className="border-t border-slate-100">
                    <td className="py-2 text-slate-900">{name}</td>
                    <td className="py-2 text-right text-slate-700">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Top services</h2>
          {topServices.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topServices.map(([name, count]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>{name}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-900"
                      style={{ width: `${(count / maxServiceCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
