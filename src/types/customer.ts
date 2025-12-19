export interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
  gstin?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  contact_person?: string
  is_active: boolean
  credit_limit?: number
  outstanding_amount?: number
  company_id?: number
  created_at: string
  updated_at?: string
}

export interface CustomerSummary {
  id: number
  name: string
  total_sales: number
  total_purchases: number
  outstanding_amount: number
  last_sale_date?: string
  sale_count: number
}

