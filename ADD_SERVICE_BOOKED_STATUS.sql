-- Allow 'booked' status in services table (appointment booking)
-- Run in Supabase SQL Editor if you use cloud sync for services.

ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE services ADD CONSTRAINT services_status_check CHECK (status IN (
  'booked',
  'draft', 'pickup_verification', 'verification_completed',
  'service_started', 'service_ended', 'completed', 'cancelled'
));
