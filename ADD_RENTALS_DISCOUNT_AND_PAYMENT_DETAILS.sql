-- =====================================================
-- Add discount, payment_methods (JSONB), internal_remarks to rentals
-- Run in Supabase SQL Editor if rentals table already exists.
-- =====================================================

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('percentage', 'fixed'));

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(15, 2);

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2);

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS payment_methods JSONB;

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS internal_remarks TEXT;

COMMENT ON COLUMN rentals.discount_type IS 'Additional discount: percentage or fixed';
COMMENT ON COLUMN rentals.discount_value IS 'Discount value (% or ₹)';
COMMENT ON COLUMN rentals.discount_amount IS 'Computed discount amount in ₹';
COMMENT ON COLUMN rentals.payment_methods IS 'Array of { method, amount } like sales';
COMMENT ON COLUMN rentals.internal_remarks IS 'Internal notes, not shown on customer receipt';
