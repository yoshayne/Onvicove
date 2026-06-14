import { useEffect, useState } from 'react';
import { useWizardStore } from '../wizardStore';
import { useApi } from '../../lib/api';

interface ConnectLinkResponse {
  url: string;
}

interface AccountStatusResponse {
  connected: boolean;
  accountId?: string;
}

export default function Step8_Payments() {
  const stripeConnected = useWizardStore((s) => s.stripeConnected);
  const setStripeConnected = useWizardStore((s) => s.setStripeConnected);
  const api = useApi();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<AccountStatusResponse>('/stripe/account-status')
      .then((res) => {
        if (!active) return;
        setStripeConnected(res.connected, res.accountId);
      })
      .catch(() => {
        // ignore — not yet connected
      })
      .finally(() => {
        if (active) setIsChecking(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setError(null);
    setIsConnecting(true);
    try {
      const result = await api.post<ConnectLinkResponse>('/stripe/connect-link', {});
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Stripe connection');
      setIsConnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Connect your payments</h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect a Stripe account so you can accept payments for orders and bookings.
        </p>
      </div>

      {isChecking ? (
        <p className="text-sm text-gray-400">Checking connection status…</p>
      ) : stripeConnected ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">✓ Stripe account connected</p>
          <p className="mt-1 text-sm text-green-700">
            You're all set to accept payments once your site is live.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-4 text-sm text-gray-600">
            You'll be redirected to Stripe to securely set up your account, then brought back
            here.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={isConnecting}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isConnecting ? 'Redirecting…' : 'Connect with Stripe'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
