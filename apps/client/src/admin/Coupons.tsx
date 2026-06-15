import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  applies_to_plan: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: '',
  applies_to_plan: '',
  max_redemptions: '',
  expires_at: '',
};

export default function Coupons() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: () => api.get<{ coupons: Coupon[] }>('/admin/coupons'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<{ coupon: Coupon }>('/admin/coupons', {
        code: form.code,
        type: form.type,
        value: parseInt(form.value, 10),
        applies_to_plan: form.applies_to_plan || null,
        max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions, 10) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setForm(emptyForm);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/admin/coupons/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/coupons/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Coupons</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-medium text-slate-500">Create a coupon</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="mt-1 w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'percentage' | 'fixed' }))}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="percentage">% off</option>
              <option value="fixed">$ off (cents)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Value</label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              className="mt-1 w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Applies to plan</label>
            <select
              value={form.applies_to_plan}
              onChange={(e) => setForm((f) => ({ ...f, applies_to_plan: e.target.value }))}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Any plan</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Max redemptions</label>
            <input
              type="number"
              placeholder="Unlimited"
              value={form.max_redemptions}
              onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
              className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Expires</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !form.code || !form.value}
          >
            {createMutation.isPending ? 'Creating…' : 'Create coupon'}
          </Button>
        </div>
        {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error || !data ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load coupons.'}
        </div>
      ) : !data.coupons.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No coupons yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Redemptions</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.coupons.map((coupon) => (
                <tr key={coupon.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{coupon.code}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {coupon.type === 'percentage' ? `${coupon.value}%` : `$${(coupon.value / 100).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{coupon.applies_to_plan || 'Any'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {coupon.redemption_count}
                    {coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={coupon.is_active ? 'success' : 'default'}>
                      {coupon.is_active ? 'active' : 'inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleMutation.mutate({ id: coupon.id, is_active: !coupon.is_active })}
                      >
                        {coupon.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(coupon.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
