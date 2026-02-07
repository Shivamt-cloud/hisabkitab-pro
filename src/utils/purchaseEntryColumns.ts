import type { PriceSegment } from '../types/priceList'

/**
 * Column configuration for purchase entry (GST & Simple) - Excel-like grid with user-selectable columns
 */

export const PURCHASE_ENTRY_COLUMN_KEYS = [
  { key: 'product', label: 'Product', gstOnly: false },
  { key: 'type', label: 'Type (Purchase/Return)', gstOnly: false },
  { key: 'article', label: 'Article', gstOnly: false },
  { key: 'batch_no', label: 'Batch No', gstOnly: false },
  { key: 'expiry', label: 'Expiry', gstOnly: false },
  { key: 'barcode', label: 'Barcode', gstOnly: false },
  { key: 'color', label: 'Color', gstOnly: false },
  { key: 'size', label: 'Size', gstOnly: false },
  { key: 'qty', label: 'Qty', gstOnly: false },
  { key: 'remaining_qty', label: 'Remaining Qty', gstOnly: false },
  { key: 'purchase_price', label: 'Purchase Price', gstOnly: false },
  { key: 'mrp', label: 'MRP', gstOnly: false },
  { key: 'sale_price', label: 'Sale (Default)', gstOnly: false },
  { key: 'discount_pct', label: 'Discount %', gstOnly: true },
  { key: 'gst_rate', label: 'GST %', gstOnly: true },
  { key: 'margin', label: 'Margin', gstOnly: false },
  { key: 'min_stock', label: 'Min Stock', gstOnly: false },
  { key: 'total', label: 'Total', gstOnly: false },
] as const

/** Segment sale price column key prefix */
export const SEGMENT_COLUMN_PREFIX = 'sale_segment_'

/** Get column keys for segment-wise sale prices */
export const getSegmentColumnKeys = (segments: PriceSegment[]) =>
  segments.map(s => ({ key: `${SEGMENT_COLUMN_PREFIX}${s.id}` as const, label: `Sale (${s.name})`, gstOnly: false }))

export const getColumnKeysForForm = (isGst: boolean, segments: PriceSegment[] = []) => {
  const base = PURCHASE_ENTRY_COLUMN_KEYS.filter(c => !c.gstOnly || isGst)
  const segmentCols = getSegmentColumnKeys(segments)
  return [...base, ...segmentCols]
}

export const DEFAULT_VISIBLE_COLUMNS_GST = [
  'product', 'type', 'article', 'barcode', 'qty', 'purchase_price', 'mrp', 'sale_price', 'discount_pct', 'total',
]

export const DEFAULT_VISIBLE_COLUMNS_SIMPLE = [
  'product', 'type', 'article', 'barcode', 'qty', 'purchase_price', 'mrp', 'sale_price', 'total',
]

export const PURCHASE_ENTRY_COLUMNS_STORAGE_KEY = 'purchaseEntry_visibleColumns'
export const PURCHASE_ENTRY_COLUMNS_STORAGE_KEY_SIMPLE = 'purchaseEntry_visibleColumns_simple'

// Compact input class for Excel-like grid
export const EXCEL_INPUT_CLASS = 'w-full min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none'
export const EXCEL_SELECT_CLASS = 'w-full min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white'
