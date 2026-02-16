-- =====================================================
-- APPLY MISSING COLUMNS AND TABLES (run after RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT.sql)
-- Safe to re-run (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS).
-- Covers: companies subscription, registration_requests flags/tier,
--         customers price_segment_id, price_segments, product_segment_prices,
--         companies premium_plus tier.
-- =====================================================

-- 1. COMPANIES: profile + subscription columns (if not already from ADD_PLAN_TO_REGISTRATION_AND_COMPANY.sql)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS created_by INTEGER;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled'));

UPDATE companies SET subscription_tier = 'basic', max_users = 3, subscription_status = 'active' WHERE subscription_tier IS NULL;

-- Allow premium_plus and premium_plus_plus in companies.subscription_tier
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_tier_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_tier_check
  CHECK (subscription_tier IN ('basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus'));

CREATE INDEX IF NOT EXISTS idx_companies_subscription_tier ON companies(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);

-- 2. REGISTRATION_REQUESTS: subscription_tier, is_free_trial, flags
ALTER TABLE registration_requests
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS communication_initiated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_activated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_rejected BOOLEAN DEFAULT false;

UPDATE registration_requests SET subscription_tier = 'basic' WHERE subscription_tier IS NULL;

CREATE INDEX IF NOT EXISTS idx_registration_requests_subscription_tier ON registration_requests(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_registration_requests_completion ON registration_requests(communication_initiated, agreement_done, payment_done);
CREATE INDEX IF NOT EXISTS idx_registration_requests_registration_done ON registration_requests(registration_done);
CREATE INDEX IF NOT EXISTS idx_registration_requests_company_activated ON registration_requests(company_activated);
CREATE INDEX IF NOT EXISTS idx_registration_requests_company_rejected ON registration_requests(company_rejected);

-- 3. CUSTOMERS: price_segment_id (for price lists)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_segment_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_customers_price_segment_id ON customers(price_segment_id) WHERE price_segment_id IS NOT NULL;

-- 4. PRICE_SEGMENTS table
CREATE TABLE IF NOT EXISTS price_segments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_segments_company_id ON price_segments(company_id);
CREATE INDEX IF NOT EXISTS idx_price_segments_is_default ON price_segments(is_default);

-- 5. PRODUCT_SEGMENT_PRICES table
CREATE TABLE IF NOT EXISTS product_segment_prices (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  segment_id BIGINT NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  article TEXT,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_segment_prices_product_id ON product_segment_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_segment_prices_segment_id ON product_segment_prices(segment_id);
CREATE INDEX IF NOT EXISTS idx_product_segment_prices_company_id ON product_segment_prices(company_id);
