import { db } from '../db/client';

export type PlanId = 'starter' | 'pro' | 'business';

export interface PlanConfig {
  name: string;
  price_cents: number;
  item_limit: number | null;
  ai_credits: number;
}

export interface PlatformSettings {
  plans: Record<PlanId, PlanConfig>;
  ai_photo_cost_cents: number;
  platform_fee_percent: number;
  platform_fee_fixed_cents: number;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  plans: {
    starter: { name: 'Starter', price_cents: 0, item_limit: 25, ai_credits: 0 },
    pro: { name: 'Pro', price_cents: 2900, item_limit: null, ai_credits: 10 },
    business: { name: 'Business', price_cents: 7900, item_limit: null, ai_credits: 50 },
  },
  ai_photo_cost_cents: parseInt(process.env.AI_PHOTO_COST_CENTS || '299'),
  platform_fee_percent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '0.049'),
  platform_fee_fixed_cents: parseInt(process.env.PLATFORM_FEE_FIXED_CENTS || '30'),
};

const SETTINGS_KEY = 'platform';
const CACHE_TTL_MS = 30_000;

let cache: { value: PlatformSettings; expires: number } | null = null;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cache && cache.expires > Date.now()) return cache.value;

  const rows = await db`SELECT value FROM platform_settings WHERE key = ${SETTINGS_KEY} LIMIT 1`;
  const stored = rows[0]?.value as Partial<PlatformSettings> | undefined;

  const value: PlatformSettings = {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...stored,
    plans: {
      starter: { ...DEFAULT_PLATFORM_SETTINGS.plans.starter, ...stored?.plans?.starter },
      pro: { ...DEFAULT_PLATFORM_SETTINGS.plans.pro, ...stored?.plans?.pro },
      business: { ...DEFAULT_PLATFORM_SETTINGS.plans.business, ...stored?.plans?.business },
    },
  };

  cache = { value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function checkItemLimit(tenant: { id: string; plan: string }): Promise<{ ok: true } | { ok: false; limit: number }> {
  const settings = await getPlatformSettings();
  const plan = settings.plans[tenant.plan as PlanId] ?? settings.plans.starter;
  if (plan.item_limit == null) return { ok: true };

  const [{ count }] = await db`
    SELECT
      (SELECT COUNT(*) FROM products WHERE tenant_id = ${tenant.id}) +
      (SELECT COUNT(*) FROM services WHERE tenant_id = ${tenant.id}) AS count
  `;

  if (Number(count) >= plan.item_limit) return { ok: false, limit: plan.item_limit };
  return { ok: true };
}

export async function savePlatformSettings(value: PlatformSettings): Promise<void> {
  await db`
    INSERT INTO platform_settings (key, value, updated_at)
    VALUES (${SETTINGS_KEY}, ${db.json(value as unknown as never)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${db.json(value as unknown as never)}, updated_at = NOW()
  `;
  cache = { value, expires: Date.now() + CACHE_TTL_MS };
}
