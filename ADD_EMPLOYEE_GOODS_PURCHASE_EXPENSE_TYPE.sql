-- =====================================================
-- Allow new expense types: salary, employee_commission, employee_goods_purchase
-- Run in Supabase SQL Editor if saving these expense types gives a CHECK constraint error.
-- =====================================================

-- Drop existing CHECK on expense_type (name may vary; this handles common cases)
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check_old;

-- Re-add CHECK with all allowed values including the new ones
ALTER TABLE expenses ADD CONSTRAINT expenses_expense_type_check CHECK (expense_type IN (
  'opening',
  'closing',
  'salary',
  'sales_person_payment',
  'employee_commission',
  'employee_goods_purchase',
  'purchase',
  'transport',
  'office',
  'utility',
  'maintenance',
  'marketing',
  'other'
));
