import { db } from '../db/client';

// Slugs that would collide with app routes, static files or platform subdomains
export const RESERVED_SLUGS = new Set([
  'api', 'app', 'admin', 'dashboard', 'sign-in', 'sign-up', 'onboarding', 'claim', 'pay', 'manage', 'guide', 'store',
  'assets', 'health', 'www', 'mail', 'smtp', 'ftp', 'staging', 'dev', 'test', 'status', 'cdn', 'static',
  'robots.txt', 'sitemap.xml', 'favicon.svg', 'checkout',
]);

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export async function generateUniqueSlug(baseName: string, excludeTenantId?: string): Promise<string> {
  const base = slugify(baseName);
  if (!base) return `store-${Date.now()}`;

  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await db`
      SELECT id FROM tenants WHERE slug = ${slug} AND id <> ${excludeTenantId ?? '00000000-0000-0000-0000-000000000000'} LIMIT 1
    `;
    if (existing.length === 0 && !RESERVED_SLUGS.has(slug)) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const clean = slugify(slug);
  if (!clean || RESERVED_SLUGS.has(clean)) return false;
  const existing = await db`
    SELECT id FROM tenants WHERE slug = ${clean} LIMIT 1
  `;
  return existing.length === 0;
}
