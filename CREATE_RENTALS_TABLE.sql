-- =====================================================
-- Rentals table for Rent & Bookings (global / Supabase-first loading)
-- Run this in Supabase SQL Editor to enable fast loading and global use.
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

-- RLS (optional – enable if you use Supabase Auth and want per-company isolation)
-- ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for anon" ON rentals FOR ALL USING (true);
