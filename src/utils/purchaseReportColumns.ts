/**
 * Column configuration for Purchase Reports - user-selectable columns per view
 */

export type PurchaseReportView = 'supplier' | 'product' | 'category' | 'purchases'

export const PURCHASE_REPORT_COLUMNS: Record<PurchaseReportView, { key: string; label: string }[]> = {
  supplier: [
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'total_quantity', label: 'Quantity' },
    { key: 'total_amount', label: 'Amount' },
    { key: 'purchase_count', label: 'Purchases' },
    { key: 'pending_amount', label: 'Pending' },
    { key: 'average_order_value', label: 'Avg Order' },
  ],
  product: [
    { key: 'product_name', label: 'Product' },
    { key: 'category_name', label: 'Category' },
    { key: 'total_quantity', label: 'Quantity' },
    { key: 'total_amount', label: 'Amount' },
    { key: 'average_unit_price', label: 'Avg Price' },
    { key: 'purchase_count', label: 'Purchases' },
    { key: 'supplier_names', label: 'Suppliers' },
  ],
  category: [
    { key: 'category_name', label: 'Category' },
    { key: 'total_quantity', label: 'Quantity' },
    { key: 'total_amount', label: 'Amount' },
    { key: 'product_count', label: 'Products' },
    { key: 'purchase_count', label: 'Purchases' },
  ],
  purchases: [
    { key: 'purchase_date', label: 'Date' },
    { key: 'invoice_number', label: 'Invoice' },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'items_count', label: 'Items' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'tax_amount', label: 'Tax' },
    { key: 'grand_total', label: 'Amount' },
    { key: 'payment_status', label: 'Payment' },
    { key: 'notes', label: 'Notes' },
  ],
}

export const DEFAULT_VISIBLE_COLUMNS: Record<PurchaseReportView, string[]> = {
  supplier: ['supplier_name', 'total_quantity', 'total_amount', 'purchase_count', 'pending_amount', 'average_order_value'],
  product: ['product_name', 'category_name', 'total_quantity', 'total_amount', 'average_unit_price', 'purchase_count', 'supplier_names'],
  category: ['category_name', 'total_quantity', 'total_amount', 'product_count', 'purchase_count'],
  purchases: ['purchase_date', 'invoice_number', 'supplier_name', 'items_count', 'grand_total', 'payment_status'],
}

const STORAGE_PREFIX = 'purchaseReport_visibleColumns_'

export const getStorageKey = (view: PurchaseReportView) => `${STORAGE_PREFIX}${view}`
