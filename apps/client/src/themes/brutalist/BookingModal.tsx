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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ border: '3px solid #000' }}>
        <div className="flex items-center justify-between p-6 border-b-[3px] border-black">
          <div>
            <p className="font-mono text-xs text-black/40 uppercase tracking-widest">BOOKING</p>
            <h2 className="font-black text-2xl uppercase">{service.name}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="font-black text-xl hover:text-[var(--brand-color,#0000ff)]"><X size={22} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-0">
          <div className="p-6 border-r-[2px] border-black"><Calendar selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={onSelectDate} onSelectSlot={onSelectSlot} /></div>
          <div className="p-6 flex flex-col gap-4">
            <div className="p-4 border-2 border-black">
              {service.description && <p className="font-mono text-sm text-black/60 mb-3">{service.description}</p>}
              <div className="flex justify-between text-sm font-black mb-1">
                <span>DURATION</span>
                <span>{service.durationMinutes} MIN</span>
              </div>
              <div className="flex justify-between text-sm font-black">
                <span>PRICE</span>
                <span className="text-[var(--brand-color,#0000ff)]">{formatPrice(service.priceCents)}</span>
              </div>
            </div>
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (canConfirm) onConfirm({ name, email, phone }); }}>
              {[{ id: 'bru-bk-name', label: 'NAME', type: 'text', value: name, set: setName, required: true },
                { id: 'bru-bk-email', label: 'EMAIL', type: 'email', value: email, set: setEmail, required: true },
                { id: 'bru-bk-phone', label: 'PHONE', type: 'tel', value: phone, set: setPhone, required: false }
              ].map(({ id, label, type, value, set, required }) => (
                <div key={id}>
                  <label className="block font-black text-xs tracking-[0.2em] mb-1" htmlFor={id}>{label}</label>
                  <input id={id} type={type} required={required} value={value} onChange={(e) => set(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-sm focus:outline-none bg-white"
                    style={{ border: '2px solid #000' }} />
                </div>
              ))}
              <button type="submit" disabled={!canConfirm}
                className="mt-2 py-3 font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#000', color: '#fff' }}>
                CONFIRM BOOKING →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
