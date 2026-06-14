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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#fdf8f3] text-[#3d2314] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#3d2314]/10 p-6">
          <h2 className="font-['Lora'] text-2xl">Book: {service.name}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-[#3d2314]/60 hover:text-[#3d2314]">
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
            <div className="bg-[#f5e8d8] p-4 rounded-xl">
              {service.description && <p className="text-sm text-[#3d2314]/70 mb-2 font-['Inter']">{service.description}</p>}
              <div className="flex justify-between text-sm font-['Inter']">
                <span className="text-[#3d2314]/50">Duration</span>
                <span>{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm mt-1 font-['Inter']">
                <span className="text-[#3d2314]/50">Price</span>
                <span className="font-['Lora'] text-lg text-[#8b5e3c]">
                  {formatPrice(service.priceCents)}
                </span>
              </div>
            </div>

            <form
              className="flex flex-col gap-4 font-['Inter']"
              onSubmit={(e) => {
                e.preventDefault();
                if (canConfirm) onConfirm({ name, email, phone });
              }}
            >
              <div>
                <label className="block text-xs text-[#3d2314]/50 mb-1" htmlFor="warm-name">
                  Name
                </label>
                <input
                  id="warm-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#3d2314]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#3d2314]/50 mb-1" htmlFor="warm-email">
                  Email
                </label>
                <input
                  id="warm-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#3d2314]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#3d2314]/50 mb-1" htmlFor="warm-phone">
                  Phone
                </label>
                <input
                  id="warm-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#3d2314]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#8b5e3c]"
                />
              </div>

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-2 rounded-full bg-[#8b5e3c] text-white text-sm py-3 hover:bg-[#3d2314] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
