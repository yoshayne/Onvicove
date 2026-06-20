import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Staff, WeeklyAvailability, AvailabilitySlot } from '../types';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import { Input, Textarea } from '../components/shared/Input';

const DAYS: { key: keyof WeeklyAvailability; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  mon: [{ start: '09:00', end: '17:00' }],
  tue: [{ start: '09:00', end: '17:00' }],
  wed: [{ start: '09:00', end: '17:00' }],
  thu: [{ start: '09:00', end: '17:00' }],
  fri: [{ start: '09:00', end: '17:00' }],
  sat: [],
  sun: [],
};

const EMPTY_DAY: WeeklyAvailability = {
  mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
};

interface StaffFormState {
  name: string;
  email: string;
  phone: string;
  bio: string;
  is_active: boolean;
  availability: WeeklyAvailability;
  avatar_key: string | null;
}

const emptyForm: StaffFormState = {
  name: '',
  email: '',
  phone: '',
  bio: '',
  is_active: true,
  availability: DEFAULT_AVAILABILITY,
  avatar_key: null,
};

export default function StaffPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<{ staff: Staff[] }>('/staff'),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Staff>) => api.post<{ staff: Staff }>('/staff', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Staff> }) =>
      api.patch<{ staff: Staff }>(`/staff/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/staff/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(staff: Staff) {
    setEditing(staff);
    setForm({
      name: staff.name,
      email: staff.email ?? '',
      phone: staff.phone ?? '',
      bio: staff.bio ?? '',
      is_active: staff.is_active,
      availability: { ...EMPTY_DAY, ...staff.availability },
      avatar_key: staff.avatar_key,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true);
    try {
      const res = await api.upload<{ key: string }>('/uploads', file);
      setForm((prev) => ({ ...prev, avatar_key: res.key }));
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  }

  function addSlot(day: keyof WeeklyAvailability) {
    setForm((f) => ({
      ...f,
      availability: {
        ...f.availability,
        [day]: [...f.availability[day], { start: '09:00', end: '17:00' }],
      },
    }));
  }

  function updateSlot(day: keyof WeeklyAvailability, index: number, slot: AvailabilitySlot) {
    setForm((f) => {
      const slots = [...f.availability[day]];
      slots[index] = slot;
      return { ...f, availability: { ...f.availability, [day]: slots } };
    });
  }

  function removeSlot(day: keyof WeeklyAvailability, index: number) {
    setForm((f) => {
      const slots = f.availability[day].filter((_, i) => i !== index);
      return { ...f, availability: { ...f.availability, [day]: slots } };
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body: Partial<Staff> = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      bio: form.bio || null,
      is_active: form.is_active,
      availability: form.availability,
      avatar_key: form.avatar_key,
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
        <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
        <Button onClick={openCreate}>Add staff member</Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Failed to load staff.</div>
      ) : !data?.staff.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No staff members yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={s.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100" />
                      )}
                      <span className="font-medium text-slate-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{s.email ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{s.phone ?? '-'}</td>
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

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit staff member' : 'Add staff member'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <Textarea
            label="Bio"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={2}
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Avatar</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
            {uploading && <Spinner size="sm" />}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Weekly availability</label>
            <p className="text-xs text-slate-500">Toggle days open/closed and set the hours customers can book.</p>
            <div className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
              {DAYS.map(({ key, label }) => {
                const isOpen = form.availability[key].length > 0;
                return (
                  <div key={key} className="flex flex-wrap items-start gap-3 px-3 py-2.5 bg-white">
                    {/* Day label + open/closed toggle */}
                    <div className="flex items-center gap-2 w-24 pt-0.5 shrink-0">
                      <span className="text-sm font-medium text-slate-700 w-8">{label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (isOpen) {
                            setForm((f) => ({ ...f, availability: { ...f.availability, [key]: [] } }));
                          } else {
                            addSlot(key);
                          }
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          isOpen ? 'bg-blue-500' : 'bg-slate-200'
                        }`}
                        aria-label={isOpen ? 'Close this day' : 'Open this day'}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${isOpen ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                      <span className="text-xs text-slate-400">{isOpen ? 'Open' : 'Closed'}</span>
                    </div>

                    {/* Time slots */}
                    {isOpen ? (
                      <div className="flex flex-1 flex-col gap-1.5">
                        {form.availability[key].map((slot, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => updateSlot(key, i, { ...slot, start: e.target.value })}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <span className="text-xs text-slate-400">–</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => updateSlot(key, i, { ...slot, end: e.target.value })}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            {form.availability[key].length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSlot(key, i)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addSlot(key)}
                          className="self-start text-xs text-blue-600 hover:underline"
                        >
                          + Add break
                        </button>
                      </div>
                    ) : (
                      <span className="pt-0.5 text-xs text-slate-400 italic">Unavailable — no bookings accepted</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

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
              {editing ? 'Save changes' : 'Create staff member'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
