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
  category: string;
  requires_deposit: boolean;
  deposit_cents: number | null;
  is_active: boolean;
  billing_type: 'one_time' | 'recurring';
  recurring_kind: 'membership' | 'appointment';
  appointment_frequency: 'weekly' | 'biweekly';
}

const emptyForm: ServiceFormState = {
  name: '',
  description: '',
  category: '',
  price_cents: 0,
  duration_minutes: 30,
  buffer_minutes: 0,
  requires_deposit: false,
  deposit_cents: null,
  is_active: true,
  billing_type: 'one_time',
  recurring_kind: 'membership',
  appointment_frequency: 'weekly',
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
      category: service.category ?? '',
      price_cents: service.price_cents,
      duration_minutes: service.duration_minutes,
      buffer_minutes: service.buffer_minutes,
      requires_deposit: service.requires_deposit,
      deposit_cents: service.deposit_cents,
      is_active: service.is_active,
      billing_type: service.billing_type ?? 'one_time',
      recurring_kind: service.recurring_kind ?? 'membership',
      appointment_frequency: service.appointment_frequency ?? 'weekly',
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
      category: form.category.trim() || null,
      price_cents: form.price_cents,
      duration_minutes: form.duration_minutes,
      buffer_minutes: form.buffer_minutes,
      requires_deposit: form.billing_type === 'one_time' && form.requires_deposit,
      deposit_cents: form.billing_type === 'one_time' && form.requires_deposit ? form.deposit_cents : null,
      is_active: form.is_active,
      billing_type: form.billing_type,
      recurring_kind: form.billing_type === 'recurring' ? form.recurring_kind : null,
      appointment_frequency: form.billing_type === 'recurring' && form.recurring_kind === 'appointment' ? form.appointment_frequency : null,
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
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {s.name}
                    {s.billing_type === 'recurring' && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">{s.recurring_kind === 'appointment' ? 'Recurring appt' : 'Membership'}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatCents(s.price_cents)}{s.billing_type === 'recurring' ? '/mo' : ''}</td>
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
          <div>
            <Input
              label="Category (optional)"
              list="service-categories"
              placeholder="e.g. Haircuts, Color, Beard"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <datalist id="service-categories">
              {Array.from(new Set((data?.services ?? []).map((sv) => sv.category).filter(Boolean) as string[])).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-slate-500">Services with the same category are grouped together on your site.</p>
          </div>
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

          <fieldset className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">How do customers pay?</legend>
            <div className="grid grid-cols-2 gap-2">
              {([['one_time', 'One time', 'Pay once per booking'], ['recurring', 'Monthly', 'Charged every month until they cancel']] as const).map(([id, name, desc]) => (
                <button key={id} type="button" onClick={() => setForm((f) => ({ ...f, billing_type: id }))}
                  className={`rounded-lg border p-2.5 text-left ${form.billing_type === id ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </button>
              ))}
            </div>
            {form.billing_type === 'recurring' && (
              <div className="mt-1 flex flex-col gap-2">
                <p className="text-xs text-slate-500">The price above is charged <strong>every month</strong>. Customers agree to the recurring billing terms when they sign up. Cancelling stops future charges; refunds are up to you.</p>
                <div className="grid grid-cols-2 gap-2">
                  {([['membership', 'Membership', 'Pay monthly for access. No set times.'], ['appointment', 'Recurring appointment', 'Pay monthly and a repeating session is kept on your calendar']] as const).map(([id, name, desc]) => (
                    <button key={id} type="button" onClick={() => setForm((f) => ({ ...f, recurring_kind: id }))}
                      className={`rounded-lg border p-2.5 text-left ${form.recurring_kind === id ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' : 'border-slate-200 hover:border-slate-300'}`}>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </button>
                  ))}
                </div>
                {form.recurring_kind === 'appointment' && (
                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    How often is the session?
                    <select value={form.appointment_frequency} onChange={(e) => setForm((f) => ({ ...f, appointment_frequency: e.target.value as 'weekly' | 'biweekly' }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="weekly">Every week</option>
                      <option value="biweekly">Every 2 weeks</option>
                    </select>
                  </label>
                )}
              </div>
            )}
          </fieldset>

          {form.billing_type === 'one_time' && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.requires_deposit}
              onChange={(e) => setForm((f) => ({ ...f, requires_deposit: e.target.checked }))}
            />
            Requires deposit
          </label>
          )}
          {form.billing_type === 'one_time' && form.requires_deposit && (
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

          {(createMutation.error || updateMutation.error) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{((createMutation.error || updateMutation.error) as Error).message}</p>
          )}
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
