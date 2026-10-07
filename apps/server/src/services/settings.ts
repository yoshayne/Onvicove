import { db } from '../db/client';

export type PlanId = 'starter' | 'pro' | 'business';

export interface PlanConfig {
  name: string;
  price_cents: number;
  product_limit: number | null;
  service_limit: number | null;
  ai_credits: number;
  /** Platform fee for stores on this plan; null = use the platform-wide fee below. */
  platform_fee_percent: number | null;
  platform_fee_fixed_cents: number | null;
}

export interface PlatformSettings {
  plans: Record<PlanId, PlanConfig>;
  ai_photo_cost_cents: number;
  platform_fee_percent: number;
  platform_fee_fixed_cents: number;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  plans: {
    starter: { name: 'Starter', price_cents: 0, product_limit: 5, service_limit: 10, ai_credits: 0, platform_fee_percent: null, platform_fee_fixed_cents: null },
    pro: { name: 'Pro', price_cents: 2900, product_limit: null, service_limit: null, ai_credits: 10, platform_fee_percent: null, platform_fee_fixed_cents: null },
    business: { name: 'Business', price_cents: 7900, product_limit: null, service_limit: null, ai_credits: 50, platform_fee_percent: 0.039, platform_fee_fixed_cents: null },
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

export type ItemKind = 'product' | 'service';

export async function getPlanLimits(planId: string): Promise<Record<ItemKind, number | null>> {
  const settings = await getPlatformSettings();
  const plan = settings.plans[planId as PlanId] ?? settings.plans.starter;
  return { product: plan.product_limit, service: plan.service_limit };
}

/** The fee a store on `planId` pays: its plan's override, otherwise the platform-wide default. */
export function feeForPlan(settings: PlatformSettings, planId: string): { percent: number; fixedCents: number } {
  const plan = settings.plans[planId as PlanId] ?? settings.plans.starter;
  return {
    percent: plan.platform_fee_percent ?? settings.platform_fee_percent,
    fixedCents: plan.platform_fee_fixed_cents ?? settings.platform_fee_fixed_cents,
  };
}

export async function checkItemLimit(
  tenant: { id: string; plan: string },
  kind: ItemKind,
  adding = 1,
): Promise<{ ok: true } | { ok: false; limit: number }> {
  const limit = (await getPlanLimits(tenant.plan))[kind];
  if (limit == null) return { ok: true };

  const [{ count }] = kind === 'product'
    ? await db`SELECT COUNT(*) AS count FROM products WHERE tenant_id = ${tenant.id}`
    : await db`SELECT COUNT(*) AS count FROM services WHERE tenant_id = ${tenant.id}`;

  if (Number(count) + adding > limit) return { ok: false, limit };
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
