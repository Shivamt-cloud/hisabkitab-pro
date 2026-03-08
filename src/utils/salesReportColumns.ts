/**
 * Column configuration for Sales Reports - user-selectable columns per view
 */

export type SalesReportView = 'product' | 'category' | 'customer' | 'salesperson' | 'sales' | 'alteration'

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
    { key: 'payment', label: 'Payment' },
    { key: 'internal_remarks', label: 'Remark' },
    { key: 'notes', label: 'Notes' },
  ],
  alteration: [
    { key: 'sale_date', label: 'Time' },
    { key: 'sale_date_full', label: 'Date' },
    { key: 'invoice_number', label: 'Invoice' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'alteration_purpose', label: 'Purpose' },
    { key: 'alteration_sent_to', label: 'Sent to' },
    { key: 'amount_to_pay', label: 'Amount to Pay' },
    { key: 'grand_total', label: 'Amount' },
    { key: 'balance_due', label: 'Due Pending' },
    { key: 'payment', label: 'Payment' },
    { key: 'notes', label: 'Notes' },
  ],
}

export const DEFAULT_VISIBLE_COLUMNS: Record<SalesReportView, string[]> = {
  product: ['product_name', 'total_quantity', 'total_revenue', 'total_cost', 'total_profit', 'profit_margin', 'average_price', 'sale_count'],
  category: ['category_name', 'total_quantity', 'total_revenue', 'total_cost', 'total_profit', 'profit_margin', 'product_count', 'sale_count'],
  customer: ['customer_name', 'total_quantity', 'total_revenue', 'total_cost', 'total_profit', 'profit_margin', 'sale_count', 'average_order_value'],
  salesperson: ['sales_person_name', 'total_quantity', 'total_revenue', 'total_cost', 'total_profit', 'profit_margin', 'commission_amount', 'sale_count'],
  sales: ['sale_date', 'invoice_number', 'sale_type', 'customer_name', 'sales_person_name', 'items_count', 'grand_total', 'return_amount', 'payment', 'internal_remarks'],
  alteration: ['sale_date', 'sale_date_full', 'invoice_number', 'customer_name', 'alteration_purpose', 'alteration_sent_to', 'amount_to_pay', 'grand_total', 'balance_due', 'payment', 'notes'],
}

const STORAGE_PREFIX = 'salesReport_visibleColumns_'

export const getStorageKey = (view: SalesReportView) => `${STORAGE_PREFIX}${view}`
