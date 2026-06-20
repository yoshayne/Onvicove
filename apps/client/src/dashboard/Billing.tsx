import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import StripePaymentForm from '../themes/shared/StripePaymentForm';

type PlanId = 'starter' | 'pro' | 'business';

interface SubStatus {
  plan: PlanId;
  plan_expires_at: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
}

const PLANS = [
  {
    id: 'starter' as PlanId,
    name: 'Starter',
    price: 'Free',
    priceCents: 0,
    features: ['Online store or booking page', 'Up to 25 products or services', 'Standard themes', 'Shop Suite Direct branding'],
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    price: '$29/mo',
    priceCents: 2900,
    features: ['Unlimited products & services', 'All premium themes', 'Remove branding', 'AI photo generation credits', 'Priority support'],
  },
  {
    id: 'business' as PlanId,
    name: 'Business',
    price: '$79/mo',
    priceCents: 7900,
    features: ['Everything in Pro', 'Multiple staff & locations', 'Advanced analytics', 'Custom domain', 'Lower transaction fees'],
  },
];

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  canceling: 'Cancels at period end',
  past_due: 'Past due — update payment method',
  canceled: 'Canceled',
  incomplete: 'Incomplete — payment required',
  none: '',
};

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripePromise() {
  if (!stripePromise) stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string || '');
  return stripePromise;
}

export default function Billing() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [priceCents, setPriceCents] = useState(0);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => api.get<{ subscription: SubStatus }>('/subscriptions/status'),
  });

  const sub = data?.subscription;
  const currentPlan = sub?.plan ?? 'starter';
  const subStatus = sub?.stripe_subscription_status ?? 'none';
  const hasActiveSub = subStatus === 'active' || subStatus === 'canceling';

  const subscribeMutation = useMutation({
    mutationFn: (plan: PlanId) => api.post<{ clientSecret?: string; upgraded?: boolean; status: string }>('/subscriptions/create', { plan }),
    onSuccess: (res, plan) => {
      if (res.upgraded || res.status === 'active') {
        queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
        queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
        setSelectedPlan(null);
      } else if (res.clientSecret) {
        setClientSecret(res.clientSecret);
        setPriceCents(PLANS.find((p) => p.id === plan)?.priceCents ?? 0);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post('/subscriptions/cancel', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await api.post<{ url: string }>('/subscriptions/portal', {});
      window.location.href = res.url;
    } catch {
      setPortalLoading(false);
    }
  }

  function handlePaymentSuccess() {
    setClientSecret(null);
    setSelectedPlan(null);
    queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Plan</h1>
        {hasActiveSub && (
          <Button variant="secondary" isLoading={portalLoading} onClick={handleManageBilling}>
            Manage billing
          </Button>
        )}
      </div>

      {/* Current plan banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Current plan</p>
            <p className="text-2xl font-bold text-slate-900 capitalize">{currentPlan}</p>
            {subStatus && subStatus !== 'none' && (
              <p className={`mt-1 text-sm ${subStatus === 'past_due' ? 'text-red-600' : subStatus === 'canceling' ? 'text-amber-600' : 'text-green-600'}`}>
                {STATUS_LABELS[subStatus] ?? subStatus}
              </p>
            )}
            {sub?.plan_expires_at && (subStatus === 'active' || subStatus === 'canceling') && (
              <p className="mt-1 text-xs text-slate-400">
                {subStatus === 'canceling' ? 'Access until' : 'Renews'}{' '}
                {new Date(sub.plan_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
          {hasActiveSub && currentPlan !== 'starter' && (
            <button
              type="button"
              onClick={() => { if (window.confirm('Cancel your subscription? You\'ll stay on this plan until the period ends.')) cancelMutation.mutate(); }}
              disabled={cancelMutation.isPending || subStatus === 'canceling'}
              className="text-sm text-slate-400 hover:text-red-600 disabled:opacity-50"
            >
              {subStatus === 'canceling' ? 'Cancellation scheduled' : 'Cancel plan'}
            </button>
          )}
        </div>
      </div>

      {/* Payment form — shown after selecting a paid plan */}
      {clientSecret && selectedPlan && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Activate {PLANS.find((p) => p.id === selectedPlan)?.name} plan
          </h2>
          <StripePaymentForm
            clientSecret={clientSecret}
            amountCents={priceCents}
            onSuccess={handlePaymentSuccess}
            onCancel={() => { setClientSecret(null); setSelectedPlan(null); }}
          />
        </div>
      )}

      {/* Plan cards */}
      {!clientSecret && (
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isSelecting = selectedPlan === plan.id && subscribeMutation.isPending;
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-xl border p-5 ${isCurrent ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">{plan.name}</span>
                  {isCurrent && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">Current</span>}
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-4">{plan.price}</p>
                <ul className="flex flex-col gap-1.5 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-0.5 text-green-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.id === 'starter' ? (
                  isCurrent ? null : (
                    <button
                      type="button"
                      onClick={() => { if (window.confirm('Downgrade to Starter (free)? Your subscription will cancel at period end.')) cancelMutation.mutate(); }}
                      disabled={cancelMutation.isPending}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Downgrade to Free
                    </button>
                  )
                ) : isCurrent ? null : (
                  <Button
                    isLoading={isSelecting}
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      subscribeMutation.mutate(plan.id);
                    }}
                  >
                    {currentPlan === 'starter' ? 'Upgrade' : 'Switch'} to {plan.name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subscribeMutation.error && (
        <p className="text-sm text-red-600">{(subscribeMutation.error as Error).message}</p>
      )}
    </div>
  );
}
