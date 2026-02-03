-- Add due_date column to purchases table (for Purchase reminders: Overdue / Due for payment)
-- Run this migration if your purchases table was created before due_date was added.

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS due_date DATE;

COMMENT ON COLUMN purchases.due_date IS 'When bill payment is due (for reminders: Overdue / Due for payment)';
