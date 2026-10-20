import { create } from 'zustand';
import type { ServiceData } from '../types';

/** Opens the monthly-plan checkout from any theme (it is drawn once, by ThemeRenderer) */
export interface RecurringCheckoutState {
  isOpen: boolean;
  service: ServiceData | null;
  /** Recurring appointments: the first session the customer picked */
  startTime: string | null;
  staffId: string | null;
  whenLabel: string | null;
  prefill: { name: string; email: string; phone: string } | null;
  open: (args: { service: ServiceData; startTime?: string | null; staffId?: string | null; whenLabel?: string | null; prefill?: { name: string; email: string; phone: string } | null }) => void;
  close: () => void;
}

export const useRecurringCheckout = create<RecurringCheckoutState>((set) => ({
  isOpen: false,
  service: null,
  startTime: null,
  staffId: null,
  whenLabel: null,
  prefill: null,
  open: (a) => set({ isOpen: true, service: a.service, startTime: a.startTime ?? null, staffId: a.staffId ?? null, whenLabel: a.whenLabel ?? null, prefill: a.prefill ?? null }),
  close: () => set({ isOpen: false }),
}));
