-- Fix Companies Table ID Column
-- The ID column needs to be SERIAL (auto-increment) in PostgreSQL
-- Run this SQL in Supabase SQL Editor

-- First, check the current table structure
-- If the table was created with INTEGER PRIMARY KEY (SQLite syntax),
-- we need to recreate it with SERIAL

-- Option 1: If you have no data in the table, drop and recreate
-- (Only use this if the table is empty!)

-- DROP TABLE IF EXISTS companies CASCADE;

-- CREATE TABLE companies (
--   id SERIAL PRIMARY KEY,
--   name TEXT NOT NULL,
--   unique_code TEXT UNIQUE,
--   email TEXT,
--   phone TEXT,
--   address TEXT,
--   city TEXT,
--   state TEXT,
--   pincode TEXT,
--   country TEXT DEFAULT 'India',
--   gstin TEXT,
--   pan TEXT,
--   website TEXT,
--   logo TEXT,
--   valid_from DATE,
--   valid_to DATE,
--   is_active BOOLEAN DEFAULT true,
--   created_by INTEGER,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Option 2: If you have data, use ALTER TABLE to change ID to SERIAL
-- (This is more complex and requires careful handling)

-- Step 1: Create a sequence
CREATE SEQUENCE IF NOT EXISTS companies_id_seq;

-- Step 2: Set the sequence to start from the max existing ID + 1
SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 0) + 1, false);

-- Step 3: Alter the id column to use the sequence
ALTER TABLE companies 
ALTER COLUMN id TYPE INTEGER,
ALTER COLUMN id SET DEFAULT nextval('companies_id_seq'),
ALTER COLUMN id SET NOT NULL;

-- Step 4: Set the sequence owner
ALTER SEQUENCE companies_id_seq OWNED BY companies.id;

-- Verify the changes
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'companies' AND column_name = 'id';
