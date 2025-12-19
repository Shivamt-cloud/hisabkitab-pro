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

