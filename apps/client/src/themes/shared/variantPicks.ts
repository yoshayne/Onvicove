import type { ProductVariantData } from '../types';

/**
 * A product whose customer picks several values of its custom option (e.g. 2 lash styles) goes into the cart as
 * one line whose "variant" is a combination. Its id lists the chosen values so the order can send them to the server.
 */
export const MULTI_PREFIX = 'multi:';

export function multiVariant(picks: ProductVariantData[]): ProductVariantData {
  return {
    id: `${MULTI_PREFIX}${picks.map((p) => p.id).join(',')}`,
    name: picks.map((p) => p.name).join(' + '),
    option_type: 'custom',
    option_name: picks[0]?.option_name ?? null,
    color_hex: null,
    price_cents: null,
    stock_quantity: null,
  };
}

/** The chosen values' ids when this cart variant is a combination, otherwise null */
export function multiVariantIds(variantId?: string | null): string[] | null {
  return variantId?.startsWith(MULTI_PREFIX) ? variantId.slice(MULTI_PREFIX.length).split(',').filter(Boolean) : null;
}
