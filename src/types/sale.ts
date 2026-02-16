export type PaymentStatus = 'paid' | 'pending'

export interface SaleItem {
  id?: number
  product_id: number
  product_name: string
  barcode: string
  quantity: number
  unit_price: number // Selling price per unit (after discount)
  purchase_price?: number // Purchase price per unit (for profit calculation)
  mrp?: number // Maximum Retail Price (original price)
  discount?: number // Discount amount (not percentage, absolute value)
  discount_percentage?: number // Discount percentage (optional)
  sale_type: 'sale' | 'return' // Whether this item is a sale or return
  total: number // Final total after discount
  product_snapshot?: any // Store product details at time of sale
  // Purchase item tracking for inventory management
  purchase_id?: number // ID of the purchase this item was sold from
  purchase_item_id?: number // ID of the specific purchase item (for tracking which purchase item was sold)
  purchase_item_article?: string // Article from the purchase item
  purchase_item_barcode?: string // Barcode from the purchase item
  purchase_item_unique_key?: string // Unique key: "P{purchase_id}-I{purchase_item_id}" - ensures each purchase item is treated separately
  // Per-item sales person (optional; if not set, sale-level sales_person is used)
  sales_person_id?: number
  sales_person_name?: string
}

export interface Sale {
  id: number
  sale_date: string
  customer_id?: number
  customer_name?: string
  sales_person_id?: number
  sales_person_name?: string
  invoice_number: string
  items: SaleItem[]
  subtotal: number
  discount?: number
  tax_amount: number
  grand_total: number
  total_commission?: number // Total commission for this sale
  payment_status: PaymentStatus
  payment_method: string // Legacy: single payment method (for backward compatibility)
  payment_methods?: Array<{ method: string; amount: number }> // New: multiple payment methods
  return_amount?: number // Amount to return to customer when payment exceeds grand total
  credit_applied?: number // Amount of customer credit applied to this sale
  credit_added?: number // Amount of credit added to customer from returns
  notes?: string // Customer-facing notes (shown on invoice)
  internal_remarks?: string // Internal remarks (NOT shown to customers, only in reports)
  /** When set, this sale is for parts/products sold during this service */
  service_id?: number
  company_id?: number
  created_by: number
  archived: boolean
  created_at: string
  updated_at?: string
}

export interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  gstin?: string
  company_id?: number
  created_at?: string
  updated_at?: string
}

