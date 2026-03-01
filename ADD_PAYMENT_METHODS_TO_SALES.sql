-- =====================================================
-- ADD payment_methods TO sales (if missing)
-- Run in Supabase SQL Editor if your sales table was created
-- before payment_methods was in the schema.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- =====================================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_methods JSONB;

COMMENT ON COLUMN sales.payment_methods IS 'Array of { method, amount } for split payments (e.g. [{method: "cash", amount: 100}, {method: "upi", amount: 120}])';
