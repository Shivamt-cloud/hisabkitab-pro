-- =====================================================
-- PERFORMANCE INDEXES – Run in Supabase SQL Editor
-- =====================================================
-- Composite indexes for the common query pattern:
-- If a table doesn't exist yet, that index will error – comment it out.
--   WHERE company_id = X ORDER BY date_column DESC
-- These speed up Purchase Report, Daily Report, Daily Expenses, Sales History, etc.
-- Safe to run multiple times (IF NOT EXISTS).

-- Purchases: company + date (Purchase Report, Daily Report, Sale Form)
CREATE INDEX IF NOT EXISTS idx_purchases_company_date_desc
  ON purchases(company_id, purchase_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

-- Sales: company + date (Sales Report, Daily Report, Dashboard)
CREATE INDEX IF NOT EXISTS idx_sales_company_date_desc
  ON sales(company_id, sale_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

-- Expenses: company + date (Daily Report, Daily Expenses)
CREATE INDEX IF NOT EXISTS idx_expenses_company_date_desc
  ON expenses(company_id, expense_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

-- Services: company + date (Service Reports)
CREATE INDEX IF NOT EXISTS idx_services_company_date_desc
  ON services(company_id, service_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

-- Salary payments: company + date (Employee Salary pages)
CREATE INDEX IF NOT EXISTS idx_salary_payments_company_date_desc
  ON salary_payments(company_id, payment_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

-- Rentals: company + booking date
CREATE INDEX IF NOT EXISTS idx_rentals_company_booking_desc
  ON rentals(company_id, booking_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

-- Purchase reorders: company + order date
CREATE INDEX IF NOT EXISTS idx_purchase_reorders_company_order_desc
  ON purchase_reorders(company_id, order_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

-- Employee goods purchases: company + period
CREATE INDEX IF NOT EXISTS idx_employee_goods_company_period_desc
  ON employee_goods_purchases(company_id, period DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

-- Products: company + created_at (Products list, Reports, Sale Form)
CREATE INDEX IF NOT EXISTS idx_products_company_created_desc
  ON products(company_id, created_at DESC NULLS LAST)
  WHERE company_id IS NOT NULL;
