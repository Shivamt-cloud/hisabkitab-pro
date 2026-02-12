/** Type of employee payment – salary or commission */
export type EmployeePaymentType = 'salary' | 'commission'

/**
 * Salary or commission payment record – when salary/commission was given to a sales person / employee
 */
export interface SalaryPayment {
  id: number
  sales_person_id: number
  sales_person_name?: string
  /** Whether this record is salary or commission (default 'salary' for backward compatibility) */
  payment_type?: EmployeePaymentType
  payment_date: string // ISO date
  amount: number
  /** Period this salary is for, e.g. "2025-01" for Jan 2025 */
  for_period?: string
  payment_method?: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other'
  notes?: string
  company_id?: number
  created_at: string
  updated_at?: string
}
