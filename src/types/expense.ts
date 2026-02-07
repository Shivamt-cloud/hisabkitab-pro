export type ExpenseType = 
  | 'opening' // Opening cash balance (morning)
  | 'closing' // Closing cash balance (evening)
  | 'salary' // Employee salary
  | 'sales_person_payment' // Money given to sales person
  | 'purchase' // Purchase expense
  | 'transport' // Transport/vehicle expense
  | 'office' // Office expense
  | 'utility' // Utility bills
  | 'maintenance' // Maintenance/repair
  | 'marketing' // Marketing/advertising
  | 'other' // Other expenses

/** Manual sales (closing) or extra money (opening) by payment method - outside system */
export interface ManualExtraAmounts {
  cash?: number
  upi?: number
  card?: number
  other?: number
}

export interface CashDenominations {
  notes_2000?: number // Number of ₹2000 notes
  notes_500?: number // Number of ₹500 notes
  notes_200?: number // Number of ₹200 notes
  notes_100?: number // Number of ₹100 notes
  notes_50?: number // Number of ₹50 notes
  notes_20?: number // Number of ₹20 notes
  notes_10?: number // Number of ₹10 notes
  coins_10?: number // Number of ₹10 coins
  coins_5?: number // Number of ₹5 coins
  coins_2?: number // Number of ₹2 coins
  coins_1?: number // Number of ₹1 coins
}

export interface Expense {
  id: number
  expense_date: string
  expense_type: ExpenseType
  amount: number
  description: string
  sales_person_id?: number // If expense is related to sales person
  sales_person_name?: string
  payment_method: 'cash' | 'card' | 'upi' | 'other'
  receipt_number?: string // Receipt/bill number
  category?: string // Expense category for grouping
  // Cash denominations for opening/closing
  cash_denominations?: CashDenominations
  /** For closing: manual sales (outside system). For opening: extra money (carry forward). */
  manual_extra?: ManualExtraAmounts
  /** Optional remark for opening/closing entries */
  remark?: string
  company_id?: number
  created_by: number
  created_at: string
  updated_at?: string
}

