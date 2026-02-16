export interface InvoiceData {
  invoice_number: string
  invoice_date: string
  /** Used for receipt time when sale_date from DB is date-only (Supabase DATE column) */
  created_at?: string
  customer?: {
    name: string
    email?: string
    phone?: string
    gstin?: string
    address?: string
    city?: string
    state?: string
    pincode?: string
  }
  items: InvoiceItem[]
  subtotal: number
  discount?: number
  tax_amount: number
  grand_total: number
  payment_method: string // Legacy: single payment method (for backward compatibility)
  payment_methods?: Array<{ method: string; amount: number }> // New: multiple payment methods
  return_amount?: number // Amount returned to customer when payment exceeds grand total
  credit_applied?: number // Amount of customer credit applied to this sale
  credit_balance?: number // Customer's current credit balance after this transaction
  payment_status: string
  sales_person?: string
  notes?: string
  company_info?: CompanyInfo
}

export interface InvoiceItem {
  product_name: string
  quantity: number
  mrp?: number // Maximum Retail Price
  unit_price: number // Selling price per unit (after discount)
  discount?: number // Discount amount
  discount_percentage?: number // Discount percentage
  total: number // Final total after discount
  hsn_code?: string
  gst_rate?: number
  unit?: string
  /** Sales person for this line (when different per item) */
  sales_person_name?: string
}

export interface CompanyInfo {
  name: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  gstin?: string
  website?: string
  logo?: string
}

