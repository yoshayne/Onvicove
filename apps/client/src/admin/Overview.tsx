import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';

interface StatsResponse {
  tenants: {
    total: number;
    active: number;
    starter: number;
    pro: number;
    business: number;
    stripe_onboarded: number;
  };
  revenue: {
    platform_fee_cents: number;
    gross_amount_cents: number;
    net_to_tenant_cents: number;
    transaction_count: number;
  };
  recent_tenants: {
    id: string;
    company_name: string;
    slug: string;
    plan: string;
    is_active: boolean;
    created_at: string;
  }[];
}

function formatCents(cents: number | string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents) / 100);
}

export default function Overview() {
  const api = useApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<StatsResponse>('/admin/stats'),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error instanceof Error ? error.message : 'Failed to load admin stats.'}
      </div>
    );
  }

  const { tenants, revenue, recent_tenants } = data;

  const cards = [
    { label: 'Total tenants', value: tenants.total },
    { label: 'Active tenants', value: tenants.active },
    { label: 'Stripe connected', value: tenants.stripe_onboarded },
    { label: 'Transactions', value: revenue.transaction_count },
    { label: 'Platform fee revenue', value: formatCents(revenue.platform_fee_cents) },
    { label: 'Gross processed', value: formatCents(revenue.gross_amount_cents) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{card.label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-medium text-slate-500">Plans</div>
        <div className="flex gap-4 text-sm text-slate-700">
          <span>Starter: {tenants.starter}</span>
          <span>Pro: {tenants.pro}</span>
          <span>Business: {tenants.business}</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
          Recent tenants
        </div>
        <div className="divide-y divide-slate-100">
          {recent_tenants.map((t) => (
            <Link
              key={t.id}
              to={`/admin/tenants/${t.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
            >
              <div>
                <div className="font-medium text-slate-900">{t.company_name}</div>
                <div className="text-xs text-slate-400">/{t.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={t.is_active ? 'success' : 'danger'}>{t.is_active ? 'active' : 'inactive'}</Badge>
                <Badge tone="default">{t.plan}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
