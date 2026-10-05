import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import {
  Package, Sparkles, CalendarDays, LayoutTemplate, Tag, Users,
  TrendingUp, TrendingDown, ShoppingBag, Globe, Share2,
  CheckCircle2, Circle, ArrowRight, Clock, ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { useApi } from '../lib/api';
import type { Tenant, Order, Booking, Product, Service } from '../types';
import Spinner from '../components/shared/Spinner';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ values, color = '#7c3aed' }: { values: number[]; color?: string }) {
  if (values.length < 2) return <div className="h-7 w-20" />;
  const max = Math.max(...values, 0.001);
  const min = Math.min(...values);
  const range = max - min || 0.001;
  const W = 80, H = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - 4 - ((v - min) / range) * (H - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={W} height={H} aria-hidden="true" className="overflow-visible">
      <path d={`M${pts.join('L')}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Circular progress ─────────────────────────────────────────────────────────

function CircularProgress({ pct }: { pct: number }) {
  const r = 38, circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28" aria-label={`${pct}% complete`}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle
        cx={50} cy={50} r={r} fill="none"
        stroke="url(#prog-grad)" strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" transform="rotate(-90 50 50)"
      />
      <defs>
        <linearGradient id="prog-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, trend, sparkValues, color = '#7c3aed',
}: {
  label: string; value: string; trend?: number | null;
  sparkValues: number[]; color?: string;
}) {
  const isUp = (trend ?? 0) >= 0;
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Sparkline values={sparkValues} color={color} />
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {trend !== null && trend !== undefined ? (
          <p className={`mt-0.5 flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isUp ? '+' : ''}{trend}% vs yesterday
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-400">— no change</p>
        )}
      </div>
    </div>
  );
}

// ── Quick action card ─────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon, label, to, bg,
}: {
  icon: LucideIcon;
  label: string; to: string; bg: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={22} className="text-white" />
      </div>
      <span className="text-sm font-semibold text-slate-800">{label}</span>
    </Link>
  );
}

// ── Checklist item ────────────────────────────────────────────────────────────

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {done
        ? <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
        : <Circle size={16} className="shrink-0 text-slate-300" />}
      <span className={done ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Overview() {
  const api = useApi();
  const { user } = useUser();

  const tenantQ = useQuery({ queryKey: ['tenant', 'me'], queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me') });
  const ordersQ = useQuery({ queryKey: ['orders'], queryFn: () => api.get<{ orders: Order[] }>('/orders') });
  const bookingsQ = useQuery({ queryKey: ['bookings'], queryFn: () => api.get<{ bookings: Booking[] }>('/bookings') });
  const productsQ = useQuery({ queryKey: ['products'], queryFn: () => api.get<{ products: Product[] }>('/products') });
  const servicesQ = useQuery({ queryKey: ['services'], queryFn: () => api.get<{ services: Service[] }>('/services') });

  if (tenantQ.isLoading || ordersQ.isLoading || bookingsQ.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const tenant = tenantQ.data?.tenant;
  const orders = ordersQ.data?.orders ?? [];
  const bookings = bookingsQ.data?.bookings ?? [];
  const products = productsQ.data?.products ?? [];
  const services = servicesQ.data?.services ?? [];

  // ── Date helpers ──────────────────────────────────────────────────────────
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const yesterday = new Date(todayStart); yesterday.setDate(yesterday.getDate() - 1);
  const DAY = 86_400_000;

  function ordersInRange(from: Date, to: Date) {
    return orders.filter(o => { const d = new Date(o.created_at); return d >= from && d < to; });
  }

  function paidRevenue(os: Order[]) {
    return os.filter(o => o.status === 'paid' || o.status === 'fulfilled').reduce((s, o) => s + o.total_cents, 0);
  }

  function bookingsOnDay(from: Date, to: Date) {
    return bookings.filter(b => { const s = new Date(b.start_time); return s >= from && s < to; });
  }

  // Today / yesterday snapshots
  const todayOrders = ordersInRange(todayStart, new Date(+todayStart + DAY));
  const ydayOrders = ordersInRange(yesterday, todayStart);
  const todayRevCents = paidRevenue(todayOrders);
  const ydayRevCents = paidRevenue(ydayOrders);
  const todayBookings = bookingsOnDay(todayStart, new Date(+todayStart + DAY));
  const ydayBookings = bookingsOnDay(yesterday, todayStart);

  function trend(today: number, yest: number): number | null {
    if (yest === 0) return null;
    return Math.round(((today - yest) / yest) * 100);
  }

  // Last-7 sparkline values
  const revSpark = Array.from({ length: 7 }, (_, i) => {
    const from = new Date(+todayStart - (6 - i) * DAY);
    const to = new Date(+from + DAY);
    return paidRevenue(ordersInRange(from, to)) / 100;
  });
  const orderSpark = Array.from({ length: 7 }, (_, i) => {
    const from = new Date(+todayStart - (6 - i) * DAY);
    const to = new Date(+from + DAY);
    return ordersInRange(from, to).length;
  });
  const bookSpark = Array.from({ length: 7 }, (_, i) => {
    const from = new Date(+todayStart - (6 - i) * DAY);
    const to = new Date(+from + DAY);
    return bookingsOnDay(from, to).length;
  });

  // Revenue chart (last 7 days)
  const chartMax = Math.max(...revSpark, 1);
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(+todayStart - (6 - i) * DAY);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  // Total revenue
  const totalRevCents = paidRevenue(orders);

  // Unique customers
  const uniqueEmails = new Set(orders.map(o => o.customer_email)).size;

  // Activity feed (merge orders + bookings, sort by time)
  type FeedItem = {
    id: string;
    icon: LucideIcon;
    label: string; sub: string; time: string; iconBg: string;
  };
  const feed: FeedItem[] = [
    ...orders.slice(0, 8).map(o => ({
      id: `o${o.id}`, icon: ShoppingBag,
      label: `New order #${o.order_number} received`,
      sub: o.customer_name,
      time: o.created_at, iconBg: 'bg-blue-100 text-blue-600',
    })),
    ...bookings.slice(0, 8).map(b => ({
      id: `b${b.id}`, icon: CalendarDays,
      label: `Booking: ${b.service_name ?? 'Appointment'}`,
      sub: b.customer_name,
      time: b.created_at, iconBg: 'bg-violet-100 text-violet-600',
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 9);

  // Setup checklist
  const hasSale = orders.some(o => o.status === 'paid' || o.status === 'fulfilled');
  const setupItems = [
    { done: true, label: 'Store created' },
    { done: !!tenant?.custom_domain_verified, label: 'Domain connected' },
    { done: !!tenant?.stripe_onboarded, label: 'Payments connected' },
    { done: services.length > 0, label: 'Booking calendar ready' },
    { done: products.length > 0, label: 'First product added' },
    { done: hasSale, label: 'Get your first sale' },
  ];
  const setupPct = Math.round((setupItems.filter(s => s.done).length / setupItems.length) * 100);

  // Upcoming bookings
  const upcoming = bookings
    .filter(b => new Date(b.start_time) > now && (b.status === 'confirmed' || b.status === 'pending'))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  // Best product & service
  const bestProduct = products.find(p => p.is_featured) ?? products[0];
  const bestService = services.find(s => s.is_featured) ?? services[0];

  // Site URL for actions
  const isPublished = !!(tenant?.wizard_completed && tenant?.is_active);
  const siteHref = tenant?.custom_domain_verified && tenant?.custom_domain
    ? `https://${tenant.custom_domain}`
    : tenant?.slug ? `/${tenant.slug}` : null;

  async function copyLink() {
    if (!siteHref) return;
    const url = siteHref.startsWith('http') ? siteHref : `${window.location.origin}${siteHref}`;
    await navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Welcome ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}, {user?.firstName ?? tenant?.company_name} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {tenant?.company_name} is {isPublished ? 'live and ready for business.' : 'being set up.'}
          </p>
        </div>
        {siteHref && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={siteHref} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ExternalLink size={14} />
              Preview Site
            </a>
            <button
              type="button" onClick={copyLink}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Share2 size={14} />
              Share
            </button>
            <a
              href={siteHref} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <Globe size={14} />
              {isPublished ? 'View Live Site' : 'Publish Site'}
            </a>
          </div>
        )}
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Quick Actions</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <QuickAction icon={Package}       label="Add Product"     to="/dashboard/products"     bg="bg-blue-500" />
          <QuickAction icon={Sparkles}      label="Create Service"  to="/dashboard/services"     bg="bg-emerald-500" />
          <QuickAction icon={CalendarDays}  label="Create Booking"  to="/dashboard/bookings"     bg="bg-violet-500" />
          <QuickAction icon={LayoutTemplate} label="Edit Website"   to="/dashboard/page-builder" bg="bg-orange-500" />
          <QuickAction icon={Tag}           label="Add Coupon"      to="/dashboard/discounts"    bg="bg-pink-500" />
          <QuickAction icon={Users}         label="Invite Staff"    to="/dashboard/staff"        bg="bg-indigo-500" />
        </div>
      </div>

      {/* ── Today's Snapshot ─────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Today's Snapshot</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Revenue Today"    value={fmt(todayRevCents)}         trend={trend(todayRevCents, ydayRevCents)}      sparkValues={revSpark}   color="#7c3aed" />
          <KpiCard label="Bookings Today"   value={String(todayBookings.length)} trend={trend(todayBookings.length, ydayBookings.length)} sparkValues={bookSpark}  color="#10b981" />
          <KpiCard label="Orders Today"     value={String(todayOrders.length)} trend={trend(todayOrders.length, ydayOrders.length)}     sparkValues={orderSpark} color="#3b82f6" />
          <KpiCard label="Customers"        value={String(uniqueEmails)}        trend={null}                                   sparkValues={[1,1,2,2,3,3,uniqueEmails]} color="#f59e0b" />
          <KpiCard label="Total Revenue"    value={fmt(totalRevCents)}          trend={null}                                   sparkValues={revSpark}   color="#6366f1" />
        </div>
      </div>

      {/* ── Main two-column layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Left (2/3): Revenue chart + bottom cards */}
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Revenue chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Revenue Overview</h2>
                <p className="mt-1 text-3xl font-bold text-slate-900">{fmt(totalRevCents)}</p>
                <p className="mt-0.5 text-xs font-medium text-emerald-600">All time</p>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                This Week
              </div>
            </div>
            {/* Bar chart */}
            <div className="flex h-36 items-end gap-1.5">
              {revSpark.map((v, i) => {
                const pct = Math.max((v / chartMax) * 100, 3);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="relative w-full flex-1 overflow-hidden rounded-t-lg bg-slate-100">
                      <div
                        className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-400 transition-all duration-500"
                        style={{ height: `${pct}%` }}
                        title={`${fmt(v * 100)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">{dayLabels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom row: best product / service / traffic */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* Best product */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Best Selling Product</p>
              {bestProduct ? (
                <div className="flex gap-3">
                  {bestProduct.image_urls?.[0] ? (
                    <img src={bestProduct.image_urls[0]} alt={bestProduct.name} className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Package size={20} className="text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{bestProduct.name}</p>
                    <p className="mt-0.5 text-base font-bold text-violet-600">{fmt(bestProduct.price_cents)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-3">
                  <Package size={24} className="text-slate-300" />
                  <p className="text-xs text-slate-400">No products yet</p>
                  <Link to="/dashboard/products" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                    Add your first →
                  </Link>
                </div>
              )}
            </div>

            {/* Top service */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Top Service</p>
              {bestService ? (
                <div className="flex gap-3">
                  {bestService.image_urls?.[0] ? (
                    <img src={bestService.image_urls[0]} alt={bestService.name} className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Sparkles size={20} className="text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{bestService.name}</p>
                    <p className="mt-0.5 text-base font-bold text-violet-600">{fmt(bestService.price_cents)}</p>
                    <p className="text-[11px] text-slate-400">{todayBookings.length} bookings today</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-3">
                  <Sparkles size={24} className="text-slate-300" />
                  <p className="text-xs text-slate-400">No services yet</p>
                  <Link to="/dashboard/services" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                    Add your first →
                  </Link>
                </div>
              )}
            </div>

            {/* Traffic sources (illustrative) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Top Traffic Source</p>
              {[
                { label: 'Direct', pct: 45, color: 'bg-violet-500' },
                { label: 'Google', pct: 30, color: 'bg-blue-500' },
                { label: 'Social', pct: 15, color: 'bg-pink-500' },
                { label: 'Other', pct: 10, color: 'bg-slate-300' },
              ].map(s => (
                <div key={s.label} className="mb-2.5 last:mb-0">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-600">{s.label}</span>
                    <span className="text-slate-500">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right (1/3): Activity + Setup + Bookings */}
        <div className="flex flex-col gap-4">

          {/* Recent activity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
              <Link to="/dashboard/orders" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                View All
              </Link>
            </div>
            {feed.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-50">
                {feed.map(item => (
                  <li key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}>
                      <item.icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-snug text-slate-900">{item.label}</p>
                      <p className="text-[11px] text-slate-500">{item.sub}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(item.time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Business setup progress */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Business Setup Progress</h2>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <CircularProgress pct={setupPct} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">{setupPct}%</span>
                  <span className="text-[10px] font-medium text-slate-500">Complete</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {setupItems.map(item => (
                  <CheckItem key={item.label} done={item.done} label={item.label} />
                ))}
              </div>
            </div>
            {setupPct < 100 && (
              <Link
                to="/onboarding"
                className="mt-4 flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
              >
                View Setup Guide <ArrowRight size={12} />
              </Link>
            )}
          </div>

          {/* Upcoming bookings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Upcoming Bookings</h2>
              <Link to="/dashboard/bookings" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                View Calendar
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <CalendarDays size={24} className="text-slate-300" />
                <p className="text-xs text-slate-400">No upcoming bookings</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcoming.map(b => (
                  <li key={b.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                      <Clock size={14} className="text-violet-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900">{b.service_name ?? 'Appointment'}</p>
                      <p className="text-[11px] text-slate-500">{b.customer_name}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-slate-500">
                      {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
