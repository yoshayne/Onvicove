import { db } from '../db/client';

export interface ResolvedStore {
  tenantId: string;
  slug: string;
}

interface CacheEntry {
  value: ResolvedStore | null; // null = known miss
  expiresAt: number;
}

// Short TTL bounds how long another server instance can serve a stale answer
// after a domain is added, removed or changed.
const TTL_MS = 30 * 1000;
const MAX_ENTRIES = 5000;

class DomainCache {
  private map = new Map<string, CacheEntry>();

  private get(key: string): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry;
    if (entry) this.map.delete(key);
    return undefined;
  }

  private put(key: string, value: ResolvedStore | null) {
    if (this.map.size >= MAX_ENTRIES) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: Date.now() + TTL_MS });
  }

  /** Resolve a verified custom domain to its store. */
  async resolve(domain: string): Promise<ResolvedStore | null> {
    const key = `d:${domain}`;
    const hit = this.get(key);
    if (hit) return hit.value;

    const rows = await db`
      SELECT id, slug FROM tenants
      WHERE custom_domain = ${domain}
        AND custom_domain_verified = TRUE
        AND is_active = TRUE
      LIMIT 1
    `;
    const value = rows[0] ? { tenantId: rows[0].id as string, slug: rows[0].slug as string } : null;
    this.put(key, value);
    return value;
  }

  /** Resolve `<slug>.shopsuitedirect.com` to its store. */
  async resolveSubdomain(slug: string): Promise<ResolvedStore | null> {
    const key = `s:${slug}`;
    const hit = this.get(key);
    if (hit) return hit.value;

    const rows = await db`
      SELECT id, slug FROM tenants WHERE slug = ${slug} AND is_active = TRUE LIMIT 1
    `;
    const value = rows[0] ? { tenantId: rows[0].id as string, slug: rows[0].slug as string } : null;
    this.put(key, value);
    return value;
  }

  set(domain: string, tenantId: string, slug: string) {
    this.put(`d:${domain}`, { tenantId, slug });
  }

  invalidate(domain: string | null | undefined) {
    if (domain) this.map.delete(`d:${domain}`);
  }

  invalidateSlug(slug: string | null | undefined) {
    if (slug) this.map.delete(`s:${slug}`);
  }
}

export const domainCache = new DomainCache();
