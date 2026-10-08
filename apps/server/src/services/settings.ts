import { db } from '../db/client';
import { CHARGE_MODEL, type ChargeModel } from './chargeModel';

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
  /** Platform fee, in the units of `fee_model`: on top of Stripe's fee (direct) or including it (destination). */
  platform_fee_percent: number;
  platform_fee_fixed_cents: number;
  /** Which charge model the fee numbers above were set for. Fees saved under a different model are ignored. */
  fee_model?: ChargeModel;
}

// Direct charges: the store pays Stripe's 2.9% + 30c itself, so our fee is just our cut (2%; Business 1%).
// Destination charges (rollback): our fee has to cover Stripe's, hence 4.9% + 30c (Business 3.9%).
const DIRECT = CHARGE_MODEL === 'direct';
const DEFAULT_FEE_PERCENT = DIRECT
  ? parseFloat(process.env.PLATFORM_APP_FEE_PERCENT || '0.02')
  : parseFloat(process.env.PLATFORM_FEE_PERCENT || '0.049');
const DEFAULT_FEE_FIXED_CENTS = DIRECT
  ? parseInt(process.env.PLATFORM_APP_FEE_FIXED_CENTS || '0')
  : parseInt(process.env.PLATFORM_FEE_FIXED_CENTS || '30');
const BUSINESS_FEE_PERCENT = DIRECT ? 0.01 : 0.039;

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  plans: {
    starter: { name: 'Starter', price_cents: 0, product_limit: 5, service_limit: 10, ai_credits: 0, platform_fee_percent: null, platform_fee_fixed_cents: null },
    pro: { name: 'Pro', price_cents: 2900, product_limit: null, service_limit: null, ai_credits: 10, platform_fee_percent: null, platform_fee_fixed_cents: null },
    business: { name: 'Business', price_cents: 7900, product_limit: null, service_limit: null, ai_credits: 50, platform_fee_percent: BUSINESS_FEE_PERCENT, platform_fee_fixed_cents: null },
  },
  ai_photo_cost_cents: parseInt(process.env.AI_PHOTO_COST_CENTS || '299'),
  platform_fee_percent: DEFAULT_FEE_PERCENT,
  platform_fee_fixed_cents: DEFAULT_FEE_FIXED_CENTS,
  fee_model: CHARGE_MODEL,
};

const SETTINGS_KEY = 'platform';
const CACHE_TTL_MS = 30_000;

let cache: { value: PlatformSettings; expires: number } | null = null;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cache && cache.expires > Date.now()) return cache.value;

  const rows = await db`SELECT value FROM platform_settings WHERE key = ${SETTINGS_KEY} LIMIT 1`;
  const stored = rows[0]?.value as Partial<PlatformSettings> | undefined;

  // Fee numbers saved for the OTHER charge model (e.g. the old 4.9% + 30c) would be wildly wrong now, so they're ignored.
  // Settings saved before charge models existed have no fee_model and were always the old (destination) kind.
  const feesApply = (stored?.fee_model ?? 'destination') === CHARGE_MODEL;
  const plan = (id: PlanId): PlanConfig => {
    const merged = { ...DEFAULT_PLATFORM_SETTINGS.plans[id], ...stored?.plans?.[id] };
    if (!feesApply) {
      merged.platform_fee_percent = DEFAULT_PLATFORM_SETTINGS.plans[id].platform_fee_percent;
      merged.platform_fee_fixed_cents = DEFAULT_PLATFORM_SETTINGS.plans[id].platform_fee_fixed_cents;
    }
    return merged;
  };

  const value: PlatformSettings = {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...stored,
    ...(feesApply ? {} : {
      platform_fee_percent: DEFAULT_PLATFORM_SETTINGS.platform_fee_percent,
      platform_fee_fixed_cents: DEFAULT_PLATFORM_SETTINGS.platform_fee_fixed_cents,
    }),
    fee_model: CHARGE_MODEL,
    plans: { starter: plan('starter'), pro: plan('pro'), business: plan('business') },
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

export async function savePlatformSettings(input: PlatformSettings): Promise<void> {
  const value: PlatformSettings = { ...input, fee_model: CHARGE_MODEL };
  await db`
    INSERT INTO platform_settings (key, value, updated_at)
    VALUES (${SETTINGS_KEY}, ${db.json(value as unknown as never)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${db.json(value as unknown as never)}, updated_at = NOW()
  `;
  cache = { value, expires: Date.now() + CACHE_TTL_MS };
}
