-- =====================================================
-- Alteration support: technician mode on sales + alteration_contacts table
-- Run this in Supabase SQL Editor so alteration technician data syncs across devices.
-- =====================================================

-- 1) Add technician mode and related columns to sales (safe to re-run)

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS sent_to_contact_id BIGINT;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS amount_to_pay DECIMAL(15, 2);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS alteration_technician_mode TEXT
  CHECK (alteration_technician_mode IN ('advance', 'pending'));

-- Optional indexes (helps Balance Collection / reports)
CREATE INDEX IF NOT EXISTS idx_sales_sent_to_contact_id ON sales(sent_to_contact_id);

-- 2) Alteration contacts (tailor / technician master)

CREATE TABLE IF NOT EXISTS alteration_contacts (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alteration_contacts_company_id ON alteration_contacts(company_id);

