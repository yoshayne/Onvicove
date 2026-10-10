import { useMemo, useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { formatPrice } from '../types';
import { currentPageUrl } from '../../lib/paymentReturn';

// Prefer the build-time env var for the key; always ask the server which charge model is active
let resolvedPublishableKey: string | null = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) || null;
let chargeModel: 'direct' | 'destination' = 'direct';
let configPromise: Promise<void> | null = null;

function ensureConfig(): Promise<void> {
  if (configPromise) return configPromise;
  configPromise = fetch('/api/public/config')
    .then((r) => r.json())
    .then((data: { stripePublishableKey?: string | null; chargeModel?: 'direct' | 'destination' }) => {
      if (!resolvedPublishableKey && data.stripePublishableKey) resolvedPublishableKey = data.stripePublishableKey;
      if (data.chargeModel) chargeModel = data.chargeModel;
    })
    .catch(() => {});
  return configPromise;
}

// Pre-fetch on module load so it's ready by the time the form renders
ensureConfig();

interface StripePaymentFormProps {
  clientSecret: string;
  stripeAccountId?: string;
  amountCents: number;
  currency?: string;
  /** Where redirect-based methods (Cash App, Klarna, bank…) send the customer afterwards. Defaults to this page. */
  returnUrl?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripePaymentForm({
  clientSecret,
  stripeAccountId,
  amountCents,
  currency,
  returnUrl,
  onSuccess,
  onCancel,
}: StripePaymentFormProps) {
  const [ready, setReady] = useState(false);
  const [publishableKey, setPublishableKey] = useState<string | null>(resolvedPublishableKey);

  useEffect(() => {
    ensureConfig().then(() => { setPublishableKey(resolvedPublishableKey); setReady(true); });
  }, []);

  // With direct charges the payment lives on the store's own Stripe account, so Stripe.js must be loaded for that account
  const stripePromise = useMemo(() => {
    if (!ready || !publishableKey) return null;
    return loadStripe(publishableKey, stripeAccountId && chargeModel === 'direct' ? { stripeAccount: stripeAccountId } : undefined);
  }, [ready, publishableKey, stripeAccountId]);

  if (!ready) {
    return (
      <p className="text-sm text-amber-600">Loading payment form…</p>
    );
  }

  if (!stripePromise) {
    return (
      <p className="text-sm text-red-600">Payments are not configured for this store yet.</p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        // Tighter spacing so the form fits a phone screen with less scrolling
        appearance: { theme: 'stripe', variables: { spacingUnit: '3px', spacingGridRow: '10px', spacingGridColumn: '10px', fontSizeBase: '15px' } },
      }}
    >
      <PaymentInner amountCents={amountCents} currency={currency} returnUrl={returnUrl} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

function PaymentInner({
  amountCents,
  currency,
  returnUrl,
  onSuccess,
  onCancel,
}: {
  amountCents: number;
  currency?: string;
  returnUrl?: string;
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
      // Required by every redirect-based method; cards finish in place and never use it
      confirmParams: { return_url: returnUrl ?? currentPageUrl() },
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
    <div className="flex flex-col gap-3 text-left">
      <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {/* Stays at the bottom of the screen while the form scrolls, so Pay is always in reach */}
      <div className="sticky bottom-0 -mx-1 flex gap-3 bg-white px-1 pb-1 pt-2">
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
