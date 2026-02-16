-- =====================================================
-- Services & Technicians tables (global / Supabase)
-- For Services module: bike, car, e-bike, e-car service records and technicians.
-- Run this in Supabase SQL Editor to enable global sync.
-- =====================================================

-- =====================================================
-- 1. TECHNICIANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS technicians (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_technicians_company_id ON technicians(company_id);

-- =====================================================
-- 2. SERVICES TABLE (service records)
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_services_company_id ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_services_vehicle_type ON services(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_services_service_date ON services(service_date);

-- =====================================================
-- RLS (optional – enable if you use Supabase Auth)
-- =====================================================
-- ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE services ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for services" ON services FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all for technicians" ON technicians FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Trigger for services.updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
