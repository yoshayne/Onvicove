import cron from 'node-cron';
import { syncPendingBookings } from '../services/calendarSync';

/** Every 5 minutes: send new, changed and missed bookings to the stores' own calendars */
export function startCalendarSyncJob() {
  cron.schedule('*/5 * * * *', () => {
    syncPendingBookings().catch((err) => console.error('Calendar sync job error:', err));
  });
  console.log('Calendar sync cron job scheduled (every 5 minutes)');
}
