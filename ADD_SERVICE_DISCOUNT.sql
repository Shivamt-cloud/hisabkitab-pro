-- =====================================================
-- Add discount fields to services (optional % and amount)
-- Run in Supabase SQL Editor. Safe to re-run.
-- =====================================================

ALTER TABLE services ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0;
