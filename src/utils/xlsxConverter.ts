/**
 * XLSX to JSON Converter for HisabKitab-Pro
 * Converts Excel files to the backup JSON format
 */

import * as XLSX from 'xlsx'

export interface ConversionResult {
  success: boolean
  message: string
  jsonData?: string
  stats?: {
    suppliers?: number
    purchases?: number
    products?: number
    customers?: number
    categories?: number
  }
  /** Number of missing required values (Supplier Name, Bill No, Bill Date, Product/Desc, Qty) that were filled with placeholders */
  placeholderChangeCount?: number
  validationWarnings?: {
    isValid: boolean
    missingColumns: string[]
    sheetName: string
    explanation: string
  }[]
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: any): string {
  if (!dateStr) {
    return new Date().toISOString()
  }

  // If it's already a Date object
  if (dateStr instanceof Date) {
    return dateStr.toISOString()
  }

  const str = String(dateStr).trim()
  if (str === '') return new Date().toISOString()

  // Excel / Mac Numbers: date as number (e.g. 44927) or string number ("44927")
  const asNum = typeof dateStr === 'number' ? dateStr : (str.match(/^\d+$/) ? parseInt(str, 10) : NaN)
  if (!isNaN(asNum) && asNum > 0) {
    try {
      // Excel/Mac Numbers: serial 1 = 1900-01-01, so epoch is 1899-12-31
      const excelEpoch = new Date(1899, 11, 31)
      const date = new Date(excelEpoch.getTime() + asNum * 86400000)
      if (!isNaN(date.getTime())) return date.toISOString()
    } catch {
      // fall through to string parsing
    }
  }

  // Try common date formats
  const formats = [
    /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/,  // 07-Apr-2025
    /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/,  // 08/Apr/2025
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,  // 07-04-2025
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // 07/04/2025
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,  // 2025-04-07
  ]

  for (const format of formats) {
    const match = str.match(format)
    if (match) {
      try {
        const date = new Date(str)
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      } catch {
        continue
      }
    }
  }

  // Try direct Date parsing
  try {
    const date = new Date(str)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch {
    // Fall through
  }

  return new Date().toISOString()
}

/**
 * Safe cell read: if column index is out of bounds or value is missing, return null (column not present = blank)
 */
function safeCell(row: any[], index: number | null): any {
  if (index === null || index < 0) return null
  if (!row || index >= row.length) return null
  const v = row[index]
  return v === undefined ? null : v
}

/**
 * Clean and convert value to string; missing column => '' (blank)
 */
function cleanString(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

/**
 * Clean and convert value to number; missing column => 0
 */
function cleanNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0
  }
  if (typeof value === 'number') {
    return value
  }
  try {
    const cleaned = String(value).replace(/,/g, '').replace(/\s/g, '').trim()
    return parseFloat(cleaned) || 0
  } catch {
    return 0
  }
}

/**
 * Clean and convert value to integer; missing column => 0
 */
function cleanInt(value: any): number {
  return Math.round(cleanNumber(value))
}

/** String from row column: missing column or empty => '' */
function cellStr(row: any[], index: number | null): string {
  return cleanString(safeCell(row, index))
}

/** Number from row column: missing column or empty => 0 */
function cellNum(row: any[], index: number | null): number {
  return cleanNumber(safeCell(row, index))
}

/** Optional value: missing column or empty => null */
function cellOptional(row: any[], index: number | null): any {
  const v = safeCell(row, index)
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : v
}

/** Optional number: missing column or empty => null; otherwise number */
function cellNumOptional(row: any[], index: number | null): number | null {
  const v = safeCell(row, index)
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '') return null
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

/**
 * Find column index by matching keywords
 */
function findColumnIndex(headers: string[], keywords: string[]): number | null {
  const headersLower = headers.map(h => String(h).toLowerCase().trim())
  for (const keyword of keywords) {
    const kw = keyword.toLowerCase()
    const index = headersLower.findIndex(h => h && h.includes(kw))
    if (index !== -1) {
      return index
    }
  }
  return null
}

/** Try multiple rows as header and return the first result that has purchase data */
function tryConvertPurchaseSheet(jsonData: any[][]): { purchases: any[]; suppliers: any[]; placeholderChangeCount: number } {
  const maxHeaderRow = Math.min(15, Math.max(0, jsonData.length - 2))
  let best = { purchases: [] as any[], suppliers: [] as any[], placeholderChangeCount: 0 }
  for (let headerRow = 0; headerRow <= maxHeaderRow; headerRow++) {
    const headerRowData = jsonData[headerRow]
    if (!headerRowData || !Array.isArray(headerRowData)) continue
    const headers = headerRowData.map((h: any) => String(h ?? '').trim())
    const rows = jsonData.slice(headerRow + 1)
    const result = convertPurchaseData(rows, headers)
    if (result.purchases.length > 0) return result
    best = result
  }
  return best
}

/**
 * Validate Excel format for purchases sheet
 */
function validatePurchaseFormat(headers: string[]): {
  isValid: boolean
  missingColumns: string[]
  explanation: string
} {
  const requiredColumns = [
    { keywords: ['customer name', 'supplier name', 'vendor name', 'supplier'], name: 'Supplier/Customer Name' },
    { keywords: ['bill no', 'invoice no', 'invoice number', 'bill number'], name: 'Invoice/Bill Number' },
    { keywords: ['bill date', 'invoice date', 'date', 'purchase date'], name: 'Invoice/Bill Date' },
    { keywords: ['desc', 'description', 'product', 'item', 'product name'], name: 'Product/Item Description' },
    { keywords: ['qty', 'quantity'], name: 'Quantity' },
  ]

  const missingColumns: string[] = []
  
  for (const column of requiredColumns) {
    const found = findColumnIndex(headers, column.keywords)
    if (found === null) {
      missingColumns.push(column.name)
    }
  }

  const isValid = missingColumns.length === 0
  
  let explanation = ''
  if (!isValid) {
    explanation = `The Excel file is missing required columns for purchase data:\n\n`
    explanation += `❌ Missing: ${missingColumns.join(', ')}\n\n`
    explanation += `Required columns for Purchase sheet:\n`
    explanation += `• Supplier/Customer Name (or "Customer Name", "Supplier Name", "Vendor Name")\n`
    explanation += `• Invoice/Bill Number (or "Bill No", "Invoice No", "Invoice Number")\n`
    explanation += `• Invoice/Bill Date (or "Bill Date", "Invoice Date", "Date", "Purchase Date")\n`
    explanation += `• Product/Item Description (or "Desc", "Description", "Product", "Item", "Product Name")\n`
    explanation += `• Quantity (or "Qty")\n\n`
    explanation += `💡 Tip: Download the sample Excel template to see the correct format.`
  }

  return { isValid, missingColumns, explanation }
}

/**
 * Validate Excel format for products sheet
 */
function validateProductFormat(headers: string[]): {
  isValid: boolean
  missingColumns: string[]
  explanation: string
} {
  const requiredColumns = [
    { keywords: ['name', 'product name', 'product'], name: 'Product Name' },
  ]

  const missingColumns: string[] = []
  
  for (const column of requiredColumns) {
    const found = findColumnIndex(headers, column.keywords)
    if (found === null) {
      missingColumns.push(column.name)
    }
  }

  const isValid = missingColumns.length === 0
  
  let explanation = ''
  if (!isValid) {
    explanation = `The Excel file is missing required columns for product data:\n\n`
    explanation += `❌ Missing: ${missingColumns.join(', ')}\n\n`
    explanation += `Required columns for Products sheet:\n`
    explanation += `• Product Name (or "Name", "Product")\n\n`
    explanation += `💡 Tip: Download the sample Excel template to see the correct format.`
  }

  return { isValid, missingColumns, explanation }
}

/**
 * Validate Excel format for suppliers sheet
 */
function validateSupplierFormat(headers: string[]): {
  isValid: boolean
  missingColumns: string[]
  explanation: string
} {
  const requiredColumns = [
    { keywords: ['name', 'supplier name', 'vendor name'], name: 'Supplier Name' },
  ]

  const missingColumns: string[] = []
  
  for (const column of requiredColumns) {
    const found = findColumnIndex(headers, column.keywords)
    if (found === null) {
      missingColumns.push(column.name)
    }
  }

  const isValid = missingColumns.length === 0
  
  let explanation = ''
  if (!isValid) {
    explanation = `The Excel file is missing required columns for supplier data:\n\n`
    explanation += `❌ Missing: ${missingColumns.join(', ')}\n\n`
    explanation += `Required columns for Suppliers sheet:\n`
    explanation += `• Supplier Name (or "Name", "Vendor Name")\n\n`
    explanation += `💡 Tip: Download the sample Excel template to see the correct format.`
  }

  return { isValid, missingColumns, explanation }
}

/**
 * Validate Excel format for customers sheet
 */
function validateCustomerFormat(headers: string[]): {
  isValid: boolean
  missingColumns: string[]
  explanation: string
} {
  const requiredColumns = [
    { keywords: ['name', 'customer name'], name: 'Customer Name' },
  ]

  const missingColumns: string[] = []
  
  for (const column of requiredColumns) {
    const found = findColumnIndex(headers, column.keywords)
    if (found === null) {
      missingColumns.push(column.name)
    }
  }

  const isValid = missingColumns.length === 0
  
  let explanation = ''
  if (!isValid) {
    explanation = `The Excel file is missing required columns for customer data:\n\n`
    explanation += `❌ Missing: ${missingColumns.join(', ')}\n\n`
    explanation += `Required columns for Customers sheet:\n`
    explanation += `• Customer Name (or "Name") — required\n`
    explanation += `• Phone, Email, GSTIN, Address, etc. — optional\n\n`
    explanation += `💡 Tip: Download the sample Excel template to see the correct format.`
  }

  return { isValid, missingColumns, explanation }
}

/**
 * Convert purchase data from Excel to JSON format
 */
/** Generate a short random suffix for placeholders to keep keys unique */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

function convertPurchaseData(rows: any[][], headers: string[]): {
  suppliers: any[]
  purchases: any[]
  placeholderChangeCount: number
} {
  let placeholderChangeCount = 0
  // Find column indices (broad keywords to match Excel/Numbers variants)
  const supplierNameIdx = findColumnIndex(headers, ['supplier name', 'customer name', 'vendor name', 'vendor', 'supplier', 'party name', 'party', 'from', 'name of supplier'])
  const gstinIdx = findColumnIndex(headers, ['gst number', 'gstin', 'gst no', 'gst'])
  const invoiceNumberIdx = findColumnIndex(headers, ['bill no', 'invoice no', 'invoice number', 'bill number', 'inv no', 'inv no.', 'invoice #', 'bill #', 'invoice', 'bill no.'])
  const invoiceDateIdx = findColumnIndex(headers, ['bill date', 'invoice date', 'date', 'purchase date', 'bill dt', 'invoice dt', 'dt'])
  const hsnCodeIdx = findColumnIndex(headers, ['hsn', 'hsn code', 'hsn_code'])
  // Prefer "Product" column for item name (avoids confusion with Desc); fallback to Desc/description
  const productNameIdx = findColumnIndex(headers, ['product', 'product name', 'item', 'particulars', 'item name', 'item description', 'description'])
  const descriptionIdx = findColumnIndex(headers, ['desc', 'description'])
  const articleIdx = findColumnIndex(headers, ['article', 'article no', 'article number', 'article code', 'art'])
  const barcodeIdx = findColumnIndex(headers, ['barcode', 'barcode no', 'barcode number', 'ean'])
  const gstRateIdx = findColumnIndex(headers, ['gst%', 'gst rate', 'gst_percent', 'tax rate', 'gst'])
  const quantityIdx = findColumnIndex(headers, ['qty', 'quantity', 'qty.', 'nos', 'no. of', 'number'])
  const unitIdx = findColumnIndex(headers, ['unit', 'uom', 'unit of measure'])
  const taxableAmountIdx = findColumnIndex(headers, ['taxable amt', 'taxable amount', 'subtotal', 'base amount'])
  const sgstIdx = findColumnIndex(headers, ['sgst'])
  const cgstIdx = findColumnIndex(headers, ['cgst'])
  const igstIdx = findColumnIndex(headers, ['igst'])
  const totalAmountIdx = findColumnIndex(headers, ['bill amt', 'total', 'grand total', 'bill amount'])
  const purchasePriceIdx = findColumnIndex(headers, ['purchase', 'purchase price', 'cost', 'cost price'])
  const salePriceIdx = findColumnIndex(headers, ['sale', 'sale price', 'selling price', 'sell price'])
  const mrpIdx = findColumnIndex(headers, ['mrp', 'maximum retail price', 'max retail price'])

  // Positional fallback: if header matching failed (e.g. merged cells, different locale), use sample-template column order: SrNo, Supplier, GST, Bill No, Bill Date, HSN, Product, Desc, Article, Barcode, GST%, Qty, ...
  const col = (idx: number | null, fallback: number) => (idx !== null ? idx : (headers.length > fallback ? fallback : 0))
  const sIdx = col(supplierNameIdx, 1)
  const iIdx = col(invoiceNumberIdx, 3)
  const dIdx = col(invoiceDateIdx, 4)
  const qIdx = col(quantityIdx, 11)
  const descIdx = descriptionIdx ?? productNameIdx ?? 6

  const purchasesDict: Record<string, any> = {}
  const suppliersDict: Record<string, any> = {}
  let purchaseId = 1

  // Carry-forward: many Excel sheets have Supplier/Bill No only on the first row of each bill; line-item rows have empty cells
  let lastSupplierName = ''
  let lastInvoiceNumber = ''
  let lastInvoiceDate = ''
  let lastGstin = ''

  for (const row of rows) {
    // Normalize: xlsx can return object or sparse array; ensure we have an array
    const r = Array.isArray(row) ? row : (row && typeof row === 'object' ? Object.values(row) : [])
    if (!r || r.length === 0) continue

    try {
      const rawSupplierName = cellStr(r, sIdx)
      const rawGstin = cellStr(r, gstinIdx)
      const rawInvoiceNumber = cellStr(r, iIdx)
      const rawInvoiceDate = safeCell(r, dIdx)

      // Skip row if it looks like a header row (e.g. "Supplier Name", "Bill No")
      const looksLikeHeader = /^(supplier name|bill no|invoice no|sr\s*no|s\.?no\.?|date|qty|product|desc)$/i.test(rawSupplierName) ||
        /^(supplier name|bill no|invoice no|sr\s*no|date|qty)$/i.test(rawInvoiceNumber)
      if (looksLikeHeader) continue

      // Use current row values, or carry forward, or fill with placeholder so row is not skipped
      let supplierName = rawSupplierName || lastSupplierName
      let gstin = rawGstin || lastGstin
      let invoiceNumber = rawInvoiceNumber || lastInvoiceNumber
      let invoiceDate = rawInvoiceDate != null && String(rawInvoiceDate).trim() !== ''
        ? parseDate(rawInvoiceDate)
        : (lastInvoiceDate || new Date().toISOString())

      if (!supplierName) {
        supplierName = `(No supplier - ${randomSuffix()})`
        placeholderChangeCount++
      }
      if (!invoiceNumber) {
        invoiceNumber = `(No bill no - ${randomSuffix()})`
        placeholderChangeCount++
      }
      if (!invoiceDate) invoiceDate = new Date().toISOString()
      if (!(rawInvoiceDate != null && String(rawInvoiceDate).trim() !== '') && !lastInvoiceDate)
        placeholderChangeCount++

      // Update carry-forward when this row had header info (so next rows can use it)
      if (rawSupplierName) lastSupplierName = rawSupplierName.trim()
      if (rawInvoiceNumber) lastInvoiceNumber = rawInvoiceNumber.trim()
      if (rawInvoiceDate != null && String(rawInvoiceDate).trim() !== '') lastInvoiceDate = parseDate(rawInvoiceDate)
      if (rawGstin) lastGstin = rawGstin

      // Create supplier if not exists
      const supplierKey = supplierName.toUpperCase().trim()
      if (!suppliersDict[supplierKey]) {
        suppliersDict[supplierKey] = {
          id: Object.keys(suppliersDict).length + 1,
          name: supplierName.trim(),
          gstin: gstin || null,
          email: null,
          phone: null,
          address: null,
          city: null,
          state: null,
          pincode: null,
          contact_person: null,
          is_registered: !!gstin,
          company_id: 1,
          created_at: invoiceDate,
          updated_at: invoiceDate,
        }
      }

      const supplierId = suppliersDict[supplierKey].id

      // Create purchase key
      const purchaseKey = `${supplierKey}_${invoiceNumber}_${invoiceDate.substring(0, 10)}`

      if (!purchasesDict[purchaseKey]) {
        purchasesDict[purchaseKey] = {
          id: purchaseId++,
          type: 'gst',
          supplier_id: supplierId,
          supplier_name: supplierName.trim(),
          invoice_number: invoiceNumber,
          purchase_date: invoiceDate,
          items: [],
          subtotal: 0,
          total_tax: 0,
          grand_total: 0,
          payment_status: 'pending',
          payment_method: 'cash',
          notes: '',
          company_id: 1,
          created_by: 1,
          created_at: invoiceDate,
          updated_at: invoiceDate,
        }
      }

      const purchase = purchasesDict[purchaseKey]

      // Extract item data: missing column => blank/null; required (Product/Desc, Qty) => placeholder if missing
      const hsnCode = cellStr(r, hsnCodeIdx)
      const productName = cellStr(r, productNameIdx)
      const descValue = cellStr(r, descriptionIdx)
      let productOrDesc = productName || descValue || cellStr(r, descIdx) || hsnCode || ''
      if (!productOrDesc) {
        productOrDesc = '(No product)'
        placeholderChangeCount++
      } else if (productOrDesc === 'Unknown Product') {
        productOrDesc = '(No product)'
        placeholderChangeCount++
      }
      const article = cellStr(r, articleIdx)
      
      let barcode = ''
      const barcodeValue = safeCell(r, barcodeIdx ?? 9)
      if (barcodeValue !== null && barcodeValue !== undefined) {
        if (typeof barcodeValue === 'number') {
          barcode = String(Math.floor(barcodeValue))
        } else {
          barcode = String(barcodeValue).trim()
        }
        if (barcode === '' || barcode === 'null' || barcode === 'undefined') barcode = ''
      }
      const gstRate = cellNum(r, gstRateIdx)
      let quantity = cellNum(r, qIdx)
      if (quantity <= 0) {
        quantity = 1
        placeholderChangeCount++
      }
      const unit = cellStr(r, unitIdx) || 'pcs'
      const taxableAmount = cellNum(r, taxableAmountIdx)
      const sgstAmount = cellNum(r, sgstIdx)
      const cgstAmount = cellNum(r, cgstIdx)
      const igstAmount = cellNum(r, igstIdx)
      const totalAmount = cellNum(r, totalAmountIdx)
      
      const purchasePrice = cellNum(r, purchasePriceIdx)
      const salePrice = cellNum(r, salePriceIdx)
      const mrp = cellNum(r, mrpIdx)

      // Calculate unit price (prefer Purchase column, fallback to calculated from taxable amount)
      const unitPrice = purchasePrice > 0 ? purchasePrice : (quantity > 0 ? taxableAmount / quantity : 0)

      // Calculate tax rates
      const cgstRate = taxableAmount > 0 ? (cgstAmount / taxableAmount) * 100 : 0
      const sgstRate = taxableAmount > 0 ? (sgstAmount / taxableAmount) * 100 : 0
      const igstRate = taxableAmount > 0 ? (igstAmount / taxableAmount) * 100 : 0

      // Use provided GST rate or calculate from tax amounts
      const finalGstRate = gstRate > 0 ? gstRate : cgstRate + sgstRate + igstRate

      // Item total: use column value if present, else auto-calculate from quantity × unit price
      const itemTotal = totalAmount > 0
        ? Math.round(totalAmount * 100) / 100
        : (quantity > 0 && unitPrice >= 0 ? Math.round(quantity * unitPrice * 100) / 100 : 0)

      // Create purchase item; missing/blank columns => null
      const item = {
        product_id: null,
        product_name: productOrDesc,
        quantity: quantity,
        unit_price: Math.round(unitPrice * 100) / 100,
        purchase_price: Math.round(unitPrice * 100) / 100,
        mrp: mrp > 0 ? Math.round(mrp * 100) / 100 : null,
        sale_price: salePrice > 0 ? Math.round(salePrice * 100) / 100 : (mrp > 0 ? Math.round(mrp * 100) / 100 : null),
        hsn_code: hsnCode || null,
        gst_rate: Math.round(finalGstRate * 100) / 100,
        cgst_rate: cgstRate > 0 ? Math.round(cgstRate * 100) / 100 : null,
        sgst_rate: sgstRate > 0 ? Math.round(sgstRate * 100) / 100 : null,
        igst_rate: igstRate > 0 ? Math.round(igstRate * 100) / 100 : null,
        tax_amount: Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100,
        total: itemTotal,
        article: article || null,
        barcode: barcode || null,
      }

      purchase.items.push(item)
      const itemTotalForPurchase = itemTotal > 0 ? itemTotal : (taxableAmount + (cgstAmount + sgstAmount + igstAmount))
      purchase.subtotal = Math.round((purchase.subtotal + taxableAmount) * 100) / 100
      purchase.total_tax = Math.round((purchase.total_tax + cgstAmount + sgstAmount + igstAmount) * 100) / 100
      purchase.grand_total = Math.round((purchase.grand_total + (totalAmount > 0 ? totalAmount : itemTotalForPurchase)) * 100) / 100
    } catch (error) {
      console.error('Error processing row:', error)
      continue
    }
  }

  return {
    suppliers: Object.values(suppliersDict),
    purchases: Object.values(purchasesDict),
    placeholderChangeCount,
  }
}

/**
 * Convert Products sheet data
 */
function convertProductsData(rows: any[][], headers: string[]): any[] {
  const nameIdx = findColumnIndex(headers, ['name', 'product name', 'product'])
  const skuIdx = findColumnIndex(headers, ['sku', 'product code', 'code'])
  const barcodeIdx = findColumnIndex(headers, ['barcode', 'barcode no', 'ean'])
  const categoryIdx = findColumnIndex(headers, ['category', 'category name'])
  const descriptionIdx = findColumnIndex(headers, ['description', 'desc'])
  const unitIdx = findColumnIndex(headers, ['unit', 'uom', 'unit of measure'])
  const purchasePriceIdx = findColumnIndex(headers, ['purchase price', 'cost', 'cost price'])
  const sellingPriceIdx = findColumnIndex(headers, ['selling price', 'sale price', 'price'])
  const stockIdx = findColumnIndex(headers, ['stock quantity', 'stock', 'quantity', 'qty'])
  const minStockIdx = findColumnIndex(headers, ['min stock level', 'min stock', 'reorder level'])
  const hsnIdx = findColumnIndex(headers, ['hsn code', 'hsn', 'hsn_code'])
  const gstRateIdx = findColumnIndex(headers, ['gst rate', 'gst%', 'gst_percent', 'tax rate'])
  const taxTypeIdx = findColumnIndex(headers, ['tax type', 'tax_type'])

  const products: any[] = []
  let productId = 1

  for (const row of rows) {
    const r = Array.isArray(row) ? row : (row && typeof row === 'object' ? Object.values(row) : [])
    if (!r || r.length === 0) continue

    try {
      const name = cellStr(r, nameIdx)
      if (!name) continue

      const sku = cellStr(r, skuIdx)
      const barcodeVal = cellStr(r, barcodeIdx)
      products.push({
        id: productId++,
        name: name,
        sku: sku || null,
        barcode: barcodeVal || null,
        category_name: cellStr(r, categoryIdx) || null,
        description: cellStr(r, descriptionIdx) || null,
        unit: cellStr(r, unitIdx) || 'pcs',
        purchase_price: cellNum(r, purchasePriceIdx),
        selling_price: cellNum(r, sellingPriceIdx),
        stock_quantity: cellNum(r, stockIdx),
        min_stock_level: cellNumOptional(r, minStockIdx),
        hsn_code: cellStr(r, hsnIdx) || null,
        gst_rate: cellNum(r, gstRateIdx),
        tax_type: (cellStr(r, taxTypeIdx) || 'exclusive').toLowerCase(),
        is_active: true,
        status: 'active',
        barcode_status: barcodeVal ? 'active' : 'inactive',
      })
    } catch (error) {
      console.error('Error processing product row:', error)
      continue
    }
  }

  return products
}

/**
 * Convert Customers sheet data
 */
function convertCustomersData(rows: any[][], headers: string[]): any[] {
  const nameIdx = findColumnIndex(headers, ['name', 'customer name'])
  const emailIdx = findColumnIndex(headers, ['email'])
  const phoneIdx = findColumnIndex(headers, ['phone', 'mobile', 'contact'])
  const gstinIdx = findColumnIndex(headers, ['gstin', 'gst number', 'gst no', 'gst'])
  const addressIdx = findColumnIndex(headers, ['address'])
  const cityIdx = findColumnIndex(headers, ['city'])
  const stateIdx = findColumnIndex(headers, ['state'])
  const pincodeIdx = findColumnIndex(headers, ['pincode', 'pin code', 'zip'])
  const contactPersonIdx = findColumnIndex(headers, ['contact person', 'contact'])
  const creditLimitIdx = findColumnIndex(headers, ['credit limit', 'credit'])

  const customers: any[] = []
  let customerId = 1

  for (const row of rows) {
    const r = Array.isArray(row) ? row : (row && typeof row === 'object' ? Object.values(row) : [])
    if (!r || r.length === 0) continue

    try {
      const name = cellStr(r, nameIdx)
      if (!name) continue

      customers.push({
        id: customerId++,
        name: name,
        email: cellStr(r, emailIdx) || null,
        phone: cellStr(r, phoneIdx) || null,
        gstin: cellStr(r, gstinIdx) || null,
        address: cellStr(r, addressIdx) || null,
        city: cellStr(r, cityIdx) || null,
        state: cellStr(r, stateIdx) || null,
        pincode: cellStr(r, pincodeIdx) || null,
        contact_person: cellStr(r, contactPersonIdx) || null,
        credit_limit: cellNum(r, creditLimitIdx),
        is_active: true,
      })
    } catch (error) {
      console.error('Error processing customer row:', error)
      continue
    }
  }

  return customers
}

/**
 * Convert Suppliers sheet data
 */
function convertSuppliersData(rows: any[][], headers: string[]): any[] {
  const nameIdx = findColumnIndex(headers, ['name', 'supplier name', 'vendor name'])
  const emailIdx = findColumnIndex(headers, ['email'])
  const phoneIdx = findColumnIndex(headers, ['phone', 'mobile', 'contact'])
  const gstinIdx = findColumnIndex(headers, ['gstin', 'gst number', 'gst no', 'gst'])
  const addressIdx = findColumnIndex(headers, ['address'])
  const cityIdx = findColumnIndex(headers, ['city'])
  const stateIdx = findColumnIndex(headers, ['state'])
  const pincodeIdx = findColumnIndex(headers, ['pincode', 'pin code', 'zip'])
  const contactPersonIdx = findColumnIndex(headers, ['contact person', 'contact'])
  const isRegisteredIdx = findColumnIndex(headers, ['is registered', 'is_registered', 'registered'])

  const suppliers: any[] = []
  let supplierId = 1

  for (const row of rows) {
    const r = Array.isArray(row) ? row : (row && typeof row === 'object' ? Object.values(row) : [])
    if (!r || r.length === 0) continue

    try {
      const name = cellStr(r, nameIdx)
      if (!name) continue

      const isRegisteredStr = String(safeCell(r, isRegisteredIdx) ?? '').toLowerCase()
      const isRegistered = isRegisteredStr === 'yes' || isRegisteredStr === 'true' || isRegisteredStr === '1'
      const gstinVal = cellStr(r, gstinIdx)

      suppliers.push({
        id: supplierId++,
        name: name,
        email: cellStr(r, emailIdx) || null,
        phone: cellStr(r, phoneIdx) || null,
        gstin: gstinVal || null,
        address: cellStr(r, addressIdx) || null,
        city: cellStr(r, cityIdx) || null,
        state: cellStr(r, stateIdx) || null,
        pincode: cellStr(r, pincodeIdx) || null,
        contact_person: cellStr(r, contactPersonIdx) || null,
        is_registered: isRegistered || !!gstinVal,
      })
    } catch (error) {
      console.error('Error processing supplier row:', error)
      continue
    }
  }

  return suppliers
}

/**
 * Convert Categories sheet data
 */
function convertCategoriesData(rows: any[][], headers: string[]): { categories: any[], subCategories: any[] } {
  const nameIdx = findColumnIndex(headers, ['name', 'category name'])
  const descriptionIdx = findColumnIndex(headers, ['description', 'desc'])
  const parentCategoryIdx = findColumnIndex(headers, ['parent category', 'parent', 'parent name'])
  const isSubcategoryIdx = findColumnIndex(headers, ['is subcategory', 'is_subcategory', 'subcategory'])

  const categories: any[] = []
  const subCategories: any[] = []
  let categoryId = 1

  // First pass: create all categories (non-subcategories)
  for (const row of rows) {
    const r = Array.isArray(row) ? row : (row && typeof row === 'object' ? Object.values(row) : [])
    if (!r || r.length === 0) continue

    try {
      const name = cellStr(r, nameIdx)
      if (!name) continue

      const isSubcategoryStr = String(safeCell(r, isSubcategoryIdx) ?? '').toLowerCase()
      const isSubcategory = isSubcategoryStr === 'yes' || isSubcategoryStr === 'true' || isSubcategoryStr === '1'
      const parentCategoryName = cellStr(r, parentCategoryIdx)

      if (!isSubcategory && !parentCategoryName) {
        categories.push({
          id: categoryId++,
          name: name,
          description: cellStr(r, descriptionIdx) || null,
          parent_id: null,
          is_active: true,
        })
      }
    } catch (error) {
      console.error('Error processing category row:', error)
      continue
    }
  }

  // Second pass: create subcategories
  for (const row of rows) {
    const r = Array.isArray(row) ? row : (row && typeof row === 'object' ? Object.values(row) : [])
    if (!r || r.length === 0) continue

    try {
      const name = cellStr(r, nameIdx)
      if (!name) continue

      const isSubcategoryStr = String(safeCell(r, isSubcategoryIdx) ?? '').toLowerCase()
      const isSubcategory = isSubcategoryStr === 'yes' || isSubcategoryStr === 'true' || isSubcategoryStr === '1'
      const parentCategoryName = cellStr(r, parentCategoryIdx)

      if (isSubcategory || parentCategoryName) {
        // Find parent category
        const parentCategory = categories.find(c => c.name === parentCategoryName)
        if (parentCategory) {
          subCategories.push({
            id: categoryId++,
            name: name,
            description: cellStr(r, descriptionIdx) || null,
            parent_id: parentCategory.id,
            is_active: true,
          })
        }
      }
    } catch (error) {
      console.error('Error processing subcategory row:', error)
      continue
    }
  }

  return { categories, subCategories }
}

/**
 * Convert XLSX file to HisabKitab-Pro JSON format
 * Now processes all sheets: Purchases, Products, Customers, Suppliers, Categories
 */
export async function convertXLSXToJSON(file: File): Promise<ConversionResult> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Initialize result data
    let purchases: any[] = []
    let suppliers: any[] = []
    let products: any[] = []
    let customers: any[] = []
    let categories: any[] = []
    let subCategories: any[] = []
    let placeholderChangeCount = 0
    const validationWarnings: ConversionResult['validationWarnings'] = []

    // First pass: Validate all sheets
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]

      if (jsonData.length < 2) continue // Skip empty sheets

      const headers = jsonData[0].map(h => String(h).trim())
      const sheetNameLower = sheetName.toLowerCase()

      // Validate based on sheet type
      if (sheetNameLower.includes('purchase') || sheetNameLower.includes('bill')) {
        const validation = validatePurchaseFormat(headers)
        if (!validation.isValid) {
          validationWarnings.push({
            isValid: false,
            missingColumns: validation.missingColumns,
            sheetName: sheetName,
            explanation: validation.explanation,
          })
        }
      } else if (sheetNameLower.includes('product')) {
        const validation = validateProductFormat(headers)
        if (!validation.isValid) {
          validationWarnings.push({
            isValid: false,
            missingColumns: validation.missingColumns,
            sheetName: sheetName,
            explanation: validation.explanation,
          })
        }
      } else if (sheetNameLower.includes('supplier') || sheetNameLower.includes('vendor')) {
        const validation = validateSupplierFormat(headers)
        if (!validation.isValid) {
          validationWarnings.push({
            isValid: false,
            missingColumns: validation.missingColumns,
            sheetName: sheetName,
            explanation: validation.explanation,
          })
        }
      } else if (sheetNameLower.includes('customer')) {
        const validation = validateCustomerFormat(headers)
        if (!validation.isValid) {
          validationWarnings.push({
            isValid: false,
            missingColumns: validation.missingColumns,
            sheetName: sheetName,
            explanation: validation.explanation,
          })
        }
      }
    }

    // If no purchases sheet found, validate first sheet as purchases only when the first sheet
    // is not already a known type (Customers, Products, Suppliers, Categories) to avoid wrong warnings
    let hasPurchaseSheet = false
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toLowerCase().includes('purchase') || sheetName.toLowerCase().includes('bill')) {
        hasPurchaseSheet = true
        break
      }
    }

    const firstSheetNameLower = workbook.SheetNames.length > 0 ? workbook.SheetNames[0].toLowerCase() : ''
    const firstSheetIsOtherType =
      firstSheetNameLower.includes('customer') ||
      firstSheetNameLower.includes('product') ||
      firstSheetNameLower.includes('supplier') ||
      firstSheetNameLower.includes('vendor') ||
      firstSheetNameLower.includes('categor')

    if (!hasPurchaseSheet && workbook.SheetNames.length > 0 && !firstSheetIsOtherType) {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][]
      if (jsonData.length >= 2) {
        const headers = jsonData[0].map(h => String(h).trim())
        const validation = validatePurchaseFormat(headers)
        if (!validation.isValid) {
          validationWarnings.push({
            isValid: false,
            missingColumns: validation.missingColumns,
            sheetName: workbook.SheetNames[0],
            explanation: validation.explanation,
          })
        }
      }
    }

    // Process all sheets
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]

      if (jsonData.length < 2) continue // Skip empty sheets

      const headers = jsonData[0].map(h => String(h).trim())
      const rows = jsonData.slice(1)

      const sheetNameLower = sheetName.toLowerCase()

      // Process based on sheet name (merge all purchase/bill sheets so no data is lost)
      if (sheetNameLower.includes('purchase') || sheetNameLower.includes('bill')) {
        const result = tryConvertPurchaseSheet(jsonData)
        placeholderChangeCount += result.placeholderChangeCount
        const nextId = purchases.length > 0 ? Math.max(...purchases.map((p: any) => p.id)) + 1 : 1
        const suppliersMap = new Map(suppliers.map((s: any) => [s.name.toUpperCase(), s]))
        result.suppliers.forEach((s: any) => {
          const key = s.name.toUpperCase()
          if (!suppliersMap.has(key)) {
            suppliersMap.set(key, { ...s, id: suppliers.length + 1 })
            suppliers.push(suppliersMap.get(key))
          }
        })
        result.purchases.forEach((p: any, idx: number) => {
          purchases.push({
            ...p,
            id: nextId + idx,
            supplier_id: suppliersMap.get((p.supplier_name || '').toUpperCase().trim())?.id ?? p.supplier_id,
          })
        })
      } else if (sheetNameLower.includes('product')) {
        products = convertProductsData(rows, headers)
      } else if (sheetNameLower.includes('customer')) {
        customers = convertCustomersData(rows, headers)
      } else if (sheetNameLower.includes('supplier') || sheetNameLower.includes('vendor')) {
        const sheetSuppliers = convertSuppliersData(rows, headers)
        // Merge with existing suppliers
        const suppliersMap = new Map(suppliers.map(s => [s.name.toUpperCase(), s]))
        sheetSuppliers.forEach(s => {
          const key = s.name.toUpperCase()
          if (!suppliersMap.has(key)) {
            suppliersMap.set(key, s)
            suppliers.push(s)
          }
        })
      } else if (sheetNameLower.includes('categor')) {
        const result = convertCategoriesData(rows, headers)
        categories = result.categories
        subCategories = result.subCategories
      }
    }

    // If no purchases sheet found, or to pick up extra data: try first sheet and any sheet with many rows (merge all)
    if (workbook.SheetNames.length > 0) {
      const sheetsToTry: string[] = []
      if (purchases.length === 0 && !firstSheetIsOtherType) sheetsToTry.push(workbook.SheetNames[0])
      // Also try any sheet with many rows that wasn't already processed as purchase/bill (e.g. "Sheet 2", "Data", "Export")
      for (const name of workbook.SheetNames) {
        const n = name.toLowerCase()
        if (n.includes('purchase') || n.includes('bill')) continue
        if (n.includes('customer') || n.includes('product') || n.includes('supplier') || n.includes('vendor') || n.includes('categor')) continue
        const ws = workbook.Sheets[name]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
        if (data.length >= 10 && !sheetsToTry.includes(name)) sheetsToTry.push(name)
      }
      for (const sheetName of sheetsToTry) {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]
        if (jsonData.length >= 2) {
          const result = tryConvertPurchaseSheet(jsonData)
          if (result.purchases.length > 0) {
            placeholderChangeCount += result.placeholderChangeCount
            const nextId = purchases.length > 0 ? Math.max(...purchases.map((p: any) => p.id)) + 1 : 1
            const suppliersMap = new Map(suppliers.map((s: any) => [s.name.toUpperCase(), s]))
            result.suppliers.forEach((s: any) => {
              const key = s.name.toUpperCase()
              if (!suppliersMap.has(key)) {
                suppliersMap.set(key, { ...s, id: suppliers.length + 1 })
                suppliers.push(suppliersMap.get(key))
              }
            })
            result.purchases.forEach((p: any, idx: number) => {
              purchases.push({
                ...p,
                id: nextId + idx,
                supplier_id: suppliersMap.get((p.supplier_name || '').toUpperCase().trim())?.id ?? p.supplier_id,
              })
            })
            if (purchases.length === result.purchases.length) break
          }
        }
      }
    }

    // Create backup JSON structure
    const backup = {
      version: '1.0.0',
      export_date: new Date().toISOString(),
      export_by: 'xlsx_converter',
      data: {
        companies: [],
        users: [],
        products: products,
        categories: categories,
        sub_categories: subCategories,
        sales: [],
        purchases: purchases,
        suppliers: suppliers,
        customers: customers,
        sales_persons: [],
        category_commissions: [],
        sales_person_category_assignments: [],
        stock_adjustments: [],
        settings: {},
      },
    }

    const purchaseLineItemCount = purchases.reduce((sum: number, p: any) => sum + (p.items?.length || 0), 0)
    const stats = {
      suppliers: suppliers.length,
      purchases: purchases.length,
      purchaseLineItems: purchaseLineItemCount,
      products: products.length,
      customers: customers.length,
      categories: categories.length + subCategories.length,
    }

    const messages = []
    if (products.length > 0) messages.push(`${products.length} products`)
    if (categories.length > 0 || subCategories.length > 0) messages.push(`${categories.length + subCategories.length} categories`)
    if (suppliers.length > 0) messages.push(`${suppliers.length} suppliers`)
    if (customers.length > 0) messages.push(`${customers.length} customers`)
    if (purchases.length > 0) {
      if (purchaseLineItemCount > 0 && purchaseLineItemCount !== purchases.length) {
        messages.push(`${purchases.length} purchases (${purchaseLineItemCount} line items)`)
      } else {
        messages.push(`${purchases.length} purchases`)
      }
    }

    const hasNoData = purchases.length === 0 && products.length === 0 && customers.length === 0 && suppliers.length === 0 && categories.length === 0
    let message: string
    if (hasNoData) {
      message = `No data rows were found in the file.\n\nPlease check:\n• Sheet name should contain "Purchase" or "Bill" (e.g. "Purchases").\n• First row must be column headers: Supplier Name, Bill No, Bill Date, Product (or Desc), Qty.\n• Data should start from row 2.\n• Download the sample template from Backup & Restore to match the format.`
    } else {
      message = `Successfully converted: ${messages.join(', ')}`
      if (placeholderChangeCount > 0) {
        message += `\n\nWe filled ${placeholderChangeCount} missing required value(s) (Supplier Name, Bill No, Bill Date, Product/Desc, Qty) with placeholders so all rows could be imported. You can edit them after import.`
      }
      if (validationWarnings.length > 0) {
        message += `\n\n⚠️ WARNING: Format validation issues detected. Some data may not import correctly.`
      }
    }

    return {
      success: true,
      message: message,
      jsonData: JSON.stringify(backup, null, 2),
      stats,
      placeholderChangeCount: placeholderChangeCount > 0 ? placeholderChangeCount : undefined,
      validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to convert XLSX file: ${error.message || 'Unknown error'}`,
    }
  }
}

