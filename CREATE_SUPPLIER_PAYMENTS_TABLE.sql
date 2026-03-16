-- =====================================================
-- Supplier Payments table (Supabase)
-- Run this in Supabase SQL Editor so payments sync across devices.
-- Used by: Party Ledger Summary, Supplier Account, Supplier Payment forms
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_payments (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL,
  supplier_name TEXT,
  purchase_id BIGINT,
  purchase_invoice_number TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi', 'credit_card', 'debit_card', 'other')),
  payment_date DATE NOT NULL,
  check_id BIGINT,
  reference_number TEXT,
  notes TEXT,
  company_id INTEGER,
  created_by BIGINT NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_company_id ON supplier_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_payment_date ON supplier_payments(payment_date);

COMMENT ON TABLE supplier_payments IS 'Payments made to suppliers. Syncs across devices when Supabase is used.';
