import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import { getFontPair } from '../themes/shared/fontPairs';
import { ServiceCatalog } from '../themes/shared/CatalogGrid';
import BookingStatusOverlay from '../themes/shared/BookingStatusOverlay';
import { useStorefrontCommerce } from '../themes/shared/useStorefrontCommerce';
import type { Tenant, Service, Staff } from '../types';
import type { ThemeData, ServiceData, StaffData } from '../themes/types';

// Minimal inline booking modal import — reuse the minimal theme's
import BookingModal from '../themes/minimal/BookingModal';
import { staffForService } from '../themes/shared/bookingFlow';

function mapTenant(tenant: Tenant): ThemeData {
  const pc = tenant.page_content ?? {};
  return {
    companyName: tenant.company_name,
    tagline: pc['hero.subtext'] || tenant.tagline || undefined,
    logoUrl: tenant.logo_url,
    heroImageUrl: tenant.hero_image_url,
    brandColor: tenant.brand_color ?? undefined,
    mode: tenant.mode,
    currency: tenant.currency,
    city: tenant.city ?? undefined,
    industry: tenant.industry ?? undefined,
    themeId: tenant.theme_id,
    slug: tenant.slug,
    paymentsEnabled: tenant.stripe_onboarded,
    stripeAccountId: tenant.stripe_account_id ?? undefined,
    serviceLayout: (pc['service_layout'] as import('../themes/types').ServiceLayout) || 'cards',
  };
}

function mapService(s: Service): ServiceData {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? undefined,
    priceCents: s.price_cents,
    durationMinutes: s.duration_minutes,
    imageUrls: s.image_urls,
    category: s.category ?? undefined,
    isFeatured: s.is_featured,
    requiresDeposit: s.requires_deposit,
    depositCents: s.deposit_cents ?? undefined,
  };
}

function mapStaff(s: Staff): StaffData {
  return { id: s.id, name: s.name, bio: s.bio ?? undefined, avatarUrl: s.avatar_url, serviceIds: s.service_ids };
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();

  const tenantQ = useQuery({
    queryKey: ['public-tenant', slug],
    queryFn: () => apiGet<{ tenant: Tenant }>(`/api/public/${slug}`).then((r) => r.tenant),
    enabled: !!slug,
    retry: false,
  });

  const servicesQ = useQuery({
    queryKey: ['public-services', slug],
    queryFn: () => apiGet<{ services: Service[] }>(`/api/public/${slug}/services`).then((r) => r.services),
    enabled: !!slug && !!tenantQ.data,
  });

  const staffQ = useQuery({
    queryKey: ['public-staff', slug],
    queryFn: () => apiGet<{ staff: Staff[] }>(`/api/public/${slug}/staff`).then((r) => r.staff).catch(() => []),
    enabled: !!slug && !!tenantQ.data,
  });

  const fontPair = getFontPair(tenantQ.data?.font_pair_id);

  useEffect(() => {
    if (!tenantQ.data) return;
    const linkId = 'booking-google-fonts';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = fontPair.googleFontsUrl;
    document.title = `Book — ${tenantQ.data.company_name}`;
  }, [tenantQ.data, fontPair.googleFontsUrl]);

  if (tenantQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (tenantQ.isError || !tenantQ.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-slate-500">We couldn&apos;t find a booking page at this address.</p>
      </div>
    );
  }

  const tenant = tenantQ.data;
  const theme = mapTenant(tenant);
  const services = (servicesQ.data ?? []).map(mapService);
  const staff = (staffQ.data ?? []).map(mapStaff);

  const accent = theme.brandColor ?? '#111111';

  return (
    <BookingPageInner
      theme={theme}
      services={services}
      staff={staff}
      accent={accent}
      fontBody={fontPair.body}
      plan={tenant.plan}
    />
  );
}

function BookingPageInner({ theme, services, staff, accent, fontBody, plan }: {
  theme: ThemeData;
  services: ServiceData[];
  staff: StaffData[];
  accent: string;
  fontBody: string;
  plan?: string;
}) {
  const {
    bookingService, bookingOpen, openBooking, closeBooking,
    selectedDate, selectedSlot, availableSlots, bookingCityLabel,
    selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    refreshSlots, slotsRefreshing, selectedStaffId, setSelectedStaffId,
    bookingClientSecret, bookingAmountCents,
  } = useStorefrontCommerce(theme.slug);

  return (
    <div data-storefront style={{ fontFamily: fontBody, minHeight: '100vh', background: '#fff' }}>
      {/* Minimal header */}
      <header style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {theme.logoUrl && (
          <img src={theme.logoUrl} alt={theme.companyName} style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
        )}
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#111', margin: 0 }}>{theme.companyName}</p>
          {theme.city && <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{theme.city}</p>}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 8 }}>Book an appointment</h1>
        {theme.tagline && <p style={{ color: '#666', marginBottom: 32 }}>{theme.tagline}</p>}

        {services.length === 0 ? (
          <p style={{ color: '#aaa' }}>No services available yet.</p>
        ) : (
          <ServiceCatalog
            services={services}
            layout={theme.serviceLayout ?? 'cards'}
            currency={theme.currency}
            paymentsEnabled={theme.paymentsEnabled}
            accentColor={accent}
            textColor="#111111"
            surfaceColor="#f8f8f8"
            slug={theme.slug}
            allowToggle={true}
            onBook={openBooking}
          />
        )}

        {staff.length > 0 && (
          <div style={{ marginTop: 48, display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center' }}>
            {staff.map((m) => (
              <div key={m.id} style={{ textAlign: 'center', maxWidth: 160 }}>
                {m.avatarUrl && (
                  <img src={m.avatarUrl} alt={m.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px' }} />
                )}
                <p style={{ fontWeight: 600, color: '#111', margin: 0 }}>{m.name}</p>
                {m.bio && <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{m.bio}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid #f0f0f0', padding: '24px', textAlign: 'center', color: '#aaa', fontSize: 12 }}>
        &copy; {new Date().getFullYear()} {theme.companyName}
        {plan === 'starter' && (
          <span style={{ marginLeft: 8 }}>
            · <a href="https://shopsuitedirect.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Powered by Shop Suite Direct</a>
          </span>
        )}
      </footer>

      <BookingModal
        isOpen={bookingOpen}
        onClose={closeBooking}
        service={bookingService}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        availableSlots={availableSlots}
        cityLabel={bookingCityLabel}
        onSelectDate={selectBookingDate}
        onSelectSlot={selectBookingSlot}
        onConfirm={confirmBooking}
        onRefreshSlots={refreshSlots}
        slotsRefreshing={slotsRefreshing}
        staff={staffForService(staff, bookingService)}
        selectedStaffId={selectedStaffId}
        onSelectStaff={setSelectedStaffId}
      />

      <BookingStatusOverlay
        status={bookingStatus}
        error={bookingError}
        clientSecret={bookingClientSecret}
        amountCents={bookingAmountCents}
        stripeAccountId={theme.stripeAccountId}
        currency={theme.currency}
        onClose={closeBooking}
        onDismiss={dismissBookingStatus}
        onPaymentSuccess={confirmBookingPayment}
        onPaymentCancel={cancelBookingPayment}
      />
    </div>
  );
}
