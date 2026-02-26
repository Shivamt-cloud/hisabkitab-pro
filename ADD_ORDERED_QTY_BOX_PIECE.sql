-- Add ordered_qty_box and ordered_qty_piece to purchase_reorder_items
-- Run after SUPABASE_SCRIPTS_IN_ORDER.sql

ALTER TABLE purchase_reorder_items
  ADD COLUMN IF NOT EXISTS ordered_qty_box DECIMAL(15, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ordered_qty_piece DECIMAL(15, 3) DEFAULT 0;
