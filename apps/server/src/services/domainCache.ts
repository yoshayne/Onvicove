import { db } from '../db/client';

interface CacheEntry {
  tenantId: string | null; // null = verified miss (domain not in DB)
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

class DomainCache {
  private map = new Map<string, CacheEntry>();

  async resolve(domain: string): Promise<string | null> {
    const now = Date.now();
    const entry = this.map.get(domain);

    if (entry && entry.expiresAt > now) {
      return entry.tenantId;
    }

    // Cache miss — hit the DB
    const rows = await db`
      SELECT id FROM tenants
      WHERE custom_domain = ${domain}
        AND custom_domain_verified = TRUE
        AND is_active = TRUE
      LIMIT 1
    `;

    const tenantId = rows[0]?.id as string | undefined ?? null;
    this.map.set(domain, { tenantId, expiresAt: now + TTL_MS });
    return tenantId;
  }

  set(domain: string, tenantId: string) {
    this.map.set(domain, { tenantId, expiresAt: Date.now() + TTL_MS });
  }

  invalidate(domain: string) {
    this.map.delete(domain);
  }
}

export const domainCache = new DomainCache();
