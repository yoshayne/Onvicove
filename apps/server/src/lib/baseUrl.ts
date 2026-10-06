/** Returns the client base URL with no trailing slash. */
export function getBaseUrl(): string {
  return (process.env.CLIENT_URL || 'https://shopsuitedirect.com').replace(/\/+$/, '');
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
