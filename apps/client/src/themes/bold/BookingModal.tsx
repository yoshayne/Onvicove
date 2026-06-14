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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#0a0a0a] text-white w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-[#e8ff00]">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="font-black text-2xl uppercase tracking-widest">
            Book: <span className="text-[#e8ff00]">{service.name}</span>
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-white/60 hover:text-[#e8ff00]">
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
            <div className="bg-[#161616] p-4 border border-white/10">
              {service.description && <p className="text-sm text-white/70 mb-2">{service.description}</p>}
              <div className="flex justify-between text-sm">
                <span className="uppercase tracking-widest text-white/50 font-bold">Duration</span>
                <span className="font-bold">{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="uppercase tracking-widest text-white/50 font-bold">Price</span>
                <span className="font-black text-lg text-[#e8ff00]">
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
                <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-1" htmlFor="bd-name">
                  Name
                </label>
                <input
                  id="bd-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161616] border border-white/20 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e8ff00]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-1" htmlFor="bd-email">
                  Email
                </label>
                <input
                  id="bd-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161616] border border-white/20 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e8ff00]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-1" htmlFor="bd-phone">
                  Phone
                </label>
                <input
                  id="bd-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#161616] border border-white/20 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e8ff00]"
                />
              </div>

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-2 bg-[#e8ff00] text-[#0a0a0a] uppercase tracking-widest text-sm font-black py-3 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
