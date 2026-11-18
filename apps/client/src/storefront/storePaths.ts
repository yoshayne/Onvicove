/** Set by the server when the request came in on a store's own domain (or <slug>.shopsuitedirect.com) */
const hostStoreSlug = (window as unknown as { __STORE_SLUG__?: string }).__STORE_SLUG__;

/** Where a store's own refund policy page lives: at the root on its own domain, otherwise under its address */
export const storeRefundPath = (slug?: string) => (hostStoreSlug ? '/refund-policy' : `/${slug ?? ''}/refund-policy`);
export const storeHomePath = (slug?: string) => (hostStoreSlug ? '/' : `/${slug ?? ''}`);
