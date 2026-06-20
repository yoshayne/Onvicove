import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Clock, CheckCircle, X, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useApi } from '../lib/api';
import Button from '../components/shared/Button';

interface DomainRequest {
  id: string;
  domain: string;
  tld: string;
  status: 'pending' | 'purchased' | 'rejected' | 'cancelled';
  notes: string | null;
  price_cents: number | null;
  created_at: string;
}

interface AvailabilityResult {
  domain: string;
  available: boolean;
  price_cents: number | null;
}

const POPULAR_TLDS = [
  { ext: '.com', note: 'Most trusted' },
  { ext: '.co', note: 'Popular alt' },
  { ext: '.io', note: 'Great for tech' },
  { ext: '.dev', note: 'Developer-friendly' },
  { ext: '.app', note: 'Mobile & apps' },
  { ext: '.ai', note: 'AI & SaaS' },
  { ext: '.store', note: 'eCommerce' },
  { ext: '.shop', note: 'eCommerce' },
];

const STATUS_UI = {
  pending: { label: 'Processing', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  purchased: { label: 'Active', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
  rejected: { label: 'Unavailable', color: 'text-red-700 bg-red-50 border-red-200', icon: X },
  cancelled: { label: 'Cancelled', color: 'text-slate-500 bg-slate-50 border-slate-200', icon: X },
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}/yr`;
}

export default function DomainPurchasePanel() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [selectedTld, setSelectedTld] = useState('.com');
  const [customTld, setCustomTld] = useState('');
  const [debouncedDomain, setDebouncedDomain] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for ?domain_paid=1 return from Stripe Checkout
  const paidReturn = new URLSearchParams(window.location.search).get('domain_paid') === '1';

  const { data: requestsData } = useQuery({
    queryKey: ['domain-purchase-requests'],
    queryFn: () => api.get<{ requests: DomainRequest[] }>('/domain-purchases/my'),
  });

  const requests = requestsData?.requests ?? [];
  const hasPending = requests.some((r) => r.status === 'pending');
  const hasActive = requests.some((r) => r.status === 'purchased');

  const tld = customTld.trim() ? (customTld.startsWith('.') ? customTld : `.${customTld}`) : selectedTld;
  const cleanName = name.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
  const fullDomain = cleanName ? `${cleanName}${tld}` : '';

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!fullDomain) { setDebouncedDomain(''); return; }
    debounceRef.current = setTimeout(() => setDebouncedDomain(fullDomain), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fullDomain]);

  const { data: availability, isFetching: checkingAvailability } = useQuery({
    queryKey: ['domain-check', debouncedDomain],
    queryFn: () => api.get<AvailabilityResult>(`/domain-purchases/check?domain=${encodeURIComponent(debouncedDomain)}`),
    enabled: !!debouncedDomain,
    staleTime: 60_000,
  });

  const checkoutMutation = useMutation({
    mutationFn: (domain: string) => api.post<{ url: string }>('/domain-purchases/checkout', { domain }),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/domain-purchases/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domain-purchase-requests'] }),
  });

  const isAvailable = availability?.domain === fullDomain && availability.available;
  const isTaken = availability?.domain === fullDomain && !availability.available;
  const isChecking = checkingAvailability || (!!fullDomain && debouncedDomain !== fullDomain);
  const price = isAvailable ? availability?.price_cents : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Returned from successful Stripe payment */}
      {paidReturn && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2 text-sm text-blue-800">
          <CheckCircle size={15} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Payment received — your domain is being set up!</p>
            <p className="text-xs mt-0.5 text-blue-700">We'll purchase and attach your domain within 24–48 hours. You'll get an email when it's live.</p>
          </div>
        </div>
      )}

      {/* Active domain notice */}
      {hasActive && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle size={15} className="shrink-0" />
          Your purchased domain is active. Manage renewals at{' '}
          <a
            href="https://railway.com/workspace/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium inline-flex items-center gap-0.5"
          >
            railway.com/workspace/domains <ExternalLink size={11} />
          </a>
        </div>
      )}

      {/* Pending notice */}
      {hasPending && !paidReturn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2 text-sm text-amber-800">
          <Clock size={15} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Domain purchase in progress</p>
            <p className="text-xs mt-0.5 text-amber-700">We're setting up your domain. You'll get an email within 24–48 hours when it's live.</p>
          </div>
        </div>
      )}

      {/* Purchase form — hide if already pending or active */}
      {!hasPending && !hasActive && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Domain name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mybusiness"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={customTld || selectedTld}
                onChange={(e) => { setCustomTld(e.target.value); setSelectedTld(''); }}
                placeholder=".com"
                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Availability + price indicator */}
            {fullDomain && (
              <div className="flex items-center gap-1.5 mt-1">
                {isChecking ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400 font-mono">{fullDomain}</span>
                  </>
                ) : isAvailable && price ? (
                  <>
                    <CheckCircle size={12} className="text-green-500" />
                    <span className="text-xs text-green-700 font-mono font-medium">{fullDomain} — available</span>
                    <span className="text-xs text-green-600 font-semibold ml-1">{formatPrice(price)}</span>
                  </>
                ) : isTaken ? (
                  <>
                    <X size={12} className="text-red-500" />
                    <span className="text-xs text-red-600 font-mono font-medium">{fullDomain} — already taken</span>
                  </>
                ) : (
                  <span className="text-xs text-indigo-600 font-mono">→ {fullDomain}</span>
                )}
              </div>
            )}
          </div>

          {/* Popular TLDs */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-slate-500 font-medium">Popular extensions</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TLDS.map((t) => (
                <button
                  key={t.ext}
                  type="button"
                  onClick={() => { setSelectedTld(t.ext); setCustomTld(''); }}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    tld === t.ext
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {t.ext}
                  <span className="ml-1 text-[10px] text-slate-400">{t.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-1 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">How it works</p>
            <p>1. Pick an available domain and pay — price shown above includes 1 year registration</p>
            <p>2. We purchase it through Railway within 24–48 hours</p>
            <p>3. SSL is included, DNS is auto-configured, and you'll get an email when it's live</p>
          </div>

          {checkoutMutation.isError && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle size={12} />
              {checkoutMutation.error instanceof Error ? checkoutMutation.error.message : 'Something went wrong'}
            </div>
          )}

          <Button
            onClick={() => checkoutMutation.mutate(fullDomain)}
            isLoading={checkoutMutation.isPending}
            disabled={!isAvailable || !price || checkoutMutation.isPending}
          >
            <ShoppingBag size={14} className="mr-1.5" />
            {price ? `Purchase ${fullDomain} — ${formatPrice(price)}` : 'Select an available domain'}
          </Button>
        </div>
      )}

      {/* Request history */}
      {requests.filter((r) => r.status !== 'cancelled').length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your domains</p>
          {requests
            .filter((r) => r.status !== 'cancelled')
            .map((req) => {
              const ui = STATUS_UI[req.status];
              const Icon = ui.icon;
              return (
                <div
                  key={req.id}
                  className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-3 ${ui.color}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold font-mono truncate">{req.domain}</p>
                      {req.notes && <p className="text-xs opacity-70 mt-0.5">{req.notes}</p>}
                      {req.price_cents && (
                        <p className="text-xs opacity-60 mt-0.5">Paid {formatPrice(req.price_cents)}</p>
                      )}
                      {req.status === 'pending' && (
                        <p className="text-xs opacity-60">
                          Submitted {new Date(req.created_at).toLocaleDateString()} · live within 24–48 hrs
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${ui.color}`}>
                      {ui.label}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
