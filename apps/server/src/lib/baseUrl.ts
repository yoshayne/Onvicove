const PUBLIC_ORIGIN = 'https://shopsuitedirect.com';

/**
 * The public address of the platform, no trailing slash. Always shopsuitedirect.com in production: a Railway
 * hostname (*.railway.app) is internal plumbing and must never appear in links, emails, Stripe URLs or metadata,
 * even if CLIENT_URL is accidentally set to one.
 */
export function getBaseUrl(): string {
  const raw = (process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return PUBLIC_ORIGIN;
  try {
    if (new URL(raw).hostname.endsWith('.railway.app')) return PUBLIC_ORIGIN;
  } catch {
    return PUBLIC_ORIGIN;
  }
  // The local dev server stays reachable over http; everything else is https
  return /^http:\/\/(localhost|127\.0\.0\.1)/.test(raw) ? raw : raw.replace(/^http:\/\//, 'https://');
}

interface DomainTenant {
  slug?: string | null;
  custom_domain?: string | null;
  custom_domain_verified?: boolean | null;
  custom_domain_status?: string | null;
}

/** The tenant's live custom domain, or null if it isn't connected and working yet. */
export function getActiveCustomDomain(row: object): string | null {
  const tenant = row as DomainTenant;
  if (tenant.custom_domain && tenant.custom_domain_verified && tenant.custom_domain_status === 'active') {
    return tenant.custom_domain;
  }
  return null;
}

/** Public storefront URL: the custom domain when it's live, otherwise shopsuitedirect.com/<slug>. */
export function getStoreUrl(row: object): string {
  const tenant = row as DomainTenant;
  const domain = getActiveCustomDomain(tenant);
  return domain ? `https://${domain}` : `${getBaseUrl()}/${tenant.slug ?? ''}`;
}

/** Origin that serves customer pages such as /pay/booking/:id (those live at the host root). */
export function getCustomerBaseUrl(row: object): string {
  const domain = getActiveCustomDomain(row);
  return domain ? `https://${domain}` : getBaseUrl();
}
