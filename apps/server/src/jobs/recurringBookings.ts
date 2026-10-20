import cron from 'node-cron';
import { confirmPendingPlans, generateAllRecurringBookings } from '../services/recurring';

/** Keeps the next 8 weeks of every recurring-appointment plan on the calendar */
export function startRecurringBookingsJob() {
  cron.schedule('17 4 * * *', () => {
    generateAllRecurringBookings().catch((err) => console.error('Recurring bookings job error:', err));
  });
  // A plan whose first payment webhook was missed gets checked with Stripe
  cron.schedule('*/10 * * * *', () => {
    confirmPendingPlans().catch((err) => console.error('Pending plan check error:', err));
  });
  console.log('Recurring bookings cron job scheduled (daily + pending check)');
}
