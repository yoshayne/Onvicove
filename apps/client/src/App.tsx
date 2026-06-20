import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Spinner from './components/shared/Spinner';

import Landing from './marketing/Landing';
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
import AdminLayout from './admin/Layout';
import AdminOverview from './admin/Overview';
import AdminTenants from './admin/Tenants';
import AdminTenantDetail from './admin/TenantDetail';
import AdminTransactions from './admin/Transactions';
import AdminAuditLog from './admin/AuditLog';
import AdminSettings from './admin/Settings';
import AdminCoupons from './admin/Coupons';
import AdminDomainRequests from './admin/DomainRequests';

const Wizard = lazy(() => import('./wizard/Wizard'));
const StorefrontRouter = lazy(() => import('./storefront/StorefrontRouter'));
const PayBalance = lazy(() => import('./storefront/PayBalance'));

const queryClient = new QueryClient();

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

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

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />

              <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
              <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />

              <Route
                path="/onboarding/*"
                element={
                  <>
                    <SignedIn>
                      <Wizard />
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
                <Route path="ai-photos" element={<AIPhotos />} />
                <Route path="discounts" element={<Discounts />} />
                <Route path="settings" element={<Settings />} />
                <Route path="payouts" element={<Payouts />} />
                <Route path="billing" element={<Billing />} />
              </Route>

              <Route path="/pay/booking/:id" element={<PayBalance />} />

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
                <Route path="tenants/:id" element={<AdminTenantDetail />} />
                <Route path="transactions" element={<AdminTransactions />} />
                <Route path="audit-log" element={<AdminAuditLog />} />
                <Route path="domain-requests" element={<AdminDomainRequests />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="/:slug/*" element={<StorefrontRouter />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
