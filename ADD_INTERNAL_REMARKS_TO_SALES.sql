-- Add internal_remarks column to sales table
-- This column stores internal remarks that are NOT shown to customers
-- Only visible in reports and internal views

-- Add the column if it doesn't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS internal_remarks TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN sales.internal_remarks IS 'Internal remarks for sales (not shown to customers, only visible in reports)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'internal_remarks';
