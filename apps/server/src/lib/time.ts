import { formatInTimeZone } from 'date-fns-tz';

/** "Tue, Oct 14 at 2:30 PM EDT" in the business's own timezone (never the server's). */
export function formatBookingTime(iso: string | Date, timezone?: string | null): string {
  return formatInTimeZone(new Date(iso), timezone || 'America/New_York', "EEE, MMM d 'at' h:mm a zzz");
}
