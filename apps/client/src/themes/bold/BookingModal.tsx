import { useState } from 'react';
import { X, Clock, DollarSign } from 'lucide-react';
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

  const inputClass = 'w-full bg-[#111] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand-color,#e8ff00)] transition-colors';
  const labelClass = 'block text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] text-white w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-white/10 flex flex-col">
        {/* Accent bar */}
        <div className="h-1 bg-[var(--brand-color,#e8ff00)] shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--brand-color,#e8ff00)] mb-1">Booking</p>
            <h2 style={{ fontFamily: 'Anton, sans-serif' }} className="text-2xl uppercase tracking-wide leading-none">
              {service.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-2 border border-white/10 hover:border-[var(--brand-color,#e8ff00)] hover:text-[var(--brand-color,#e8ff00)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-0 flex-1">
          {/* Left — Calendar */}
          <div className="p-6 border-b md:border-b-0 md:border-r border-white/10">
            <Calendar
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              availableSlots={availableSlots}
              onSelectDate={onSelectDate}
              onSelectSlot={onSelectSlot}
            />
          </div>

          {/* Right — Details + Form */}
          <div className="p-6 flex flex-col gap-6">
            {/* Service info cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111] border border-white/10 px-4 py-3 flex items-center gap-3">
                <Clock size={14} className="text-[var(--brand-color,#e8ff00)] shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Duration</p>
                  <p className="text-sm font-bold">{service.durationMinutes} min</p>
                </div>
              </div>
              <div className="bg-[#111] border border-white/10 px-4 py-3 flex items-center gap-3">
                <DollarSign size={14} className="text-[var(--brand-color,#e8ff00)] shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Price</p>
                  <p style={{ fontFamily: 'Anton, sans-serif' }} className="text-lg text-[var(--brand-color,#e8ff00)] leading-none">
                    {formatPrice(service.priceCents)}
                  </p>
                </div>
              </div>
            </div>

            {service.description && (
              <p className="text-white/40 text-xs leading-relaxed border-l-2 border-[var(--brand-color,#e8ff00)]/30 pl-3">
                {service.description}
              </p>
            )}

            {/* Form */}
            <form
              className="flex flex-col gap-4 flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (canConfirm) onConfirm({ name, email, phone });
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/30">Your info</p>
              <div>
                <label className={labelClass} htmlFor="bd-name">Full name</label>
                <input id="bd-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Jane Smith" />
              </div>
              <div>
                <label className={labelClass} htmlFor="bd-email">Email</label>
                <input id="bd-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@email.com" />
              </div>
              <div>
                <label className={labelClass} htmlFor="bd-phone">Phone (optional)</label>
                <input id="bd-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+1 (555) 000-0000" />
              </div>

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-auto w-full bg-[var(--brand-color,#e8ff00)] text-black text-xs font-bold uppercase tracking-[0.25em] py-4 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {canConfirm ? 'Confirm Booking →' : selectedDate && selectedSlot ? 'Fill in your info' : 'Select a date & time'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
