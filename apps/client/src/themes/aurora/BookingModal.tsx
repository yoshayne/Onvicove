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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(5,5,16,0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(167,139,250,0.25)' }}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Book: {service.name}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-white/40 hover:text-[var(--brand-color,#a78bfa)]"><X size={22} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div><Calendar selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={onSelectDate} onSelectSlot={onSelectSlot} /></div>
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
              {service.description && <p className="text-sm text-white/60 mb-3">{service.description}</p>}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/40">Duration</span>
                <span className="text-white/70">{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Price</span>
                <span className="text-lg font-semibold text-[var(--brand-color,#a78bfa)]">{formatPrice(service.priceCents)}</span>
              </div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (canConfirm) onConfirm({ name, email, phone }); }}>
              {[{ id: 'aur-bk-name', label: 'Your Name', type: 'text', value: name, set: setName, required: true },
                { id: 'aur-bk-email', label: 'Email', type: 'email', value: email, set: setEmail, required: true },
                { id: 'aur-bk-phone', label: 'Phone (optional)', type: 'tel', value: phone, set: setPhone, required: false }
              ].map(({ id, label, type, value, set, required }) => (
                <div key={id}>
                  <label className="block text-xs text-white/40 mb-1" htmlFor={id}>{label}</label>
                  <input id={id} type={type} required={required} value={value} onChange={(e) => set(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-white rounded-xl focus:outline-none focus:border-[var(--brand-color,#a78bfa)]"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(167,139,250,0.2)' }} />
                </div>
              ))}
              <button type="submit" disabled={!canConfirm}
                className="mt-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: canConfirm ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : 'rgba(255,255,255,0.1)' }}>
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
