import { create } from 'zustand';
import type { ServiceData, StaffData } from '../types';

/** Only offer the people who actually do this service (someone with nothing ticked does everything). */
export function staffForService(staff: StaffData[], service: ServiceData | null): StaffData[] {
  if (!service) return staff;
  return staff.filter((s) => !s.serviceIds || s.serviceIds.length === 0 || s.serviceIds.includes(service.id));
}

/** What the customer is about to pay for, shown on the payment screen so a wrong date is obvious before they pay. */
export const useBookingSummary = create<{ service: string; when: string; set: (v: { service: string; when: string }) => void }>((set) => ({
  service: '',
  when: '',
  set: (v) => set(v),
}));
