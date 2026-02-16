-- =====================================================
-- Maintenance / Alert config (global – all users see same message)
-- Run in Supabase SQL Editor. Safe to re-run.
-- After this, Settings > Maintenance & Alerts will sync to DB and all users will see the banner/page.
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  show_as TEXT NOT NULL DEFAULT 'banner' CHECK (show_as IN ('banner', 'page')),
  message TEXT NOT NULL DEFAULT '',
  end_time_ist TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Single row: insert if not exists
INSERT INTO maintenance_config (id, enabled, show_as, message, end_time_ist)
VALUES (1, false, 'banner', '', '')
ON CONFLICT (id) DO NOTHING;

-- RLS so app can read; service role can write
ALTER TABLE maintenance_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read maintenance_config" ON maintenance_config;
CREATE POLICY "Allow read maintenance_config" ON maintenance_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service role all maintenance_config" ON maintenance_config;
CREATE POLICY "Allow service role all maintenance_config" ON maintenance_config FOR ALL USING (true) WITH CHECK (true);
