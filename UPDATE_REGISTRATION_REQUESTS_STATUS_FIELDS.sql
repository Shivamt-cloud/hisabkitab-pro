-- Update Registration Requests Table - Add Status Tracking Fields
-- Run this SQL in Supabase SQL Editor after the registration_requests table is created

-- Step 1: Add status tracking flags (communication_initiated, agreement_done, payment_done)
ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS communication_initiated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agreement_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_done BOOLEAN DEFAULT false;

-- Step 2: Drop existing status constraint if it exists
ALTER TABLE registration_requests 
DROP CONSTRAINT IF EXISTS registration_requests_status_check;

-- Step 3: Add new status constraint with professional status values
ALTER TABLE registration_requests
ADD CONSTRAINT registration_requests_status_check 
CHECK (status IN ('pending', 'under_review', 'registration_accepted', 'agreement_pending', 'payment_pending', 'completed', 'rejected'));

-- Step 4: Update default status (if column doesn't have default)
ALTER TABLE registration_requests 
ALTER COLUMN status SET DEFAULT 'pending';

-- Step 5: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_registration_requests_status_flags ON registration_requests(communication_initiated, agreement_done, payment_done);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status_new ON registration_requests(status);

-- Step 6: Update any existing records with 'approved' status to 'completed'
UPDATE registration_requests 
SET status = 'completed' 
WHERE status = 'approved';

-- Verification: Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'registration_requests'
-- ORDER BY ordinal_position;
