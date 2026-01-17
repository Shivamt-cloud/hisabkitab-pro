-- Fix Registration Requests Status Constraint
-- This script updates the status constraint to include all new status values
-- Run this SQL in Supabase SQL Editor

-- Step 1: Drop existing status constraint if it exists
ALTER TABLE registration_requests 
DROP CONSTRAINT IF EXISTS registration_requests_status_check;

-- Step 2: Add new status constraint with ALL status values
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

-- Step 3: Verify the constraint was created
-- You can run this query to verify:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'registration_requests'::regclass 
-- AND conname = 'registration_requests_status_check';

-- Step 4: Test by trying to update a record (optional)
-- UPDATE registration_requests 
-- SET status = 'agreement_accepted' 
-- WHERE id = <some_id>;
-- This should work without errors if the constraint is correct
