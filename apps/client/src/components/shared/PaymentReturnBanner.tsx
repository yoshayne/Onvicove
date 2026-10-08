import { useEffect, useState } from 'react';
import { clearPaymentReturn, readPaymentReturn, type PaymentReturnStatus } from '../../lib/paymentReturn';

const MESSAGES: Record<PaymentReturnStatus, { text: string; tone: string }> = {
  succeeded: { text: "Payment received — thank you! You'll get a confirmation email shortly.", tone: 'bg-emerald-600' },
  processing: { text: "Your payment is processing. We'll email you as soon as it's confirmed.", tone: 'bg-amber-600' },
  failed: { text: "Your payment didn't go through, so nothing was charged. Please try again.", tone: 'bg-red-600' },
};

/** Shown when a customer lands back on the page after paying with Cash App, Klarna or another redirect method. */
export default function PaymentReturnBanner() {
  const [status, setStatus] = useState<PaymentReturnStatus | null>(() => readPaymentReturn());

  useEffect(() => {
    if (status) clearPaymentReturn(); // keep the address bar clean; the message stays until dismissed
  }, [status]);

  if (!status) return null;
  const { text, tone } = MESSAGES[status];
  return (
    <div role="status" className={`fixed inset-x-0 top-0 z-[2000] flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium text-white shadow-lg ${tone}`}>
      <span>{text}</span>
      <button type="button" onClick={() => setStatus(null)} aria-label="Dismiss" className="rounded px-2 text-white/80 hover:text-white">✕</button>
    </div>
  );
}
