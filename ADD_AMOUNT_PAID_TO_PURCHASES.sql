-- Add amount_paid to purchases for partial payment tracking (e.g. paid 5000 at goods receiving, 5000 pending).
-- Run this in Supabase SQL Editor if you use cloud sync.

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT NULL;

COMMENT ON COLUMN purchases.amount_paid IS 'Amount already paid (e.g. at goods receiving). Pending = grand_total/total_amount - amount_paid.';
