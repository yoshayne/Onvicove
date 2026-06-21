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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,26,26,0.6)' }}>
      <div className="bg-[#f8f6f1] w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ border: '1px solid #d0cdc8' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #d0cdc8' }}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a1a]/40 mb-1">Schedule</p>
            <h2 className="font-['Playfair_Display'] text-2xl text-[#1a1a1a]">{service.name}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-[#1a1a1a]/30 hover:text-[#1a1a1a]"><X size={22} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div><Calendar selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={onSelectDate} onSelectSlot={onSelectSlot} /></div>
          <div className="flex flex-col gap-4">
            <div className="p-4" style={{ background: '#eeece7', border: '1px solid #d0cdc8' }}>
              {service.description && <p className="text-sm text-[#1a1a1a]/60 mb-3">{service.description}</p>}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#1a1a1a]/40">Duration</span>
                <span className="text-[#1a1a1a]/70">{service.durationMinutes} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#1a1a1a]/40">Investment</span>
                <span className="font-['Playfair_Display'] text-lg text-[#1a1a1a]">{formatPrice(service.priceCents)}</span>
              </div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (canConfirm) onConfirm({ name, email, phone }); }}>
              {[{ id: 'mag-bk-name', label: 'Name', type: 'text', value: name, set: setName, required: true },
                { id: 'mag-bk-email', label: 'Email', type: 'email', value: email, set: setEmail, required: true },
                { id: 'mag-bk-phone', label: 'Phone', type: 'tel', value: phone, set: setPhone, required: false }
              ].map(({ id, label, type, value, set, required }) => (
                <div key={id}>
                  <label className="block text-xs uppercase tracking-widest text-[#1a1a1a]/40 mb-1" htmlFor={id}>{label}</label>
                  <input id={id} type={type} required={required} value={value} onChange={(e) => set(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white text-[#1a1a1a] focus:outline-none"
                    style={{ border: '1px solid #d0cdc8' }} />
                </div>
              ))}
              <button type="submit" disabled={!canConfirm}
                className="mt-2 py-3 text-xs uppercase tracking-[0.2em] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#1a1a1a', color: '#f8f6f1' }}>
                Book Session
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
