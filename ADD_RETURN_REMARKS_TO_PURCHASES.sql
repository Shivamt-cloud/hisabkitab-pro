-- Add return_remarks column to purchases table
-- This column stores remarks/details for purchase returns to suppliers

-- Add the column if it doesn't exist
ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS return_remarks TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN purchases.return_remarks IS 'Remarks/details for purchase returns to supplier (when items are returned)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchases' AND column_name = 'return_remarks';
