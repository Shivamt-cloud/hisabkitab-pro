-- =====================================================
-- Ensure sales table has sales_person_id and sales_person_name
-- Run in Supabase SQL Editor if receipts show "—" for Sales Person.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- =====================================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS sales_person_id BIGINT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sales_person_name TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_sales_person_id ON sales(sales_person_id) WHERE sales_person_id IS NOT NULL;
