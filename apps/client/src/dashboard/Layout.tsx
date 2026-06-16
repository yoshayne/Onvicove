import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ShoppingCart,
  CalendarDays,
  Package,
  Sparkles,
  Users,
  BarChart3,
  Palette,
  LayoutTemplate,
  Camera,
  Tag,
  Settings as SettingsIcon,
  Wallet,
  Menu,
  X,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Spinner from '../components/shared/Spinner';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/dashboard/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/dashboard/products', label: 'Products', icon: Package },
  { to: '/dashboard/services', label: 'Services', icon: Sparkles },
  { to: '/dashboard/staff', label: 'Staff', icon: Users },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/themes', label: 'Themes', icon: Palette },
  { to: '/dashboard/page-builder', label: 'Page Builder', icon: LayoutTemplate },
  { to: '/dashboard/ai-photos', label: 'AI Photos', icon: Camera },
  { to: '/dashboard/discounts', label: 'Discounts', icon: Tag },
  { to: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/dashboard/payouts', label: 'Payouts', icon: Wallet },
];

export default function Layout() {
  const api = useApi();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me'),
  });

  const tenant = data?.tenant;

  async function handleShare(slug: string) {
    const url = `${window.location.origin}/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: tenant?.company_name });
        return;
      }
    } catch {
      // fall through to clipboard copy
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto bg-slate-900 text-slate-100 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <span className="text-lg font-bold tracking-tight">Shop Suite Direct</span>
          <button
            className="rounded p-1 hover:bg-slate-800 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-2 pb-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded p-1 text-slate-700 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>
            <div className="text-sm font-semibold text-slate-900">
              {isLoading ? <Spinner size="sm" /> : tenant?.company_name || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tenant?.slug && (
              <>
                <a
                  href={`/${tenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ExternalLink size={16} />
                  <span className="hidden sm:inline">Visit site</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleShare(tenant.slug)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Share2 size={16} />
                  <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
                </button>
              </>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          {tenant && !tenant.wizard_completed && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">
                Your store setup isn't finished yet — your site isn't live until you complete it.
              </p>
              <Link
                to="/onboarding"
                className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
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
