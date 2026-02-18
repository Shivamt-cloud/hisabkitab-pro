-- =====================================================
-- ADD STARTER TIER + DEVICE LIMITS FOR ALL TIERS
-- Run after APPLY_MISSING_SUPABASE_COLUMNS_AND_TABLES.sql (or after scripts that create companies/users subscription_tier).
-- Safe to re-run.
-- - Companies: allow subscription_tier = 'starter'
-- - Users: allow subscription_tier = 'starter', 'premium_plus', 'premium_plus_plus'
-- - get_max_devices_for_tier: starter=1, basic=1, standard=3, premium/premium_plus/premium_plus_plus=unlimited
-- =====================================================

-- 1. COMPANIES: allow 'starter' in subscription_tier
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_tier_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus'));

-- 2. USERS: allow all six tiers (drop CHECK if present; name is often users_subscription_tier_check)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus'));

-- 3. get_max_devices_for_tier: all six tiers (starter=1, basic=1, standard=3, premium/premium_plus/premium_plus_plus=unlimited)
CREATE OR REPLACE FUNCTION get_max_devices_for_tier(p_tier TEXT) RETURNS INTEGER AS $$
BEGIN
  RETURN CASE
    WHEN p_tier = 'starter'      THEN 1
    WHEN p_tier = 'basic'        THEN 1
    WHEN p_tier = 'standard'     THEN 3
    WHEN p_tier = 'premium'      THEN 999999
    WHEN p_tier = 'premium_plus'  THEN 999999
    WHEN p_tier = 'premium_plus_plus' THEN 999999
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql;
