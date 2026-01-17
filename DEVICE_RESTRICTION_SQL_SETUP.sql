-- Device Restriction SQL Setup
-- Run this SQL in Supabase SQL Editor

-- =====================================================
-- 1. UPDATE USERS TABLE - Add Subscription Fields
-- =====================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'standard', 'premium')),
ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled'));

-- Update existing users to have basic tier
UPDATE users 
SET 
  subscription_tier = 'basic',
  max_devices = 1,
  subscription_status = 'active'
WHERE subscription_tier IS NULL;

-- =====================================================
-- 2. CREATE USER_DEVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_devices (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet', 'unknown'
  browser_info TEXT,
  user_agent TEXT,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, device_id)
);

-- Indexes for user_devices
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_devices_last_accessed ON user_devices(last_accessed);

-- =====================================================
-- 3. RLS POLICIES FOR USER_DEVICES
-- =====================================================
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Note: Adjust these policies based on your authentication setup
-- For now, using permissive policies (application handles filtering)
CREATE POLICY "Allow all for service role" ON user_devices FOR ALL USING (true) WITH CHECK (true);

-- If using Supabase Auth, uncomment and adjust:
-- CREATE POLICY "Users can view their own devices" ON user_devices FOR SELECT USING (auth.uid()::text = user_id);
-- CREATE POLICY "Users can insert their own devices" ON user_devices FOR INSERT WITH CHECK (auth.uid()::text = user_id);
-- CREATE POLICY "Users can update their own devices" ON user_devices FOR UPDATE USING (auth.uid()::text = user_id);
-- CREATE POLICY "Users can delete their own devices" ON user_devices FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- 4. HELPER FUNCTION: Get Device Count for User
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_device_count(p_user_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM user_devices
    WHERE user_id = p_user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. HELPER FUNCTION: Get Max Devices for Tier
-- =====================================================
CREATE OR REPLACE FUNCTION get_max_devices_for_tier(p_tier TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE
    WHEN p_tier = 'basic' THEN 1
    WHEN p_tier = 'standard' THEN 3
    WHEN p_tier = 'premium' THEN 999999 -- Unlimited (large number)
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGER: Auto-update max_devices when tier changes
-- =====================================================
CREATE OR REPLACE FUNCTION update_max_devices_on_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    NEW.max_devices := get_max_devices_for_tier(NEW.subscription_tier);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_max_devices
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier)
  EXECUTE FUNCTION update_max_devices_on_tier_change();

-- =====================================================
-- 7. TRIGGER: Auto-update last_accessed on device access
-- =====================================================
CREATE OR REPLACE FUNCTION update_device_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_last_accessed
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION update_device_last_accessed();

-- =====================================================
-- 8. INDEXEDDB STORE (For Local Storage)
-- =====================================================
-- Note: IndexedDB schema updates will be in db.ts
-- Store: USER_DEVICES

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check users table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name LIKE 'subscription%' OR column_name LIKE 'max_devices'
-- ORDER BY ordinal_position;

-- Check user_devices table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_devices'
-- ORDER BY ordinal_position;

-- Test device count function
-- SELECT get_user_device_count('USER_ID_HERE');

-- Test max devices function
-- SELECT get_max_devices_for_tier('basic');  -- Should return 1
-- SELECT get_max_devices_for_tier('standard'); -- Should return 3
-- SELECT get_max_devices_for_tier('premium');  -- Should return 999999
