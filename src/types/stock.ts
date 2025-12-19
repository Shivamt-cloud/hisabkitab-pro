export type StockAdjustmentType = 'increase' | 'decrease' | 'set' | 'damaged' | 'expired' | 'returned' | 'other'

export type StockAdjustmentReason = 
  | 'manual_adjustment'
  | 'damaged_goods'
  | 'expired_items'
  | 'found_stock'
  | 'theft_loss'
  | 'return_to_supplier'
  | 'return_from_customer'
  | 'stock_take'
  | 'other'

export interface StockAdjustment {
  id: number
  product_id: number
  product_name: string
  adjustment_type: StockAdjustmentType
  reason: StockAdjustmentReason
  quantity: number // Positive number, the adjustment type determines if it's added/subtracted
  previous_stock: number
  new_stock: number
  notes?: string
  company_id?: number
  adjusted_by: number // User ID
  adjusted_by_name?: string
  adjustment_date: string
  created_at: string
  updated_at?: string
}

export interface StockAlert {
  product_id: number
  product_name: string
  current_stock: number
  min_stock_level: number
  category?: string
  unit?: string
  alert_type: 'low_stock' | 'out_of_stock'
  suggested_quantity?: number // Suggested quantity to purchase to reach optimal stock
}

