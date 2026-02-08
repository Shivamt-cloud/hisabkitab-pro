-- =====================================================
-- Add manual_extra and remark to expenses (Opening & Closing)
-- Run this in Supabase SQL Editor once. Fixes:
--   OPENING: Extra money / Carry forward (Cash, UPI, Card, Other) + Remark
--   CLOSING: Manual sales (outside system) (Cash, UPI, Card, Other) + Remark
-- =====================================================
-- manual_extra: Opening = extra/carry-forward; Closing = manual sales (format: {cash, upi, card, other})
-- remark: Optional remark for opening/closing entries

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS manual_extra JSONB,
ADD COLUMN IF NOT EXISTS remark TEXT;

COMMENT ON COLUMN expenses.manual_extra IS 'Manual extra amounts: opening=extra/carry-forward money, closing=manual sales outside system. Format: {cash, upi, card, other}';
COMMENT ON COLUMN expenses.remark IS 'Optional remark for opening/closing entries';
