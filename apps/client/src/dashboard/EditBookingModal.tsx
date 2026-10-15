import { useState, useEffect, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Booking, Tenant } from '../types';
import Modal from '../components/shared/Modal';
import Button from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import BookingPaymentPanel from './BookingPaymentPanel';

interface Props {
  booking: Booking | null;
  onClose: () => void;
}

export default function EditBookingModal({ booking, onClose }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [notify, setNotify] = useState(true);
  const [location, setLocation] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const tenantQ = useQuery({ queryKey: ['tenant', 'me'], queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me') });
  const tz = tenantQ.data?.tenant.timezone || undefined;
  const servicesQ = useQuery({ queryKey: ['services'], queryFn: () => api.get<{ services: { id: string; name: string; price_cents: number; duration_minutes: number; category: string | null }[] }>('/services') });
  const staffQ = useQuery({ queryKey: ['staff'], queryFn: () => api.get<{ staff: { id: string; name: string; is_active: boolean; service_ids?: string[] }[] }>('/staff') });
  const services = servicesQ.data?.services ?? [];
  const chosenService = services.find((sv) => sv.id === serviceId);
  const serviceMinutes = chosenService?.duration_minutes ?? 0;
  const currentLen = booking ? Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000) : 0;
  const custom = parseInt(customMinutes, 10) || 0;
  const minutes = custom || (chosenService?.duration_minutes ?? (booking ? Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000) : 0));
  // End time = start + the service's length
  const endLabel = (() => {
    if (!date || !startTime || !minutes) return '';
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const eh = Math.floor((total % 1440) / 60);
    const em = total % 60;
    const ampm = eh >= 12 ? 'PM' : 'AM';
    return `${((eh + 11) % 12) + 1}:${String(em).padStart(2, '0')} ${ampm}${total >= 1440 ? ' (next day)' : ''}`;
  })();

  // The appointment's date and times as the business sees them (its own timezone)
  const wall = (iso: string) => ({
    date: new Date(iso).toLocaleDateString('en-CA', { timeZone: tz }),
    time: new Date(iso).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).replace(/^24:/, '00:'),
  });

  useEffect(() => {
    if (booking) {
      setCustomerName(booking.customer_name ?? '');
      setCustomerEmail(booking.customer_email ?? '');
      setCustomerPhone(booking.customer_phone ?? '');
      setNotes(booking.notes ?? '');
      setPrice(booking.amount_cents != null ? (booking.amount_cents / 100).toFixed(2) : '');
      setError(null);
      setConflict(false);
      setDate(wall(booking.start_time).date);
      setStartTime(wall(booking.start_time).time);
      setServiceId(booking.service_id);
      setStaffId(booking.staff_id ?? '');
      setInternalNotes(booking.internal_notes ?? '');
      setNotify(true);
      setLocation(booking.location ?? '');
      setCustomMinutes('');
      setPriceTouched(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking, tz]);

  // A booking whose length differs from its type's usual length keeps that custom length
  useEffect(() => {
    if (booking && serviceId === booking.service_id && serviceMinutes && currentLen !== serviceMinutes) setCustomMinutes(String(currentLen));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, serviceMinutes]);

  const editMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<{ booking: Booking }>(`/bookings/${booking!.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (err: Error & { status?: number }) => {
      setError(err.message);
      setConflict(/overlaps/i.test(err.message));
    },
  });

  function handleSubmit(e: FormEvent, force = false) {
    e.preventDefault();
    if (!booking) return;
    setError(null);
    setConflict(false);
    const was = { date: wall(booking.start_time).date, start: wall(booking.start_time).time };
    const serviceChanged = serviceId !== booking.service_id;
    const timeMoved = date !== was.date || startTime !== was.start;
    const lengthChanged = custom ? custom !== currentLen : !!serviceMinutes && currentLen !== serviceMinutes;
    const locationChanged = location.trim() !== (booking.location ?? '');
    editMutation.mutate({
      ...(timeMoved || serviceChanged || lengthChanged ? { reschedule: { date, start: startTime }, force } : {}),
      ...(custom && (lengthChanged || serviceChanged || timeMoved) ? { duration_minutes: custom } : {}),
      ...(locationChanged ? { location: location.trim() || null } : {}),
      ...(serviceChanged ? { service_id: serviceId } : {}),
      ...(staffId !== (booking.staff_id ?? '') ? { staff_id: staffId || null } : {}),
      ...(timeMoved || serviceChanged || lengthChanged || locationChanged || staffId !== (booking.staff_id ?? '') ? { notify } : {}),
      internal_notes: internalNotes.trim() || null,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone.trim() || null,
      notes: notes.trim() || null,
      amount_cents: price !== '' ? Math.round(parseFloat(price) * 100) : booking.amount_cents,
    });
  }

  const originalPrice = booking?.amount_cents != null ? (booking.amount_cents / 100).toFixed(2) : '';

  return (
    <Modal isOpen={!!booking} onClose={onClose} title="Edit booking">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* What */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Type of booking</label>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setCustomMinutes(''); // a different type brings its own length
              const sv = services.find((x) => x.id === e.target.value);
              if (sv && !priceTouched) setPrice((sv.price_cents / 100).toFixed(2));
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {services.length === 0 && <option value={serviceId}>{booking?.service_name ?? 'Loading…'}</option>}
            {services.map((sv) => (
              <option key={sv.id} value={sv.id}>{sv.name} ({sv.duration_minutes} min, ${(sv.price_cents / 100).toFixed(2)})</option>
            ))}
          </select>
          {(staffQ.data?.staff ?? []).filter((m) => m.is_active).length > 0 && (
            <>
              <label className="mt-2 text-sm font-medium text-slate-700">With</label>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Anyone</option>
                {(staffQ.data?.staff ?? []).filter((m) => m.is_active).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* When */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Date and start time</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <p className="text-xs text-slate-500">
            {endLabel ? <>Ends at <strong>{endLabel}</strong> ({minutes} min, {custom ? 'custom length' : 'set by the type of booking'}). </> : null}
            Your business's timezone.
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <span>Custom length</span>
            <input type="number" min={5} max={1440} step={5} placeholder={serviceMinutes ? String(serviceMinutes) : ''} value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <span className="text-xs text-slate-500">min (leave empty to use the type's length)</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Location <span className="font-normal text-slate-400">(shown in the customer's emails)</span></label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} placeholder="Address, studio, or a video call link" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Price
            {price !== originalPrice && originalPrice && (
              <span className="ml-1 text-xs font-normal text-amber-600">original: ${originalPrice}</span>
            )}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => { setPrice(e.target.value); setPriceTouched(true); }}
              className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Customer info */}
        <div className="border-t border-slate-100 pt-2">
          <p className="mb-3 text-sm font-medium text-slate-700">Customer info</p>
          <div className="flex flex-col gap-3">
            <Input
              label="Name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
            <Input
              label="Email *"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Private note (only you see this)</label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {booking && <BookingPaymentPanel booking={booking} timezone={tz} />}

        {booking?.status === 'confirmed' && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Email the customer if the time, type, person or location changes
          </label>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
            {conflict && (
              <button type="button" className="ml-2 font-semibold underline" onClick={(e) => handleSubmit(e as unknown as FormEvent, true)}>
                Move it anyway
              </button>
            )}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={editMutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
