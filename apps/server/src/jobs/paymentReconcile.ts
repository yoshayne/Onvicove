import cron from 'node-cron';
import { reconcilePayments } from '../services/reconcile';

let running = false;

/** Every few minutes: settle any payment Stripe reports as paid that our records still show as unpaid. */
export function startPaymentReconcileJob() {
  cron.schedule('*/5 * * * *', () => {
    if (running) return;
    running = true;
    reconcilePayments({ days: 7 })
      .catch((err) => console.error('Payment reconcile job error:', err))
      .finally(() => { running = false; });
  });
  console.log('Payment reconcile job scheduled (every 5 minutes)');
}
