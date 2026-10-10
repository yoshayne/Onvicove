import { useState } from 'react';
import { X } from 'lucide-react';
import type { ServiceData, StaffData, AvailableSlot } from '../types';
import { formatPrice } from '../types';
import Calendar from './Calendar';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceData | null;
  selectedDate: Date | null;
  selectedSlot: string | null;
  availableSlots: AvailableSlot[];
  cityLabel?: string | null;
  onSelectDate: (d: Date) => void;
  onSelectSlot: (s: string) => void;
  onConfirm: (info: { name: string; email: string; phone: string }) => void;
  staff?: StaffData[];
  selectedStaffId?: string | null;
  onSelectStaff?: (staffId: string | null) => void;
  isDateClosed?: (d: Date) => boolean;
}

export default function BookingModal({
  isOpen, onClose, service,
  selectedDate, selectedSlot, availableSlots, cityLabel,
  onSelectDate, onSelectSlot, onConfirm,
  staff = [], selectedStaffId, onSelectStaff,
  isDateClosed,
}: BookingModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen || !service) return null;
  const canConfirm = Boolean(selectedDate && selectedSlot && name && email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4">
      <div className="bg-[#0d0d0d] border border-white/10 text-[#f0ede8] w-full max-w-3xl max-h-[94dvh] overflow-y-auto font-['DM_Sans']">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="font-['DM_Serif_Display'] text-2xl">{service.name}</h2>
            <p className="mt-0.5 text-xs text-white/50">{service.durationMinutes} min · {formatPrice(service.priceCents)}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6">
          <Calendar
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            availableSlots={availableSlots}
            onSelectDate={onSelectDate}
            onSelectSlot={onSelectSlot}
            isDateClosed={isDateClosed}
          />

          <div className="flex flex-col gap-4 md:gap-5">
            <div className="hidden md:block border border-white/10 p-4 bg-white/3">
              {service.description && (
                <p className="text-sm text-white/60 mb-4 leading-relaxed">{service.description}</p>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/40 uppercase tracking-widest text-xs">Duration</span>
                <span className="text-white/80">{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-white/40 uppercase tracking-widest text-xs">Rate</span>
                <span className="font-['DM_Serif_Display'] text-lg text-[var(--brand-color,#c8b8a2)]">
                  {formatPrice(service.priceCents)}
                </span>
              </div>
            </div>

            {cityLabel && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded border border-white/10 bg-white/5 text-white/60 text-xs">
                <span>📍</span>
                <span className="font-medium">{cityLabel}</span>
              </div>
            )}

            {staff.length > 1 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1.5">Select staff (optional)</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <button type="button" onClick={() => onSelectStaff?.(null)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${!selectedStaffId ? 'border-[var(--brand-color,#c8b8a2)] text-[var(--brand-color,#c8b8a2)]' : 'border-white/15 text-white/40 hover:border-white/30'}`}>
                    Any available
                  </button>
                  {staff.map(s => (
                    <button key={s.id} type="button" onClick={() => onSelectStaff?.(s.id)}
                      className={`px-3 py-1.5 text-xs border transition-colors ${selectedStaffId === s.id ? 'border-[var(--brand-color,#c8b8a2)] text-[var(--brand-color,#c8b8a2)]' : 'border-white/15 text-white/40 hover:border-white/30'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!selectedSlot && <p className="text-center text-xs text-white/40">Pick a day and a time to continue.</p>}

            {selectedSlot && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => { e.preventDefault(); if (canConfirm) onConfirm({ name, email, phone }); }}
            >
              {[
                { id: 'ln-name', label: 'Name', type: 'text', value: name, set: setName, required: true },
                { id: 'ln-email', label: 'Email', type: 'email', value: email, set: setEmail, required: true },
                { id: 'ln-phone', label: 'Phone', type: 'tel', value: phone, set: setPhone, required: false },
              ].map(({ id, label, type, value, set, required }) => (
                <div key={id}>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1.5" htmlFor={id}>
                    {label}
                  </label>
                  <input
                    id={id} type={type} required={required} value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 px-3 py-2.5 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-[var(--brand-color,#c8b8a2)] transition-colors"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-1 bg-[var(--brand-color,#c8b8a2)] text-[#0d0d0d] text-xs uppercase tracking-[0.2em] py-3 font-medium hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Book Session
              </button>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
