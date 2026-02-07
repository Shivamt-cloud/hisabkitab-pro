-- =====================================================
-- Add Price Segment Support to Supabase
-- Run this in Supabase SQL Editor if you use cloud sync
-- =====================================================

-- 1. Add price_segment_id to customers (for customer->segment association)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS price_segment_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_customers_price_segment_id 
ON customers(price_segment_id) 
WHERE price_segment_id IS NOT NULL;

COMMENT ON COLUMN customers.price_segment_id IS 'Price list segment (Retail, Wholesale, VIP, etc.)';

-- 2. Create price_segments table (optional - for future cloud sync of segments)
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

-- 3. Create product_segment_prices table (optional - for future cloud sync of segment prices)
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
