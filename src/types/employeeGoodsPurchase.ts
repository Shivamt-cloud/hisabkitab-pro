/**
 * Employee goods purchase – amount to deduct from salary (e.g. advance, goods taken by employee)
 * Stored per employee per period (month) so we can track multiple months.
 */
export interface EmployeeGoodsPurchase {
  id: number
  sales_person_id: number
  sales_person_name?: string
  /** Period (month) e.g. "2025-01" */
  period: string
  amount: number
  notes?: string
  company_id?: number
  created_at: string
  updated_at?: string
}
