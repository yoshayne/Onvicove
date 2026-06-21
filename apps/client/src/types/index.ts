// Shared TypeScript types matching apps/server/src/db/schema.sql

export type TenantMode = 'store' | 'book' | 'both';
export type ThemeId = 'editorial' | 'minimal' | 'bold' | 'warm' | 'classic' | 'bright' | 'obsidian' | 'aurora' | 'magazine' | 'brutalist' | 'neon-tokyo' | 'craft';
export type PlanId = 'starter' | 'pro' | 'business';
export type BookingMode = 'instant' | 'manual';

export interface Tenant {
  id: string;
  clerk_user_id: string;
  slug: string;
  company_name: string;
  tagline: string | null;
  logo_key: string | null;
  logo_url?: string;
  hero_image_key: string | null;
  hero_image_url?: string;
  favicon_key: string | null;
  mode: TenantMode;
  theme_id: ThemeId;
  brand_color: string | null;
  city: string | null;
  industry: string | null;
  timezone: string;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  plan: PlanId;
  plan_expires_at: string | null;
  booking_mode: BookingMode;
  show_live_calendar: boolean;
  currency: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_verify_token: string | null;
  custom_domain_cname_target: string | null;
  wizard_completed: boolean;
  wizard_step: number;
  wizard_data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductType = 'physical' | 'digital' | 'subscription';
export type SubscriptionInterval = 'monthly' | 'yearly' | null;

export interface ProductVariant {
  id: string;
  product_id: string;
  tenant_id: string;
  name: string;
  option_type: 'size' | 'color' | 'custom';
  option_name: string | null;
  color_hex: string | null;
  price_cents: number | null;
  stock_quantity: number | null;
  sku: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  tenant_id: string;
  type: ProductType;
  name: string;
  description: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  sku: string | null;
  stock_quantity: number | null;
  track_inventory: boolean;
  image_keys: string[];
  image_urls?: string[];
  category: string | null;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  digital_file_key: string | null;
  subscription_interval: SubscriptionInterval;
  weight_grams: number | null;
  requires_shipping: boolean;
  sort_order: number;
  variants?: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  buffer_minutes: number;
  max_bookings_per_slot: number;
  image_keys: string[];
  image_urls?: string[];
  category: string | null;
  is_active: boolean;
  is_featured: boolean;
  requires_deposit: boolean;
  deposit_cents: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
}

export type WeeklyAvailability = Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  AvailabilitySlot[]
>;

export interface Staff {
  id: string;
  tenant_id: string;
  clerk_user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_key: string | null;
  avatar_url?: string;
  availability: WeeklyAvailability;
  is_active: boolean;
  created_at: string;
  service_ids?: string[];
}

export interface Customer {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  total_spent_cents: number;
  order_count: number;
  booking_count: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Booking {
  id: string;
  tenant_id: string;
  service_id: string;
  staff_id: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
  internal_notes: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number | null;
  platform_fee_cents: number | null;
  deposit_paid_cents: number | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  service_name?: string;
  staff_name?: string;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'refunded' | 'cancelled';
export type FulfillmentStatus = 'unfulfilled' | 'fulfilled' | 'partial';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  tenant_id: string;
  name: string;
  quantity: number;
  price_cents: number;
  total_cents: number;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: OrderStatus;
  fulfillment_status: FulfillmentStatus;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  platform_fee_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  notes: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export type DiscountType = 'percentage' | 'fixed';

export interface DiscountCode {
  id: string;
  tenant_id: string;
  code: string;
  type: DiscountType;
  value: number;
  minimum_order_cents: number;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PageSection {
  id: string;
  tenant_id: string;
  page: string;
  sections: PageSectionItem[];
  updated_at: string;
}

export interface PageSectionItem {
  id: string;
  type: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface PlatformTransaction {
  id: string;
  tenant_id: string;
  reference_id: string;
  reference_type: 'order' | 'booking' | 'ai_photo';
  gross_amount_cents: number;
  platform_fee_cents: number;
  stripe_fee_cents: number;
  net_to_tenant_cents: number;
  stripe_transfer_id: string | null;
  created_at: string;
}
