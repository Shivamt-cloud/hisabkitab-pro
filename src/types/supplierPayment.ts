// Supplier Payment and Check Management Types

export type SupplierPaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'credit_card' | 'debit_card' | 'other'
export type CheckStatus = 'pending' | 'cleared' | 'bounced' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid'

/**
 * Supplier Payment - Records individual payments made to a supplier
 */
export interface SupplierPayment {
  id: number
  supplier_id: number
  supplier_name?: string
  purchase_id?: number // Optional: link to specific purchase
  purchase_invoice_number?: string
  amount: number
  payment_method: SupplierPaymentMethod
  payment_date: string
  check_id?: number // If payment is via check, link to check record
  reference_number?: string // Transaction ID, UPI reference, etc.
  notes?: string
  company_id?: number
  created_by: number
  created_by_name?: string
  created_at: string
  updated_at?: string
}

/**
 * Supplier Check - Manages check payments to suppliers
 */
export interface SupplierCheck {
  id: number
  supplier_id: number
  supplier_name?: string
  purchase_id?: number // Optional: link to specific purchase
  check_number: string
  bank_name: string
  account_number?: string
  amount: number
  issue_date: string
  due_date: string // When check should be cleared
  status: CheckStatus
  cleared_date?: string // When check was actually cleared
  notes?: string
  company_id?: number
  created_by: number
  created_by_name?: string
  created_at: string
  updated_at?: string
}

/**
 * Supplier Account Summary - Aggregated view of supplier's financial status
 */
export interface SupplierAccountSummary {
  supplier_id: number
  supplier_name: string
  total_purchases: number // Total amount of all purchases
  total_paid: number // Total amount paid to supplier
  pending_amount: number // Total pending amount
  upcoming_checks: SupplierCheck[] // Checks with due dates in future
  overdue_checks: SupplierCheck[] // Checks past due date
  recent_payments: SupplierPayment[] // Recent payment history
  payment_history: SupplierPayment[] // All payment history
  check_history: SupplierCheck[] // All check history
}

