// Cash App, Klarna, bank redirects etc. send the customer away to finish paying and then back to a
// return URL with ?payment_intent=…&redirect_status=… added. These helpers build that URL and read it.

const PAYMENT_PARAMS = ['payment_intent', 'payment_intent_client_secret', 'redirect_status', 'source_type'];

/** The page the customer is on now, minus any leftover payment-return parameters. */
export function currentPageUrl(): string {
  const url = new URL(window.location.href);
  PAYMENT_PARAMS.forEach((k) => url.searchParams.delete(k));
  url.hash = '';
  return url.toString();
}

export type PaymentReturnStatus = 'succeeded' | 'processing' | 'failed';

export function readPaymentReturn(): PaymentReturnStatus | null {
  const p = new URLSearchParams(window.location.search);
  const status = p.get('redirect_status');
  if (!status || !p.get('payment_intent')) return null;
  if (status === 'succeeded') return 'succeeded';
  if (status === 'processing' || status === 'pending') return 'processing';
  return 'failed';
}

export function clearPaymentReturn(): void {
  window.history.replaceState(null, '', currentPageUrl().replace(window.location.origin, ''));
}
