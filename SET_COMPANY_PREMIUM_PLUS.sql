-- =====================================================
-- Set a company to Premium Plus (so all its users get Premium Plus)
-- Run in Supabase SQL Editor. Replace IDs/codes with your values.
-- =====================================================

-- Step 0 (only if you get "invalid input value for enum" or CHECK constraint error):
-- Allow premium_plus (and premium_plus_plus) in companies.subscription_tier
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_tier_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_tier_check
  CHECK (subscription_tier IN ('basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus'));

-- =====================================================
-- Option A: Update by company ID
-- =====================================================
UPDATE companies
SET
  subscription_tier = 'premium_plus',
  max_users = NULL,
  subscription_status = 'active',
  updated_at = NOW()
WHERE id = 1;   -- replace 1 with your company id

-- =====================================================
-- Option B: Update by company unique_code
-- =====================================================
UPDATE companies
SET
  subscription_tier = 'premium_plus',
  max_users = NULL,
  subscription_status = 'active',
  updated_at = NOW()
WHERE unique_code = 'YOUR_UNIQUE_CODE';   -- replace with your company unique_code

-- =====================================================
-- Option C: Update the company of a specific user (by user email)
-- =====================================================
UPDATE companies c
SET
  subscription_tier = 'premium_plus',
  max_users = NULL,
  subscription_status = 'active',
  updated_at = NOW()
FROM users u
WHERE u.company_id = c.id
  AND u.email = 'user@example.com';   -- replace with the user's email

-- =====================================================
-- Verify (run after update)
-- =====================================================
SELECT id, name, unique_code, subscription_tier, max_users, subscription_status, updated_at
FROM companies
WHERE id = 1;   -- or WHERE unique_code = 'YOUR_UNIQUE_CODE'
