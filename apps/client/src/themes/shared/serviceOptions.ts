import { create } from 'zustand';
import type { Service } from '../../types';
import type { ServiceData } from '../types';

/** A service with options shows its lowest price and shortest time, marked "From" */
export function optionFields(s: Pick<Service, 'options' | 'price_cents' | 'duration_minutes'>): Pick<ServiceData, 'options' | 'priceCents' | 'durationMinutes' | 'priceFrom'> {
  const opts = s.options ?? [];
  if (opts.length === 0) return { priceCents: s.price_cents, durationMinutes: s.duration_minutes };
  const options = opts.map((o) => ({ id: o.id, name: o.name, priceCents: o.price_cents, durationMinutes: o.duration_minutes }));
  const prices = options.map((o) => o.priceCents);
  return {
    options,
    priceCents: Math.min(...prices),
    durationMinutes: Math.min(...options.map((o) => o.durationMinutes)),
    priceFrom: new Set(prices).size > 1,
  };
}

/** The service exactly as booked once an option is chosen */
export function withOption(service: ServiceData, optionId: string): ServiceData {
  const o = service.options?.find((x) => x.id === optionId);
  if (!o) return service;
  return { ...service, optionId: o.id, optionName: o.name, name: `${service.name} (${o.name})`, priceCents: o.priceCents, durationMinutes: o.durationMinutes, priceFrom: false };
}

/** Opens the "choose an option" sheet from any theme (it is drawn once, by ThemeRenderer) */
interface OptionPickerState {
  service: ServiceData | null;
  onChoose: ((chosen: ServiceData) => void) | null;
  open: (service: ServiceData, onChoose: (chosen: ServiceData) => void) => void;
  close: () => void;
}

export const useServiceOptionPicker = create<OptionPickerState>((set) => ({
  service: null,
  onChoose: null,
  open: (service, onChoose) => set({ service, onChoose }),
  close: () => set({ service: null, onChoose: null }),
}));
