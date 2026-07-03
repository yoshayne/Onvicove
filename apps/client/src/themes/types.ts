// Shared types for theme/storefront components.
// Storefront components are pure presentational components driven by props
// (no API calls here — data is passed down from parent/dashboard/wizard).

export type ThemeId = 'editorial' | 'minimal' | 'bold' | 'warm' | 'classic' | 'bright' | 'obsidian' | 'aurora' | 'magazine' | 'brutalist' | 'neon-tokyo' | 'craft';
export type StoreMode = 'store' | 'book' | 'both';

export interface ThemeData {
  companyName: string;
  tagline?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  brandColor?: string;
  mode: StoreMode;
  currency?: string;
  city?: string;
  industry?: string;
  themeId?: ThemeId;
  slug?: string;
  paymentsEnabled?: boolean;
  stripeAccountId?: string;
  heroImageOpacity?: number; // 0–100; undefined = use theme default
  // Content tab — editable via Page Builder
  aboutText?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactHours?: string;
}

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ProductVariantData {
  id: string;
  name: string;
  option_type: 'size' | 'color' | 'custom';
  option_name: string | null;
  color_hex: string | null;
  price_cents: number | null;
  stock_quantity: number | null;
}

export interface ProductData {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  compareAtPriceCents?: number;
  imageUrls?: string[];
  category?: string;
  isFeatured?: boolean;
  stockQuantity?: number;
  requiresShipping?: boolean;
  variants?: ProductVariantData[];
}

export interface ServiceData {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  durationMinutes: number;
  imageUrls?: string[];
  category?: string;
  isFeatured?: boolean;
  requiresDeposit?: boolean;
  depositCents?: number;
}

export interface StaffData {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  serviceIds?: string[];
}

export interface CartItem {
  cartKey: string;       // `${productId}:${variantId || ''}`
  productId: string;
  variantId?: string;
  variantName?: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl?: string;
  requiresShipping?: boolean;
}

export interface AvailableSlot {
  time: string; // e.g. "09:00 AM"
  available: boolean;
}

export interface ThemeProps {
  theme: ThemeData;
  products: ProductData[];
  services: ServiceData[];
  staff: StaffData[];
  /**
   * Ordered list of enabled section IDs from the Page Builder.
   * Non-gallery sections use their type as ID (e.g. 'hero', 'featured-products').
   * Gallery sections use their unique section ID (e.g. 'gallery-default', uuid).
   * When absent, themes render their default section order.
   */
  visibleSections?: string[];
  /** Enabled gallery sections, in order, for inline rendering inside the theme. */
  galleries?: import('./shared/Gallery').GallerySectionData[];
  onAddToCart?: (product: ProductData) => void;
  onBookService?: (service: ServiceData) => void;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    bg: string;
    surface: string;
    text: string;
    accent: string;
    nav: string;
    hero: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
