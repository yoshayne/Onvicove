import { db } from '../db/client';
import { formatBookingTime } from '../lib/time';
import { manageUrlFor } from './bookingManage';
import { sendBookingReminder } from './email';

/** "24,2" → [24, 2] (biggest first). Empty or junk → none. */
export function parseReminderHours(v: string | null | undefined): number[] {
  return [...new Set((v ?? '').split(',').map((x) => parseInt(x, 10)).filter((n) => n > 0 && n <= 168))].sort((a, b) => b - a);
}

function whenLabel(hours: number): string {
  if (hours >= 48) return `is in ${Math.round(hours / 24)} days`;
  if (hours >= 20) return 'is tomorrow';
  return hours === 1 ? 'is in about an hour' : `is in about ${hours} hours`;
}

/** Email the reminder for one booking. Returns false when the booking doesn't exist. */
export async function sendReminderForBooking(bookingId: string, opts: { tenantId?: string; hoursBefore?: number } = {}): Promise<boolean> {
  const rows = await db`
    SELECT b.id, b.tenant_id, b.start_time, b.end_time, b.location, b.customer_name, b.customer_email,
           s.name AS service_name, t.company_name, t.timezone, t.cancel_window_hours
    FROM bookings b JOIN services s ON s.id = b.service_id JOIN tenants t ON t.id = b.tenant_id
    WHERE b.id = ${bookingId} ${opts.tenantId ? db`AND b.tenant_id = ${opts.tenantId}` : db``}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return false;
  const fmt = (d: unknown) => formatBookingTime(new Date(d as string), row.timezone as string);
  await sendBookingReminder({
    toEmail: row.customer_email as string,
    toName: (row.customer_name as string) || (row.customer_email as string),
    serviceName: row.service_name as string,
    startTime: fmt(row.start_time),
    endTime: fmt(row.end_time),
    companyName: row.company_name as string,
    tenantId: row.tenant_id as string,
    bookingId: row.id as string,
    manageUrl: await manageUrlFor(row, row.id as string),
    cancelWindowHours: (row.cancel_window_hours as number | null) ?? 24,
    location: row.location as string | null,
    whenLabel: opts.hoursBefore ? whenLabel(opts.hoursBefore) : undefined,
  });
  // Manual sends record as "0 hours" so the edit window can show when the last one went out
  await db`INSERT INTO booking_reminders (booking_id, hours_before) VALUES (${bookingId}, ${opts.hoursBefore ?? 0}) ON CONFLICT (booking_id, hours_before) DO UPDATE SET sent_at = NOW()`;
  return true;
}
