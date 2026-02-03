-- ============================================
-- Update Company Subscription Plan & Max Users
-- ============================================
-- In HisabKitab-Pro, subscription is stored on the COMPANY (not the user).
-- Plan limits in app: Basic = 3 users, Standard = 10 users, Premium = unlimited.
-- Use these queries in Supabase SQL Editor (or your PostgreSQL client).
-- ============================================

-- ============================================
-- 1. Update by company ID (subscription plan + max users)
-- ============================================

-- Set to Basic Plan, max 3 users
UPDATE companies
SET 
    subscription_tier = 'basic',
    max_users = 3,
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;  -- Replace 1 with your company ID

-- Set to Standard Plan, max 10 users
UPDATE companies
SET 
    subscription_tier = 'standard',
    max_users = 10,
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;

-- Set to Premium Plan, unlimited users (NULL = unlimited)
UPDATE companies
SET 
    subscription_tier = 'premium',
    max_users = NULL,
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;


-- ============================================
-- 2. Update by company unique_code
-- ============================================

UPDATE companies
SET 
    subscription_tier = 'standard',  -- 'basic' | 'standard' | 'premium'
    max_users = 10,                   -- 3 for basic, 10 for standard, NULL for premium
    subscription_status = 'active',
    updated_at = NOW()
WHERE unique_code = 'COMP001';  -- Replace with your company unique code


-- ============================================
-- 3. Update subscription plan + max users + dates (full example)
-- ============================================

UPDATE companies
SET 
    subscription_tier = 'standard',
    max_users = 10,
    subscription_start_date = '2026-01-01',
    subscription_end_date = '2027-01-01',
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;


-- ============================================
-- 4. Update only max_users (keep same plan)
-- ============================================

UPDATE companies
SET 
    max_users = 15,
    updated_at = NOW()
WHERE id = 1;


-- ============================================
-- 5. Update only subscription_tier (max_users can be set per plan below)
-- ============================================

UPDATE companies
SET 
    subscription_tier = 'premium',
    max_users = NULL,  -- Premium = unlimited
    updated_at = NOW()
WHERE id = 1;


-- ============================================
-- 6. Recommended values per plan (match app logic)
-- ============================================
-- Basic:    max_users = 3
-- Standard: max_users = 10
-- Premium:  max_users = NULL (unlimited)


-- ============================================
-- 7. Check current subscription before/after update
-- ============================================

SELECT 
    id,
    name,
    unique_code,
    subscription_tier,
    max_users,
    subscription_start_date,
    subscription_end_date,
    subscription_status,
    updated_at
FROM companies
WHERE id = 1;  -- Replace with your company ID
