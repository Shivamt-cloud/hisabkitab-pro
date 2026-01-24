-- =====================================================
-- Add Admin User to Supabase
-- =====================================================
-- This script adds the admin user to Supabase so it's 
-- accessible globally from all devices and locations.
--
-- Admin Credentials:
-- Email: hisabkitabpro@hisabkitab.com
-- Password: Shiv845496!@#
-- =====================================================

-- First, check if admin user already exists
-- If it exists, update it; if not, create it

-- Option 1: Insert or Update (PostgreSQL 9.5+)
-- This will insert if not exists, or update if exists
INSERT INTO users (
  id,
  name,
  email,
  password,
  role,
  company_id,
  user_code,
  created_at,
  updated_at
)
VALUES (
  '1',  -- Admin user ID
  'HisabKitab Pro Admin',
  'hisabkitabpro@hisabkitab.com',
  'Shiv845496!@#',
  'admin',
  NULL,  -- Admin has no company_id (can access all companies)
  NULL,  -- No user_code for admin
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  user_code = EXCLUDED.user_code,
  updated_at = NOW();

-- Alternative: If ON CONFLICT doesn't work, use this approach:
-- =====================================================
-- Step 1: Delete existing admin user (if any)
-- DELETE FROM users WHERE email = 'hisabkitabpro@hisabkitab.com';
--
-- Step 2: Insert new admin user
-- INSERT INTO users (
--   id,
--   name,
--   email,
--   password,
--   role,
--   company_id,
--   user_code,
--   created_at,
--   updated_at
-- )
-- VALUES (
--   '1',
--   'HisabKitab Pro Admin',
--   'hisabkitabpro@hisabkitab.com',
--   'Shiv845496!@#',
--   'admin',
--   NULL,
--   NULL,
--   NOW(),
--   NOW()
-- );
-- =====================================================

-- Verify the admin user was created/updated
SELECT 
  id,
  name,
  email,
  role,
  company_id,
  created_at,
  updated_at
FROM users 
WHERE email = 'hisabkitabpro@hisabkitab.com';

-- Expected result:
-- id: 1
-- name: HisabKitab Pro Admin
-- email: hisabkitabpro@hisabkitab.com
-- role: admin
-- company_id: NULL
-- created_at: [current timestamp]
-- updated_at: [current timestamp]
