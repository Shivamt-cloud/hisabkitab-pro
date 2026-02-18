-- =====================================================
-- ADD access_type (Mobile / Desktop / Combo) TO REGISTRATION AND COMPANY
-- Run after ADD_STARTER_TIER_AND_DEVICE_LIMITS.sql (or after scripts that create these tables).
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- =====================================================

-- 1. REGISTRATION_REQUESTS: which device the user will use
ALTER TABLE registration_requests
  ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'combo' CHECK (access_type IN ('mobile', 'desktop', 'combo'));

UPDATE registration_requests SET access_type = 'combo' WHERE access_type IS NULL;

-- 2. COMPANIES: which device access the company is on
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'combo' CHECK (access_type IN ('mobile', 'desktop', 'combo'));

UPDATE companies SET access_type = 'combo' WHERE access_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_registration_requests_access_type ON registration_requests(access_type) WHERE access_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_access_type ON companies(access_type) WHERE access_type IS NOT NULL;
