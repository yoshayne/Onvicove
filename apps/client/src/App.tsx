import { lazy, Suspense, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useApi } from './lib/api';
import { useIsAdmin } from './lib/useIsAdmin';
import Spinner from './components/shared/Spinner';
import { ImpersonationProvider } from './contexts/ImpersonationContext';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-semibold text-slate-800">Something went wrong</p>
          <p className="text-sm text-slate-500">{this.state.error.message}</p>
          <button onClick={() => window.location.reload()} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import Landing from './marketing/Landing';
import Guide from './marketing/Guide';
import AuthPage from './marketing/AuthPage';
import DashboardLayout from './dashboard/Layout';
import Overview from './dashboard/Overview';
import Orders from './dashboard/Orders';
import Bookings from './dashboard/Bookings';
import Products from './dashboard/Products';
import Services from './dashboard/Services';
import Staff from './dashboard/Staff';
import Customers from './dashboard/Customers';
import Analytics from './dashboard/Analytics';
import Themes from './dashboard/Themes';
import PageBuilder from './dashboard/PageBuilder';
import AIPhotos from './dashboard/AIPhotos';
import Discounts from './dashboard/Discounts';
import Settings from './dashboard/Settings';
import Payouts from './dashboard/Payouts';
import Billing from './dashboard/Billing';
import GalleryManager from './dashboard/GalleryManager';
import EmailLog from './dashboard/EmailLog';
import AdminLayout from './admin/Layout';
import AdminOverview from './admin/Overview';
import AdminTenants from './admin/Tenants';
import AdminTenantDetail from './admin/TenantDetail';
import AdminTransactions from './admin/Transactions';
import AdminAuditLog from './admin/AuditLog';
import AdminFunnel from './admin/Funnel';
import AdminSettings from './admin/Settings';
import AdminCoupons from './admin/Coupons';
import AdminDomainRequests from './admin/DomainRequests';
import AdminCreateTenant from './admin/CreateTenant';

const Wizard = lazy(() => import('./wizard/Wizard'));
const StorefrontRouter = lazy(() => import('./storefront/StorefrontRouter'));
const PayBalance = lazy(() => import('./storefront/PayBalance'));
const ManageBooking = lazy(() => import('./storefront/ManageBooking'));
const ClaimPage = lazy(() => import('./storefront/ClaimPage'));

const queryClient = new QueryClient();

/** Platform admins without a store of their own never get pushed into store setup: they go to /admin. */
function OnboardingGate({ children }: { children: ReactNode }) {
  const api = useApi();
  const { isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const tenantQ = useQuery({
    queryKey: ['tenant', 'me', 'self'],
    queryFn: () => api.get<{ tenant: unknown }>('/tenants/me'),
    retry: false,
    enabled: isAdmin,
  });
  if (checkingAdmin || (isAdmin && tenantQ.isLoading)) return <PageFallback />;
  if (isAdmin && tenantQ.isError) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

function HashScroller() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
      history.pushState(null, '', href);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  return null;
}

function RedirectToSignIn() {
  const location = useLocation();
  return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
}

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// Set by the server when the request came in on a store's own domain (or <slug>.shopsuitedirect.com).
const hostStoreSlug = (window as unknown as { __STORE_SLUG__?: string }).__STORE_SLUG__;

function StoreHostApp({ slug }: { slug: string }) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HashScroller />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/pay/booking/:id" element={<PayBalance />} />
              <Route path="/manage/booking/:token" element={<ManageBooking />} />
              <Route path="*" element={<StorefrontRouter slug={slug} />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default function App() {
  if (hostStoreSlug) return <StoreHostApp slug={hostStoreSlug} />;
  return (
    <AppErrorBoundary>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <ImpersonationProvider>
        <BrowserRouter>
          <HashScroller />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/guide" element={<Guide />} />

              <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
              <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />

              <Route
                path="/onboarding/*"
                element={
                  <>
                    <SignedIn>
                      <OnboardingGate>
                        <Wizard />
                      </OnboardingGate>
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              />

              <Route
                path="/dashboard/*"
                element={
                  <>
                    <SignedIn>
                      <DashboardLayout />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              >
                <Route index element={<Overview />} />
                <Route path="orders" element={<Orders />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="products" element={<Products />} />
                <Route path="services" element={<Services />} />
                <Route path="staff" element={<Staff />} />
                <Route path="customers" element={<Customers />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="themes" element={<Themes />} />
                <Route path="page-builder" element={<PageBuilder />} />
                <Route path="gallery" element={<GalleryManager />} />
                <Route path="ai-photos" element={<AIPhotos />} />
                <Route path="discounts" element={<Discounts />} />
                <Route path="email-log" element={<EmailLog />} />
                <Route path="settings" element={<Settings />} />
                <Route path="payouts" element={<Payouts />} />
                <Route path="billing" element={<Billing />} />
              </Route>

              <Route path="/pay/booking/:id" element={<PayBalance />} />
              <Route path="/manage/booking/:token" element={<ManageBooking />} />

              <Route
                path="/admin/*"
                element={
                  <>
                    <SignedIn>
                      <AdminLayout />
                    </SignedIn>
                    <SignedOut>
                      <RedirectToSignIn />
                    </SignedOut>
                  </>
                }
              >
                <Route index element={<AdminOverview />} />
                <Route path="tenants" element={<AdminTenants />} />
                <Route path="tenants/new" element={<AdminCreateTenant />} />
                <Route path="tenants/:id" element={<AdminTenantDetail />} />
                <Route path="transactions" element={<AdminTransactions />} />
                <Route path="funnel" element={<AdminFunnel />} />
                <Route path="audit-log" element={<AdminAuditLog />} />
                <Route path="domain-requests" element={<AdminDomainRequests />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="/claim/:token" element={<ClaimPage />} />

              <Route path="/:slug/*" element={<StorefrontRouter />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </ImpersonationProvider>
      </QueryClientProvider>
    </ClerkProvider>
    </AppErrorBoundary>
  );
}
