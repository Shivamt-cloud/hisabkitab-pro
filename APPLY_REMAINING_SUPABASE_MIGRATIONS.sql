-- =====================================================
-- APPLY REMAINING MIGRATIONS (run after RUN_ALL + APPLY_MISSING)
-- Run this in Supabase SQL Editor after:
--   1. RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT.sql
--   2. APPLY_MISSING_SUPABASE_COLUMNS_AND_TABLES.sql
-- Safe to re-run (ADD COLUMN IF NOT EXISTS / DROP CONSTRAINT IF EXISTS).
-- =====================================================

-- 1. SERVICES: discount and parts total (ServiceForm, list/reports)
ALTER TABLE services ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS parts_total DECIMAL(15, 2) DEFAULT 0;

-- 2. SERVICES: allow 'booked' status (appointment booking)
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE services ADD CONSTRAINT services_status_check CHECK (status IN (
  'booked',
  'draft', 'pickup_verification', 'verification_completed',
  'service_started', 'service_ended', 'completed', 'cancelled'
));

-- 3. SALES: link to service (parts sold during service)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS service_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_sales_service_id ON sales(service_id) WHERE service_id IS NOT NULL;

-- 4. CUSTOMERS: ID proof (rentals, customer form)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_id_type ON customers(id_type) WHERE id_type IS NOT NULL;
