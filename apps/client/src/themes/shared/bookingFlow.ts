import { create } from 'zustand';
import type { ServiceData, StaffData } from '../types';

/** Lets the shared time picker (used by every theme) show and use the "next available" shortcut. */
interface BookingFlowState {
  next: { date: string; start: string } | null;
  pickNext: (() => void) | null;
  set: (patch: Partial<Pick<BookingFlowState, 'next' | 'pickNext'>>) => void;
}

export const useBookingFlow = create<BookingFlowState>((set) => ({
  next: null,
  pickNext: null,
  set: (patch) => set(patch),
}));

/** Only offer the people who actually do this service (someone with nothing ticked does everything). */
export function staffForService(staff: StaffData[], service: ServiceData | null): StaffData[] {
  if (!service) return staff;
  return staff.filter((s) => !s.serviceIds || s.serviceIds.length === 0 || s.serviceIds.includes(service.id));
}
