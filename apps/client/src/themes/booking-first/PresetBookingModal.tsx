import { useState } from 'react';
import { X } from 'lucide-react';
import type { AvailableSlot, ServiceData, StaffData } from '../types';
import { formatPrice } from '../types';
import PresetCalendar from './PresetCalendar';
import type { BookingFirstPreset } from './presets';

interface Props {
  preset: BookingFirstPreset;
  currency?: string;
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
  onSelectStaff?: (id: string | null) => void;
  isDateClosed?: (d: Date) => boolean;
}

/** Booking sheet: choose a professional, pick a day and time, enter details. Bottom sheet on phones, dialog on desktop. */
export default function PresetBookingModal({
  preset: p, currency, isOpen, onClose, service, selectedDate, selectedSlot, availableSlots, cityLabel,
  onSelectDate, onSelectSlot, onConfirm, staff = [], selectedStaffId, onSelectStaff, isDateClosed,
}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  if (!isOpen || !service) return null;

  const accent = `var(--brand-color, ${p.accent})`;
  const canConfirm = Boolean(selectedDate && selectedSlot && name.trim() && email.trim());
  const field = 'w-full px-3 py-2.5 text-base outline-none';
  const fieldStyle = { background: p.surface, color: p.text, border: `1px solid ${p.border}`, borderRadius: Math.min(p.radius, 12) } as const;
  const heading = { fontFamily: p.headingFont, textTransform: p.uppercaseHeadings ? ('uppercase' as const) : undefined, letterSpacing: p.uppercaseHeadings ? '0.04em' : undefined };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Book ${service.name}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto"
        style={{ background: p.bg, color: p.text, fontFamily: p.bodyFont, borderRadius: `${Math.min(p.radius * 1.5, 24)}px ${Math.min(p.radius * 1.5, 24)}px 0 0` }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-4" style={{ background: p.bg, borderBottom: `1px solid ${p.border}` }}>
          <div>
            <h2 className="text-xl" style={heading}>{service.name}</h2>
            <p className="mt-0.5 text-sm" style={{ color: p.muted }}>
              {service.durationMinutes} min · {formatPrice(service.priceCents, currency)}
              {service.requiresDeposit && service.depositCents ? ` · ${formatPrice(service.depositCents, currency)} deposit` : ''}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ color: p.muted }}>
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {cityLabel && (
            <p className="px-3 py-2 text-sm" style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: Math.min(p.radius, 12) }}>
              📍 {cityLabel}
            </p>
          )}

          {staff.length > 1 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: p.muted }}>With</p>
              <div className="flex flex-wrap gap-2">
                {[{ id: null as string | null, name: 'Any professional' }, ...staff].map((s) => {
                  const on = (selectedStaffId ?? null) === s.id;
                  return (
                    <button
                      key={s.id ?? 'any'}
                      type="button"
                      onClick={() => onSelectStaff?.(s.id)}
                      className="px-3.5 py-2 text-sm transition-colors"
                      style={{
                        borderRadius: Math.min(p.radius * 2, 999),
                        background: on ? accent : 'transparent',
                        color: on ? p.onAccent : p.text,
                        border: `1px solid ${on ? 'transparent' : p.border}`,
                        fontWeight: on ? 700 : 500,
                      }}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <PresetCalendar
            preset={p}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            availableSlots={availableSlots}
            onSelectDate={onSelectDate}
            onSelectSlot={onSelectSlot}
            isDateClosed={isDateClosed}
          />

          {!selectedSlot && (
            <p className="text-center text-xs" style={{ color: p.muted }}>Pick a day and a time to continue.</p>
          )}

          {selectedSlot && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (canConfirm) onConfirm({ name, email, phone });
            }}
          >
            <input className={field} style={fieldStyle} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            <input className={field} style={fieldStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            <input className={field} style={fieldStyle} type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            <button
              type="submit"
              disabled={!canConfirm}
              className="mt-1 px-5 py-3.5 text-sm font-bold uppercase tracking-widest transition-opacity disabled:opacity-40"
              style={{ background: accent, color: p.onAccent, borderRadius: Math.min(p.radius * 2, 999) }}
            >
              Continue
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
