-- =====================================================
-- Add Admin User to Supabase (FIXED VERSION)
-- =====================================================
-- This script handles the case where a user with id='1' 
-- already exists but might not be the admin user.
-- =====================================================

-- Step 1: Delete any existing admin user by email
-- This ensures we don't have duplicate admin users
DELETE FROM users WHERE email = 'hisabkitabpro@hisabkitab.com';

-- Step 2: Delete user with id='1' if it exists and is not the admin
-- (This handles the case where id='1' is used by another user)
DELETE FROM users WHERE id = '1' AND email != 'hisabkitabpro@hisabkitab.com';

-- Step 3: Insert the admin user
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
  '1',
  'HisabKitab Pro Admin',
  'hisabkitabpro@hisabkitab.com',
  'Shiv845496!@#',
  'admin',
  NULL,
  NULL,
  NOW(),
  NOW()
);

-- Step 4: Verify the admin user was created
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
