-- Allow app (anon key) to read purchases so Purchase History shows records for company_id.
-- Run this in Supabase SQL Editor if the UI shows no purchases even though data exists (e.g. company_id = 6).
-- The app uses VITE_SUPABASE_ANON_KEY; RLS must allow anon/authenticated to SELECT.

-- Add policy so anon and authenticated roles can read purchases (app filters by company_id in the query)
DROP POLICY IF EXISTS "Allow read purchases" ON purchases;
CREATE POLICY "Allow read purchases" ON purchases
  FOR SELECT
  TO anon, authenticated
  USING (true);
