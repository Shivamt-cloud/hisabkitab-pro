-- Add manual_extra and remark columns to expenses table
-- manual_extra: For Opening=extra money/carry forward, For Closing=manual sales outside system (Cash, UPI, Card, Other)
-- remark: Optional user remark for opening/closing entries

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS manual_extra JSONB,
ADD COLUMN IF NOT EXISTS remark TEXT;

COMMENT ON COLUMN expenses.manual_extra IS 'Manual extra amounts: opening=extra/carry-forward money, closing=manual sales outside system. Format: {cash, upi, card, other}';
COMMENT ON COLUMN expenses.remark IS 'Optional remark for opening/closing entries';
