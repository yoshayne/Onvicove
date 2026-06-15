import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import type { Booking } from '../types';
import StripePaymentForm from '../themes/shared/StripePaymentForm';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';

interface PaymentInfo {
  remaining_cents: number;
  amount_cents: number | null;
  deposit_paid_cents: number;
  has_card: boolean;
  card_brand: string | null;
  card_last4: string | null;
  currency: string;
}

interface BalanceIntentResponse {
  client_secret: string;
  amount: number;
}

interface ChargeResponse {
  status: string;
  amount: number;
}

function formatCents(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function PaymentModal({
  booking,
  stripeAccountId,
  currency,
  onClose,
}: {
  booking: Booking;
  stripeAccountId?: string;
  currency?: string;
  onClose: () => void;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'menu' | 'collect' | 'done'>('menu');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [linkSent, setLinkSent] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', booking.id, 'payment-info'],
    queryFn: () => api.get<PaymentInfo>(`/bookings/${booking.id}/payment-info`),
  });

  const chargeSavedCardMutation = useMutation({
    mutationFn: () => api.post<ChargeResponse>(`/bookings/${booking.id}/charge-saved-card`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setView('done');
    },
    onError: (err: Error) => setChargeError(err.message),
  });

  const collectMutation = useMutation({
    mutationFn: () => api.post<BalanceIntentResponse>(`/bookings/${booking.id}/balance-intent`),
    onSuccess: (res) => {
      setClientSecret(res.client_secret);
      setAmountCents(res.amount);
      setView('collect');
    },
    onError: (err: Error) => setChargeError(err.message),
  });

  const sendLinkMutation = useMutation({
    mutationFn: () => api.post(`/bookings/${booking.id}/send-payment-link`),
    onSuccess: () => setLinkSent(true),
    onError: (err: Error) => setChargeError(err.message),
  });

  function handlePaid() {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setView('done');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : !data ? (
          <p className="text-sm text-red-600">Failed to load payment details.</p>
        ) : view === 'menu' ? (
          <>
            <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Service total</span>
                <span>{formatCents(data.amount_cents ?? 0, currency ?? data.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Deposit paid</span>
                <span>{formatCents(data.deposit_paid_cents, currency ?? data.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <span>Remaining balance</span>
                <span>{formatCents(data.remaining_cents, currency ?? data.currency)}</span>
              </div>
            </div>

            {chargeError && <p className="mt-3 text-sm text-red-600">{chargeError}</p>}

            <div className="mt-6 flex flex-col gap-2">
              {data.has_card && (
                <Button
                  className="w-full"
                  onClick={() => chargeSavedCardMutation.mutate()}
                  disabled={chargeSavedCardMutation.isPending}
                >
                  {chargeSavedCardMutation.isPending
                    ? 'Charging…'
                    : `Charge card on file${data.card_brand ? ` (${data.card_brand} •••• ${data.card_last4})` : ''}`}
                </Button>
              )}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => collectMutation.mutate()}
                disabled={collectMutation.isPending}
              >
                {collectMutation.isPending ? 'Preparing…' : 'Collect payment now'}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => sendLinkMutation.mutate()}
                disabled={sendLinkMutation.isPending || linkSent}
              >
                {linkSent ? 'Link sent' : sendLinkMutation.isPending ? 'Sending…' : 'Send payment link'}
              </Button>
              <Button variant="secondary" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : view === 'collect' && clientSecret ? (
          <>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Enter card details</h2>
            <StripePaymentForm
              clientSecret={clientSecret}
              amountCents={amountCents}
              currency={currency ?? data.currency}
              stripeAccountId={stripeAccountId}
              onSuccess={handlePaid}
              onCancel={() => setView('menu')}
            />
          </>
        ) : (
          <>
            <p className="mb-2 text-lg font-semibold text-slate-900">Payment received</p>
            <p className="mb-4 text-sm text-slate-600">The remaining balance has been collected.</p>
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
