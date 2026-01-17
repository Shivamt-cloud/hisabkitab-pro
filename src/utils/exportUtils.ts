/**
 * Export Utilities for HisabKitab-Pro
 * Provides Excel and PDF export functionality
 */

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  
  // Add headers row
  const worksheetData = [headers, ...data]
  
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
  pdf.text(`Date: ${new Date(invoiceData.invoice_date).toLocaleDateString('en-IN')}`, pageWidth - margin - 40, margin + 12)

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
  yPosition = pdf.internal.pageSize.height - 20
  pdf.setFontSize(8)
  pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' })

  // Save PDF
  pdf.save(`${filename}.pdf`)
}

/**
 * Print receipt (thermal/compact format for POS printers)
 */
export function printReceipt(
  invoiceData: {
    invoice_number: string
    invoice_date: string
    customer?: { name?: string; phone?: string; gstin?: string }
    items: Array<{
      product_name: string
      quantity: number
      unit_price: number
      total: number
      unit?: string
      discount?: number
      discount_percentage?: number
      mrp?: number
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
): void {
  const receiptWindow = window.open('', '_blank', 'width=400,height=600')
  if (!receiptWindow) {
    alert('Please allow popups to print receipt')
    return
  }

  const companyName = invoiceData.company_info?.name || 'HisabKitab'
  const companyAddress = invoiceData.company_info?.address || ''
  const companyPhone = invoiceData.company_info?.phone || ''
  const companyGSTIN = invoiceData.company_info?.gstin || ''
  const customerName = invoiceData.customer?.name || 'Walk-in Customer'
  const invoiceDate = new Date(invoiceData.invoice_date)
  const dateStr = invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const timeStr = invoiceDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  // Calculate payment breakdown
  const paymentMethods = invoiceData.payment_methods || [
    { method: invoiceData.payment_method, amount: invoiceData.grand_total }
  ]

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${invoiceData.invoice_number}</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
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
      width: 80mm;
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
      <div class="company-name">${companyName}</div>
      ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
      ${companyPhone ? `<div class="company-info">Ph: ${companyPhone}</div>` : ''}
      ${companyGSTIN ? `<div class="company-info">GSTIN: ${companyGSTIN}</div>` : ''}
    </div>

    <div class="section">
      <div class="invoice-info">
        <span>Invoice #: ${invoiceData.invoice_number}</span>
        <span>${dateStr}</span>
      </div>
      <div class="invoice-info">
        <span>${timeStr}</span>
        <span>${invoiceData.payment_status.toUpperCase()}</span>
      </div>
    </div>

    ${customerName !== 'Walk-in Customer' ? `
    <div class="section">
      <div class="section-title">Customer</div>
      <div class="customer-info">
        ${customerName}
        ${invoiceData.customer?.phone ? `<br>Ph: ${invoiceData.customer.phone}` : ''}
        ${invoiceData.customer?.gstin ? `<br>GSTIN: ${invoiceData.customer.gstin}` : ''}
      </div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Items</div>
      <table class="items-table">
        ${invoiceData.items.map(item => {
          const itemTotal = item.total
          const hasDiscount = item.discount && item.discount > 0
          return `
          <tr>
            <td class="item-name">
              ${item.product_name}
              ${hasDiscount ? `<div class="item-discount">(${item.discount_percentage?.toFixed(1) || 0}% OFF)</div>` : ''}
            </td>
            <td class="item-qty">${item.quantity}${item.unit ? item.unit.substring(0, 2) : ''}</td>
            <td class="item-price">₹${itemTotal.toFixed(2)}</td>
          </tr>
          `
        }).join('')}
      </table>
    </div>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>₹${invoiceData.subtotal.toFixed(2)}</span>
      </div>
      ${invoiceData.discount && invoiceData.discount > 0 ? `
      <div class="total-row">
        <span>Discount:</span>
        <span>-₹${invoiceData.discount.toFixed(2)}</span>
      </div>
      ` : ''}
      ${invoiceData.tax_amount && invoiceData.tax_amount > 0 ? `
      <div class="total-row">
        <span>Tax (GST):</span>
        <span>₹${invoiceData.tax_amount.toFixed(2)}</span>
      </div>
      ` : ''}
      ${invoiceData.credit_applied && invoiceData.credit_applied > 0 ? `
      <div class="total-row">
        <span>Credit Applied:</span>
        <span>-₹${invoiceData.credit_applied.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>₹${invoiceData.grand_total.toFixed(2)}</span>
      </div>
    </div>

    <div class="section payment-info">
      <div class="section-title">Payment</div>
      ${paymentMethods.map(pm => `
        <div class="payment-method">
          ${pm.method}: ₹${pm.amount.toFixed(2)}
        </div>
      `).join('')}
      ${invoiceData.return_amount && invoiceData.return_amount > 0 ? `
        <div class="payment-method" style="color: #059669;">
          Return: ₹${invoiceData.return_amount.toFixed(2)}
        </div>
      ` : ''}
      ${invoiceData.credit_balance !== undefined ? `
        <div class="payment-method" style="margin-top: 4px; font-size: 10px; color: #666;">
          Credit Balance: ₹${invoiceData.credit_balance.toFixed(2)}
        </div>
      ` : ''}
    </div>

    <div class="footer">
      <div>Thank you for your business!</div>
      <div style="margin-top: 4px; font-size: 9px;">This is a computer-generated receipt</div>
    </div>
  </div>

  <button class="print-btn no-print" onclick="window.print()">🖨️ Print Receipt</button>

  <script>
    // Auto-print when window loads (optional - can be removed if manual print preferred)
    // window.onload = () => {
    //   setTimeout(() => window.print(), 500)
    // }
  </script>
</body>
</html>
  `

  receiptWindow.document.write(receiptHTML)
  receiptWindow.document.close()
  
  // Focus window for printing
  receiptWindow.focus()
}
