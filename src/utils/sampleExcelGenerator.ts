/**
 * Generate sample Excel files for data import templates
 * Uses xlsx library to create files in the browser
 */

import * as XLSX from 'xlsx'

/**
 * Download Excel file
 */
function downloadExcel(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename)
}

/**
 * Generate sample purchase Excel file
 */
export function generateSamplePurchases() {
  const data = [
    ['SrNo', 'Customer Name', 'GST Number', 'Bill No', 'Bill Date', 'HSN', 'Desc', 'Article', 'Barcode', 'GST%', 'Qty', 'UNIT', 'Purchase', 'Sale', 'MRP', 'Taxable Amt', 'SGST', 'CGST', 'IGST', 'Oth Amt', 'Bill Amt'],
    // Example 1: Standard EAN-13 barcode
    ['1', 'ABC Suppliers', '27AAAAA0000A1Z5', 'ABC/2025/001', '07-Apr-2025', '6107', 'Sample Product 1', 'ART-001', '8904201446686', '5.00', '60.00', 'PCS', '262.27', '280.00', '300.00', '15736.17', '393.41', '393.41', '0.00', '0.01', '16523.00'],
    // Example 2: Another barcode (note: barcodes can be numbers or text)
    ['2', 'XYZ Traders', '09ABXYZ0000A1Z6', 'XYZ/2025/002', '08/Apr/2025', '6107', 'Sample Product 2', 'ART-002', '8905005506422', '5.00', '50.00', 'PCS', '87.14', '95.00', '100.00', '4357.13', '108.93', '108.93', '0.00', '0.01', '4575.00'],
    // Example 3: Product with article and barcode
    ['3', 'DEF Company', '27DEFAA0000A1Z7', 'DEF/2025/003', '10-Apr-2025', '8517', 'Sample Product 3', 'SUIT-BLK-001', '99000000298', '18.00', '10.00', 'PCS', '5000.00', '5500.00', '6000.00', '50000.00', '4500.00', '4500.00', '0.00', '0.00', '59000.00'],
    // Example 4: Product without barcode (barcode column can be empty)
    ['4', 'GHI Suppliers', '27GHIAA0000A1Z8', 'GHI/2025/004', '11-Apr-2025', '8517', 'Sample Product 4', 'ART-004', '', '18.00', '5.00', 'PCS', '1000.00', '1200.00', '1500.00', '5000.00', '450.00', '450.00', '0.00', '0.00', '5900.00'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Purchases')
  
  downloadExcel(wb, 'sample-purchases.xlsx')
}

/**
 * Generate sample products Excel file
 */
export function generateSampleProducts() {
  const data = [
    ['Name', 'SKU', 'Barcode', 'Category', 'Description', 'Unit', 'Purchase Price', 'Selling Price', 'Stock Quantity', 'Min Stock Level', 'HSN Code', 'GST Rate', 'Tax Type'],
    ['Sample Product 1', 'PROD-001', '1234567890123', 'Electronics', 'Sample electronic product description', 'pcs', '50000', '55000', '10', '5', '8517', '18', 'exclusive'],
    ['Sample Product 2', 'PROD-002', '9876543210987', 'Electronics', 'Another sample product description', 'pcs', '60000', '65000', '5', '3', '8517', '18', 'exclusive'],
    ['Sample Product 3', 'PROD-003', '4567890123456', 'Accessories', 'Sample accessory product', 'pcs', '1000', '1200', '50', '10', '4202', '18', 'exclusive'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  
  downloadExcel(wb, 'sample-products.xlsx')
}

/**
 * Generate sample customers Excel file
 */
export function generateSampleCustomers() {
  const data = [
    ['Name', 'Email', 'Phone', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Credit Limit'],
    ['ABC Company', 'contact@abccompany.com', '+91-9876543210', '27AAAAA0000A1Z5', '123 Sample Street', 'Delhi', 'Delhi', '110001', 'Mr. Sample', '100000'],
    ['XYZ Enterprises', 'info@xyzent.com', '+91-9876543211', '09ABXYZ0000A1Z6', '456 Sample Avenue', 'Mumbai', 'Maharashtra', '400001', 'Mr. Example', '50000'],
    ['Walk-in Customer', '', '', '', '', '', '', '', '', '0'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Customers')
  
  downloadExcel(wb, 'sample-customers.xlsx')
}

/**
 * Generate sample suppliers Excel file
 */
export function generateSampleSuppliers() {
  const data = [
    ['Name', 'Email', 'Phone', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Is Registered'],
    ['ABC Suppliers', 'contact@abcsuppliers.com', '+91-9876543200', '27AAAAA0000A1Z5', '123 Sample Street', 'Mumbai', 'Maharashtra', '400001', 'Mr. Sample', 'Yes'],
    ['XYZ Traders', 'info@xyztraders.com', '+91-9876543201', '09ABXYZ0000A1Z6', '456 Sample Road', 'Delhi', 'Delhi', '110001', 'Mr. Example', 'Yes'],
    ['DEF Company', 'sales@defcompany.com', '+91-9876543202', '27DEFAA0000A1Z7', '789 Sample Lane', 'Bangalore', 'Karnataka', '560001', 'Mr. Demo', 'Yes'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers')
  
  downloadExcel(wb, 'sample-suppliers.xlsx')
}

/**
 * Generate sample categories Excel file
 */
export function generateSampleCategories() {
  const data = [
    ['Name', 'Description', 'Parent Category', 'Is Subcategory'],
    ['Electronics', 'Electronic products', '', 'No'],
    ['Mobile Phones', 'Mobile phones and accessories', 'Electronics', 'Yes'],
    ['Accessories', 'Phone and device accessories', 'Electronics', 'Yes'],
    ['Clothing', 'Clothing and apparel', '', 'No'],
    ['Men\'s Wear', 'Men\'s clothing', 'Clothing', 'Yes'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Categories')
  
  downloadExcel(wb, 'sample-categories.xlsx')
}

/**
 * Generate universal template with all data types
 */
export function generateUniversalTemplate() {
  const wb = XLSX.utils.book_new()

  // Purchases Sheet
  const purchasesData = [
    ['SrNo', 'Customer Name', 'GST Number', 'Bill No', 'Bill Date', 'HSN', 'Desc', 'Article', 'Barcode', 'GST%', 'Qty', 'UNIT', 'Purchase', 'Sale', 'MRP', 'Taxable Amt', 'SGST', 'CGST', 'IGST', 'Oth Amt', 'Bill Amt'],
    // Example 1: Standard EAN-13 barcode
    ['1', 'ABC Suppliers', '27AAAAA0000A1Z5', 'ABC/2025/001', '07-Apr-2025', '6107', 'Sample Product 1', 'ART-001', '8904201446686', '5.00', '60.00', 'PCS', '262.27', '280.00', '300.00', '15736.17', '393.41', '393.41', '0.00', '0.01', '16523.00'],
    // Example 2: Another barcode
    ['2', 'XYZ Traders', '09ABXYZ0000A1Z6', 'XYZ/2025/002', '08/Apr/2025', '6107', 'Sample Product 2', 'ART-002', '8905005506422', '5.00', '50.00', 'PCS', '87.14', '95.00', '100.00', '4357.13', '108.93', '108.93', '0.00', '0.01', '4575.00'],
  ]
  const purchasesWS = XLSX.utils.aoa_to_sheet(purchasesData)
  XLSX.utils.book_append_sheet(wb, purchasesWS, 'Purchases')

  // Products Sheet
  const productsData = [
    ['Name', 'SKU', 'Barcode', 'Category', 'Description', 'Unit', 'Purchase Price', 'Selling Price', 'Stock Quantity', 'Min Stock Level', 'HSN Code', 'GST Rate', 'Tax Type'],
    ['Sample Product 1', 'PROD-001', '1234567890123', 'Electronics', 'Sample electronic product description', 'pcs', '50000', '55000', '10', '5', '8517', '18', 'exclusive'],
    ['Sample Product 2', 'PROD-002', '9876543210987', 'Electronics', 'Another sample product description', 'pcs', '60000', '65000', '5', '3', '8517', '18', 'exclusive'],
  ]
  const productsWS = XLSX.utils.aoa_to_sheet(productsData)
  XLSX.utils.book_append_sheet(wb, productsWS, 'Products')

  // Customers Sheet
  const customersData = [
    ['Name', 'Email', 'Phone', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Credit Limit'],
    ['ABC Company', 'contact@abccompany.com', '+91-9876543210', '27AAAAA0000A1Z5', '123 Sample Street', 'Delhi', 'Delhi', '110001', 'Mr. Sample', '100000'],
    ['XYZ Enterprises', 'info@xyzent.com', '+91-9876543211', '09ABXYZ0000A1Z6', '456 Sample Avenue', 'Mumbai', 'Maharashtra', '400001', 'Mr. Example', '50000'],
  ]
  const customersWS = XLSX.utils.aoa_to_sheet(customersData)
  XLSX.utils.book_append_sheet(wb, customersWS, 'Customers')

  // Suppliers Sheet
  const suppliersData = [
    ['Name', 'Email', 'Phone', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Contact Person', 'Is Registered'],
    ['ABC Suppliers', 'contact@abcsuppliers.com', '+91-9876543200', '27AAAAA0000A1Z5', '123 Sample Street', 'Mumbai', 'Maharashtra', '400001', 'Mr. Sample', 'Yes'],
    ['XYZ Traders', 'info@xyztraders.com', '+91-9876543201', '09ABXYZ0000A1Z6', '456 Sample Road', 'Delhi', 'Delhi', '110001', 'Mr. Example', 'Yes'],
  ]
  const suppliersWS = XLSX.utils.aoa_to_sheet(suppliersData)
  XLSX.utils.book_append_sheet(wb, suppliersWS, 'Suppliers')

  // Categories Sheet
  const categoriesData = [
    ['Name', 'Description', 'Parent Category', 'Is Subcategory'],
    ['Electronics', 'Electronic products', '', 'No'],
    ['Mobile Phones', 'Mobile phones and accessories', 'Electronics', 'Yes'],
    ['Accessories', 'Phone and device accessories', 'Electronics', 'Yes'],
  ]
  const categoriesWS = XLSX.utils.aoa_to_sheet(categoriesData)
  XLSX.utils.book_append_sheet(wb, categoriesWS, 'Categories')

  downloadExcel(wb, 'sample-universal-template.xlsx')
}

