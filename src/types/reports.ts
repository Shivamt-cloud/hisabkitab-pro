export interface SalesByProductReport {
  product_id: number
  product_name: string
  total_quantity: number
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_margin: number
  average_price: number
  sale_count: number
}

export interface SalesByCategoryReport {
  category_id?: number
  category_name: string
  total_quantity: number
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_margin: number
  product_count: number
  sale_count: number
}

export interface SalesByCustomerReport {
  customer_id?: number
  customer_name: string
  total_quantity: number
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_margin: number
  sale_count: number
  average_order_value: number
}

export interface SalesBySalesPersonReport {
  sales_person_id?: number
  sales_person_name: string
  total_quantity: number
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_margin: number
  commission_amount: number
  sale_count: number
}

export interface ProductPerformanceReport {
  product_id: number
  product_name: string
  category_name?: string
  current_stock: number
  min_stock_level?: number
  total_sold: number
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_margin: number
  average_selling_price: number
  last_sold_date?: string
  performance: 'fast_moving' | 'slow_moving' | 'normal'
}

export interface ProfitAnalysisReport {
  period: string // 'day', 'week', 'month', 'year', or date string
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_margin: number
  sale_count: number
  return_count: number
  return_amount: number
}

export interface CategoryProfitReport {
  category_id?: number
  category_name: string
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_margin: number
  product_count: number
  sale_count: number
}

export type ReportTimePeriod = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom' | 'all'

export interface DateRange {
  startDate?: string
  endDate?: string
}

// Purchase report types
export interface PurchasesBySupplierReport {
  supplier_id?: number
  supplier_name: string
  total_quantity: number
  total_amount: number
  purchase_count: number
  pending_amount: number
  average_order_value: number
}export interface PurchasesByProductReport {
  product_id: number
  product_name: string
  category_name: string
  total_quantity: number
  total_amount: number
  average_unit_price: number
  purchase_count: number
  supplier_names: string[] // Suppliers from whom this product was bought
}

export interface PurchasesByCategoryReport {
  category_id?: number
  category_name: string
  total_quantity: number
  total_amount: number
  product_count: number
  purchase_count: number
}

// Expense report types
export interface ExpensesByCategoryReport {
  expense_type: string
  category_label: string
  total_amount: number
  expense_count: number
  payment_methods: Record<string, number>
}

export interface ExpensesByPeriodReport {
  period: string
  total_amount: number
  expense_count: number
}

export interface ExpenseVsIncomeReport {
  period: string
  total_expense: number
  total_income: number
  net: number // income - expense
  expense_count: number
  sale_count: number
}
