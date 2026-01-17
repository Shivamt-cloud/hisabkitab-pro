-- Add status tracking fields to registration_requests table
-- These fields track the progress of registration requests

ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS communication_initiated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agreement_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_done BOOLEAN DEFAULT false;

-- Create index for filtering by completion status
CREATE INDEX IF NOT EXISTS idx_registration_requests_completion ON registration_requests(communication_initiated, agreement_done, payment_done);
