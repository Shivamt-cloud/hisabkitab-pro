-- =====================================================
-- Allow premium_plus and premium_plus_plus in companies.subscription_tier
-- Run this ONCE in Supabase SQL Editor, then you can set tier to premium_plus.
-- =====================================================

-- Drop the existing check (it only allows 'basic', 'standard', 'premium')
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_tier_check;

-- Add new check that includes premium_plus and premium_plus_plus
ALTER TABLE companies ADD CONSTRAINT companies_subscription_tier_check
  CHECK (subscription_tier IN ('basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus'));
