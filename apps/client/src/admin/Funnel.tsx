import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';

interface Person {
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  created_at: string;
}
interface WizardRow { id: string; company_name: string; email: string | null; step: number; created_at: string; updated_at: string }
interface LaunchedRow { id: string; company_name: string; email: string | null; stripe_started: boolean; created_at: string; updated_at: string }
interface FunnelResponse {
  counts: { signed_up_no_store: number; in_wizard: number; launched: number; launched_no_payments: number; payments_ready: number };
  signed_up_no_store: Person[];
  in_wizard: WizardRow[];
  launched_no_payments: LaunchedRow[];
}

const STEP_NAMES: Record<number, string> = {
  0: 'Just started', 1: 'Business name', 2: 'Store type', 3: 'Theme', 4: 'Brand info', 5: 'Hero photo',
  6: 'Products', 7: 'Services', 8: 'Staff & hours', 9: 'Plan', 10: 'Review & launch',
};

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function Section({ title, hint, empty, children }: { title: string; hint: string; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{hint}</div>
      </div>
      {empty ? <div className="px-4 py-6 text-sm text-slate-400">Nobody here right now.</div> : <div className="divide-y divide-slate-100">{children}</div>}
    </div>
  );
}

export default function Funnel() {
  const api = useApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'funnel'],
    queryFn: () => api.get<FunnelResponse>('/admin/funnel'),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  if (error || !data) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error instanceof Error ? error.message : 'Failed to load.'}</div>;

  const c = data.counts;
  const cards = [
    { label: 'Signed in, never started', value: c.signed_up_no_store },
    { label: 'In the setup wizard', value: c.in_wizard },
    { label: 'Launched', value: c.launched },
    { label: 'Launched, can\'t get paid yet', value: c.launched_no_payments },
    { label: 'Ready to get paid', value: c.payments_ready },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Setup funnel</h1>
        <p className="text-sm text-slate-500">Where new people are in the journey, and who stopped. Reach out to anyone who's been stuck for a day.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <Section title="Signed in but never started a store" hint="They created an account and did nothing after. These are your 'signed in, then nothing' people." empty={data.signed_up_no_store.length === 0}>
        {data.signed_up_no_store.map((p, i) => (
          <div key={`${p.email}-${i}`} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium text-slate-900">{[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown'}</div>
              {p.email && <a href={`mailto:${p.email}`} className="text-xs text-slate-500 hover:underline">{p.email}</a>}
            </div>
            <span className="text-xs text-slate-400">signed up {ago(p.created_at)}</span>
          </div>
        ))}
      </Section>

      <Section title="Stopped inside the wizard" hint="The step they reached last, and when they last did anything." empty={data.in_wizard.length === 0}>
        {data.in_wizard.map((t) => (
          <Link key={t.id} to={`/admin/tenants/${t.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
            <div>
              <div className="font-medium text-slate-900">{t.company_name}</div>
              <div className="text-xs text-slate-500">{t.email ?? 'no email recorded'}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="warning">Step {t.step}: {STEP_NAMES[t.step] ?? '?'}</Badge>
              <span className="text-xs text-slate-400">active {ago(t.updated_at)}</span>
            </div>
          </Link>
        ))}
      </Section>

      <Section title="Launched, but can't take payments yet" hint="Their store is live. Stripe setup isn't finished." empty={data.launched_no_payments.length === 0}>
        {data.launched_no_payments.map((t) => (
          <Link key={t.id} to={`/admin/tenants/${t.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
            <div>
              <div className="font-medium text-slate-900">{t.company_name}</div>
              <div className="text-xs text-slate-500">{t.email ?? 'no email recorded'}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={t.stripe_started ? 'warning' : 'default'}>{t.stripe_started ? 'Stripe started, needs info' : 'Stripe not started'}</Badge>
              <span className="text-xs text-slate-400">created {ago(t.created_at)}</span>
            </div>
          </Link>
        ))}
      </Section>
    </div>
  );
}
