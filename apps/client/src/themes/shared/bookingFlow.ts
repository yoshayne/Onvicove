import type { ServiceData, StaffData } from '../types';

/** Only offer the people who actually do this service (someone with nothing ticked does everything). */
export function staffForService(staff: StaffData[], service: ServiceData | null): StaffData[] {
  if (!service) return staff;
  return staff.filter((s) => !s.serviceIds || s.serviceIds.length === 0 || s.serviceIds.includes(service.id));
}
