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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(44,31,20,0.6)' }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ background: '#f5f0e8', border: '1px solid #c4b49a' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #c4b49a' }}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#5c4a32]/60 mb-1">Reserve a Spot</p>
            <h2 className="font-['Playfair_Display'] text-2xl text-[#2c1f14]">{service.name}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-[#5c4a32]/40 hover:text-[#2c1f14]"><X size={22} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div><Calendar selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={onSelectDate} onSelectSlot={onSelectSlot} /></div>
          <div className="flex flex-col gap-4">
            <div className="p-4" style={{ background: '#ece5d8', border: '1px solid #c4b49a' }}>
              {service.description && <p className="text-sm text-[#5c4a32]/70 mb-3">{service.description}</p>}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#5c4a32]/50">Duration</span>
                <span className="text-[#2c1f14]/70">{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5c4a32]/50">Investment</span>
                <span className="font-['Playfair_Display'] text-lg text-[var(--brand-color,#5c4a32)]">{formatPrice(service.priceCents)}</span>
              </div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (canConfirm) onConfirm({ name, email, phone }); }}>
              {[{ id: 'cra-bk-name', label: 'Your Name', type: 'text', value: name, set: setName, required: true },
                { id: 'cra-bk-email', label: 'Email', type: 'email', value: email, set: setEmail, required: true },
                { id: 'cra-bk-phone', label: 'Phone', type: 'tel', value: phone, set: setPhone, required: false }
              ].map(({ id, label, type, value, set, required }) => (
                <div key={id}>
                  <label className="block text-xs uppercase tracking-widest text-[#5c4a32]/50 mb-1" htmlFor={id}>{label}</label>
                  <input id={id} type={type} required={required} value={value} onChange={(e) => set(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-[#2c1f14] focus:outline-none"
                    style={{ background: '#fff', border: '1px solid #c4b49a' }} />
                </div>
              ))}
              <button type="submit" disabled={!canConfirm}
                className="mt-2 py-3 text-xs uppercase tracking-[0.15em] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#5c4a32', color: '#f5f0e8' }}>
                Reserve My Spot
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
