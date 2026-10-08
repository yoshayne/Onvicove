import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import StripePaymentForm from '../themes/shared/StripePaymentForm';
import { clearPaymentReturn, readPaymentReturn } from '../lib/paymentReturn';

type PlanId = 'starter' | 'pro' | 'business';

interface SubStatus {
  plan: PlanId;
  plan_expires_at: string | null;
  has_billing_account?: boolean;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
}

const PLANS = [
  {
    id: 'starter' as PlanId,
    name: 'Starter',
    price: 'Free',
    priceCents: 0,
    features: ['Online store or booking page', 'Up to 5 products & 10 services', 'Standard themes', 'Shop Suite Direct branding'],
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
    features: ['Everything in Pro', 'Multiple staff & locations', 'Advanced analytics', 'Custom domain'],
  },
];

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  canceling: 'Cancels at period end',
  past_due: 'Past due — update payment method',
  canceled: 'Canceled',
  incomplete: 'Incomplete — payment required',
  trialing: 'Trial',
  unpaid: 'Unpaid — your plan has ended',
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
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoStarted = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => api.get<{ subscription: SubStatus }>('/subscriptions/status'),
  });

  const { data: plansData } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => api.get<{ plans: Record<PlanId, { fee_percent: number; fee_fixed_cents: number }> }>('/subscriptions/plans'),
  });
  const feeLabel = (id: PlanId) => {
    const f = plansData?.plans[id];
    return f ? `${+(f.fee_percent * 100).toFixed(2)}% + ${f.fee_fixed_cents}¢ per sale` : null;
  };

  const sub = data?.subscription;
  const currentPlan = sub?.plan ?? 'starter';
  const subStatus = sub?.stripe_subscription_status ?? 'none';
  const hasActiveSub = subStatus === 'active' || subStatus === 'canceling' || subStatus === 'trialing';
  // Anyone with a Stripe subscription can open the billing portal — including past-due ones who need to fix their card
  const canManageBilling = !!sub?.has_billing_account && !!sub?.stripe_subscription_id;

  // Ask Stripe for the real state after a payment (the webhook can lag a moment), then refresh the page's data.
  async function confirmPlan(plan: PlanId) {
    for (let i = 0; i < 6; i++) {
      try {
        const r = await api.post<{ plan: PlanId }>('/subscriptions/sync');
        if (r.plan === plan) {
          setNotice({ tone: 'ok', text: `You're now on the ${PLANS.find((p) => p.id === plan)?.name} plan.` });
          break;
        }
      } catch { /* retry */ }
      if (i === 5) setNotice({ tone: 'warn', text: 'Payment received — your plan will switch over within a minute. Refresh if it doesn\'t.' });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
  }

  const subscribeMutation = useMutation({
    mutationFn: (plan: PlanId) => api.post<{ clientSecret?: string; upgraded?: boolean; status: string }>('/subscriptions/create', { plan }),
    onSuccess: (res, plan) => {
      if (res.upgraded || res.status === 'active') {
        setSelectedPlan(null);
        void confirmPlan(plan);
      } else if (res.clientSecret) {
        // If the customer pays with a redirect method (Cash App, bank…) this page reloads; remember what they bought
        sessionStorage.setItem('pendingPlan', plan);
        setClientSecret(res.clientSecret);
        setPriceCents(PLANS.find((p) => p.id === plan)?.priceCents ?? 0);
      }
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.post('/subscriptions/resume', {}),
    onSuccess: () => {
      setNotice({ tone: 'ok', text: 'Your plan will keep renewing.' });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
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
    const plan = selectedPlan;
    setClientSecret(null);
    setSelectedPlan(null);
    if (plan) void confirmPlan(plan);
  }

  function startPlan(plan: PlanId) {
    const lower = PLANS.findIndex((p) => p.id === plan) < PLANS.findIndex((p) => p.id === currentPlan);
    if (lower && !window.confirm(`Switch to ${PLANS.find((p) => p.id === plan)?.name}? You'll move to a lower plan right away, and any unused time is credited to your account.`)) return;
    setNotice(null);
    setSelectedPlan(plan);
    subscribeMutation.mutate(plan);
  }

  // Back from a redirect payment method: confirm the plan with Stripe, or say it didn't go through
  const returnHandled = useRef(false);
  useEffect(() => {
    if (returnHandled.current) return;
    const result = readPaymentReturn();
    if (!result) return;
    returnHandled.current = true;
    const plan = sessionStorage.getItem('pendingPlan') as PlanId | null;
    sessionStorage.removeItem('pendingPlan');
    clearPaymentReturn();
    if (result === 'failed') setNotice({ tone: 'warn', text: "Your payment didn't go through, so nothing was charged. You can try upgrading again." });
    else if (plan) void confirmPlan(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // /dashboard/billing?upgrade=pro (e.g. from a locked theme or the wizard) starts that plan's checkout once
  const wantedPlan = searchParams.get('upgrade');
  useEffect(() => {
    if (autoStarted.current || isLoading || !sub) return;
    if ((wantedPlan === 'pro' || wantedPlan === 'business') && currentPlan !== wantedPlan && currentPlan === 'starter') {
      autoStarted.current = true;
      startPlan(wantedPlan);
    }
    if (wantedPlan) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, sub, wantedPlan]);

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
        {canManageBilling && (
          <Button variant="secondary" isLoading={portalLoading} onClick={handleManageBilling}>
            Manage billing
          </Button>
        )}
      </div>

      {notice && (
        <p className={`rounded-lg border p-3 text-sm ${notice.tone === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {notice.text}
        </p>
      )}

      {subStatus === 'past_due' && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Your last payment didn't go through. Your plan stays active while we retry, but please update your card under <strong>Manage billing</strong> to avoid losing it.
        </p>
      )}

      {/* Current plan banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Current plan</p>
            <p className="text-2xl font-bold text-slate-900 capitalize">{currentPlan}</p>
            {feeLabel(currentPlan) && (
              <p className="mt-1 text-xs text-slate-500">Your platform fee: {feeLabel(currentPlan)}</p>
            )}
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
          {subStatus === 'canceling' && (
            <Button variant="secondary" isLoading={resumeMutation.isPending} onClick={() => resumeMutation.mutate()}>
              Keep my plan
            </Button>
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
                  {feeLabel(plan.id) && (
                    <li className="flex items-start gap-2 text-sm font-medium text-slate-800">
                      <span className="mt-0.5 text-green-600">✓</span>
                      Platform fee: {feeLabel(plan.id)}
                    </li>
                  )}
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
                    onClick={() => startPlan(plan.id)}
                  >
                    {PLANS.findIndex((p) => p.id === plan.id) > PLANS.findIndex((p) => p.id === currentPlan) ? 'Upgrade' : 'Switch'} to {plan.name}
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
