export type PurchaseReorderType = 'gst' | 'simple'
export type PurchaseReorderStatus = 'placed' | 'partial_received' | 'received' | 'cancelled'

export interface PurchaseReorderItem {
  id?: number
  purchase_reorder_id?: number
  product_id: number
  product_name?: string
  hsn_code?: string
  gst_rate?: number
  unit_price: number
  mrp?: number
  sale_price?: number
  discount_percentage?: number
  ordered_qty: number
  received_qty?: number
  total: number
  article?: string
  barcode?: string
  size?: string
  color?: string
  batch_no?: string
  expiry_date?: string
  created_at?: string
  updated_at?: string
}

export interface PurchaseReorder {
  id: number
  company_id: number
  type: PurchaseReorderType
  supplier_id?: number
  supplier_name?: string
  supplier_gstin?: string
  reorder_number: string
  order_date: string
  expected_date?: string
  status: PurchaseReorderStatus
  notes?: string
  subtotal: number
  total_tax: number
  grand_total: number
  linked_purchase_id?: number
  created_by?: number
  created_at: string
  updated_at?: string
  items?: PurchaseReorderItem[]
}
