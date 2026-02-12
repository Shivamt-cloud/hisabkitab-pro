-- =====================================================
-- Employee Salary & Goods Purchase tables (global / Supabase)
-- Run this in Supabase SQL Editor so data syncs across devices.
-- =====================================================

-- =====================================================
-- 1. SALARY_PAYMENTS (salary + commission payments per employee)
-- =====================================================
CREATE TABLE IF NOT EXISTS salary_payments (
  id BIGSERIAL PRIMARY KEY,
  sales_person_id BIGINT NOT NULL,
  sales_person_name TEXT,
  payment_type TEXT DEFAULT 'salary' CHECK (payment_type IN ('salary', 'commission')),
  payment_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  for_period TEXT,
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  notes TEXT,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_payments_company_id ON salary_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_sales_person_id ON salary_payments(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_payment_date ON salary_payments(payment_date);

-- =====================================================
-- 2. EMPLOYEE_GOODS_PURCHASES (amounts to deduct from pay, per month)
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_goods_purchases (
  id BIGSERIAL PRIMARY KEY,
  sales_person_id BIGINT NOT NULL,
  sales_person_name TEXT,
  period TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_goods_purchases_company_id ON employee_goods_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_goods_purchases_sales_person_id ON employee_goods_purchases(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_employee_goods_purchases_period ON employee_goods_purchases(period);

-- Optional: enable RLS and add policies (if you use Supabase Auth and want per-company isolation)
-- ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_goods_purchases ENABLE ROW LEVEL SECURITY;
