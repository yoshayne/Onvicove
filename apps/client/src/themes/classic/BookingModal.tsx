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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a3a5c]/60 p-4">
      <div className="bg-white text-[#1a3a5c] w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-[#1a3a5c]">
        <div className="flex items-center justify-between border-b-2 border-[#1a3a5c] p-6">
          <h2 className="font-['Merriweather'] text-2xl font-bold text-[#1a3a5c]">
            Reserve: {service.name}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-[#1a3a5c]/60 hover:text-[var(--brand-color,#c8a850)]">
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
            <div className="bg-[#f5f5f5] border border-[#1a3a5c]/10 p-4">
              {service.description && (
                <p className="text-sm font-serif text-[#1a3a5c]/70 mb-2">{service.description}</p>
              )}
              <div className="flex justify-between text-sm font-serif border-t border-[#1a3a5c]/10 pt-2">
                <span className="font-bold uppercase tracking-wide text-[#1a3a5c]/70">Duration</span>
                <span>{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm font-serif mt-1">
                <span className="font-bold uppercase tracking-wide text-[#1a3a5c]/70">Price</span>
                <span className="font-['Merriweather'] text-lg font-bold text-[var(--brand-color,#c8a850)]">
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
                <label className="block text-xs font-bold uppercase tracking-wide text-[#1a3a5c]/70 mb-1" htmlFor="cl-name">
                  Name
                </label>
                <input
                  id="cl-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-[#1a3a5c]/30 px-3 py-2 text-sm font-serif focus:outline-none focus:border-[var(--brand-color,#c8a850)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#1a3a5c]/70 mb-1" htmlFor="cl-email">
                  Email
                </label>
                <input
                  id="cl-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#1a3a5c]/30 px-3 py-2 text-sm font-serif focus:outline-none focus:border-[var(--brand-color,#c8a850)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#1a3a5c]/70 mb-1" htmlFor="cl-phone">
                  Phone
                </label>
                <input
                  id="cl-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-[#1a3a5c]/30 px-3 py-2 text-sm font-serif focus:outline-none focus:border-[var(--brand-color,#c8a850)]"
                />
              </div>

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-2 bg-[#1a3a5c] text-white uppercase tracking-wide text-sm font-bold py-3 hover:bg-[var(--brand-color,#c8a850)] hover:text-[#1a3a5c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
