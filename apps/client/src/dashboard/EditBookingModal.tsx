import { useState, useEffect, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Booking } from '../types';
import Modal from '../components/shared/Modal';
import Button from '../components/shared/Button';
import { Input } from '../components/shared/Input';

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

  useEffect(() => {
    if (booking) {
      setCustomerName(booking.customer_name ?? '');
      setCustomerEmail(booking.customer_email ?? '');
      setCustomerPhone(booking.customer_phone ?? '');
      setNotes(booking.notes ?? '');
      setPrice(booking.amount_cents != null ? (booking.amount_cents / 100).toFixed(2) : '');
      setError(null);
    }
  }, [booking]);

  const editMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.patch<{ booking: Booking }>(`/bookings/${booking!.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setError(null);
    editMutation.mutate({
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
              onChange={(e) => setPrice(e.target.value)}
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

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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
