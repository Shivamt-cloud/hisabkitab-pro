-- SQL Queries to Update User Subscription Plan
-- The subscription plan is stored in the companies table

-- ============================================
-- 1. Update subscription tier for a company by ID
-- ============================================
UPDATE companies
SET 
    subscription_tier = 'premium',  -- Options: 'basic', 'standard', 'premium'
    updated_at = NOW()
WHERE id = 1;  -- Replace with actual company ID

-- ============================================
-- 2. Update subscription tier for a company by unique_code
-- ============================================
UPDATE companies
SET 
    subscription_tier = 'standard',  -- Options: 'basic', 'standard', 'premium'
    updated_at = NOW()
WHERE unique_code = 'COMP001';  -- Replace with actual company unique code

-- ============================================
-- 3. Update subscription tier with all related fields
-- ============================================
UPDATE companies
SET 
    subscription_tier = 'premium',  -- Options: 'basic', 'standard', 'premium'
    subscription_start_date = '2026-01-26',  -- Start date of subscription
    subscription_end_date = '2027-01-26',   -- End date of subscription (1 year later)
    subscription_status = 'active',  -- Options: 'active', 'expired', 'cancelled'
    max_users = NULL,  -- NULL for premium (unlimited), or set specific number for basic/standard
    updated_at = NOW()
WHERE id = 1;  -- Replace with actual company ID

-- ============================================
-- 4. Update subscription tier and max_users based on plan
-- ============================================
-- Basic Plan: 1 device, limited users
UPDATE companies
SET 
    subscription_tier = 'basic',
    max_users = 5,  -- Adjust based on your plan limits
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;

-- Standard Plan: 3 devices, more users
UPDATE companies
SET 
    subscription_tier = 'standard',
    max_users = 15,  -- Adjust based on your plan limits
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;

-- Premium Plan: Unlimited devices, unlimited users
UPDATE companies
SET 
    subscription_tier = 'premium',
    max_users = NULL,  -- NULL means unlimited
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;

-- ============================================
-- 5. Extend subscription end date (renewal)
-- ============================================
UPDATE companies
SET 
    subscription_end_date = subscription_end_date + INTERVAL '1 year',  -- Extend by 1 year
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;

-- Or set a specific end date:
UPDATE companies
SET 
    subscription_end_date = '2027-12-31',
    subscription_status = 'active',
    updated_at = NOW()
WHERE id = 1;

-- ============================================
-- 6. Mark subscription as expired
-- ============================================
UPDATE companies
SET 
    subscription_status = 'expired',
    updated_at = NOW()
WHERE id = 1;

-- ============================================
-- 7. Cancel subscription
-- ============================================
UPDATE companies
SET 
    subscription_status = 'cancelled',
    updated_at = NOW()
WHERE id = 1;

-- ============================================
-- 8. Bulk update subscription tier for multiple companies
-- ============================================
UPDATE companies
SET 
    subscription_tier = 'premium',
    subscription_status = 'active',
    updated_at = NOW()
WHERE id IN (1, 2, 3);  -- Replace with actual company IDs

-- ============================================
-- 9. Update subscription based on email (if companies table has email)
-- ============================================
UPDATE companies
SET 
    subscription_tier = 'standard',
    subscription_status = 'active',
    updated_at = NOW()
WHERE email = 'company@example.com';  -- Replace with actual company email

-- ============================================
-- 10. View current subscription details before updating
-- ============================================
SELECT 
    id,
    name,
    unique_code,
    subscription_tier,
    subscription_start_date,
    subscription_end_date,
    subscription_status,
    max_users,
    is_active
FROM companies
WHERE id = 1;  -- Replace with actual company ID

-- ============================================
-- 11. Find all companies with a specific subscription tier
-- ============================================
SELECT 
    id,
    name,
    unique_code,
    subscription_tier,
    subscription_status,
    subscription_end_date
FROM companies
WHERE subscription_tier = 'basic';  -- or 'standard', 'premium'

-- ============================================
-- 12. Find all expired subscriptions
-- ============================================
SELECT 
    id,
    name,
    unique_code,
    subscription_tier,
    subscription_end_date,
    subscription_status
FROM companies
WHERE subscription_status = 'expired'
   OR (subscription_end_date < CURRENT_DATE AND subscription_status = 'active');
