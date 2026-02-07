-- Scheduled Export Configurations
-- For automated reports (daily/weekly PDF or Excel) sent by email
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scheduled_export_configs (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_types TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['sales_summary', 'daily_report', 'purchase_summary']
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly')),
  schedule_time TIME NOT NULL DEFAULT '08:00', -- e.g. 08:00 for 8 AM
  schedule_day_of_week SMALLINT, -- 0=Sun, 1=Mon, ... 6=Sat (for weekly only)
  email_recipients TEXT[] NOT NULL DEFAULT '{}', -- array of email addresses
  format TEXT NOT NULL CHECK (format IN ('pdf', 'excel')) DEFAULT 'excel',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Index for finding configs due for export
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_active 
  ON scheduled_export_configs(company_id) 
  WHERE is_active = true;

-- RLS (optional - disable if using custom auth)
-- ALTER TABLE scheduled_export_configs ENABLE ROW LEVEL SECURITY;

-- Note: App uses company_id to scope data. Netlify function uses 
-- SUPABASE_SERVICE_ROLE_KEY to read configs and generate reports.
