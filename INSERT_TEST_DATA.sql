-- Insert Test Company
-- Run this in Supabase SQL Editor to quickly create test data

INSERT INTO companies (id, name, unique_code, is_active)
VALUES (1, 'Test Company', 'TEST001', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Test Admin User
INSERT INTO users (id, name, email, password, role, company_id)
VALUES ('1', 'Test Admin', 'admin@test.com', 'admin123', 'admin', 1)
ON CONFLICT (id) DO NOTHING;

-- Verify data was inserted
SELECT * FROM companies;
SELECT * FROM users;




