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
  
  // Try parsing as Excel date number
  if (typeof dateStr === 'number') {
    try {
      // Excel dates are days since 1900-01-01
      const excelEpoch = new Date(1899, 11, 30)
      const date = new Date(excelEpoch.getTime() + dateStr * 86400000)
      return date.toISOString()
    } catch {
      return new Date().toISOString()
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
 * Clean and convert value to string
 */
function cleanString(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

/**
 * Clean and convert value to number
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
 * Clean and convert value to integer
 */
function cleanInt(value: any): number {
  return Math.round(cleanNumber(value))
}

/**
 * Find column index by matching keywords
 */
function findColumnIndex(headers: string[], keywords: string[]): number | null {
  const headersLower = headers.map(h => String(h).toLowerCase().trim())
  for (const keyword of keywords) {
    const index = headersLower.findIndex(h => h.includes(keyword.toLowerCase()))
    if (index !== -1) {
      return index
    }
  }
  return null
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
    explanation += `• Customer Name (or "Name")\n\n`
    explanation += `💡 Tip: Download the sample Excel template to see the correct format.`
  }

  return { isValid, missingColumns, explanation }
}

/**
 * Convert purchase data from Excel to JSON format
 */
function convertPurchaseData(rows: any[][], headers: string[]): {
  suppliers: any[]
  purchases: any[]
} {
  // Find column indices
  const supplierNameIdx = findColumnIndex(headers, ['customer name', 'supplier name', 'vendor name', 'supplier'])
  const gstinIdx = findColumnIndex(headers, ['gst number', 'gstin', 'gst no', 'gst'])
  const invoiceNumberIdx = findColumnIndex(headers, ['bill no', 'invoice no', 'invoice number', 'bill number'])
  const invoiceDateIdx = findColumnIndex(headers, ['bill date', 'invoice date', 'date', 'purchase date'])
  const hsnCodeIdx = findColumnIndex(headers, ['hsn', 'hsn code', 'hsn_code'])
  const descriptionIdx = findColumnIndex(headers, ['desc', 'description', 'product', 'item', 'product name'])
  const articleIdx = findColumnIndex(headers, ['article', 'article no', 'article number', 'article code', 'art'])
  const barcodeIdx = findColumnIndex(headers, ['barcode', 'barcode no', 'barcode number', 'ean'])
  const gstRateIdx = findColumnIndex(headers, ['gst%', 'gst rate', 'gst_percent', 'tax rate', 'gst'])
  const quantityIdx = findColumnIndex(headers, ['qty', 'quantity'])
  const unitIdx = findColumnIndex(headers, ['unit', 'uom', 'unit of measure'])
  const taxableAmountIdx = findColumnIndex(headers, ['taxable amt', 'taxable amount', 'subtotal', 'base amount'])
  const sgstIdx = findColumnIndex(headers, ['sgst'])
  const cgstIdx = findColumnIndex(headers, ['cgst'])
  const igstIdx = findColumnIndex(headers, ['igst'])
  const totalAmountIdx = findColumnIndex(headers, ['bill amt', 'total', 'grand total', 'bill amount'])
  const purchasePriceIdx = findColumnIndex(headers, ['purchase', 'purchase price', 'cost', 'cost price'])
  const salePriceIdx = findColumnIndex(headers, ['sale', 'sale price', 'selling price', 'sell price'])
  const mrpIdx = findColumnIndex(headers, ['mrp', 'maximum retail price', 'max retail price'])

  const purchasesDict: Record<string, any> = {}
  const suppliersDict: Record<string, any> = {}
  let purchaseId = 1

  for (const row of rows) {
    if (!row || row.length === 0) continue

    try {
      const supplierName = supplierNameIdx !== null ? cleanString(row[supplierNameIdx]) : ''
      const gstin = gstinIdx !== null ? cleanString(row[gstinIdx]) : ''
      const invoiceNumber = invoiceNumberIdx !== null ? cleanString(row[invoiceNumberIdx]) : ''
      const invoiceDate = invoiceDateIdx !== null ? parseDate(row[invoiceDateIdx]) : new Date().toISOString()

      if (!supplierName || !invoiceNumber) continue

      // Create supplier if not exists
      const supplierKey = supplierName.toUpperCase().trim()
      if (!suppliersDict[supplierKey]) {
        suppliersDict[supplierKey] = {
          id: Object.keys(suppliersDict).length + 1,
          name: supplierName.trim(),
          gstin: gstin,
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          contact_person: '',
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

      // Extract item data
      const hsnCode = hsnCodeIdx !== null ? cleanString(row[hsnCodeIdx]) : ''
      const description = descriptionIdx !== null ? cleanString(row[descriptionIdx]) : hsnCode || 'Unknown Product'
      const article = articleIdx !== null ? cleanString(row[articleIdx]) : ''
      const barcode = barcodeIdx !== null ? cleanString(row[barcodeIdx]) : ''
      const gstRate = gstRateIdx !== null ? cleanNumber(row[gstRateIdx]) : 0
      const quantity = quantityIdx !== null ? cleanInt(row[quantityIdx]) : 0
      const unit = unitIdx !== null ? cleanString(row[unitIdx]) : 'pcs'
      const taxableAmount = taxableAmountIdx !== null ? cleanNumber(row[taxableAmountIdx]) : 0
      const sgstAmount = sgstIdx !== null ? cleanNumber(row[sgstIdx]) : 0
      const cgstAmount = cgstIdx !== null ? cleanNumber(row[cgstIdx]) : 0
      const igstAmount = igstIdx !== null ? cleanNumber(row[igstIdx]) : 0
      const totalAmount = totalAmountIdx !== null ? cleanNumber(row[totalAmountIdx]) : 0
      
      // Extract price columns (M, N, O)
      const purchasePrice = purchasePriceIdx !== null ? cleanNumber(row[purchasePriceIdx]) : 0
      const salePrice = salePriceIdx !== null ? cleanNumber(row[salePriceIdx]) : 0
      const mrp = mrpIdx !== null ? cleanNumber(row[mrpIdx]) : 0

      // Calculate unit price (prefer Purchase column, fallback to calculated from taxable amount)
      const unitPrice = purchasePrice > 0 ? purchasePrice : (quantity > 0 ? taxableAmount / quantity : 0)

      // Calculate tax rates
      const cgstRate = taxableAmount > 0 ? (cgstAmount / taxableAmount) * 100 : 0
      const sgstRate = taxableAmount > 0 ? (sgstAmount / taxableAmount) * 100 : 0
      const igstRate = taxableAmount > 0 ? (igstAmount / taxableAmount) * 100 : 0

      // Use provided GST rate or calculate from tax amounts
      const finalGstRate = gstRate > 0 ? gstRate : cgstRate + sgstRate + igstRate

      // Create purchase item
      const item = {
        product_id: null,
        product_name: description,
        quantity: quantity,
        unit_price: Math.round(unitPrice * 100) / 100,
        purchase_price: Math.round(unitPrice * 100) / 100,
        mrp: mrp > 0 ? Math.round(mrp * 100) / 100 : undefined, // Use MRP from Excel (Column O)
        sale_price: salePrice > 0 ? Math.round(salePrice * 100) / 100 : (mrp > 0 ? Math.round(mrp * 100) / 100 : undefined), // Use Sale from Excel (Column N), fallback to MRP
        hsn_code: hsnCode,
        gst_rate: Math.round(finalGstRate * 100) / 100,
        cgst_rate: cgstRate > 0 ? Math.round(cgstRate * 100) / 100 : null,
        sgst_rate: sgstRate > 0 ? Math.round(sgstRate * 100) / 100 : null,
        igst_rate: igstRate > 0 ? Math.round(igstRate * 100) / 100 : null,
        tax_amount: Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100,
        total: Math.round(totalAmount * 100) / 100,
        article: article, // Use article from Excel file
        barcode: barcode, // Use barcode from Excel file
      }

      purchase.items.push(item)
      purchase.subtotal = Math.round((purchase.subtotal + taxableAmount) * 100) / 100
      purchase.total_tax = Math.round((purchase.total_tax + cgstAmount + sgstAmount + igstAmount) * 100) / 100
      purchase.grand_total = Math.round((purchase.grand_total + totalAmount) * 100) / 100
    } catch (error) {
      console.error('Error processing row:', error)
      continue
    }
  }

  return {
    suppliers: Object.values(suppliersDict),
    purchases: Object.values(purchasesDict),
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
    if (!row || row.length === 0) continue

    try {
      const name = nameIdx !== null ? cleanString(row[nameIdx]) : ''
      if (!name) continue

      products.push({
        id: productId++,
        name: name,
        sku: skuIdx !== null ? cleanString(row[skuIdx]) : '',
        barcode: barcodeIdx !== null ? cleanString(row[barcodeIdx]) : '',
        category_name: categoryIdx !== null ? cleanString(row[categoryIdx]) : '',
        description: descriptionIdx !== null ? cleanString(row[descriptionIdx]) : '',
        unit: unitIdx !== null ? cleanString(row[unitIdx]) : 'pcs',
        purchase_price: purchasePriceIdx !== null ? cleanNumber(row[purchasePriceIdx]) : 0,
        selling_price: sellingPriceIdx !== null ? cleanNumber(row[sellingPriceIdx]) : 0,
        stock_quantity: stockIdx !== null ? cleanInt(row[stockIdx]) : 0,
        min_stock_level: minStockIdx !== null ? cleanInt(row[minStockIdx]) : undefined,
        hsn_code: hsnIdx !== null ? cleanString(row[hsnIdx]) : '',
        gst_rate: gstRateIdx !== null ? cleanNumber(row[gstRateIdx]) : 0,
        tax_type: taxTypeIdx !== null ? cleanString(row[taxTypeIdx]).toLowerCase() : 'exclusive',
        is_active: true,
        status: 'active',
        barcode_status: barcodeIdx !== null && cleanString(row[barcodeIdx]) ? 'active' : 'inactive',
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
    if (!row || row.length === 0) continue

    try {
      const name = nameIdx !== null ? cleanString(row[nameIdx]) : ''
      if (!name) continue

      customers.push({
        id: customerId++,
        name: name,
        email: emailIdx !== null ? cleanString(row[emailIdx]) : '',
        phone: phoneIdx !== null ? cleanString(row[phoneIdx]) : '',
        gstin: gstinIdx !== null ? cleanString(row[gstinIdx]) : '',
        address: addressIdx !== null ? cleanString(row[addressIdx]) : '',
        city: cityIdx !== null ? cleanString(row[cityIdx]) : '',
        state: stateIdx !== null ? cleanString(row[stateIdx]) : '',
        pincode: pincodeIdx !== null ? cleanString(row[pincodeIdx]) : '',
        contact_person: contactPersonIdx !== null ? cleanString(row[contactPersonIdx]) : '',
        credit_limit: creditLimitIdx !== null ? cleanNumber(row[creditLimitIdx]) : 0,
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
    if (!row || row.length === 0) continue

    try {
      const name = nameIdx !== null ? cleanString(row[nameIdx]) : ''
      if (!name) continue

      const isRegisteredStr = isRegisteredIdx !== null ? String(row[isRegisteredIdx]).toLowerCase() : ''
      const isRegistered = isRegisteredStr === 'yes' || isRegisteredStr === 'true' || isRegisteredStr === '1'

      suppliers.push({
        id: supplierId++,
        name: name,
        email: emailIdx !== null ? cleanString(row[emailIdx]) : '',
        phone: phoneIdx !== null ? cleanString(row[phoneIdx]) : '',
        gstin: gstinIdx !== null ? cleanString(row[gstinIdx]) : '',
        address: addressIdx !== null ? cleanString(row[addressIdx]) : '',
        city: cityIdx !== null ? cleanString(row[cityIdx]) : '',
        state: stateIdx !== null ? cleanString(row[stateIdx]) : '',
        pincode: pincodeIdx !== null ? cleanString(row[pincodeIdx]) : '',
        contact_person: contactPersonIdx !== null ? cleanString(row[contactPersonIdx]) : '',
        is_registered: isRegistered || !!gstinIdx,
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
    if (!row || row.length === 0) continue

    try {
      const name = nameIdx !== null ? cleanString(row[nameIdx]) : ''
      if (!name) continue

      const isSubcategoryStr = isSubcategoryIdx !== null ? String(row[isSubcategoryIdx]).toLowerCase() : ''
      const isSubcategory = isSubcategoryStr === 'yes' || isSubcategoryStr === 'true' || isSubcategoryStr === '1'
      const parentCategoryName = parentCategoryIdx !== null ? cleanString(row[parentCategoryIdx]) : ''

      if (!isSubcategory && !parentCategoryName) {
        // Main category
        categories.push({
          id: categoryId++,
          name: name,
          description: descriptionIdx !== null ? cleanString(row[descriptionIdx]) : '',
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
    if (!row || row.length === 0) continue

    try {
      const name = nameIdx !== null ? cleanString(row[nameIdx]) : ''
      if (!name) continue

      const isSubcategoryStr = isSubcategoryIdx !== null ? String(row[isSubcategoryIdx]).toLowerCase() : ''
      const isSubcategory = isSubcategoryStr === 'yes' || isSubcategoryStr === 'true' || isSubcategoryStr === '1'
      const parentCategoryName = parentCategoryIdx !== null ? cleanString(row[parentCategoryIdx]) : ''

      if (isSubcategory || parentCategoryName) {
        // Find parent category
        const parentCategory = categories.find(c => c.name === parentCategoryName)
        if (parentCategory) {
          subCategories.push({
            id: categoryId++,
            name: name,
            description: descriptionIdx !== null ? cleanString(row[descriptionIdx]) : '',
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

    // If no purchases sheet found, validate first sheet as purchases
    let hasPurchaseSheet = false
    for (const sheetName of workbook.SheetNames) {
      if (sheetName.toLowerCase().includes('purchase') || sheetName.toLowerCase().includes('bill')) {
        hasPurchaseSheet = true
        break
      }
    }

    if (!hasPurchaseSheet && workbook.SheetNames.length > 0) {
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

      // Process based on sheet name
      if (sheetNameLower.includes('purchase') || sheetNameLower.includes('bill')) {
        const result = convertPurchaseData(rows, headers)
        purchases = result.purchases
        // Merge suppliers from purchases with existing suppliers
        const suppliersMap = new Map(suppliers.map(s => [s.name.toUpperCase(), s]))
        result.suppliers.forEach(s => {
          const key = s.name.toUpperCase()
          if (!suppliersMap.has(key)) {
            suppliersMap.set(key, s)
            suppliers.push(s)
          }
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

    // If no purchases sheet found, try first sheet as purchases (backward compatibility)
    if (purchases.length === 0 && workbook.SheetNames.length > 0) {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][]
      if (jsonData.length >= 2) {
        const headers = jsonData[0].map(h => String(h).trim())
        const rows = jsonData.slice(1)
        const result = convertPurchaseData(rows, headers)
        purchases = result.purchases
        suppliers = result.suppliers
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

    const stats = {
      suppliers: suppliers.length,
      purchases: purchases.length,
      products: products.length,
      customers: customers.length,
      categories: categories.length + subCategories.length,
    }

    const messages = []
    if (products.length > 0) messages.push(`${products.length} products`)
    if (categories.length > 0 || subCategories.length > 0) messages.push(`${categories.length + subCategories.length} categories`)
    if (suppliers.length > 0) messages.push(`${suppliers.length} suppliers`)
    if (customers.length > 0) messages.push(`${customers.length} customers`)
    if (purchases.length > 0) messages.push(`${purchases.length} purchases`)

    // If there are validation warnings, show them but still allow conversion
    let message = `Successfully converted: ${messages.join(', ')}`
    if (validationWarnings.length > 0) {
      message += `\n\n⚠️ WARNING: Format validation issues detected. Some data may not import correctly.`
    }

    return {
      success: true,
      message: message,
      jsonData: JSON.stringify(backup, null, 2),
      stats,
      validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to convert XLSX file: ${error.message || 'Unknown error'}`,
    }
  }
}

