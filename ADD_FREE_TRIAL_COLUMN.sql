-- Add is_free_trial column to registration_requests table
-- This column tracks if user registered via "1 Month Free Trial" button

ALTER TABLE registration_requests
ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN DEFAULT false;

-- Add comment to column for documentation
COMMENT ON COLUMN registration_requests.is_free_trial IS 'Indicates if user registered via 1 Month Free Trial button';

-- Update existing records (optional - set to false for existing records)
-- UPDATE registration_requests SET is_free_trial = false WHERE is_free_trial IS NULL;
