-- =====================================================
-- Purchase Reorders (Place order → Receive → creates Purchase)
-- Run in Supabase SQL Editor after main tables exist
-- =====================================================

-- =====================================================
-- 1. purchase_reorders (header)
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

-- =====================================================
-- 2. purchase_reorder_items (line items)
-- =====================================================
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

-- RLS (drop existing policies first so script can be re-run safely)
ALTER TABLE purchase_reorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_reorder_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage purchase_reorders" ON purchase_reorders;
CREATE POLICY "Service role can manage purchase_reorders" ON purchase_reorders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage purchase_reorder_items" ON purchase_reorder_items;
CREATE POLICY "Service role can manage purchase_reorder_items" ON purchase_reorder_items FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_purchase_reorders_updated_at ON purchase_reorders;
CREATE TRIGGER update_purchase_reorders_updated_at BEFORE UPDATE ON purchase_reorders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_reorder_items_updated_at ON purchase_reorder_items;
CREATE TRIGGER update_purchase_reorder_items_updated_at BEFORE UPDATE ON purchase_reorder_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
