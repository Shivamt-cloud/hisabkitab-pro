-- =====================================================
-- Add Parts sale total to services (for list/reports)
-- Run in Supabase SQL Editor. Safe to re-run.
-- =====================================================

ALTER TABLE services ADD COLUMN IF NOT EXISTS parts_total DECIMAL(15, 2) DEFAULT 0;

-- Optional: index only if you filter/sort by parts_total
-- CREATE INDEX IF NOT EXISTS idx_services_parts_total ON services(parts_total) WHERE parts_total > 0;
