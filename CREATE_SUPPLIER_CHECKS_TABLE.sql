-- =====================================================
-- Supplier Checks table (global / Supabase)
-- Run this in Supabase SQL Editor so checks sync across devices.
-- Used by: Simple Purchase, GST Purchase, Upcoming Checks, Supplier Check Form
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_checks (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL,
  supplier_name TEXT,
  purchase_id BIGINT,
  check_number TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
  cleared_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  company_id INTEGER,
  created_by BIGINT,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_checks_company_id ON supplier_checks(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_checks_supplier_id ON supplier_checks(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_checks_purchase_id ON supplier_checks(purchase_id);
CREATE INDEX IF NOT EXISTS idx_supplier_checks_due_date ON supplier_checks(due_date);
CREATE INDEX IF NOT EXISTS idx_supplier_checks_status ON supplier_checks(status);

COMMENT ON TABLE supplier_checks IS 'Checks issued to suppliers (from purchase forms, standalone). Syncs across devices.';
