import cron from 'node-cron';
import { formatBookingTime } from '../lib/time';
import { manageUrlFor } from '../services/bookingManage';
import { db } from '../db/client';
import { sendBookingReminder } from '../services/email';

async function runBookingReminders() {
  // Find confirmed bookings starting in 20-28 hours that haven't had a reminder sent
  const upcoming = await db`
    SELECT
      b.id, b.start_time, b.end_time, b.tenant_id,
      s.name AS service_name,
      t.company_name, t.timezone, t.cancel_window_hours,
      c.email AS customer_email, c.name AS customer_name
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN tenants t ON t.id = b.tenant_id
    JOIN customers c ON c.id = b.customer_id
    WHERE b.status = 'confirmed'
      AND b.reminder_sent = FALSE
      AND b.start_time >= NOW() + INTERVAL '20 hours'
      AND b.start_time <= NOW() + INTERVAL '28 hours'
      AND c.email IS NOT NULL
  `;

  for (const row of upcoming) {
    try {
      const fmt = (d: Date) => formatBookingTime(d, row.timezone as string);

      await sendBookingReminder({
        toEmail: row.customer_email as string,
        toName: (row.customer_name as string) || (row.customer_email as string),
        serviceName: row.service_name as string,
        startTime: fmt(new Date(row.start_time as string)),
        endTime: fmt(new Date(row.end_time as string)),
        companyName: row.company_name as string,
        tenantId: row.tenant_id as string,
        bookingId: row.id as string,
        manageUrl: await manageUrlFor(row, row.id as string),
        cancelWindowHours: (row.cancel_window_hours as number | null) ?? 24,
      });

      await db`UPDATE bookings SET reminder_sent = TRUE WHERE id = ${row.id}`;
    } catch (err) {
      console.error(`Booking reminder failed for booking ${row.id}:`, err);
    }
  }
}

export function startBookingReminderJob() {
  // Runs every hour at :30 (offset from stripe nudge)
  cron.schedule('30 * * * *', () => {
    runBookingReminders().catch((err) => console.error('Booking reminder job error:', err));
  });
  console.log('Booking reminder cron job scheduled (hourly)');
}
