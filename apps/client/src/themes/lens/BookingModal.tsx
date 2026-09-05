import { useState } from 'react';
import { X } from 'lucide-react';
import type { ServiceData, AvailableSlot } from '../types';
import { formatPrice } from '../types';
import Calendar from './Calendar';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceData | null;
  selectedDate: Date | null;
  selectedSlot: string | null;
  availableSlots: AvailableSlot[];
  onSelectDate: (d: Date) => void;
  onSelectSlot: (s: string) => void;
  onConfirm: (info: { name: string; email: string; phone: string }) => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  service,
  selectedDate,
  selectedSlot,
  availableSlots,
  onSelectDate,
  onSelectSlot,
  onConfirm,
}: BookingModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen || !service) return null;

  const canConfirm = Boolean(selectedDate && selectedSlot && name && email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white text-[#111111] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#111111]/10 p-6">
          <h2 className="text-2xl font-light">Book: <span className="font-medium">{service.name}</span></h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-[#111111]/40 hover:text-[#111111]">
            <X size={22} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div>
            <Calendar
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              availableSlots={availableSlots}
              onSelectDate={onSelectDate}
              onSelectSlot={onSelectSlot}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-[#f8f8f8] p-4">
              {service.description && <p className="text-sm text-[#111111]/60 mb-2 font-light">{service.description}</p>}
              <div className="flex justify-between text-sm">
                <span className="uppercase tracking-widest text-[#111111]/40 text-xs font-medium">Duration</span>
                <span className="font-light">{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="uppercase tracking-widest text-[#111111]/40 text-xs font-medium">Price</span>
                <span className="font-bold">{formatPrice(service.priceCents)}</span>
              </div>
            </div>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canConfirm) onConfirm({ name, email, phone });
              }}
            >
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#111111]/40 font-medium mb-1" htmlFor="min-name">
                  Name
                </label>
                <input
                  id="min-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-[#111111]/20 px-3 py-2 text-sm focus:outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#111111]/40 font-medium mb-1" htmlFor="min-email">
                  Email
                </label>
                <input
                  id="min-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#111111]/20 px-3 py-2 text-sm focus:outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#111111]/40 font-medium mb-1" htmlFor="min-phone">
                  Phone
                </label>
                <input
                  id="min-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-[#111111]/20 px-3 py-2 text-sm focus:outline-none focus:border-[#111111]"
                />
              </div>

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-2 bg-[var(--brand-color,#111111)] text-white uppercase tracking-widest text-sm font-medium py-3 hover:bg-[#333333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
