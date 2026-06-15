import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { formatPrice } from '../types';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

interface StripePaymentFormProps {
  clientSecret: string;
  stripeAccountId?: string;
  amountCents: number;
  currency?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePaymentForm({
  clientSecret,
  stripeAccountId,
  amountCents,
  currency,
  onSuccess,
  onCancel,
}: StripePaymentFormProps) {
  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey, stripeAccountId ? { stripeAccount: stripeAccountId } : undefined);
  }, [stripeAccountId]);

  if (!stripePromise) {
    return (
      <p className="text-sm text-red-600">Payments are not configured for this store yet.</p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentInner amountCents={amountCents} currency={currency} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

function PaymentInner({
  amountCents,
  currency,
  onSuccess,
  onCancel,
}: {
  amountCents: number;
  currency?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
      return;
    }
    onSuccess();
  }

  return (
    <div className="flex flex-col gap-4 text-left">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handlePay}
          disabled={!stripe || submitting}
          className="flex-1 rounded-lg bg-[var(--brand-color,#111111)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Processing…' : `Pay ${formatPrice(amountCents, currency)}`}
        </button>
      </div>
    </div>
  );
}
