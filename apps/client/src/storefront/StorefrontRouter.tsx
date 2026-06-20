import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import ThemeRenderer from '../themes/ThemeRenderer';
import type { ThemeData, ProductData, ServiceData, StaffData } from '../themes/types';
import type { Tenant, Product, Service, Staff } from '../types';

function mapTenant(tenant: Tenant): ThemeData {
  return {
    companyName: tenant.company_name,
    tagline: tenant.tagline ?? undefined,
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
  };
}

function mapProduct(p: Product): ProductData {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    priceCents: p.price_cents,
    compareAtPriceCents: p.compare_at_price_cents ?? undefined,
    imageUrls: p.image_urls,
    category: p.category ?? undefined,
    isFeatured: p.is_featured,
    stockQuantity: p.stock_quantity ?? undefined,
    requiresShipping: p.requires_shipping ?? true,
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
  return {
    id: s.id,
    name: s.name,
    bio: s.bio ?? undefined,
    avatarUrl: s.avatar_url,
    serviceIds: s.service_ids,
  };
}

export default function StorefrontRouter() {
  const { slug } = useParams<{ slug: string }>();

  const tenantQuery = useQuery({
    queryKey: ['public-tenant', slug],
    queryFn: () => apiGet<{ tenant: Tenant }>(`/api/public/${slug}`).then((r) => r.tenant),
    enabled: !!slug,
    retry: false,
  });

  const productsQuery = useQuery({
    queryKey: ['public-products', slug],
    queryFn: () =>
      apiGet<{ products: Product[] }>(`/api/public/${slug}/products`).then((r) => r.products),
    enabled: !!slug && !!tenantQuery.data,
  });

  const servicesQuery = useQuery({
    queryKey: ['public-services', slug],
    queryFn: () =>
      apiGet<{ services: Service[] }>(`/api/public/${slug}/services`).then((r) => r.services),
    enabled: !!slug && !!tenantQuery.data,
  });

  const staffQuery = useQuery({
    queryKey: ['public-staff', slug],
    queryFn: () =>
      apiGet<{ staff: Staff[] }>(`/api/public/${slug}/staff`)
        .then((r) => r.staff)
        .catch(() => []),
    enabled: !!slug && !!tenantQuery.data,
  });

  if (tenantQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (tenantQuery.isError || !tenantQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-slate-600">We couldn&apos;t find a store at this address.</p>
      </div>
    );
  }

  const tenant = tenantQuery.data;

  return (
    <ThemeRenderer
      themeId={tenant.theme_id}
      theme={mapTenant(tenant)}
      products={(productsQuery.data ?? []).map(mapProduct)}
      services={(servicesQuery.data ?? []).map(mapService)}
      staff={(staffQuery.data ?? []).map(mapStaff)}
    />
  );
}
