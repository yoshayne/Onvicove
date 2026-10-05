import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Service, Staff, Booking } from '../types';
import Modal from '../components/shared/Modal';
import Button from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import Spinner from '../components/shared/Spinner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface TimeSlot { start: string; end: string }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function NewBookingModal({ isOpen, onClose }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();

  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get<{ services: Service[] }>('/services'),
    enabled: isOpen,
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<{ staff: Staff[] }>('/staff'),
    enabled: isOpen,
  });

  const services = servicesData?.services ?? [];
  const staffList = staffData?.staff ?? [];

  const canFetchSlots = !!serviceId && !!date;

  const { data: slotsData, isFetching: loadingSlots } = useQuery({
    queryKey: ['booking-slots', serviceId, date, staffId],
    queryFn: () => {
      const params = new URLSearchParams({ service_id: serviceId, date });
      if (staffId) params.set('staff_id', staffId);
      return api.get<{ slots: TimeSlot[]; staffId: string; timezone: string }>(
        `/bookings/availability?${params.toString()}`
      );
    },
    enabled: canFetchSlots,
    staleTime: 30_000,
  });

  const slots = slotsData?.slots ?? [];

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ booking: Booking }>('/bookings', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleClose() {
    setServiceId(''); setStaffId(''); setDate(todayLocal());
    setSelectedSlot(null); setCustomerName(''); setCustomerEmail('');
    setCustomerPhone(''); setNotes(''); setError(null);
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedSlot) { setError('Please select a time slot.'); return; }
    if (!customerName.trim()) { setError('Customer name is required.'); return; }
    if (!customerEmail.trim()) { setError('Customer email is required.'); return; }
    setError(null);
    createMutation.mutate({
      service_id: serviceId,
      staff_id: staffId || null,
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone.trim() || null,
      notes: notes.trim() || null,
      status: 'confirmed',
    });
  }

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New booking">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Service */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Service *</label>
          <select
            value={serviceId}
            onChange={(e) => { setServiceId(e.target.value); setSelectedSlot(null); }}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a service…</option>
            {services.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_minutes} min)
              </option>
            ))}
          </select>
        </div>

        {/* Staff (optional) */}
        {staffList.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Staff member</label>
            <select
              value={staffId}
              onChange={(e) => { setStaffId(e.target.value); setSelectedSlot(null); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any available</option>
              {staffList.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Date *</label>
          <input
            type="date"
            value={date}
            min={todayLocal()}
            onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Time slots */}
        {serviceId && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Available times *</label>
            {loadingSlots ? (
              <div className="flex h-16 items-center justify-center">
                <Spinner size="sm" />
              </div>
            ) : slots.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No available slots on this date. The business may be closed or fully booked.
              </p>
            ) : (
              <div className="grid max-h-48 grid-cols-3 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const isSelected =
                    selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedSlot && selectedService && (
              <p className="text-xs text-slate-500">
                {formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)} ·{' '}
                {selectedService.duration_minutes} min
              </p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 pt-2">
          <p className="mb-3 text-sm font-medium text-slate-700">Customer info</p>
          <div className="flex flex-col gap-3">
            <Input
              label="Name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
            <Input
              label="Email *"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+1 555 000 0000"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes for this booking…"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isPending} disabled={!selectedSlot}>
            Create booking
          </Button>
        </div>
      </form>
    </Modal>
  );
}
