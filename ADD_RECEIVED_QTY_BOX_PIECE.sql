-- Add received_qty_box and received_qty_piece to purchase_reorder_items
-- Run after ADD_ORDERED_QTY_BOX_PIECE.sql

ALTER TABLE purchase_reorder_items
  ADD COLUMN IF NOT EXISTS received_qty_box DECIMAL(15, 3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_qty_piece DECIMAL(15, 3) DEFAULT 0;
