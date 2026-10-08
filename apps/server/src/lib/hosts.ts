import { domainToASCII } from 'node:url';

const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'smtp', 'ftp', 'staging', 'dev', 'test', 'status', 'cdn', 'static',
]);

const PLATFORM_APEX = 'shopsuitedirect.com';

/** Lowercase, strip port and trailing dot. */
export function normalizeHost(raw: string): string {
  return raw.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.+$/, '');
}

function configuredHosts(): string[] {
  const hosts = ['localhost', '127.0.0.1', PLATFORM_APEX, `www.${PLATFORM_APEX}`];
  if (process.env.RAILWAY_PUBLIC_DOMAIN) hosts.push(normalizeHost(process.env.RAILWAY_PUBLIC_DOMAIN));
  try {
    if (process.env.CLIENT_URL) hosts.push(normalizeHost(new URL(process.env.CLIENT_URL).host));
  } catch { /* ignore malformed CLIENT_URL */ }
  return hosts;
}

/** True for the platform's own hostnames (never a tenant custom domain). */
export function isPlatformHost(host: string): boolean {
  if (configuredHosts().includes(host)) return true;
  if (host.endsWith('.up.railway.app') || host.endsWith('.railway.app')) return true;
  return host.endsWith(`.${PLATFORM_APEX}`);
}

/** For `<slug>.shopsuitedirect.com` returns the slug label; otherwise null. */
export function platformSubdomain(host: string): string | null {
  if (!host.endsWith(`.${PLATFORM_APEX}`)) return null;
  const label = host.slice(0, -(PLATFORM_APEX.length + 1));
  if (!label || label.includes('.') || RESERVED_SUBDOMAINS.has(label)) return null;
  return /^[a-z0-9-]+$/.test(label) ? label : null;
}

/** Cleans user input into a bare hostname (punycode for IDNs). */
export function sanitizeDomain(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/^[^@]*@/, '')
    .replace(/:\d+$/, '')
    .replace(/\.+$/, '');
  return domainToASCII(cleaned) || '';
}

export function isValidDomain(domain: string): boolean {
  if (domain.length > 253) return false;
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,}|xn--[a-z0-9-]{2,})$/.test(domain);
}

/** Domains tenants may never claim (the platform itself, Railway hosts). */
export function isBlockedCustomDomain(domain: string): boolean {
  return (
    domain === PLATFORM_APEX ||
    domain.endsWith(`.${PLATFORM_APEX}`) ||
    domain.endsWith('.railway.app') ||
    domain.endsWith('.up.railway.app') ||
    configuredHosts().includes(domain)
  );
}

/** Only accept a syntactically valid Host header for building URLs; otherwise null. */
export function safeOrigin(proto: string | undefined, host: string | undefined): string | null {
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const scheme = proto === 'http' ? 'http' : 'https';
  return `${scheme}://${host.toLowerCase()}`;
}

/** Railway's own hostnames (e.g. onvicove-production.up.railway.app): never shown to customers. */
export function isRailwayHost(host: string): boolean {
  return host.endsWith('.railway.app');
}
