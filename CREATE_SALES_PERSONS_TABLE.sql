-- =====================================================
-- Sales persons table (global / Supabase)
-- Used by: sales (sales_person_id), expenses, rentals, salary_payments, etc.
-- Run this in Supabase SQL Editor to enable global sync.
-- =====================================================

CREATE TABLE IF NOT EXISTS sales_persons (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  employee_id TEXT,
  commission_rate DECIMAL(5, 2),
  joining_date DATE,
  current_salary DECIMAL(15, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_persons_company_id ON sales_persons(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_persons_is_active ON sales_persons(is_active);

-- Trigger for updated_at (function may already exist from CREATE_ALL_SUPABASE_TABLES.sql)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sales_persons_updated_at ON sales_persons;
CREATE TRIGGER update_sales_persons_updated_at
  BEFORE UPDATE ON sales_persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
