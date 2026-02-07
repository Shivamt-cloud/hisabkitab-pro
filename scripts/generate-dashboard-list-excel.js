/**
 * Generate Excel file: Dashboard Report Summary & Sales/Purchase Options list
 * Run from project root: node scripts/generate-dashboard-list-excel.js
 */
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const outDir = path.join(__dirname, '..', 'docs')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'Dashboard_Report_And_Options.xlsx')

const workbook = XLSX.utils.book_new()

// Sheet 1: Report Summary
const reportSummary = [
  ['#', 'Title', 'Description / Link', 'Permission to see'],
  [1, 'Total Sales', 'Today\'s sales value, % change vs last period', 'sales:read'],
  [2, 'Total Purchases', 'Today\'s purchases value, % change', 'purchases:read'],
  [3, 'Total Profit', 'Profit value, margin %', 'sales:read'],
  [4, 'Total Products', 'Count of products', 'products:read'],
  [5, 'Low Stock Alert', 'Count of low-stock products; click → /stock/alerts', 'products:read'],
  [6, 'Out of Stock', 'Count of out-of-stock products; click → /stock/alerts', 'products:read'],
  [7, 'Upcoming Checks', 'Count and total of upcoming supplier checks; click → /checks/upcoming', 'purchases:read'],
]
const ws1 = XLSX.utils.aoa_to_sheet(reportSummary)
ws1['!cols'] = [{ wch: 4 }, { wch: 18 }, { wch: 55 }, { wch: 18 }]
XLSX.utils.book_append_sheet(workbook, ws1, 'Report Summary')

// Sheet 2: Sales Options
const salesOptions = [
  ['#', 'Title', 'Description', 'Link', 'Permission'],
  [1, 'Quick Sale', 'Scan barcode → auto-add → pay (fast checkout)', '/sales/quick', 'sales:create'],
  [2, 'New Sale', 'Create a new sales invoice (full form)', '/sales/new', 'sales:create'],
  [3, 'New Sale Tab', 'Open sale form in new tab (for multiple customers)', '/sales/new (new tab)', 'sales:create'],
  [4, 'Sales History', 'View all sales (Admin Only)', '/sales/history', 'sales:read + admin'],
]
const ws2 = XLSX.utils.aoa_to_sheet(salesOptions)
ws2['!cols'] = [{ wch: 4 }, { wch: 18 }, { wch: 50 }, { wch: 22 }, { wch: 18 }]
XLSX.utils.book_append_sheet(workbook, ws2, 'Sales Options')

// Sheet 3: Purchase Options
const purchaseOptions = [
  ['#', 'Title', 'Description', 'Link', 'Permission'],
  [1, 'Customers', 'Manage customer database', '/customers', 'sales:read'],
  [2, 'Suppliers', 'Manage supplier contacts', '/suppliers', 'purchases:read'],
  [3, 'Sales & Category Management', 'Manage sales persons, categories, commissions & assignments', '/sales-category-management', 'users:read'],
  [4, 'GST Purchase', 'Create purchase with GST details', '/purchases/new-gst', 'purchases:create'],
  [5, 'Simple Purchase', 'Create purchase without GST', '/purchases/new-simple', 'purchases:create'],
  [6, 'Purchase History', 'View all purchase records', '/purchases/history', 'purchases:read'],
  [7, 'Upcoming Checks', 'View and manage upcoming supplier checks', '/checks/upcoming', 'purchases:read'],
]
const ws3 = XLSX.utils.aoa_to_sheet(purchaseOptions)
ws3['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 55 }, { wch: 28 }, { wch: 18 }]
XLSX.utils.book_append_sheet(workbook, ws3, 'Purchase Options')

// Sheet 4: Expense Options
const expenseOptions = [
  ['#', 'Title', 'Description', 'Link', 'Permission'],
  [1, 'Daily Expenses', 'Manage and track daily business expenses', '/expenses', 'expenses:read'],
  [2, 'Daily Report', 'View comprehensive daily business summary', '/daily-report', 'expenses:read'],
]
const ws4 = XLSX.utils.aoa_to_sheet(expenseOptions)
ws4['!cols'] = [{ wch: 4 }, { wch: 18 }, { wch: 48 }, { wch: 18 }, { wch: 16 }]
XLSX.utils.book_append_sheet(workbook, ws4, 'Expense Options')

// Sheet 5: Report Links
const reportLinks = [
  ['#', 'Label', 'Link', 'Note'],
  [1, 'Daily Activity Report', '/reports/daily-activity', 'reports:read'],
  [2, 'View Sales Reports', '/reports/sales', 'reports:read'],
  [3, 'View Purchase Reports', '/reports/purchases', 'reports:read'],
  [4, 'Profit Analysis', '/reports/profit-analysis', 'reports:read'],
  [5, 'Expense Reports', '/reports/expenses', 'reports:read'],
  [6, 'Comparative Reports (Month vs Month, Year vs Year)', '/reports/comparative', 'reports:read'],
  [7, 'Customer Insights', '/customers/insights', 'sales:read'],
  [8, 'View Commission Reports', '/reports/commissions', 'reports:read'],
  [9, 'CA Reports (GSTR-1, GSTR-2, GSTR-3B)', '/reports/ca', 'reports:read'],
  [10, 'Outstanding Payments', '/payments/outstanding', 'sales:read'],
]
const ws5 = XLSX.utils.aoa_to_sheet(reportLinks)
ws5['!cols'] = [{ wch: 4 }, { wch: 48 }, { wch: 38 }, { wch: 14 }]
XLSX.utils.book_append_sheet(workbook, ws5, 'Report Links')

// Sheet 6: Cash Flow Overview
const cashFlowOverview = [
  ['CASH FLOW OVERVIEW', '', '', ''],
  ['Metric', 'Amount (₹)', 'Note', ''],
  ['CASH', 125518, '', ''],
  ['UPI', 1500, '', ''],
  ['CARD', 1900, '', ''],
  ['OTHER', 200, '', ''],
  ['CREDIT', 0, '', ''],
  ['TOTAL SALE', 129108, '', ''],
  ['TOTAL EXPENSES', 500, '', ''],
  ['NET CASH', 64540, 'outflow', ''],
]
const ws6 = XLSX.utils.aoa_to_sheet(cashFlowOverview)
ws6['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 8 }]
XLSX.utils.book_append_sheet(workbook, ws6, 'Cash Flow Overview')

// Sheet 7: Top 5 Products (Period)
const top5Products = [
  ['TOP 5 PRODUCTS (PERIOD)', '', ''],
  ['#', 'Product Name', 'Amount (₹)'],
  [1, 'demoProduct', 114000],
  [2, 'Saroj Saree', 13000],
  [3, 'Sample Product 2', 2185],
  [4, '(slot 4)', 0],
  [5, '(slot 5)', 0],
]
const ws7 = XLSX.utils.aoa_to_sheet(top5Products)
ws7['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }]
XLSX.utils.book_append_sheet(workbook, ws7, 'Top 5 Products')

// Sheet 8: Top 5 Customers (Period)
const top5Customers = [
  ['TOP 5 CUSTOMERS (PERIOD)', '', ''],
  ['#', 'Customer Name', 'Amount (₹)'],
  [1, 'Walk-in Customer', 124485],
  [2, 'Shalini', 3790],
  [3, 'muskan', 833],
  [4, '(slot 4)', 0],
  [5, '(slot 5)', 0],
]
const ws8 = XLSX.utils.aoa_to_sheet(top5Customers)
ws8['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }]
XLSX.utils.book_append_sheet(workbook, ws8, 'Top 5 Customers')

// Sheet 9: Outstanding Summary
const outstandingSummary = [
  ['OUTSTANDING SUMMARY', '', '', ''],
  ['Type', 'Amount (₹)', 'Invoice(s)', 'Link'],
  ['Receivables (from customers)', 0, '0 invoice(s)', 'View lists'],
  ['Payables (to suppliers)', 145710, '5 invoice(s)', 'View lists'],
]
const ws9 = XLSX.utils.aoa_to_sheet(outstandingSummary)
ws9['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }]
XLSX.utils.book_append_sheet(workbook, ws9, 'Outstanding Summary')

// Sheet 10: Sales Target
const salesTarget = [
  ['SALES TARGET', '', '', ''],
  ['Action', 'Set goal', '', 'Link / Settings'],
  ['', '', '', ''],
  ['Period', 'Current', 'Goal', ''],
  ['Daily', '₹0', '₹400', ''],
  ['Monthly', '₹1,26,808', '₹4,000', ''],
]
const ws10 = XLSX.utils.aoa_to_sheet(salesTarget)
ws10['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 18 }]
XLSX.utils.book_append_sheet(workbook, ws10, 'Sales Target')

XLSX.writeFile(workbook, outPath)
console.log('Created:', outPath)
