export interface SalesPerson {
  id: number
  name: string
  email?: string
  phone?: string
  employee_id?: string
  commission_rate?: number // Default commission rate (percentage)
  is_active: boolean
  created_at: string
  updated_at?: string
}

export type CommissionType = 'percentage' | 'per_piece'

export interface CategoryCommission {
  id: number
  category_id: number // Can be main category or sub-category
  category_name?: string
  commission_type: CommissionType
  commission_value: number // Percentage (0-100) or amount per piece
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface SalesPersonCategoryAssignment {
  id: number
  sales_person_id: number
  sales_person_name?: string
  category_id: number // Sub-category ID
  category_name?: string
  parent_category_name?: string // Parent category name for display
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface SalesPersonCommission {
  sales_person_id: number
  sales_person_name?: string
  sale_id: number
  category_id: number
  category_name?: string
  product_id: number
  product_name?: string
  quantity: number
  unit_price: number
  subtotal: number
  commission_type: CommissionType
  commission_rate: number // The actual commission rate/value used
  commission_amount: number
  sale_date: string
  created_at: string
}

