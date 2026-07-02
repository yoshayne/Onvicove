import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ShoppingCart, CalendarDays, Package, Sparkles,
  Users, UserCheck, BarChart3, Palette, LayoutTemplate, Camera,
  Tag, Settings as SettingsIcon, Wallet, CreditCard,
  Menu, X, Bell, Search, Zap, type LucideIcon,
} from 'lucide-react';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; }
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Spinner from '../components/shared/Spinner';

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'HOME',
    items: [
      { to: '/dashboard', label: 'Home', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'SELL',
    items: [
      { to: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
      { to: '/dashboard/products', label: 'Products', icon: Package },
      { to: '/dashboard/services', label: 'Services', icon: Sparkles },
      { to: '/dashboard/bookings', label: 'Bookings', icon: CalendarDays },
    ],
  },
  {
    label: 'CUSTOMERS',
    items: [
      { to: '/dashboard/customers', label: 'Customers', icon: Users },
      { to: '/dashboard/staff', label: 'Staff', icon: UserCheck },
    ],
  },
  {
    label: 'WEBSITE',
    items: [
      { to: '/dashboard/page-builder', label: 'Page Builder', icon: LayoutTemplate },
      { to: '/dashboard/themes', label: 'Themes', icon: Palette },
      { to: '/dashboard/ai-photos', label: 'AI Photos', icon: Camera },
    ],
  },
  {
    label: 'BUSINESS',
    items: [
      { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/dashboard/discounts', label: 'Discounts', icon: Tag },
      { to: '/dashboard/payouts', label: 'Payouts', icon: Wallet },
      { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
      { to: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

export default function Layout() {
  const api = useApi();
  const navigate = useNavigate();
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me'),
    retry: false,
  });

  useEffect(() => {
    if (error) navigate('/wizard', { replace: true });
  }, [error, navigate]);

  const tenant = data?.tenant;
  const isPublished = !!(tenant?.wizard_completed && tenant?.is_active);
  const siteDisplay = tenant?.custom_domain_verified && tenant?.custom_domain
    ? tenant.custom_domain
    : tenant?.slug
    ? `${tenant.slug}.shopsuitedirect.com`
    : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow">
              <Zap size={15} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">Shop Suite Direct</span>
          </div>
          <button
            className="rounded-md p-1 text-slate-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Store card */}
        {isLoading ? (
          <div className="mx-3 mb-3 flex h-14 items-center justify-center rounded-xl bg-slate-800">
            <Spinner size="sm" />
          </div>
        ) : tenant ? (
          <div className="mx-3 mb-3 rounded-xl bg-slate-800 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
                  {tenant.company_name[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-white">{tenant.company_name}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`flex h-1.5 w-1.5 shrink-0 rounded-full ${isPublished ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className={`text-[11px] font-medium ${isPublished ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isPublished ? 'Published' : 'Setup needed'}
                  </span>
                </div>
                {siteDisplay && (
                  <p className="truncate text-[11px] text-slate-500 mt-0.5">{siteDisplay}</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Upgrade banner */}
        {tenant?.plan === 'starter' && (
          <div className="m-3 shrink-0 rounded-xl border border-violet-700/30 bg-gradient-to-br from-violet-900/50 to-purple-900/50 p-3.5">
            <div className="mb-1 flex items-center gap-1.5">
              <Zap size={13} className="text-amber-400" />
              <span className="text-xs font-bold text-white">Upgrade Your Plan</span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
              Unlock more features and grow your business faster.
            </p>
            <Link
              to="/dashboard/billing"
              className="block w-full rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 py-2 text-center text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              Upgrade Now
            </Link>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400 lg:flex">
              <Search size={14} />
              <span className="text-sm">Search anything...</span>
              <kbd className="ml-8 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            {user && (
              <span className="hidden text-sm font-medium text-slate-700 sm:block">
                {user.firstName} {user.lastName}
              </span>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {tenant && !tenant.wizard_completed && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">
                Your store setup isn't finished yet — your site isn't live until you complete it.
              </p>
              <Link
                to="/onboarding"
                className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition-colors"
              >
                Finish setup
              </Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
