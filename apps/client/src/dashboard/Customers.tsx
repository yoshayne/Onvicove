import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Customer } from '../types';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import { Input, Textarea } from '../components/shared/Input';

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function Customers() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      api.get<{ customers: Customer[] }>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

  const updateMutation = useMutation({
    mutationFn: (body: { email: string; notes: string | null; tags: string[] }) =>
      api.post<{ customer: Customer }>('/customers', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelected(null);
    },
  });

  function openCustomer(customer: Customer) {
    setSelected(customer);
    setNotes(customer.notes ?? '');
    setTags((customer.tags ?? []).join(', '));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    updateMutation.mutate({
      email: selected.email,
      notes: notes || null,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load customers.</div>
      ) : !data?.customers.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No customers found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Total spent</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openCustomer(c)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.email}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCents(c.total_spent_cents)}</td>
                  <td className="px-4 py-3 text-slate-700">{c.order_count}</td>
                  <td className="px-4 py-3 text-slate-700">{c.booking_count}</td>
                  <td className="px-4 py-3 text-slate-700">{(c.tags ?? []).join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.first_name ?? ''} ${selected.last_name ?? ''}`.trim() || selected.email : ''}
      >
        {selected && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-sm text-slate-500">{selected.email}</div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Total spent</p>
                <p className="font-semibold text-slate-900">{formatCents(selected.total_spent_cents)}</p>
              </div>
              <div>
                <p className="text-slate-500">Orders</p>
                <p className="font-semibold text-slate-900">{selected.order_count}</p>
              </div>
              <div>
                <p className="text-slate-500">Bookings</p>
                <p className="font-semibold text-slate-900">{selected.booking_count}</p>
              </div>
            </div>
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <Input
              label="Tags (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
