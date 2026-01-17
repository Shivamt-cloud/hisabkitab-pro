-- =====================================================
-- Create All Supabase Tables with RLS (Row Level Security)
-- This script creates tables for: products, purchases, customers, suppliers, sales, expenses
-- =====================================================
-- Run this script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PRODUCTS TABLE
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

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- =====================================================
-- 2. SUPPLIERS TABLE
-- =====================================================
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

-- Indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON suppliers(gstin) WHERE gstin IS NOT NULL;

-- =====================================================
-- 3. CUSTOMERS TABLE
-- =====================================================
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

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- =====================================================
-- 4. PURCHASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('gst', 'simple')),
  purchase_date DATE NOT NULL,
  supplier_id BIGINT,
  supplier_name TEXT,
  supplier_gstin TEXT,
  invoice_number TEXT,
  items JSONB NOT NULL, -- Array of PurchaseItem objects
  subtotal DECIMAL(15, 2),
  total_tax DECIMAL(15, 2),
  cgst_amount DECIMAL(15, 2),
  sgst_amount DECIMAL(15, 2),
  igst_amount DECIMAL(15, 2),
  grand_total DECIMAL(15, 2),
  total_amount DECIMAL(15, 2), -- For simple purchases
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'partial')),
  payment_method TEXT,
  notes TEXT,
  company_id INTEGER,
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_company_id ON purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_invoice_number ON purchases(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(type);

-- =====================================================
-- 5. SALES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  customer_id BIGINT,
  customer_name TEXT,
  sales_person_id BIGINT,
  sales_person_name TEXT,
  invoice_number TEXT NOT NULL,
  items JSONB NOT NULL, -- Array of SaleItem objects
  subtotal DECIMAL(15, 2),
  discount DECIMAL(15, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2),
  grand_total DECIMAL(15, 2),
  total_commission DECIMAL(15, 2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending')),
  payment_method TEXT, -- Legacy: single payment method
  payment_methods JSONB, -- New: multiple payment methods array
  return_amount DECIMAL(15, 2),
  credit_applied DECIMAL(15, 2),
  credit_added DECIMAL(15, 2),
  notes TEXT,
  company_id INTEGER,
  created_by BIGINT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sales
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_archived ON sales(archived);
CREATE INDEX IF NOT EXISTS idx_sales_sales_person_id ON sales(sales_person_id) WHERE sales_person_id IS NOT NULL;

-- =====================================================
-- 6. EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN (
    'opening', 'closing', 'sales_person_payment', 'purchase', 
    'transport', 'office', 'utility', 'maintenance', 'marketing', 'other'
  )),
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT NOT NULL,
  sales_person_id BIGINT,
  sales_person_name TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'other')),
  receipt_number TEXT,
  category TEXT,
  cash_denominations JSONB, -- CashDenominations object
  company_id INTEGER,
  created_by BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_sales_person_id ON expenses(sales_person_id) WHERE sales_person_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Note: Since the application uses the service role key (which bypasses RLS),
-- we're enabling RLS for future enhancement but keeping it permissive.
-- Data isolation is currently handled at the application level by filtering by company_id.
-- All services (productService, purchaseService, etc.) already implement company_id filtering.
-- =====================================================

-- Drop existing policies if they exist (for re-running the script)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('products', 'suppliers', 'customers', 'purchases', 'sales', 'expenses')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Service role can manage all %I" ON %I', r.tablename, r.tablename);
    END LOOP;
END $$;

-- Create permissive policies for service role
-- Note: Service role key bypasses RLS, so these policies are for future use
-- Current implementation relies on application-level filtering by company_id
CREATE POLICY "Service role can manage all products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Verification Queries (Optional - uncomment to verify)
-- =====================================================
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name IN ('products', 'suppliers', 'customers', 'purchases', 'sales', 'expenses')
-- ORDER BY table_name, ordinal_position;

-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('products', 'suppliers', 'customers', 'purchases', 'sales', 'expenses');
