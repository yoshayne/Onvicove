import { useQuery, useMutation } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';

interface AccountStatus {
  connected: boolean;
  onboarded: boolean;
}

export default function Payouts() {
  const api = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stripe', 'account-status'],
    queryFn: () => api.get<AccountStatus>('/stripe/account-status'),
  });

  const connectMutation = useMutation({
    mutationFn: () => api.post<{ url: string }>('/stripe/connect-link'),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Stripe Connect status</h2>
        {isLoading ? (
          <Spinner size="md" />
        ) : isError ? (
          <p className="text-sm text-red-700">Failed to load Stripe account status.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Status:</span>
              {data?.onboarded ? (
                <Badge tone="success">Onboarded</Badge>
              ) : data?.connected ? (
                <Badge tone="warning">Onboarding incomplete</Badge>
              ) : (
                <Badge tone="default">Not connected</Badge>
              )}
            </div>
            {!data?.onboarded && (
              <div>
                <Button isLoading={connectMutation.isPending} onClick={() => connectMutation.mutate()}>
                  {data?.connected ? 'Continue onboarding' : 'Connect Stripe account'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Recent transactions</h2>
        <p className="text-sm text-slate-500">
          Transaction history will appear here once available.
        </p>
      </div>
    </div>
  );
}
