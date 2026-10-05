import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Service } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import { Input, Textarea } from '../components/shared/Input';

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

interface ServiceFormState {
  name: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  buffer_minutes: number;
  requires_deposit: boolean;
  deposit_cents: number | null;
  is_active: boolean;
}

const emptyForm: ServiceFormState = {
  name: '',
  description: '',
  price_cents: 0,
  duration_minutes: 30,
  buffer_minutes: 0,
  requires_deposit: false,
  deposit_cents: null,
  is_active: true,
};

export default function Services() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get<{ services: Service[] }>('/services'),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Service>) => api.post<{ service: Service }>('/services', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Service> }) =>
      api.patch<{ service: Service }>(`/services/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/services/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? '',
      price_cents: service.price_cents,
      duration_minutes: service.duration_minutes,
      buffer_minutes: service.buffer_minutes,
      requires_deposit: service.requires_deposit,
      deposit_cents: service.deposit_cents,
      is_active: service.is_active,
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
    const body: Partial<Service> = {
      name: form.name,
      description: form.description || null,
      price_cents: form.price_cents,
      duration_minutes: form.duration_minutes,
      buffer_minutes: form.buffer_minutes,
      requires_deposit: form.requires_deposit,
      deposit_cents: form.requires_deposit ? form.deposit_cents : null,
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
        <h1 className="text-2xl font-bold text-slate-900">Services</h1>
        <Button onClick={openCreate}>Add service</Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load services.</div>
      ) : !data?.services.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No services yet. Add your first service to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Buffer</th>
                <th className="px-4 py-3 font-medium">Deposit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCents(s.price_cents)}</td>
                  <td className="px-4 py-3 text-slate-700">{s.duration_minutes} min</td>
                  <td className="px-4 py-3 text-slate-700">{s.buffer_minutes} min</td>
                  <td className="px-4 py-3 text-slate-700">
                    {s.requires_deposit && s.deposit_cents ? formatCents(s.deposit_cents) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={s.is_active ? 'success' : 'default'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Delete ${s.name}?`)) deleteMutation.mutate(s.id);
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

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit service' : 'Add service'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Price (USD)"
              type="number"
              min={0}
              step="0.01"
              value={form.price_cents / 100}
              onChange={(e) =>
                setForm((f) => ({ ...f, price_cents: Math.round(Number(e.target.value) * 100) }))
              }
              required
            />
            <Input
              label="Duration (min)"
              type="number"
              min={1}
              value={form.duration_minutes}
              onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
              required
            />
            <Input
              label="Buffer (min)"
              type="number"
              min={0}
              value={form.buffer_minutes}
              onChange={(e) => setForm((f) => ({ ...f, buffer_minutes: Number(e.target.value) }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.requires_deposit}
              onChange={(e) => setForm((f) => ({ ...f, requires_deposit: e.target.checked }))}
            />
            Requires deposit
          </label>
          {form.requires_deposit && (
            <Input
              label="Deposit (USD)"
              type="number"
              min={0}
              step="0.01"
              value={(form.deposit_cents ?? 0) / 100}
              onChange={(e) =>
                setForm((f) => ({ ...f, deposit_cents: Math.round(Number(e.target.value) * 100) }))
              }
            />
          )}

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
              {editing ? 'Save changes' : 'Create service'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
