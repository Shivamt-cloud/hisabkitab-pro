export type PurchaseType = 'gst' | 'simple'
export type PaymentStatus = 'paid' | 'pending' | 'partial'

export interface PurchaseItem {
  id?: number
  product_id: number
  product_name?: string
  article?: string // Article number/code (supplier's article code, variant, batch number, etc.)
  barcode?: string // Barcode for this purchase item (generated during purchase entry)
  hsn_code?: string
  quantity: number
  sold_quantity?: number // Quantity sold from this purchase item (for inventory tracking)
  available_quantity?: number // Available quantity (quantity - sold_quantity), calculated dynamically
  unit_price: number // Purchase price per unit
  mrp?: number // Maximum Retail Price
  sale_price?: number // Selling price
  margin_percentage?: number // Margin percentage
  margin_amount?: number // Margin amount per unit
  min_stock_level?: number // Minimum stock level for alerts
  gst_rate?: number
  tax_amount?: number
  total: number
}

export interface GSTPurchase {
  id: number
  type: 'gst'
  purchase_date: string
  supplier_id: number
  supplier_name?: string
  supplier_gstin?: string
  invoice_number: string
  items: PurchaseItem[]
  subtotal: number
  total_tax: number
  cgst_amount?: number
  sgst_amount?: number
  igst_amount?: number
  grand_total: number
  payment_status: PaymentStatus
  payment_method?: string
  notes?: string
  company_id?: number
  created_by: number
  created_at: string
  updated_at?: string
}

export interface SimplePurchase {
  id: number
  type: 'simple'
  purchase_date: string
  supplier_id?: number
  supplier_name?: string
  invoice_number?: string
  items: PurchaseItem[]
  total_amount: number
  payment_status: PaymentStatus
  payment_method?: string
  notes?: string
  company_id?: number
  created_by: number
  created_at: string
  updated_at?: string
}

export type Purchase = GSTPurchase | SimplePurchase

export interface Supplier {
  id: number
  name: string
  gstin?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  is_registered: boolean // Has GST registration
  company_id?: number
  created_at?: string
  updated_at?: string
}

