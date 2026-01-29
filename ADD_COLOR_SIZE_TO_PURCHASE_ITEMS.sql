-- =====================================================
-- Add Color and Size Fields to Purchase Items
-- =====================================================
-- Note: This is for documentation purposes only.
-- No actual database migration is needed because:
-- 1. The 'items' column in 'purchases' table is JSONB type
-- 2. JSONB automatically accepts new fields in the JSON structure
-- 3. Color and size will be stored as part of the items JSON array
-- =====================================================
-- 
-- The purchases.items column is already JSONB, so new fields
-- (color and size) will be automatically included when saving.
--
-- Example of how items are stored:
-- {
--   "items": [
--     {
--       "product_id": 1,
--       "product_name": "T-Shirt",
--       "quantity": 10,
--       "unit_price": 500,
--       "article": "TSH001",
--       "barcode": "1234567890123",
--       "color": "Red",        -- NEW FIELD (optional)
--       "size": "L",           -- NEW FIELD (optional)
--       "total": 5000
--     }
--   ]
-- }
-- =====================================================
--
-- Verification Query (Optional):
-- Check if any purchases have color/size in their items
-- =====================================================

-- Check purchases with color/size in items (after using the feature)
SELECT 
  id,
  invoice_number,
  purchase_date,
  jsonb_array_elements(items) as item
FROM purchases
WHERE items::text LIKE '%"color"%' 
   OR items::text LIKE '%"size"%'
LIMIT 10;

-- =====================================================
-- No ALTER TABLE statement needed!
-- The JSONB column automatically accepts new fields.
-- =====================================================
