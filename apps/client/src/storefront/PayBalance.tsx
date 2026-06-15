import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import { formatPrice } from '../themes/types';
import StripePaymentForm from '../themes/shared/StripePaymentForm';
import Spinner from '../components/shared/Spinner';

interface BalanceInfo {
  customer_name: string;
  service_name: string;
  company_name: string;
  currency: string;
  remaining_cents: number;
  stripe_account_id: string | null;
}

interface BalanceIntentResponse {
  client_secret: string;
  amount: number;
  stripe_account_id: string | null;
  currency: string;
}

export default function PayBalance() {
  const { id } = useParams<{ id: string }>();
  const [info, setInfo] = useState<BalanceInfo | null>(null);
  const [intent, setIntent] = useState<BalanceIntentResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'paid' | 'error' | 'done'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await apiGet<BalanceInfo>(`/public/bookings/${id}/balance`);
        setInfo(data);
        if (data.remaining_cents <= 0) {
          setStatus('paid');
          return;
        }
        const pi = await apiPost<BalanceIntentResponse>(`/public/bookings/${id}/balance-intent`, {});
        setIntent(pi);
        setStatus('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment details');
        setStatus('error');
      }
    })();
  }, [id]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm text-center">
        {status === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        )}

        {status === 'error' && (
          <p className="text-sm text-red-600">{error ?? 'Something went wrong'}</p>
        )}

        {status === 'paid' && info && (
          <>
            <p className="mb-2 text-lg font-semibold text-gray-900">All paid up!</p>
            <p className="text-sm text-gray-600">
              There's no remaining balance for your appointment with {info.company_name}.
            </p>
          </>
        )}

        {status === 'ready' && info && intent && (
          <>
            <p className="text-sm text-gray-500">{info.company_name}</p>
            <h1 className="mt-1 text-xl font-semibold text-gray-900">{info.service_name}</h1>
            <p className="mt-4 text-3xl font-bold text-gray-900">
              {formatPrice(info.remaining_cents, info.currency)}
            </p>
            <p className="mb-6 text-sm text-gray-500">Remaining balance</p>
            <StripePaymentForm
              clientSecret={intent.client_secret}
              amountCents={intent.amount}
              currency={intent.currency}
              stripeAccountId={intent.stripe_account_id ?? undefined}
              onSuccess={() => setStatus('done')}
              onCancel={() => setStatus('done')}
            />
          </>
        )}

        {status === 'done' && (
          <>
            <p className="mb-2 text-lg font-semibold text-gray-900">Thank you!</p>
            <p className="text-sm text-gray-600">Your payment has been received.</p>
          </>
        )}
      </div>
    </div>
  );
}
