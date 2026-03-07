-- Add sales targets to companies table (for Dashboard Sales Target feature)
-- Enables Supabase sync so targets persist across devices
-- Run in Supabase SQL Editor after companies table exists. Safe to re-run.

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS sales_target_daily NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS sales_target_monthly NUMERIC(15, 2);

COMMENT ON COLUMN companies.sales_target_daily IS 'Daily sales goal (Dashboard Sales Target)';
COMMENT ON COLUMN companies.sales_target_monthly IS 'Monthly sales goal (Dashboard Sales Target)';
