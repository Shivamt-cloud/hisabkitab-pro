-- Add Subscription Plan Fields to Registration Requests and Companies Tables
-- Run this SQL in Supabase SQL Editor

-- =====================================================
-- 1. ADD SUBSCRIPTION_TIER TO REGISTRATION_REQUESTS
-- =====================================================
ALTER TABLE registration_requests
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'standard', 'premium'));

-- Update existing records to have basic tier
UPDATE registration_requests 
SET subscription_tier = 'basic'
WHERE subscription_tier IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_registration_requests_subscription_tier ON registration_requests(subscription_tier);

-- =====================================================
-- 2. ADD SUBSCRIPTION FIELDS TO COMPANIES TABLE
-- =====================================================
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'standard', 'premium')),
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled'));

-- Update existing companies to have basic tier and max_users
UPDATE companies 
SET 
  subscription_tier = 'basic',
  max_users = 3,
  subscription_status = 'active'
WHERE subscription_tier IS NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_subscription_tier ON companies(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);
