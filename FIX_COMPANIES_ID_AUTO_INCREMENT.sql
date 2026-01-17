-- Fix Companies Table ID Column to Auto-Increment
-- Run this SQL in Supabase SQL Editor

-- Step 1: Create a sequence for the ID column
CREATE SEQUENCE IF NOT EXISTS companies_id_seq;

-- Step 2: Set the sequence to start from the max existing ID + 1 (or 1 if table is empty)
SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 0) + 1, false);

-- Step 3: Alter the id column to use the sequence as default
ALTER TABLE companies 
ALTER COLUMN id SET DEFAULT nextval('companies_id_seq');

-- Step 4: Set the sequence to be owned by the column (so it's managed automatically)
ALTER SEQUENCE companies_id_seq OWNED BY companies.id;

-- Verify the changes worked:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'companies' AND column_name = 'id';
