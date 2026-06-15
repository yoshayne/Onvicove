CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  tagline TEXT,
  logo_key TEXT,
  hero_image_key TEXT,
  favicon_key TEXT,
  mode TEXT NOT NULL DEFAULT 'both'
    CHECK (mode IN ('store','book','both')),
  theme_id TEXT NOT NULL DEFAULT 'editorial'
    CHECK (theme_id IN ('editorial','minimal','bold','warm','classic','bright')),
  brand_color TEXT DEFAULT '#3D4F7C',
  city TEXT,
  industry TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  stripe_account_id TEXT,
  stripe_onboarded BOOLEAN DEFAULT FALSE,
  plan TEXT DEFAULT 'starter'
    CHECK (plan IN ('starter','pro','business')),
  plan_expires_at TIMESTAMPTZ,
  booking_mode TEXT DEFAULT 'instant'
    CHECK (booking_mode IN ('instant','manual')),
  show_live_calendar BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'USD',
  custom_domain TEXT,
  custom_domain_verified BOOLEAN DEFAULT FALSE,
  wizard_completed BOOLEAN DEFAULT FALSE,
  wizard_step INTEGER DEFAULT 0,
  wizard_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'physical'
    CHECK (type IN ('physical','digital','subscription')),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  compare_at_price_cents INTEGER,
  sku TEXT,
  stock_quantity INTEGER,
  track_inventory BOOLEAN DEFAULT FALSE,
  image_keys JSONB DEFAULT '[]',
  category TEXT,
  tags JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  digital_file_key TEXT,
  subscription_interval TEXT
    CHECK (subscription_interval IN ('monthly','yearly',NULL)),
  weight_grams INTEGER,
  requires_shipping BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER,
  stock_quantity INTEGER,
  sku TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  buffer_minutes INTEGER DEFAULT 0,
  max_bookings_per_slot INTEGER DEFAULT 1,
  image_keys JSONB DEFAULT '[]',
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  requires_deposit BOOLEAN DEFAULT FALSE,
  deposit_cents INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_user_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  bio TEXT,
  avatar_key TEXT,
  availability JSONB DEFAULT '{
    "mon": [{"start": "09:00", "end": "17:00"}],
    "tue": [{"start": "09:00", "end": "17:00"}],
    "wed": [{"start": "09:00", "end": "17:00"}],
    "thu": [{"start": "09:00", "end": "17:00"}],
    "fri": [{"start": "09:00", "end": "17:00"}],
    "sat": [],
    "sun": []
  }',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_services (
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  total_spent_cents INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  staff_id UUID REFERENCES staff(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  notes TEXT,
  internal_notes TEXT,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER,
  platform_fee_cents INTEGER,
  deposit_paid_cents INTEGER,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','paid','fulfilled','refunded','cancelled')),
  fulfillment_status TEXT DEFAULT 'unfulfilled'
    CHECK (fulfillment_status IN ('unfulfilled','fulfilled','partial')),
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage','fixed')),
  value INTEGER NOT NULL CHECK (value > 0),
  minimum_order_cents INTEGER DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page TEXT NOT NULL DEFAULT 'home',
  sections JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, page)
);

CREATE TABLE IF NOT EXISTS ai_photo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  original_image_key TEXT NOT NULL,
  cutout_image_key TEXT,
  status TEXT DEFAULT 'previewing'
    CHECK (status IN ('previewing','unlocked','skipped')),
  is_free BOOLEAN DEFAULT FALSE,
  stripe_charge_id TEXT,
  amount_cents INTEGER DEFAULT 299,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_photo_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_photo_sessions(id) ON DELETE CASCADE,
  style TEXT NOT NULL,
  feedback TEXT,
  prompt_used TEXT NOT NULL,
  preview_image_key TEXT,
  full_image_key TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  reference_id UUID NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('order','booking','ai_photo')),
  gross_amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  stripe_fee_cents INTEGER NOT NULL,
  net_to_tenant_cents INTEGER NOT NULL,
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_clerk ON tenants(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id, start_time);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(tenant_id, email);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS card_brand TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS card_last4 TEXT;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
