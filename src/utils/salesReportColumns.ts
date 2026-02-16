/**
 * Column configuration for Sales Reports - user-selectable columns per view
 */

export type SalesReportView = 'product' | 'category' | 'customer' | 'salesperson' | 'sales'

export const SALES_REPORT_COLUMNS: Record<SalesReportView, { key: string; label: string }[]> = {
  product: [
    { key: 'product_name', label: 'Product' },
    { key: 'total_quantity', label: 'Quantity' },
    { key: 'total_revenue', label: 'Revenue' },
    { key: 'total_cost', label: 'Cost' },
    { key: 'total_profit', label: 'Profit' },
    { key: 'profit_margin', label: 'Margin %' },
    { key: 'average_price', label: 'Avg Price' },
    { key: 'sale_count', label: 'Sales Count' },
  ],
  category: [
    { key: 'category_name', label: 'Category' },
    { key: 'total_quantity', label: 'Quantity' },
    { key: 'total_revenue', label: 'Revenue' },
    { key: 'total_cost', label: 'Cost' },
    { key: 'total_profit', label: 'Profit' },
    { key: 'profit_margin', label: 'Margin %' },
    { key: 'product_count', label: 'Products' },
    { key: 'sale_count', label: 'Sales Count' },
  ],
  customer: [
    { key: 'customer_name', label: 'Customer' },
    { key: 'total_quantity', label: 'Quantity' },
    { key: 'total_revenue', label: 'Revenue' },
    { key: 'total_cost', label: 'Cost' },
    { key: 'total_profit', label: 'Profit' },
    { key: 'profit_margin', label: 'Margin %' },
    { key: 'sale_count', label: 'Orders' },
    { key: 'average_order_value', label: 'Avg Order' },
  ],
  salesperson: [
    { key: 'sales_person_name', label: 'Sales Person' },
    { key: 'total_quantity', label: 'Quantity' },
    { key: 'total_revenue', label: 'Revenue' },
    { key: 'total_cost', label: 'Cost' },
    { key: 'total_profit', label: 'Profit' },
    { key: 'profit_margin', label: 'Margin %' },
    { key: 'commission_amount', label: 'Commission' },
    { key: 'sale_count', label: 'Sales Count' },
  ],
  sales: [
    { key: 'sale_date', label: 'Date' },
    { key: 'invoice_number', label: 'Invoice' },
    { key: 'sale_type', label: 'Type' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'sales_person_name', label: 'Sales Person' },
    { key: 'items_count', label: 'Items' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'discount', label: 'Discount' },
    { key: 'tax_amount', label: 'Tax' },
    { key: 'grand_total', label: 'Amount' },
    { key: 'return_amount', label: 'Return' },
    { key: 'payment_status', label: 'Payment' },
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'internal_remarks', label: 'Remark' },
    { key: 'notes', label: 'Notes' },
  ],
}

export const DEFAULT_VISIBLE_COLUMNS: Record<SalesReportView, string[]> = {
  product: ['product_name', 'total_quantity', 'total_revenue', 'total_cost', 'total_profit', 'profit_margin', 'average_price', 'sale_count'],
  category: ['category_name', 'total_quantity', 'total_revenue', 'total_cost', 'total_profit', 'profit_margin', 'product_count', 'sale_count'],
  customer: ['customer_name', 'total_quantity', 'total_revenue', 'total_cost', 'total_profit', 'profit_margin', 'sale_count', 'average_order_value'],
  salesperson: ['sales_person_name', 'total_quantity', 'total_revenue', 'total_cost', 'total_profit', 'profit_margin', 'commission_amount', 'sale_count'],
  sales: ['sale_date', 'invoice_number', 'sale_type', 'customer_name', 'sales_person_name', 'items_count', 'grand_total', 'return_amount', 'payment_status', 'payment_method', 'internal_remarks'],
}

const STORAGE_PREFIX = 'salesReport_visibleColumns_'

export const getStorageKey = (view: SalesReportView) => `${STORAGE_PREFIX}${view}`
