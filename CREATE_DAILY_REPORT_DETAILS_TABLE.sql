-- Daily Report Details (sale target + customer details per day)
-- Store per-day: sale target, customers purchased/returned, return reason, expectation, remark
-- Run in Supabase SQL Editor after companies table exists

CREATE TABLE IF NOT EXISTS daily_report_details (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL,
  report_date DATE NOT NULL,
  sale_target NUMERIC(15, 2),
  customers_purchased INTEGER NOT NULL DEFAULT 0,
  customers_returned INTEGER NOT NULL DEFAULT 0,
  return_reason TEXT,
  expectation TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, report_date)
);

-- Index for time-wise lookups (by company and date range)
CREATE INDEX IF NOT EXISTS idx_daily_report_details_company_date
  ON daily_report_details(company_id, report_date DESC);

-- Optional: FK to companies if your schema uses it
-- ALTER TABLE daily_report_details ADD CONSTRAINT fk_daily_report_details_company
--   FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

COMMENT ON TABLE daily_report_details IS 'Per-day sale target and customer details for Daily Report; enables time-wise reporting in Supabase.';
