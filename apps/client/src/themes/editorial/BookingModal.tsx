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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white text-[#111111] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-sm">
        <div className="flex items-center justify-between border-b border-[#1a1a1a]/10 p-6">
          <h2 className="font-['Playfair_Display'] text-2xl">Reserve: {service.name}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-[#111111]/60 hover:text-[#111111]">
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
            <div className="bg-[#f5f5f5] p-4 rounded-sm">
              {service.description && <p className="text-sm text-[#111111]/70 mb-2">{service.description}</p>}
              <div className="flex justify-between text-sm">
                <span className="uppercase tracking-widest text-[#111111]/50">Duration</span>
                <span>{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="uppercase tracking-widest text-[#111111]/50">Price</span>
                <span className="font-['Playfair_Display'] text-lg text-[var(--brand-color,#d4a96a)]">
                  {formatPrice(service.priceCents)}
                </span>
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
                <label className="block text-xs uppercase tracking-widest text-[#111111]/50 mb-1" htmlFor="ed-name">
                  Name
                </label>
                <input
                  id="ed-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-[#111111]/20 px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-color,#d4a96a)]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#111111]/50 mb-1" htmlFor="ed-email">
                  Email
                </label>
                <input
                  id="ed-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#111111]/20 px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-color,#d4a96a)]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#111111]/50 mb-1" htmlFor="ed-phone">
                  Phone
                </label>
                <input
                  id="ed-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-[#111111]/20 px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-color,#d4a96a)]"
                />
              </div>

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-2 bg-[#1a1a1a] text-white uppercase tracking-widest text-sm py-3 hover:bg-[var(--brand-color,#d4a96a)] hover:text-[#111111] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Reservation
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
