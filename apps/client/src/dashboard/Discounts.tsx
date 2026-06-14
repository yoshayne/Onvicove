import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { DiscountCode, DiscountType } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import { Input } from '../components/shared/Input';

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

interface DiscountFormState {
  code: string;
  type: DiscountType;
  value: number;
  minimum_order_cents: number;
  usage_limit: number | null;
  expires_at: string;
  is_active: boolean;
}

const emptyForm: DiscountFormState = {
  code: '',
  type: 'percentage',
  value: 10,
  minimum_order_cents: 0,
  usage_limit: null,
  expires_at: '',
  is_active: true,
};

export default function Discounts() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<DiscountFormState>(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['discounts'],
    queryFn: () => api.get<{ discounts: DiscountCode[] }>('/discounts'),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ discount: DiscountCode }>('/discounts', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<{ discount: DiscountCode }>(`/discounts/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/discounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch<{ discount: DiscountCode }>(`/discounts/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(discount: DiscountCode) {
    setEditing(discount);
    setForm({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      minimum_order_cents: discount.minimum_order_cents,
      usage_limit: discount.usage_limit,
      expires_at: discount.expires_at ? discount.expires_at.slice(0, 10) : '',
      is_active: discount.is_active,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      code: form.code,
      type: form.type,
      value: form.value,
      minimum_order_cents: form.minimum_order_cents,
      usage_limit: form.usage_limit,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Discounts</h1>
        <Button onClick={openCreate}>Add discount code</Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load discounts.</div>
      ) : !data?.discounts.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No discount codes yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Min. order</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.discounts.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{d.code}</td>
                  <td className="px-4 py-3 text-slate-700">{d.type}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.type === 'percentage' ? `${d.value}%` : formatCents(d.value)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatCents(d.minimum_order_cents)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.usage_count}
                    {d.usage_limit ? ` / ${d.usage_limit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActiveMutation.mutate({ id: d.id, is_active: !d.is_active })}
                    >
                      <Badge tone={d.is_active ? 'success' : 'default'}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(d)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Delete code ${d.code}?`)) deleteMutation.mutate(d.id);
                        }}
                      >
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

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit discount code' : 'Add discount code'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DiscountType }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            {form.type === 'percentage' ? (
              <Input
                label="Value (%)"
                type="number"
                min={1}
                max={100}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                required
              />
            ) : (
              <Input
                label="Value (USD)"
                type="number"
                min={0.01}
                step="0.01"
                value={form.value / 100}
                onChange={(e) => setForm((f) => ({ ...f, value: Math.round(Number(e.target.value) * 100) }))}
                required
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Minimum order (USD)"
              type="number"
              min={0}
              step="0.01"
              value={form.minimum_order_cents / 100}
              onChange={(e) =>
                setForm((f) => ({ ...f, minimum_order_cents: Math.round(Number(e.target.value) * 100) }))
              }
            />
            <Input
              label="Usage limit"
              type="number"
              min={1}
              value={form.usage_limit ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  usage_limit: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              placeholder="Unlimited"
            />
          </div>
          <Input
            label="Expires"
            type="date"
            value={form.expires_at}
            onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editing ? 'Save changes' : 'Create discount'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
