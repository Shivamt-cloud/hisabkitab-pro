export type PaymentType = 'sale' | 'purchase'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'credit_card' | 'debit_card' | 'upi' | 'other'

export interface PaymentRecord {
  id: number
  type: PaymentType
  reference_id: number // sale_id or purchase_id
  reference_number: string // invoice_number or purchase invoice number
  customer_id?: number
  customer_name?: string
  supplier_id?: number
  supplier_name?: string
  total_amount: number
  paid_amount: number
  pending_amount: number
  payment_status: PaymentStatus
  payment_method?: PaymentMethod
  due_date?: string
  payment_date?: string
  notes?: string
  created_at: string
  updated_at?: string
}

export interface PaymentTransaction {
  id: number
  payment_record_id: number
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference_number?: string // cheque number, transaction ID, etc.
  notes?: string
  created_by: number
  created_by_name?: string
  created_at: string
}

export interface OutstandingPayment {
  payment_record_id: number
  type: PaymentType
  reference_number: string
  customer_id?: number
  customer_name?: string
  supplier_id?: number
  supplier_name?: string
  total_amount: number
  paid_amount: number
  pending_amount: number
  payment_status: PaymentStatus
  due_date?: string
  days_overdue?: number
  invoice_date: string
}

