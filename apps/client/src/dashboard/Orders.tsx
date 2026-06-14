import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Order, OrderItem, OrderStatus, FulfillmentStatus } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'fulfilled', 'refunded', 'cancelled'];
const FULFILLMENT_STATUSES: FulfillmentStatus[] = ['unfulfilled', 'fulfilled', 'partial'];

export default function Orders() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, OrderItem[]>>({});
  const [itemsLoading, setItemsLoading] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () =>
      api.get<{ orders: Order[] }>(`/orders${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Order> }) =>
      api.patch<{ order: Order }>(`/orders/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  async function toggleExpand(order: Order) {
    if (expandedId === order.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(order.id);
    if (!itemsCache[order.id]) {
      setItemsLoading(order.id);
      try {
        const res = await api.get<{ order: Order; items: OrderItem[] }>(`/orders/${order.id}`);
        setItemsCache((prev) => ({ ...prev, [order.id]: res.items }));
      } finally {
        setItemsLoading(null);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load orders.</div>
      ) : !data?.orders.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No orders found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Fulfillment</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <Fragment key={order.id}>
                  <tr
                    key={order.id}
                    onClick={() => toggleExpand(order)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">#{order.order_number}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{order.customer_name}</div>
                      <div className="text-xs text-slate-400">{order.customer_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCents(order.total_cents)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: order.id,
                            body: { status: e.target.value as OrderStatus },
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.fulfillment_status}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: order.id,
                            body: { fulfillment_status: e.target.value as FulfillmentStatus },
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {FULFILLMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr className="border-t border-slate-100 bg-slate-50">
                      <td colSpan={6} className="px-4 py-3">
                        {itemsLoading === order.id ? (
                          <Spinner size="sm" />
                        ) : itemsCache[order.id]?.length ? (
                          <table className="w-full text-xs">
                            <thead className="text-left text-slate-500">
                              <tr>
                                <th className="py-1 pr-4">Item</th>
                                <th className="py-1 pr-4">Qty</th>
                                <th className="py-1 pr-4">Price</th>
                                <th className="py-1 pr-4">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {itemsCache[order.id].map((item) => (
                                <tr key={item.id}>
                                  <td className="py-1 pr-4">{item.name}</td>
                                  <td className="py-1 pr-4">{item.quantity}</td>
                                  <td className="py-1 pr-4">{formatCents(item.price_cents)}</td>
                                  <td className="py-1 pr-4">{formatCents(item.total_cents)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-xs text-slate-500">No items.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
