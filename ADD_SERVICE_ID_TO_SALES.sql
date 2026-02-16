-- =====================================================
-- Link sales to services (parts sold during service)
-- Run in Supabase SQL Editor. Safe to re-run.
-- =====================================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS service_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_sales_service_id ON sales(service_id) WHERE service_id IS NOT NULL;

-- Optional: add comment for clarity
-- COMMENT ON COLUMN sales.service_id IS 'When set, this sale is for parts/products sold during this service';
