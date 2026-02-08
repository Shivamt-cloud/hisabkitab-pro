-- =====================================================
-- Update Customers table: ID proof columns (for rent/booking and customer form)
-- Run this in Supabase SQL Editor. Safe to run multiple times (IF NOT EXISTS).
-- =====================================================
-- The customers table already has "id" as BIGSERIAL PRIMARY KEY.
-- This adds optional id_type and id_number for Aadhaar, PAN, etc.

-- Add ID proof columns if they don't exist
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS id_type TEXT;

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Optional: index for filtering by id_type (e.g. "aadhaar")
CREATE INDEX IF NOT EXISTS idx_customers_id_type 
ON customers(id_type) 
WHERE id_type IS NOT NULL;

COMMENT ON COLUMN customers.id_type IS 'Type of ID proof (aadhaar, pan, passport, voter_id, driving_license, other)';
COMMENT ON COLUMN customers.id_number IS 'ID number or details for the selected id_type';
