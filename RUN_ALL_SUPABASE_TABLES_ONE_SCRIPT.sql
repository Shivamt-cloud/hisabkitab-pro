-- =====================================================
-- HISABKITAB PRO – ALL SUPABASE TABLES (ONE SCRIPT)
-- Run this entire file once in Supabase SQL Editor.
-- Creates/updates all tables and triggers. Safe to re-run (IF NOT EXISTS / IF EXISTS).
-- =====================================================

-- =====================================================
-- 1. USERS & COMPANIES (base)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  company_id INTEGER,
  user_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  unique_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_unique_code ON companies(unique_code);

-- =====================================================
-- 2. PRODUCTS, SUPPLIERS, CUSTOMERS, PURCHASES, SALES, EXPENSES
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category_id INTEGER,
  description TEXT,
  company_id INTEGER,
  purchase_price DECIMAL(15, 2),
  selling_price DECIMAL(15, 2),
  stock_quantity DECIMAL(15, 3) DEFAULT 0,
  min_stock_level DECIMAL(15, 3),
  unit TEXT DEFAULT 'pcs',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  hsn_code TEXT,
  gst_rate DECIMAL(5, 2) DEFAULT 0,
  tax_type TEXT DEFAULT 'exclusive' CHECK (tax_type IN ('inclusive', 'exclusive')),
  cgst_rate DECIMAL(5, 2),
  sgst_rate DECIMAL(5, 2),
  igst_rate DECIMAL(5, 2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
  barcode_status TEXT DEFAULT 'inactive' CHECK (barcode_status IN ('active', 'used', 'inactive')),
  sold_date TIMESTAMP WITH TIME ZONE,
  sale_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  gstin TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_registered BOOLEAN DEFAULT false,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON suppliers(gstin) WHERE gstin IS NOT NULL;

CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gstin TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  contact_person TEXT,
  is_active BOOLEAN DEFAULT true,
  credit_limit DECIMAL(15, 2),
  outstanding_amount DECIMAL(15, 2) DEFAULT 0,
  credit_balance DECIMAL(15, 2) DEFAULT 0,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('gst', 'simple')),
  purchase_date DATE NOT NULL,
  supplier_id BIGINT,
  supplier_name TEXT,
  supplier_gstin TEXT,
  invoice_number TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(15, 2),
  total_tax DECIMAL(15, 2),
  cgst_amount DECIMAL(15, 2),
  sgst_amount DECIMAL(15, 2),
  igst_amount DECIMAL(15, 2),
  grand_total DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'partial')),
  payment_method TEXT,
  notes TEXT,
  return_remarks TEXT,
  due_date DATE,
  company_id INTEGER,
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchases_company_id ON purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_invoice_number ON purchases(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(type);

CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  customer_id BIGINT,
  customer_name TEXT,
  sales_person_id BIGINT,
  sales_person_name TEXT,
  invoice_number TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(15, 2),
  discount DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2),
  grand_total DECIMAL(15, 2),
  total_commission DECIMAL(15, 2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending')),
  payment_method TEXT,
  payment_methods JSONB,
  return_amount DECIMAL(15, 2),
  credit_applied DECIMAL(15, 2),
  credit_added DECIMAL(15, 2),
  notes TEXT,
  internal_remarks TEXT,
  company_id INTEGER,
  created_by BIGINT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_archived ON sales(archived);
CREATE INDEX IF NOT EXISTS idx_sales_sales_person_id ON sales(sales_person_id) WHERE sales_person_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN (
    'opening', 'closing', 'sales_person_payment', 'salary', 'employee_commission', 'employee_goods_purchase',
    'purchase', 'transport', 'office', 'utility', 'maintenance', 'marketing', 'other'
  )),
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT NOT NULL,
  sales_person_id BIGINT,
  sales_person_name TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'other')),
  receipt_number TEXT,
  category TEXT,
  cash_denominations JSONB,
  manual_extra JSONB,
  remark TEXT,
  company_id INTEGER,
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_sales_person_id ON expenses(sales_person_id) WHERE sales_person_id IS NOT NULL;

-- RLS for core tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('products', 'suppliers', 'customers', 'purchases', 'sales', 'expenses')) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service role can manage all %I" ON %I', r.tablename, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "Service role can manage all products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- Trigger function (used by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. REGISTRATION_REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS registration_requests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT,
  registration_method TEXT NOT NULL CHECK (registration_method IN ('google', 'direct')),
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  gstin TEXT,
  website TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);
DROP TRIGGER IF EXISTS trigger_update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER trigger_update_registration_requests_updated_at BEFORE UPDATE ON registration_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. SALARY_PAYMENTS & EMPLOYEE_GOODS_PURCHASES
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

-- =====================================================
-- 5. RENTALS
-- =====================================================
CREATE TABLE IF NOT EXISTS rentals (
  id BIGINT PRIMARY KEY,
  rental_number TEXT NOT NULL,
  booking_date DATE NOT NULL,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  customer_id BIGINT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_id_type TEXT,
  customer_id_number TEXT,
  sales_person_id BIGINT,
  sales_person_name TEXT,
  items JSONB NOT NULL,
  total_rent_amount DECIMAL(15, 2) NOT NULL,
  total_security_deposit DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'picked_up', 'returned', 'overdue', 'cancelled')),
  payment_method TEXT,
  payment_status TEXT CHECK (payment_status IS NULL OR payment_status IN ('paid', 'partial', 'pending')),
  discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(15, 2),
  discount_amount DECIMAL(15, 2),
  payment_methods JSONB,
  advance_amount DECIMAL(15, 2),
  internal_remarks TEXT,
  notes TEXT,
  company_id INTEGER,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rentals_company_id ON rentals(company_id);
CREATE INDEX IF NOT EXISTS idx_rentals_customer_id ON rentals(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rentals_booking_date ON rentals(booking_date);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_rental_number ON rentals(rental_number);

-- =====================================================
-- 6. PURCHASE_REORDERS & PURCHASE_REORDER_ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_reorders (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gst', 'simple')),
  supplier_id BIGINT,
  supplier_name TEXT,
  supplier_gstin TEXT,
  reorder_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  expected_date DATE,
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'partial_received', 'received', 'cancelled')),
  notes TEXT,
  subtotal DECIMAL(15, 2) DEFAULT 0,
  total_tax DECIMAL(15, 2) DEFAULT 0,
  grand_total DECIMAL(15, 2) DEFAULT 0,
  linked_purchase_id BIGINT,
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchase_reorders_company_id ON purchase_reorders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_reorders_supplier_id ON purchase_reorders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_reorders_status ON purchase_reorders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_reorders_order_date ON purchase_reorders(order_date DESC);

CREATE TABLE IF NOT EXISTS purchase_reorder_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_reorder_id BIGINT NOT NULL REFERENCES purchase_reorders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL,
  product_name TEXT,
  hsn_code TEXT,
  gst_rate DECIMAL(5, 2),
  unit_price DECIMAL(15, 2) NOT NULL,
  mrp DECIMAL(15, 2),
  sale_price DECIMAL(15, 2),
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  ordered_qty DECIMAL(15, 3) NOT NULL,
  received_qty DECIMAL(15, 3) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  article TEXT,
  barcode TEXT,
  size TEXT,
  color TEXT,
  batch_no TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchase_reorder_items_reorder_id ON purchase_reorder_items(purchase_reorder_id);
CREATE INDEX IF NOT EXISTS idx_purchase_reorder_items_product_id ON purchase_reorder_items(product_id);

ALTER TABLE purchase_reorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_reorder_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage purchase_reorders" ON purchase_reorders;
CREATE POLICY "Service role can manage purchase_reorders" ON purchase_reorders FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage purchase_reorder_items" ON purchase_reorder_items;
CREATE POLICY "Service role can manage purchase_reorder_items" ON purchase_reorder_items FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_purchase_reorders_updated_at ON purchase_reorders;
CREATE TRIGGER update_purchase_reorders_updated_at BEFORE UPDATE ON purchase_reorders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_purchase_reorder_items_updated_at ON purchase_reorder_items;
CREATE TRIGGER update_purchase_reorder_items_updated_at BEFORE UPDATE ON purchase_reorder_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. SCHEDULED_EXPORT_CONFIGS (requires companies)
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_export_configs (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_types TEXT[] NOT NULL DEFAULT '{}',
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly')),
  schedule_time TIME NOT NULL DEFAULT '08:00',
  schedule_day_of_week SMALLINT,
  email_recipients TEXT[] NOT NULL DEFAULT '{}',
  format TEXT NOT NULL CHECK (format IN ('pdf', 'excel')) DEFAULT 'excel',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_active ON scheduled_export_configs(company_id) WHERE is_active = true;

-- =====================================================
-- 8. USERS (subscription/device columns) & USER_DEVICES
-- =====================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'standard', 'premium')),
  ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled'));

UPDATE users SET subscription_tier = 'basic', max_devices = 1, subscription_status = 'active' WHERE subscription_tier IS NULL;

CREATE TABLE IF NOT EXISTS user_devices (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  browser_info TEXT,
  user_agent TEXT,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_devices_last_accessed ON user_devices(last_accessed);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service role" ON user_devices;
CREATE POLICY "Allow all for service role" ON user_devices FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION get_user_device_count(p_user_id TEXT) RETURNS INTEGER AS $$
BEGIN RETURN (SELECT COUNT(*)::INTEGER FROM user_devices WHERE user_id = p_user_id AND is_active = true); END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_max_devices_for_tier(p_tier TEXT) RETURNS INTEGER AS $$
BEGIN RETURN CASE WHEN p_tier = 'basic' THEN 1 WHEN p_tier = 'standard' THEN 3 WHEN p_tier = 'premium' THEN 999999 ELSE 1 END; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_max_devices_on_tier_change() RETURNS TRIGGER AS $$
BEGIN IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN NEW.max_devices := get_max_devices_for_tier(NEW.subscription_tier); END IF; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_max_devices ON users;
CREATE TRIGGER trigger_update_max_devices BEFORE UPDATE ON users FOR EACH ROW WHEN (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier) EXECUTE FUNCTION update_max_devices_on_tier_change();

CREATE OR REPLACE FUNCTION update_device_last_accessed() RETURNS TRIGGER AS $$
BEGIN NEW.last_accessed := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_device_last_accessed ON user_devices;
CREATE TRIGGER trigger_update_device_last_accessed BEFORE UPDATE ON user_devices FOR EACH ROW WHEN (NEW.is_active = true) EXECUTE FUNCTION update_device_last_accessed();

-- =====================================================
-- 9. SALES_PERSONS
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

DROP TRIGGER IF EXISTS update_sales_persons_updated_at ON sales_persons;
CREATE TRIGGER update_sales_persons_updated_at BEFORE UPDATE ON sales_persons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. TECHNICIANS & SERVICES (Services module)
-- =====================================================
CREATE TABLE IF NOT EXISTS technicians (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON technicians(company_id);

CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bike', 'car', 'ebike', 'ecar')),
  service_date TIMESTAMP WITH TIME ZONE NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  vehicle_number TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL DEFAULT 'Other',
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  next_service_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pickup_verification', 'verification_completed',
    'service_started', 'service_ended', 'completed', 'cancelled'
  )),
  pickup_verification_notes TEXT,
  assigned_to TEXT,
  assigned_technician_id BIGINT,
  technician_name TEXT,
  technician_phone TEXT,
  technician_notes TEXT,
  payment_status TEXT CHECK (payment_status IS NULL OR payment_status IN ('pending', 'paid')),
  payment_method TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  receipt_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by BIGINT
);
ALTER TABLE services ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS customer_email TEXT;
CREATE INDEX IF NOT EXISTS idx_services_company_id ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_services_vehicle_type ON services(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_services_service_date ON services(service_date);

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. EXPENSES – ensure manual_extra, remark, full expense_type list (if table already existed with old constraint)
-- =====================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS manual_extra JSONB;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS remark TEXT;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check_old;
ALTER TABLE expenses ADD CONSTRAINT expenses_expense_type_check CHECK (expense_type IN (
  'opening', 'closing', 'salary', 'sales_person_payment', 'employee_commission', 'employee_goods_purchase',
  'purchase', 'transport', 'office', 'utility', 'maintenance', 'marketing', 'other'
));

-- =====================================================
-- DONE. All pending Supabase tables and triggers are created/updated.
-- =====================================================
