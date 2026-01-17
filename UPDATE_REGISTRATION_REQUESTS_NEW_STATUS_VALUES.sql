-- Update Registration Requests Table - New Status Values
-- Run this SQL in Supabase SQL Editor to update status values

-- Step 1: Drop existing status constraint
ALTER TABLE registration_requests 
DROP CONSTRAINT IF EXISTS registration_requests_status_check;

-- Step 2: Add new status constraint with updated status values
ALTER TABLE registration_requests
ADD CONSTRAINT registration_requests_status_check 
CHECK (status IN (
  'pending', 
  'under_review', 
  'query_initiated', 
  'query_completed', 
  'registration_accepted', 
  'agreement_pending', 
  'agreement_accepted', 
  'payment_pending', 
  'payment_completed', 
  'activation_completed', 
  'activation_rejected'
));

-- Step 3: Update any existing records to map old statuses to new ones
UPDATE registration_requests 
SET status = 'activation_completed' 
WHERE status = 'completed';

UPDATE registration_requests 
SET status = 'activation_rejected' 
WHERE status = 'rejected';

-- Step 4: Ensure default status
ALTER TABLE registration_requests 
ALTER COLUMN status SET DEFAULT 'pending';

-- Verification: Check updated table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'registration_requests'
-- ORDER BY ordinal_position;
