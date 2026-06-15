import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';

interface AdminTransaction {
  id: string;
  tenant_id: string;
  company_name: string;
  slug: string;
  reference_id: string;
  reference_type: 'order' | 'booking' | 'ai_photo';
  gross_amount_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  net_to_tenant_cents: number;
  stripe_transfer_id: string | null;
  created_at: string;
}

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function Transactions() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [referenceType, setReferenceType] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (referenceType) params.set('reference_type', referenceType);
  const query = params.toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'transactions', referenceType],
    queryFn: () => api.get<{ transactions: AdminTransaction[] }>(`/admin/transactions${query ? `?${query}` : ''}`),
  });

  const refundMutation = useMutation({
    mutationFn: (transactionId: string) => api.post('/admin/refunds', { transaction_id: transactionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      setConfirmId(null);
    },
    onError: (err: Error) => setRefundError(err.message),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>

      <div className="flex flex-wrap gap-3">
        <select
          value={referenceType}
          onChange={(e) => setReferenceType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="order">Orders</option>
          <option value="booking">Bookings</option>
          <option value="ai_photo">AI photos</option>
        </select>
      </div>

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
          No transactions found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Gross</th>
                <th className="px-4 py-3 font-medium">Platform fee</th>
                <th className="px-4 py-3 font-medium">Stripe fee</th>
                <th className="px-4 py-3 font-medium">Net to tenant</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => {
                const isRefund = tx.gross_amount_cents < 0;
                return (
                  <tr key={tx.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{tx.company_name}</div>
                      <div className="text-xs text-slate-400">/{tx.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={isRefund ? 'danger' : 'default'}>
                        {isRefund ? `refund (${tx.reference_type})` : tx.reference_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCents(tx.gross_amount_cents)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCents(tx.platform_fee_cents)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCents(tx.stripe_fee_cents)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCents(tx.net_to_tenant_cents)}</td>
                    <td className="px-4 py-3">
                      {!isRefund && tx.reference_type !== 'ai_photo' && (
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
                            <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setConfirmId(tx.id)}>
                            Refund
                          </Button>
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
    </div>
  );
}
