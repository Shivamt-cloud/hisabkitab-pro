-- =====================================================
-- Add payment columns to rentals (customer payment for rent)
-- Run in Supabase SQL Editor if rentals table already exists.
-- =====================================================

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS payment_status TEXT 
CHECK (payment_status IS NULL OR payment_status IN ('paid', 'partial', 'pending'));

COMMENT ON COLUMN rentals.payment_method IS 'How customer paid: cash, upi, card, other';
COMMENT ON COLUMN rentals.payment_status IS 'Rent payment: paid, partial, pending';
