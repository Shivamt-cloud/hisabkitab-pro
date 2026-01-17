-- Update Registration Requests Table Schema
-- Add status tracking fields and update status values

-- Add status tracking flags
ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS communication_initiated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agreement_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_done BOOLEAN DEFAULT false;

-- Update status column to include more professional status values
-- Note: If status column already exists with CHECK constraint, we need to drop and recreate
ALTER TABLE registration_requests 
DROP CONSTRAINT IF EXISTS registration_requests_status_check;

ALTER TABLE registration_requests
ADD CONSTRAINT registration_requests_status_check 
CHECK (status IN ('pending', 'under_review', 'registration_accepted', 'agreement_pending', 'payment_pending', 'completed', 'rejected'));

-- Update default status to 'pending' if not already set
ALTER TABLE registration_requests 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_registration_requests_status_flags ON registration_requests(communication_initiated, agreement_done, payment_done);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
