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

export default function BookingModal({ isOpen, onClose, service, selectedDate, selectedSlot, availableSlots, onSelectDate, onSelectSlot, onConfirm }: BookingModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen || !service) return null;
  const canConfirm = Boolean(selectedDate && selectedSlot && name && email);

  const inputStyle = { background: '#0a0a0a', border: '1px solid #c9a84c33', color: '#fff' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ background: '#0a0a0a', border: '1px solid #c9a84c33' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #c9a84c22' }}>
          <h2 className="font-['Playfair_Display'] text-2xl text-white uppercase tracking-[0.1em]">Reserve: {service.name}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-white/30 hover:text-[var(--brand-color,#c9a84c)]"><X size={22} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div><Calendar selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={onSelectDate} onSelectSlot={onSelectSlot} /></div>
          <div className="flex flex-col gap-4">
            <div className="p-4" style={{ background: '#111', border: '1px solid #c9a84c22' }}>
              {service.description && <p className="text-sm text-white/50 mb-3">{service.description}</p>}
              <div className="flex justify-between text-sm mb-1">
                <span className="uppercase tracking-widest text-white/30">Duration</span>
                <span className="text-white/60">{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="uppercase tracking-widest text-white/30">Price</span>
                <span className="font-['Playfair_Display'] text-lg text-[var(--brand-color,#c9a84c)]">{formatPrice(service.priceCents)}</span>
              </div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (canConfirm) onConfirm({ name, email, phone }); }}>
              {[{ id: 'obs-bk-name', label: 'Full Name', type: 'text', value: name, set: setName, required: true },
                { id: 'obs-bk-email', label: 'Email', type: 'email', value: email, set: setEmail, required: true },
                { id: 'obs-bk-phone', label: 'Phone', type: 'tel', value: phone, set: setPhone, required: false }
              ].map(({ id, label, type, value, set, required }) => (
                <div key={id}>
                  <label className="block text-xs uppercase tracking-widest text-white/30 mb-1" htmlFor={id}>{label}</label>
                  <input id={id} type={type} required={required} value={value} onChange={(e) => set(e.target.value)}
                    className="w-full px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-color,#c9a84c)]" style={inputStyle} />
                </div>
              ))}
              <button type="submit" disabled={!canConfirm}
                className="mt-2 py-3 text-xs uppercase tracking-[0.2em] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: canConfirm ? '#c9a84c' : '#333', color: canConfirm ? '#000' : '#fff' }}>
                Confirm Reservation
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
