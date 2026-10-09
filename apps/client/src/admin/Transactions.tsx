import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import { formatMoney } from '../lib/metrics';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';

interface AdminTransaction {
  id: string;
  tenant_id: string;
  company_name: string;
  slug: string;
  currency: string | null;
  reference_id: string;
  reference_type: 'order' | 'booking' | 'ai_photo';
  reference_label: string | null;
  customer_name: string | null;
  gross_amount_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  net_to_tenant_cents: number;
  stripe_transfer_id: string | null;
  refunded: boolean;
  created_at: string;
}

interface Summary {
  sales_count: number;
  refund_count: number;
  gross_cents: string | number;
  platform_fee_cents: string | number;
  stripe_fee_cents: string | number;
  net_to_tenant_cents: string | number;
}

interface TransactionsResponse {
  transactions: AdminTransaction[];
  summary: Summary;
  page: number;
  page_size: number;
}

const field = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function Transactions() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [referenceType, setReferenceType] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (referenceType) params.set('reference_type', referenceType);
  if (tenantId) params.set('tenant_id', tenantId);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  if (page) params.set('page', String(page));
  const query = params.toString();

  const tenantsQ = useQuery({
    queryKey: ['admin', 'tenants', 'all'],
    queryFn: () => api.get<{ tenants: { id: string; company_name: string }[] }>('/admin/tenants'),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'transactions', query],
    queryFn: () => api.get<TransactionsResponse>(`/admin/transactions${query ? `?${query}` : ''}`),
  });

  const refundMutation = useMutation({
    mutationFn: (transactionId: string) => api.post('/admin/refunds', { transaction_id: transactionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      setConfirmId(null);
    },
    onError: (err: Error) => {
      setRefundError(err.message);
      setConfirmId(null);
    },
  });

  function change(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPage(0);
    };
  }

  const s = data?.summary;
  const usd = (c: string | number) => formatMoney(Number(c), 'USD');
  const hasNext = !!data && data.transactions.length === data.page_size;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>

      <div className="flex flex-wrap gap-3">
        <select value={tenantId} onChange={(e) => change(setTenantId)(e.target.value)} className={field}>
          <option value="">All stores</option>
          {(tenantsQ.data?.tenants ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.company_name}</option>
          ))}
        </select>
        <select value={referenceType} onChange={(e) => change(setReferenceType)(e.target.value)} className={field}>
          <option value="">All types</option>
          <option value="order">Orders</option>
          <option value="booking">Bookings</option>
          <option value="ai_photo">AI photos</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          From <input type="date" value={dateFrom} onChange={(e) => change(setDateFrom)(e.target.value)} className={field} />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          To <input type="date" value={dateTo} onChange={(e) => change(setDateTo)(e.target.value)} className={field} />
        </label>
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Sales', value: `${s.sales_count}${s.refund_count ? ` (${s.refund_count} refunded)` : ''}` },
            { label: 'Gross (after refunds)', value: usd(s.gross_cents) },
            { label: 'Your platform fees', value: usd(s.platform_fee_cents) },
            { label: 'Stripe fees (est.)', value: usd(s.stripe_fee_cents) },
            { label: 'Net to stores', value: usd(s.net_to_tenant_cents) },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{c.value}</div>
            </div>
          ))}
        </div>
      )}
      <p className="-mt-2 text-xs text-slate-400">
        Totals cover every transaction matching the filters, not just this page. Amounts are in USD for the totals; each row uses the store's currency. Stripe's fee is an estimate (2.9% + 30¢), paid by the store.
      </p>

      {refundError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{refundError}</div>}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error || !data ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load transactions.'}
        </div>
      ) : !data.transactions.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No transactions match. Sales appear here once a customer's payment completes.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">What</th>
                <th className="px-4 py-3 font-medium">Gross</th>
                <th className="px-4 py-3 font-medium">Platform fee</th>
                <th className="px-4 py-3 font-medium">Stripe fee (est.)</th>
                <th className="px-4 py-3 font-medium">Net to store</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => {
                const isRefund = tx.gross_amount_cents < 0;
                const money = (c: number) => formatMoney(c, tx.currency);
                return (
                  <tr key={tx.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{tx.company_name}</div>
                      <div className="text-xs text-slate-400">/{tx.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={isRefund ? 'danger' : 'default'}>{isRefund ? 'refund' : tx.reference_type}</Badge>
                        {tx.refunded && <Badge tone="warning">refunded</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {tx.reference_label ?? '-'}{tx.customer_name ? ` · ${tx.customer_name}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{money(tx.gross_amount_cents)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(tx.platform_fee_cents)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(tx.stripe_fee_cents)}</td>
                    <td className="px-4 py-3 text-slate-700">{money(tx.net_to_tenant_cents)}</td>
                    <td className="px-4 py-3">
                      {!isRefund && !tx.refunded && tx.reference_type !== 'ai_photo' && (
                        confirmId === tx.id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setRefundError(null);
                                refundMutation.mutate(tx.id);
                              }}
                              disabled={refundMutation.isPending}
                            >
                              {refundMutation.isPending ? 'Refunding…' : 'Confirm'}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setConfirmId(tx.id)}>Refund</Button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && (page > 0 || hasNext) && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page + 1}</span>
          <Button size="sm" variant="secondary" disabled={!hasNext} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
