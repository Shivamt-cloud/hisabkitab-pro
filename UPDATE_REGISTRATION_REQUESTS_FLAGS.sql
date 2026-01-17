-- Update Registration Requests Table - Add New Flags
-- Run this SQL in Supabase SQL Editor to update flags

-- Step 1: Add new flag columns
ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS registration_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS company_activated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS company_rejected BOOLEAN DEFAULT false;

-- Step 2: Update existing records - calculate flags based on status
UPDATE registration_requests 
SET 
  communication_initiated = CASE 
    WHEN status IN ('query_initiated', 'query_completed', 'registration_accepted', 'agreement_pending', 'agreement_accepted', 'payment_pending', 'payment_completed', 'activation_completed', 'activation_rejected') THEN true
    ELSE false
  END,
  registration_done = CASE
    WHEN status IN ('registration_accepted', 'agreement_pending', 'agreement_accepted', 'payment_pending', 'payment_completed', 'activation_completed') THEN true
    ELSE false
  END,
  agreement_done = CASE
    WHEN status IN ('agreement_accepted', 'payment_pending', 'payment_completed', 'activation_completed') THEN true
    ELSE false
  END,
  payment_done = CASE
    WHEN status IN ('payment_completed', 'activation_completed') THEN true
    ELSE false
  END,
  company_activated = CASE
    WHEN status = 'activation_completed' THEN true
    ELSE false
  END,
  company_rejected = CASE
    WHEN status = 'activation_rejected' THEN true
    ELSE false
  END;

-- Step 3: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_registration_requests_registration_done ON registration_requests(registration_done);
CREATE INDEX IF NOT EXISTS idx_registration_requests_company_activated ON registration_requests(company_activated);
CREATE INDEX IF NOT EXISTS idx_registration_requests_company_rejected ON registration_requests(company_rejected);

-- Verification: Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'registration_requests'
-- ORDER BY ordinal_position;
