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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-['Poppins']">
      <div className="bg-white text-[#111111] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#f0f0ff] p-6">
          <h2 className="font-['Poppins'] font-bold text-2xl text-[var(--brand-color,#ff3cac)]">Book: {service.name}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-[#111111]/40 hover:text-[var(--brand-color,#ff3cac)] transition-colors"
          >
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
            <div className="bg-[#f0f0ff] p-4 rounded-2xl">
              {service.description && <p className="text-sm text-[#111111]/70 mb-2">{service.description}</p>}
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-[#111111]/50">Duration</span>
                <span>{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="font-semibold text-[#111111]/50">Price</span>
                <span className="font-['Poppins'] font-bold text-lg text-[var(--brand-color,#ff3cac)]">
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
                <label className="block text-xs font-semibold text-[#111111]/50 mb-1" htmlFor="bright-name">
                  Name
                </label>
                <input
                  id="bright-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-[#f0f0ff] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[var(--brand-color,#ff3cac)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111]/50 mb-1" htmlFor="bright-email">
                  Email
                </label>
                <input
                  id="bright-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-[#f0f0ff] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[var(--brand-color,#ff3cac)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111]/50 mb-1" htmlFor="bright-phone">
                  Phone
                </label>
                <input
                  id="bright-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border-2 border-[#f0f0ff] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[var(--brand-color,#ff3cac)]"
                />
              </div>

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-2 bg-[var(--brand-color,#ff3cac)] text-white font-bold rounded-full text-sm py-3 hover:bg-[var(--brand-color,#ff3cac)]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
