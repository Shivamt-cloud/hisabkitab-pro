/**
 * Export Utilities for HisabKitab-Pro
 * Provides Excel and PDF export functionality
 */

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/** Shown on all PDFs and Excel exports so readers can reach us */
export const POWERED_BY_TEXT = 'Powered by HisabKitab Pro · hisabkitabpro.com'
export const POWERED_BY_URL = 'https://hisabkitabpro.com'

/**
 * Export data to Excel file
 */
export function exportToExcel(
  data: any[][],
  headers: string[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  
  // Add headers row + data + powered-by footer
  const worksheetData = [headers, ...data, [], [POWERED_BY_TEXT]]
  
  // Create worksheet from array
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  
  // Set column widths
  const maxWidths = headers.map((header, colIndex) => {
    const headerWidth = header.length
    const dataWidth = Math.max(
      ...data.map(row => {
        const cellValue = row[colIndex]
        return cellValue ? String(cellValue).length : 0
      })
    )
    return Math.min(Math.max(headerWidth, dataWidth) + 2, 50) // Max width 50
  })
  
  worksheet['!cols'] = maxWidths.map(width => ({ wch: width }))
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  // Write file
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Export multiple sheets to one Excel file (for full backup / export all data).
 */
export function exportMultiSheetExcel(
  sheets: { sheetName: string; headers: string[]; rows: any[][] }[],
  filename: string
): void {
  const workbook = XLSX.utils.book_new()
  for (const { sheetName, headers, rows } of sheets) {
    const worksheetData = [headers, ...rows, [], [POWERED_BY_TEXT]]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    const maxWidths = headers.map((header, colIndex) => {
      const dataWidth = Math.max(
        ...rows.map(row => (row[colIndex] != null ? String(row[colIndex]).length : 0)),
        header.length
      )
      return Math.min(dataWidth + 2, 50)
    })
    worksheet['!cols'] = maxWidths.map(wch => ({ wch }))
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31)) // Excel sheet name max 31 chars
  }
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Tally-friendly export: Sales and Purchases in a structure suitable for TallyPrime import.
 * Columns align with common Tally voucher import (Date, Voucher Type, Voucher Number, Party, Amount, Tax, Total).
 * CA can use mapping template in Tally if column names differ.
 */
export const TALLY_SALES_HEADERS = [
  'Date',
  'Voucher Type',
  'Voucher Number',
  'Party Name',
  'Party GSTIN',
  'Subtotal',
  'Tax Amount',
  'Discount',
  'Total Amount',
  'Payment Status',
  'Notes',
]
export const TALLY_PURCHASE_HEADERS = [
  'Date',
  'Voucher Type',
  'Voucher Number',
  'Party Name',
  'Party GSTIN',
  'Subtotal',
  'Tax Amount',
  'Total Amount',
  'Payment Status',
  'Notes',
]

export function exportTallyFriendlyExcel(
  sales: Array<{
    sale_date?: string
    invoice_number?: string
    customer_name?: string
    subtotal?: number
    tax_amount?: number
    discount?: number
    grand_total?: number
    payment_status?: string
    notes?: string
    items?: Array<{ product_name?: string; quantity?: number; unit_price?: number; total?: number }>
  }>,
  purchases: Array<{
    purchase_date?: string
    invoice_number?: string
    supplier_name?: string
    supplier_gstin?: string
    subtotal?: number
    total_tax?: number
    grand_total?: number
    total_amount?: number
    payment_status?: string
    notes?: string
  }>,
  filename: string
): void {
  const salesRows = sales.map(s => [
    s.sale_date ?? '',
    'Sales',
    s.invoice_number ?? '',
    s.customer_name ?? '',
    '', // Party GSTIN - could be from customer if available
    s.subtotal ?? 0,
    s.tax_amount ?? 0,
    s.discount ?? 0,
    s.grand_total ?? 0,
    s.payment_status ?? '',
    s.notes ?? '',
  ])
  const purchaseRows = purchases.map(p => [
    p.purchase_date ?? '',
    'Purchase',
    p.invoice_number ?? '',
    p.supplier_name ?? '',
    p.supplier_gstin ?? '',
    p.subtotal ?? (p as any).total_amount ?? 0,
    p.total_tax ?? (p as any).total_tax ?? 0,
    (p.grand_total ?? p.total_amount ?? 0),
    p.payment_status ?? '',
    p.notes ?? '',
  ])
  exportMultiSheetExcel(
    [
      { sheetName: 'Sales', headers: TALLY_SALES_HEADERS, rows: salesRows },
      { sheetName: 'Purchases', headers: TALLY_PURCHASE_HEADERS, rows: purchaseRows },
    ],
    filename
  )
}

/**
 * GSTR-1 B2B Excel format for GST portal upload.
 * Columns aligned with common GSTR-1 B2B template (adjust if portal template differs).
 */
export const GSTR1_B2B_HEADERS = [
  'GSTIN of Recipient',
  'Receiver Name',
  'Invoice Number',
  'Invoice Date',
  'Invoice Value',
  'Place of Supply (State Code)',
  'Taxable Value',
  'CGST Rate',
  'CGST Amount',
  'SGST Rate',
  'SGST Amount',
  'IGST Rate',
  'IGST Amount',
  'Cess Amount',
  'Total',
]

/**
 * Export sales register data in GSTR-1 B2B portal upload format (Excel).
 * dataRows: each row [gstin, receiverName, invNo, invDate, invValue, placeOfSupply, taxableValue, cgstRate, cgstAmt, sgstRate, sgstAmt, igstRate, igstAmt, cessAmt, total]
 */
export function exportGSTR1PortalExcel(dataRows: any[][], filename: string): void {
  const sheetName = 'B2B'
  const worksheetData = [GSTR1_B2B_HEADERS, ...dataRows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  worksheet['!cols'] = GSTR1_B2B_HEADERS.map((_, i) => ({ wch: Math.min(i === 1 ? 30 : 18, 50) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * GSTR-2 B2B Excel format for GST portal upload (inward supplies).
 */
export const GSTR2_B2B_HEADERS = [
  'Supplier GSTIN',
  'Supplier Name',
  'Invoice Number',
  'Invoice Date',
  'Invoice Value',
  'Taxable Value',
  'CGST Amount',
  'SGST Amount',
  'IGST Amount',
  'Total',
]

/**
 * Export purchase register data in GSTR-2 B2B portal upload format (Excel).
 */
export function exportGSTR2PortalExcel(dataRows: any[][], filename: string): void {
  const sheetName = 'B2B'
  const worksheetData = [GSTR2_B2B_HEADERS, ...dataRows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  worksheet['!cols'] = GSTR2_B2B_HEADERS.map((_, i) => ({ wch: Math.min(i === 1 ? 30 : 18, 50) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * GSTR-3B monthly summary Excel format for CA / GST filing.
 * One row per period: Outward taxable, Outward tax, Inward taxable, ITC, Net tax payable.
 */
export const GSTR3B_HEADERS = [
  'Period (Month)',
  'Outward Taxable Value',
  'Outward Tax (CGST+SGST+IGST)',
  'Inward Taxable Value',
  'ITC (Input Tax Credit)',
  'Net Tax Payable',
]

/**
 * Export GSTR-3B style monthly summary (Excel).
 * dataRows: each row [period, outwardTaxable, outwardTax, inwardTaxable, itc, netTaxPayable]
 */
export function exportGSTR3BExcel(dataRows: any[][], filename: string): void {
  const sheetName = 'GSTR-3B Summary'
  const worksheetData = [GSTR3B_HEADERS, ...dataRows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  worksheet['!cols'] = GSTR3B_HEADERS.map((_, i) => ({ wch: Math.min(i === 0 ? 12 : 22, 50) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Export HTML element to PDF
 */
export async function exportHTMLToPDF(
  elementId: string,
  filename: string,
  options?: {
    format?: 'a4' | 'letter'
    orientation?: 'portrait' | 'landscape'
    margin?: number
  }
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`)
  }

  const format = options?.format || 'a4'
  const orientation = options?.orientation || 'portrait'
  const margin = options?.margin || 10

  // Create canvas from HTML element
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const imgWidth = format === 'a4' ? 210 : 216 // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  // Create PDF
  const pdf = new jsPDF(orientation, 'mm', format)
  const pageHeight = pdf.internal.pageSize.height
  let heightLeft = imgHeight
  let position = margin

  // Add first page
  pdf.addImage(imgData, 'PNG', margin, position, imgWidth - margin * 2, imgHeight)
  heightLeft -= pageHeight - margin * 2

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth - margin * 2, imgHeight)
    heightLeft -= pageHeight - margin * 2
  }

  // Save PDF
  pdf.save(`${filename}.pdf`)
}

/**
 * Export data to PDF table
 */
export function exportDataToPDF(
  data: any[][],
  headers: string[],
  filename: string,
  title: string = 'Report',
  options?: {
    format?: 'a4' | 'letter'
    orientation?: 'portrait' | 'landscape'
  }
): void {
  const format = options?.format || 'a4'
  const orientation = options?.orientation || 'portrait'
  
  const pdf = new jsPDF(orientation, 'mm', format)
  const pageWidth = pdf.internal.pageSize.width
  const margin = 15
  const tableWidth = pageWidth - margin * 2
  const colCount = headers.length
  const colWidth = tableWidth / colCount

  // Add title
  pdf.setFontSize(16)
  pdf.text(title, margin, margin)
  
  // Add date
  pdf.setFontSize(10)
  pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, margin + 7)

  // Table header
  let yPosition = margin + 15
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  
  headers.forEach((header, index) => {
    const xPosition = margin + index * colWidth
    pdf.text(header, xPosition, yPosition)
  })

  // Draw header line
  pdf.setLineWidth(0.5)
  pdf.line(margin, yPosition + 3, pageWidth - margin, yPosition + 3)

  // Table data
  pdf.setFont('helvetica', 'normal')
  yPosition += 10

  data.forEach((row) => {
    // Check if new page is needed
    if (yPosition > pdf.internal.pageSize.height - 20) {
      pdf.addPage()
      yPosition = margin + 10
    }

    row.forEach((cell, colIndex) => {
      const xPosition = margin + colIndex * colWidth
      const cellText = cell !== null && cell !== undefined ? String(cell) : ''
      pdf.text(cellText.substring(0, 30), xPosition, yPosition) // Limit text length
    })

    yPosition += 7
  })

  // Powered-by footer on last page
  const pageHeight = pdf.internal.pageSize.height
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(100, 100, 100)
  pdf.text(POWERED_BY_TEXT, pageWidth / 2, pageHeight - 10, { align: 'center' })
  pdf.setTextColor(0, 0, 0)

  // Save PDF
  pdf.save(`${filename}.pdf`)
}

/**
 * Export invoice to PDF (detailed version)
 */
export function exportInvoiceToPDF(
  invoiceData: {
    invoice_number: string
    invoice_date: string
    customer?: { name?: string; address?: string; phone?: string; gstin?: string }
    items: Array<{
      product_name: string
      quantity: number
      unit_price: number
      total: number
      unit?: string
    }>
    subtotal: number
    tax_amount: number
    grand_total: number
    payment_method: string
    payment_status: string
    company_info?: {
      name?: string
      address?: string
      phone?: string
      email?: string
      gstin?: string
    }
  },
  filename: string = `Invoice_${invoiceData.invoice_number}`
): void {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.width
  const margin = 15
  let yPosition = margin

  // Company Info Header
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text(invoiceData.company_info?.name || 'HisabKitab', margin, yPosition)
  yPosition += 8

  if (invoiceData.company_info?.address) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(invoiceData.company_info.address, margin, yPosition)
    yPosition += 5
  }

  if (invoiceData.company_info?.phone) {
    pdf.text(`Phone: ${invoiceData.company_info.phone}`, margin, yPosition)
    yPosition += 5
  }

  if (invoiceData.company_info?.gstin) {
    pdf.text(`GSTIN: ${invoiceData.company_info.gstin}`, margin, yPosition)
    yPosition += 5
  }

  yPosition += 5

  // Invoice Title
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text('INVOICE', pageWidth - margin - 40, margin)
  
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Invoice #: ${invoiceData.invoice_number}`, pageWidth - margin - 40, margin + 7)
  pdf.text(`Date: ${new Date(invoiceData.invoice_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`, pageWidth - margin - 40, margin + 12)

  // Customer Info
  yPosition += 5
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Bill To:', margin, yPosition)
  yPosition += 6

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(invoiceData.customer?.name || 'Walk-in Customer', margin, yPosition)
  yPosition += 5

  if (invoiceData.customer?.address) {
    pdf.text(invoiceData.customer.address, margin, yPosition)
    yPosition += 5
  }

  // Table Header
  yPosition += 5
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  pdf.text('Item', margin, yPosition)
  pdf.text('Qty', margin + 60, yPosition)
  pdf.text('Rate', margin + 80, yPosition)
  pdf.text('Amount', pageWidth - margin - 30, yPosition, { align: 'right' })
  yPosition += 3
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  // Items
  pdf.setFont('helvetica', 'normal')
  invoiceData.items.forEach((item) => {
    if (yPosition > pdf.internal.pageSize.height - 40) {
      pdf.addPage()
      yPosition = margin
    }

    pdf.text(item.product_name, margin, yPosition)
    pdf.text(`${item.quantity} ${item.unit || 'pcs'}`, margin + 60, yPosition)
    pdf.text(`₹${item.unit_price.toFixed(2)}`, margin + 80, yPosition)
    pdf.text(`₹${item.total.toFixed(2)}`, pageWidth - margin - 30, yPosition, { align: 'right' })
    yPosition += 7
  })

  // Totals
  yPosition += 5
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  pdf.text('Subtotal:', pageWidth - margin - 50, yPosition, { align: 'right' })
  pdf.text(`₹${invoiceData.subtotal.toFixed(2)}`, pageWidth - margin - 10, yPosition, { align: 'right' })
  yPosition += 6

  if (invoiceData.tax_amount > 0) {
    pdf.text('Tax (GST):', pageWidth - margin - 50, yPosition, { align: 'right' })
    pdf.text(`₹${invoiceData.tax_amount.toFixed(2)}`, pageWidth - margin - 10, yPosition, { align: 'right' })
    yPosition += 6
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.line(pageWidth - margin - 60, yPosition, pageWidth - margin, yPosition)
  yPosition += 6
  pdf.text('Total:', pageWidth - margin - 50, yPosition, { align: 'right' })
  pdf.text(`₹${invoiceData.grand_total.toFixed(2)}`, pageWidth - margin - 10, yPosition, { align: 'right' })

  // Payment Info
  yPosition += 12
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Payment Method: ${invoiceData.payment_method}`, margin, yPosition)
  yPosition += 6
  pdf.text(`Payment Status: ${invoiceData.payment_status.toUpperCase()}`, margin, yPosition)

  // Footer
  const pageHeight = pdf.internal.pageSize.height
  yPosition = pageHeight - 25
  pdf.setFontSize(10)
  pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 8
  pdf.setFontSize(9)
  pdf.setTextColor(80, 80, 80)
  pdf.text(POWERED_BY_TEXT, pageWidth / 2, yPosition, { align: 'center' })
  pdf.setTextColor(0, 0, 0)

  // Save PDF
  pdf.save(`${filename}.pdf`)
}

export type ReceiptInvoiceData = {
  invoice_number: string
  invoice_date: string
  /** Used for receipt time when invoice_date is date-only (e.g. Supabase DATE column) */
  created_at?: string
  customer?: { name?: string; phone?: string; gstin?: string; address?: string; city?: string; state?: string; pincode?: string }
  sales_person?: string
  notes?: string
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    total: number
    unit?: string
    discount?: number
    discount_percentage?: number
    mrp?: number
    gst_rate?: number
  }>
  subtotal: number
  tax_amount?: number
  discount?: number
  grand_total: number
  payment_method: string
  payment_methods?: Array<{ method: string; amount: number }>
  payment_status: string
  return_amount?: number
  credit_applied?: number
  credit_balance?: number
  company_info?: {
    name?: string
    address?: string
    phone?: string
    email?: string
    gstin?: string
  }
}

/**
 * Build receipt HTML (thermal/compact format for POS printers)
 */
import type { ReceiptPrinterSettings } from '../types/settings'

export function buildReceiptHTML(
  invoiceData: ReceiptInvoiceData,
  paperWidthMm: number = 80,
  layout?: ReceiptPrinterSettings
): string {
  const normalizedWidth = paperWidthMm === 58 ? 58 : 80

  const companyName = invoiceData.company_info?.name || 'HisabKitab'
  const companyAddress = invoiceData.company_info?.address || ''
  const companyPhone = invoiceData.company_info?.phone || ''
  const companyEmail = invoiceData.company_info?.email || ''
  const companyGSTIN = invoiceData.company_info?.gstin || ''
  const customerName = invoiceData.customer?.name || 'Walk-in Customer'
  const customerAddr = (() => {
    const c = invoiceData.customer as { address?: string; city?: string; state?: string; pincode?: string } | undefined
    if (!c) return ''
    return [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')
  })()
  const TZ_INDIA = 'Asia/Kolkata'
  const invoiceDate = new Date(invoiceData.invoice_date)
  // When Supabase stores sale_date as DATE (date-only), it returns "2026-02-06" which parses as midnight UTC = 5:30 AM IST. Use created_at for correct time.
  const isDateOnly = !invoiceData.invoice_date.includes('T') || (invoiceDate.getUTCHours() === 0 && invoiceDate.getUTCMinutes() === 0 && invoiceDate.getUTCSeconds() === 0)
  const timeSource = (isDateOnly && invoiceData.created_at) ? new Date(invoiceData.created_at) : invoiceDate
  const dateStr = invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TZ_INDIA
  })
  const timeStr = timeSource.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: TZ_INDIA
  })

  // Calculate payment breakdown (fallback when payment_methods is empty or missing)
  const paymentMethods =
    invoiceData.payment_methods && invoiceData.payment_methods.length > 0
      ? invoiceData.payment_methods
      : [{ method: invoiceData.payment_method || 'Cash', amount: invoiceData.grand_total }]

  const showCompanyName = layout?.show_company_name ?? true
  const showCompanyAddress = layout?.show_company_address ?? true
  const showCompanyPhone = layout?.show_company_phone ?? true
  const showCompanyEmail = layout?.show_company_email ?? true
  const showCompanyGstin = layout?.show_company_gstin ?? true

  const showInvoiceNumber = layout?.show_invoice_number ?? true
  const showDate = layout?.show_date ?? true
  const showTime = layout?.show_time ?? true
  const showPaymentStatus = layout?.show_payment_status ?? true

  const showCustomerName = layout?.show_customer_name ?? true
  const showCustomerPhone = layout?.show_customer_phone ?? true
  const showCustomerAddress = layout?.show_customer_address ?? true
  const showCustomerGstin = layout?.show_customer_gstin ?? true
  const showSalesPerson = layout?.show_sales_person ?? true
  const showNotes = layout?.show_notes ?? true

  const showItems = layout?.show_items ?? true
  const showItemDiscount = layout?.show_item_discount ?? true
  const showItemMrp = layout?.show_item_mrp ?? true

  const showSubtotal = layout?.show_subtotal ?? true
  const showDiscount = layout?.show_discount ?? true
  const showTax = layout?.show_tax ?? true
  const showCreditApplied = layout?.show_credit_applied ?? true
  const showReturnAmount = layout?.show_return_amount ?? true
  const showCreditBalance = layout?.show_credit_balance ?? true

  const showFooter = layout?.show_footer ?? true
  const whatsappNumber = layout?.whatsapp_number?.trim()
  const instagramHandle = layout?.instagram_handle?.trim()
  const facebookPage = layout?.facebook_page?.trim()
  const customFooterLine = layout?.custom_footer_line?.trim()

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${invoiceData.invoice_number}</title>
  <style>
    @media print {
      @page {
        size: ${normalizedWidth}mm auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      padding: 10px;
      width: ${normalizedWidth}mm;
      margin: 0 auto;
      background: white;
    }
    .receipt {
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
    }
    .company-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .company-info {
      font-size: 10px;
      line-height: 1.3;
      color: #333;
    }
    .section {
      margin-bottom: 8px;
      border-bottom: 1px dashed #ccc;
      padding-bottom: 6px;
    }
    .section:last-child {
      border-bottom: none;
    }
    .section-title {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .customer-info {
      font-size: 11px;
      line-height: 1.4;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 11px;
    }
    .items-table td {
      padding: 3px 0;
      vertical-align: top;
    }
    .item-name {
      width: 50%;
      word-wrap: break-word;
    }
    .item-qty {
      text-align: center;
      width: 15%;
      font-size: 10px;
    }
    .item-price {
      text-align: right;
      width: 35%;
    }
    .item-discount {
      font-size: 9px;
      color: #666;
      font-style: italic;
    }
    .totals {
      margin-top: 8px;
      border-top: 1px dashed #000;
      padding-top: 6px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 11px;
    }
    .total-row.grand-total {
      font-weight: bold;
      font-size: 13px;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 4px 0;
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .payment-info {
      margin-top: 8px;
      font-size: 11px;
      line-height: 1.4;
    }
    .payment-method {
      margin-bottom: 3px;
    }
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #000;
      font-size: 10px;
      line-height: 1.4;
    }
    .print-btn {
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      z-index: 1000;
    }
    .print-btn:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      ${showCompanyName ? `<div class="company-name">${companyName}</div>` : ''}
      ${showCompanyAddress ? `<div class="company-info">Address: ${companyAddress || '—'}</div>` : ''}
      ${showCompanyPhone ? `<div class="company-info">Ph: ${companyPhone || '—'}</div>` : ''}
      ${showCompanyEmail ? `<div class="company-info">Email: ${companyEmail || '—'}</div>` : ''}
      ${showCompanyGstin ? `<div class="company-info">GSTIN: ${companyGSTIN || '—'}</div>` : ''}
    </div>

    <div class="section">
      <div class="invoice-info">
        <span>
          ${showInvoiceNumber ? `Invoice #: ${invoiceData.invoice_number}` : ''}
        </span>
        <span>
          ${showDate ? dateStr : ''}
        </span>
      </div>
      <div class="invoice-info">
        <span>
          ${showTime ? timeStr : ''}
        </span>
        <span>
          ${showPaymentStatus ? invoiceData.payment_status.toUpperCase() : ''}
        </span>
      </div>
    </div>

    ${(showCustomerName || showCustomerPhone || showCustomerAddress || showCustomerGstin) ? `
    <div class="section">
      <div class="section-title">Customer</div>
      <div class="customer-info">
        ${showCustomerName ? `Name: ${customerName}` : ''}
        ${showCustomerPhone ? `<br>Ph: ${(invoiceData.customer as any)?.phone || '—'}` : ''}
        ${showCustomerAddress ? `<br>Address: ${customerAddr || '—'}` : ''}
        ${showCustomerGstin ? `<br>GSTIN: ${(invoiceData.customer as any)?.gstin || '—'}` : ''}
      </div>
    </div>
    ` : ''}

    ${showSalesPerson ? `
    <div class="section">
      <div class="section-title">Sales Person</div>
      <div class="customer-info">${(invoiceData as any).sales_person || '—'}</div>
    </div>
    ` : ''}

    ${showItems ? `
    <div class="section">
      <div class="section-title">Items</div>
      <table class="items-table">
        ${invoiceData.items.map(item => {
          const itemTotal = item.total
          const itemDiscountAmt = item.mrp != null && item.mrp > item.unit_price
            ? (item.mrp - item.unit_price) * item.quantity
            : (item.discount ?? 0)
          const itemDiscountPct = item.discount_percentage != null
            ? item.discount_percentage
            : (item.mrp != null && item.mrp > 0 && item.unit_price < item.mrp
              ? ((item.mrp - item.unit_price) / item.mrp) * 100
              : 0)
          const hasDiscount = itemDiscountAmt > 0
          return `
          <tr>
            <td class="item-name">
              ${item.product_name}
              ${(item as any).gst_rate != null ? `<div class="item-discount">GST @ ${(item as any).gst_rate}%</div>` : ''}
              ${showItemDiscount ? `<div class="item-discount">${hasDiscount ? `${typeof itemDiscountPct === 'number' ? itemDiscountPct.toFixed(1) : itemDiscountPct}% OFF (-₹${itemDiscountAmt.toFixed(2)})` : 'Discount: —'}</div>` : ''}
              ${showItemMrp ? `<div class="item-discount">MRP: ${typeof item.mrp === 'number' ? `₹${item.mrp.toFixed(2)}` : '—'}</div>` : ''}
            </td>
            <td class="item-qty">${item.quantity}${item.unit ? item.unit.substring(0, 2) : 'pc'}</td>
            <td class="item-price">₹${itemTotal.toFixed(2)}</td>
          </tr>
          `
        }).join('')}
      </table>
    </div>
    ` : ''}

    <div class="totals">
      ${(() => {
        const totalMRP = invoiceData.items.reduce((sum, item) => {
          const mrp = item.mrp ?? item.unit_price
          return sum + (mrp * item.quantity)
        }, 0)
        const totalSavings = totalMRP - invoiceData.subtotal
        const hasSavings = totalSavings > 0
        return hasSavings ? `
      <div class="total-row" style="color: #6b7280;">
        <span>Total MRP:</span>
        <span style="text-decoration: line-through;">₹${totalMRP.toFixed(2)}</span>
      </div>
      <div class="total-row" style="color: #059669; font-weight: 600;">
        <span>Total Savings:</span>
        <span>₹${totalSavings.toFixed(2)}</span>
      </div>` : ''
      })()}
      ${showSubtotal ? `
      <div class="total-row">
        <span>Subtotal:</span>
        <span>₹${invoiceData.subtotal.toFixed(2)}</span>
      </div>` : ''}
      ${showDiscount ? `
      <div class="total-row">
        <span>Additional Discount:</span>
        <span>${invoiceData.discount && invoiceData.discount > 0 ? `-₹${invoiceData.discount.toFixed(2)}` : '—'}</span>
      </div>` : ''}
      ${showTax ? `
      <div class="total-row">
        <span>Tax (GST):</span>
        <span>${invoiceData.tax_amount && invoiceData.tax_amount > 0 ? `₹${invoiceData.tax_amount.toFixed(2)}` : '—'}</span>
      </div>` : ''}
      ${showCreditApplied ? `
      <div class="total-row">
        <span>Credit Applied:</span>
        <span>${invoiceData.credit_applied && invoiceData.credit_applied > 0 ? `-₹${invoiceData.credit_applied.toFixed(2)}` : '—'}</span>
      </div>` : ''}
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>₹${invoiceData.grand_total.toFixed(2)}</span>
      </div>
    </div>

    ${(showReturnAmount || showCreditBalance || paymentMethods.length > 0) ? `
    <div class="section payment-info">
      <div class="section-title">Payment</div>
      ${paymentMethods.map(pm => `
        <div class="payment-method">
          ${pm.method.charAt(0).toUpperCase() + pm.method.slice(1).toLowerCase()}: ₹${pm.amount.toFixed(2)}
        </div>
      `).join('')}
      ${showReturnAmount ? `
        <div class="payment-method" style="color: #059669;">
          Return: ${invoiceData.return_amount && invoiceData.return_amount > 0 ? `₹${invoiceData.return_amount.toFixed(2)}` : '—'}
        </div>
      ` : ''}
      ${showCreditBalance ? `
        <div class="payment-method" style="margin-top: 4px; font-size: 10px; color: #666;">
          Credit Balance: ${invoiceData.credit_balance !== undefined ? `₹${invoiceData.credit_balance.toFixed(2)}` : '—'}
        </div>
      ` : ''}
    </div>
    ` : ''}

    ${showNotes ? `
    <div class="section">
      <div class="section-title">Notes</div>
      <div class="customer-info">${(invoiceData as any).notes || '—'}</div>
    </div>
    ` : ''}

    ${showFooter || whatsappNumber || instagramHandle || facebookPage || customFooterLine ? `
    <div class="footer">
      ${showFooter ? `<div>Thank you for your business!</div>` : ''}
      ${customFooterLine ? `<div style="margin-top: 2px;">${customFooterLine}</div>` : ''}
      ${whatsappNumber ? `<div style="margin-top: 2px; font-size: 9px;">WhatsApp: ${whatsappNumber}</div>` : ''}
      ${instagramHandle ? `<div style="margin-top: 2px; font-size: 9px;">Instagram: ${instagramHandle}</div>` : ''}
      ${facebookPage ? `<div style="margin-top: 2px; font-size: 9px;">Facebook: ${facebookPage}</div>` : ''}
      <div style="margin-top: 6px; font-size: 10px; font-weight: 600; color: #4f46e5;">${POWERED_BY_TEXT}</div>
      <div style="margin-top: 4px; font-size: 9px;">This is a computer-generated receipt</div>
    </div>
    ` : `
    <div class="footer">
      <div style="margin-top: 6px; font-size: 10px; font-weight: 600; color: #4f46e5;">${POWERED_BY_TEXT}</div>
      <div style="margin-top: 4px; font-size: 9px;">This is a computer-generated receipt</div>
    </div>`}
  </div>

  <button class="print-btn no-print" onclick="window.print()">🖨️ Print Receipt</button>

  <script>
    // Optional auto-print can be enabled here if desired
  </script>
</body>
</html>
  `

  return receiptHTML
}

/**
 * Print receipt (browser popup fallback).
 * Electron-aware flows should prefer buildReceiptHTML + window.electronAPI.print.html.
 */
export function printReceipt(
  invoiceData: ReceiptInvoiceData,
  paperWidthMm?: number,
  layout?: ReceiptPrinterSettings
): void {
  const receiptWindow = window.open('', '_blank', 'width=400,height=600')
  if (!receiptWindow) {
    alert('Please allow popups to print receipt')
    return
  }

  const receiptHTML = buildReceiptHTML(invoiceData, paperWidthMm, layout)
  receiptWindow.document.write(receiptHTML)
  receiptWindow.document.close()
  
  // Focus window for printing
  receiptWindow.focus()
}

// --- Reorder PDF/Excel export with app advertisement ---
const REORDER_AD_LINK = 'https://hisabkitabpro.com/login'
const REORDER_AD_TEXT = [
  'HisabKitab-Pro – Inventory & Business Management',
  `Login: ${REORDER_AD_LINK}`,
  'India pricing (First Year Discount Applied – 50% OFF):',
  '• Basic: ₹6,000/year (₹500/month) – 1 device + 1 mobile',
  '• Standard: ₹7,980/year (₹665/month) – 3 devices + 1 mobile (Most popular)',
  '• Premium: ₹12,000/year (₹1,000/month) – Unlimited devices',
  'Features: Inventory, GST/simple purchases, sales, customers, suppliers, reports, multi-company.',
]

export interface ReorderExportData {
  reorder_number: string
  order_date: string
  expected_date?: string
  supplier_name?: string
  supplier_gstin?: string
  status: string
  notes?: string
  subtotal: number
  total_tax: number
  grand_total: number
  items: Array<{
    product_name?: string
    ordered_qty: number
    unit_price: number
    total: number
    hsn_code?: string
    gst_rate?: number
  }>
}

export function exportReorderToPdf(
  data: ReorderExportData,
  companyName?: string,
  filename?: string
): void {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.width
  const margin = 15
  let y = margin

  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text(companyName || 'Purchase Reorder', margin, y)
  y += 8
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Reorder #: ${data.reorder_number}`, margin, y)
  y += 5
  pdf.text(`Order Date: ${new Date(data.order_date).toLocaleDateString('en-IN')}`, margin, y)
  if (data.expected_date) {
    y += 5
    pdf.text(`Expected: ${new Date(data.expected_date).toLocaleDateString('en-IN')}`, margin, y)
  }
  y += 8
  pdf.text(`Supplier: ${data.supplier_name || '—'}`, margin, y)
  if (data.supplier_gstin) {
    y += 5
    pdf.text(`GSTIN: ${data.supplier_gstin}`, margin, y)
  }
  y += 10

  pdf.setFont('helvetica', 'bold')
  pdf.text('Item', margin, y)
  pdf.text('Qty', margin + 80, y)
  pdf.text('Rate (₹)', margin + 100, y)
  pdf.text('Amount (₹)', pageWidth - margin - 25, y, { align: 'right' })
  y += 6
  pdf.line(margin, y, pageWidth - margin, y)
  y += 6
  pdf.setFont('helvetica', 'normal')
  data.items.forEach((item) => {
    if (y > pdf.internal.pageSize.height - 50) {
      pdf.addPage()
      y = margin
    }
    pdf.text(item.product_name || '—', margin, y)
    pdf.text(String(item.ordered_qty), margin + 80, y)
    pdf.text(`₹${Number(item.unit_price).toFixed(2)}`, margin + 100, y)
    pdf.text(`₹${Number(item.total).toFixed(2)}`, pageWidth - margin - 25, y, { align: 'right' })
    y += 6
  })
  y += 6
  pdf.line(margin, y, pageWidth - margin, y)
  y += 6
  pdf.text('Subtotal:', pageWidth - margin - 45, y, { align: 'right' })
  pdf.text(`₹${data.subtotal.toFixed(2)}`, pageWidth - margin - 5, y, { align: 'right' })
  y += 5
  if (data.total_tax > 0) {
    pdf.text('Tax:', pageWidth - margin - 45, y, { align: 'right' })
    pdf.text(`₹${data.total_tax.toFixed(2)}`, pageWidth - margin - 5, y, { align: 'right' })
    y += 5
  }
  pdf.setFont('helvetica', 'bold')
  pdf.text('Grand Total:', pageWidth - margin - 45, y, { align: 'right' })
  pdf.text(`₹${data.grand_total.toFixed(2)}`, pageWidth - margin - 5, y, { align: 'right' })
  y += 15

  // Ad block
  if (y > pdf.internal.pageSize.height - 55) {
    pdf.addPage()
    y = margin
  }
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text(POWERED_BY_TEXT, margin, y)
  y += 6
  pdf.setFont('helvetica', 'normal')
  REORDER_AD_TEXT.forEach((line) => {
    if (y > pdf.internal.pageSize.height - 15) {
      pdf.addPage()
      y = margin
    }
    pdf.text(line, margin, y)
    y += 5
  })
  pdf.text(REORDER_AD_LINK, margin, y)
  pdf.save(`${filename || `Reorder_${data.reorder_number}`}.pdf`)
}

export function exportReorderToExcel(
  data: ReorderExportData,
  companyName?: string,
  filename?: string
): void {
  const sheetData: any[][] = [
    [companyName || 'Purchase Reorder'],
    ['Reorder #', data.reorder_number],
    ['Order Date', data.order_date],
    ['Expected Date', data.expected_date || ''],
    ['Supplier', data.supplier_name || ''],
    ['GSTIN', data.supplier_gstin || ''],
    ['Status', data.status],
    [],
    ['Product', 'Ordered Qty', 'Unit Price', 'Total'],
    ...data.items.map((it) => [
      it.product_name || '',
      it.ordered_qty,
      it.unit_price,
      it.total,
    ]),
    [],
    ['Subtotal', '', '', data.subtotal],
    ['Total Tax', '', '', data.total_tax],
    ['Grand Total', '', '', data.grand_total],
    [],
    [POWERED_BY_TEXT],
    ...REORDER_AD_TEXT.map((t) => [t]),
    [REORDER_AD_LINK],
  ]
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reorder')
  XLSX.writeFile(wb, `${filename || `Reorder_${data.reorder_number}`}.xlsx`)
}
