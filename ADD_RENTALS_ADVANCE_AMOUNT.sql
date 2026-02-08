-- =====================================================
-- Add advance_amount to rentals (amount paid at booking; balance due at pickup)
-- Run in Supabase SQL Editor if rentals table already exists.
-- =====================================================

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(15, 2);

COMMENT ON COLUMN rentals.advance_amount IS 'Amount paid at booking (advance). Balance = (rent + security) - advance, to be paid at pickup';
