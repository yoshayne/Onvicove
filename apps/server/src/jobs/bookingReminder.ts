import cron from 'node-cron';
import { db } from '../db/client';
import { parseReminderHours, sendReminderForBooking } from '../services/reminders';

/**
 * Each store picks when reminders go out ("24,2" = a day before and two hours before).
 * An offset is due once we're inside its window: from H hours before the start until a grace period later,
 * so a booking made 30 minutes ahead doesn't get a "24 hours" reminder, and each offset is sent once per booking.
 */
export async function runBookingReminders() {
  const tenants = await db`SELECT id, reminder_hours FROM tenants WHERE reminder_hours IS NULL OR reminder_hours <> ''`;
  for (const t of tenants) {
    const offsets = parseReminderHours((t.reminder_hours as string | null) ?? '24');
    for (const h of offsets) {
      const graceMinutes = Math.min(h * 30, 180); // half the lead time, at most 3 hours
      const due = await db`
        SELECT b.id FROM bookings b
        WHERE b.tenant_id = ${t.id} AND b.status = 'confirmed' AND b.customer_email <> ''
          AND b.start_time > NOW()
          AND b.start_time - make_interval(hours => ${h}) <= NOW()
          AND b.start_time - make_interval(hours => ${h}) + make_interval(mins => ${graceMinutes}) > NOW()
          AND NOT EXISTS (SELECT 1 FROM booking_reminders r WHERE r.booking_id = b.id AND r.hours_before = ${h})
      `;
      for (const row of due) {
        try {
          await sendReminderForBooking(row.id as string, { hoursBefore: h });
        } catch (err) {
          console.error(`Booking reminder failed for booking ${row.id}:`, err);
        }
      }
    }
  }
}

export function startBookingReminderJob() {
  cron.schedule('*/10 * * * *', () => {
    runBookingReminders().catch((err) => console.error('Booking reminder job error:', err));
  });
  console.log('Booking reminder cron job scheduled (every 10 minutes)');
}
