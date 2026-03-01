-- =====================================================
-- HISABKITAB PRO – FINAL SINGLE SQL SCRIPT (RUN ONCE)
-- =====================================================
-- Run this entire file once in Supabase SQL Editor.
-- It combines all required migrations in the correct order.
-- Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DROP IF EXISTS).
--
-- Contents (in order):
--   1. Base tables (users, companies, products, suppliers, customers, purchases, sales, expenses, etc.)
--   2. APPLY_MISSING (companies subscription, registration_requests, price_segments, etc.)
--   3. ADD_STARTER_TIER_AND_DEVICE_LIMITS
--   4. ADD_ACCESS_TYPE_COLUMN (mobile/desktop/combo)
--   5. APPLY_REMAINING (services discount/parts, sales.service_id, customers id_type/id_number)
--   6. ADD_ORDERED_QTY_BOX_PIECE (purchase_reorder_items)
--   7. ADD_RECEIVED_QTY_BOX_PIECE (purchase_reorder_items)
-- =====================================================


-- #############################################################################
-- PART 1: BASE TABLES (RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT)
-- #############################################################################

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

-- 3. REGISTRATION_REQUESTS
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

-- 4. SALARY_PAYMENTS & EMPLOYEE_GOODS_PURCHASES
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

-- 5. RENTALS
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

-- 6. PURCHASE_REORDERS & PURCHASE_REORDER_ITEMS
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

-- 7. SCHEDULED_EXPORT_CONFIGS
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

-- 8. USERS (subscription/device) & USER_DEVICES
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

-- 9. SALES_PERSONS
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

-- 10. TECHNICIANS & SERVICES
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

-- 11. EXPENSES – manual_extra, remark, expense_type
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS manual_extra JSONB;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check_old;
ALTER TABLE expenses ADD CONSTRAINT expenses_expense_type_check CHECK (expense_type IN (
  'opening', 'closing', 'salary', 'sales_person_payment', 'employee_commission', 'employee_goods_purchase',
  'purchase', 'transport', 'office', 'utility', 'maintenance', 'marketing', 'other'
));


-- #############################################################################
-- PART 2: APPLY_MISSING_SUPABASE_COLUMNS_AND_TABLES
-- #############################################################################

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_to DATE,
  ADD COLUMN IF NOT EXISTS created_by INTEGER;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled'));

UPDATE companies SET subscription_tier = 'basic', max_users = 3, subscription_status = 'active' WHERE subscription_tier IS NULL;

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_tier_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus'));

CREATE INDEX IF NOT EXISTS idx_companies_subscription_tier ON companies(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);

ALTER TABLE registration_requests
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS communication_initiated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_activated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_rejected BOOLEAN DEFAULT false;

UPDATE registration_requests SET subscription_tier = 'basic' WHERE subscription_tier IS NULL;

CREATE INDEX IF NOT EXISTS idx_registration_requests_subscription_tier ON registration_requests(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_registration_requests_completion ON registration_requests(communication_initiated, agreement_done, payment_done);
CREATE INDEX IF NOT EXISTS idx_registration_requests_registration_done ON registration_requests(registration_done);
CREATE INDEX IF NOT EXISTS idx_registration_requests_company_activated ON registration_requests(company_activated);
CREATE INDEX IF NOT EXISTS idx_registration_requests_company_rejected ON registration_requests(company_rejected);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_segment_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_customers_price_segment_id ON customers(price_segment_id) WHERE price_segment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS price_segments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_segments_company_id ON price_segments(company_id);
CREATE INDEX IF NOT EXISTS idx_price_segments_is_default ON price_segments(is_default);

CREATE TABLE IF NOT EXISTS product_segment_prices (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  segment_id BIGINT NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  article TEXT,
  company_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_segment_prices_product_id ON product_segment_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_segment_prices_segment_id ON product_segment_prices(segment_id);
CREATE INDEX IF NOT EXISTS idx_product_segment_prices_company_id ON product_segment_prices(company_id);


-- #############################################################################
-- PART 3: ADD_STARTER_TIER_AND_DEVICE_LIMITS
-- #############################################################################

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_tier_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
ALTER TABLE users ADD CONSTRAINT users_subscription_tier_check
  CHECK (subscription_tier IN ('starter', 'basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus'));

CREATE OR REPLACE FUNCTION get_max_devices_for_tier(p_tier TEXT) RETURNS INTEGER AS $$
BEGIN
  RETURN CASE
    WHEN p_tier = 'starter'      THEN 1
    WHEN p_tier = 'basic'        THEN 1
    WHEN p_tier = 'standard'     THEN 3
    WHEN p_tier = 'premium'      THEN 999999
    WHEN p_tier = 'premium_plus'  THEN 999999
    WHEN p_tier = 'premium_plus_plus' THEN 999999
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql;


-- #############################################################################
-- PART 4: ADD_ACCESS_TYPE_COLUMN
-- #############################################################################

ALTER TABLE registration_requests
  ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'combo' CHECK (access_type IN ('mobile', 'desktop', 'combo'));
UPDATE registration_requests SET access_type = 'combo' WHERE access_type IS NULL;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'combo' CHECK (access_type IN ('mobile', 'desktop', 'combo'));
UPDATE companies SET access_type = 'combo' WHERE access_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_registration_requests_access_type ON registration_requests(access_type) WHERE access_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_access_type ON companies(access_type) WHERE access_type IS NOT NULL;


-- #############################################################################
-- PART 5: APPLY_REMAINING_SUPABASE_MIGRATIONS
-- #############################################################################

ALTER TABLE services ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS parts_total DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE services ADD CONSTRAINT services_status_check CHECK (status IN (
  'booked',
  'draft', 'pickup_verification', 'verification_completed',
  'service_started', 'service_ended', 'completed', 'cancelled'
));

ALTER TABLE sales ADD COLUMN IF NOT EXISTS service_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_sales_service_id ON sales(service_id) WHERE service_id IS NOT NULL;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_id_type ON customers(id_type) WHERE id_type IS NOT NULL;


-- #############################################################################
-- PART 6: ADD_ORDERED_QTY_BOX_PIECE (purchase_reorder_items)
-- #############################################################################

ALTER TABLE purchase_reorder_items
  ADD COLUMN IF NOT EXISTS ordered_qty_box DECIMAL(15, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ordered_qty_piece DECIMAL(15, 3) DEFAULT 0;


-- #############################################################################
-- PART 7: ADD_RECEIVED_QTY_BOX_PIECE (purchase_reorder_items)
-- #############################################################################

ALTER TABLE purchase_reorder_items
  ADD COLUMN IF NOT EXISTS received_qty_box DECIMAL(15, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_qty_piece DECIMAL(15, 3) DEFAULT 0;


-- =====================================================
-- PART 8: RPC – search_purchases_for_sale (online search)
-- =====================================================
-- When online: Sale form calls this RPC to search in Supabase (fast, indexed).
-- When offline: Search uses IndexedDB locally.
-- Usage: SELECT * FROM search_purchases_for_sale('barcode_or_name', company_id);

CREATE OR REPLACE FUNCTION search_purchases_for_sale(
  search_query text,
  p_company_id int DEFAULT NULL
)
RETURNS SETOF purchases AS $$
DECLARE
  q text;
BEGIN
  q := trim(search_query);
  IF q = '' OR q IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM purchases p
  WHERE (p_company_id IS NULL OR p.company_id = p_company_id)
  AND (
    -- Supplier name match (indexed via ilike pattern)
    (p.supplier_name IS NOT NULL AND p.supplier_name ILIKE '%' || q || '%')
    OR
    -- Barcode in purchase items (JSONB) – exact OR prefix/partial (e.g. "89" matches "8903657644837")
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.items) AS elem
      WHERE elem->>'barcode' IS NOT NULL
        AND (trim(elem->>'barcode') = q
             OR trim(elem->>'barcode') LIKE q || '%'
             OR trim(elem->>'barcode') ILIKE '%' || q || '%')
    )
    OR
    -- Article in purchase items (JSONB)
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.items) AS elem
      WHERE elem->>'article' IS NOT NULL AND trim(lower(elem->>'article')) = lower(q)
    )
    OR
    -- Product name in items (item.product_name)
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.items) AS elem
      WHERE elem->>'product_name' IS NOT NULL AND trim(lower(elem->>'product_name')) LIKE '%' || lower(q) || '%'
    )
    OR
    -- Product name or barcode from products table (join via product_id in items)
    -- Barcode: exact, prefix, or partial (e.g. "89" matches "8903657644837")
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.items) AS elem
      JOIN products pr ON pr.id = ((elem->>'product_id')::int)
      WHERE (pr.name ILIKE '%' || q || '%'
             OR (pr.barcode IS NOT NULL AND (trim(pr.barcode) = q
                 OR trim(pr.barcode) LIKE q || '%'
                 OR trim(pr.barcode) ILIKE '%' || q || '%')))
    )
  )
  ORDER BY p.purchase_date DESC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql STABLE;


-- =====================================================
-- PART 9: PERFORMANCE INDEXES (composite company + date)
-- =====================================================
-- Speeds up: All Reports, Daily Report, Daily Expenses, Dashboard, Business Overview, etc.
-- Query pattern: WHERE company_id = X ORDER BY date_column DESC

CREATE INDEX IF NOT EXISTS idx_purchases_company_date_desc
  ON purchases(company_id, purchase_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_company_date_desc
  ON sales(company_id, sale_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_company_date_desc
  ON expenses(company_id, expense_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_company_date_desc
  ON services(company_id, service_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rentals_company_booking_desc
  ON rentals(company_id, booking_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_salary_payments_company_date_desc
  ON salary_payments(company_id, payment_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_reorders_company_order_desc
  ON purchase_reorders(company_id, order_date DESC NULLS LAST)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_company_created_desc
  ON products(company_id, created_at DESC NULLS LAST)
  WHERE company_id IS NOT NULL;


-- =====================================================
-- END – HISABKITAB PRO FINAL SUPABASE SCRIPT
-- =====================================================
