import { InvoiceData } from '../types/invoice'
import { Printer, Download, X } from 'lucide-react'

interface InvoiceProps {
  invoiceData: InvoiceData
  onClose?: () => void
  showActions?: boolean
}

const Invoice = ({ invoiceData, onClose, showActions = true }: InvoiceProps) => {
  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceData.invoice_number}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 40px;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 20px;
            }
            .company-info h1 {
              margin: 0;
              font-size: 28px;
              color: #1f2937;
            }
            .company-info p {
              margin: 5px 0;
              color: #6b7280;
              font-size: 14px;
            }
            .invoice-details {
              text-align: right;
            }
            .invoice-details h2 {
              margin: 0;
              font-size: 24px;
              color: #1f2937;
            }
            .invoice-details p {
              margin: 5px 0;
              color: #6b7280;
              font-size: 14px;
            }
            .billing-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .billing-box {
              flex: 1;
            }
            .billing-box h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              color: #9ca3af;
              text-transform: uppercase;
            }
            .billing-box p {
              margin: 5px 0;
              color: #1f2937;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            thead {
              background: #f3f4f6;
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              color: #1f2937;
            }
            .text-right {
              text-align: right;
            }
            .totals {
              margin-left: auto;
              width: 300px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .totals-row.grand-total {
              font-size: 18px;
              font-weight: bold;
              border-top: 2px solid #1f2937;
              padding-top: 12px;
              margin-top: 8px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          ${generateInvoiceHTML(invoiceData)}
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  return (
    <div className="invoice-view">
      {/* Action Buttons - Hidden when printing */}
      {showActions && (
        <div className="no-print fixed top-4 right-4 z-50 flex gap-2 bg-white shadow-lg rounded-lg p-2 border border-gray-200">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <button
            onClick={handlePrint}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Print"
          >
            <Printer className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Download PDF"
          >
            <Download className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* Invoice Content */}
      <div className="invoice-container bg-white shadow-xl rounded-lg p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="invoice-header border-b-2 border-gray-200 pb-6 mb-8">
          <div className="company-info">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {invoiceData.company_info?.name || 'HisabKitab'}
            </h1>
            {invoiceData.company_info?.address && (
              <p className="text-gray-600 text-sm">{invoiceData.company_info.address}</p>
            )}
            {(invoiceData.company_info?.city || invoiceData.company_info?.state || invoiceData.company_info?.pincode) && (
              <p className="text-gray-600 text-sm">
                {[invoiceData.company_info.city, invoiceData.company_info.state, invoiceData.company_info.pincode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            <div className="mt-2 space-y-1">
              {invoiceData.company_info?.phone && (
                <p className="text-gray-600 text-sm">Phone: {invoiceData.company_info.phone}</p>
              )}
              {invoiceData.company_info?.email && (
                <p className="text-gray-600 text-sm">Email: {invoiceData.company_info.email}</p>
              )}
              {invoiceData.company_info?.gstin && (
                <p className="text-gray-600 text-sm">GSTIN: {invoiceData.company_info.gstin}</p>
              )}
            </div>
          </div>
          <div className="invoice-details text-right">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
            <p className="text-gray-600 text-sm">
              <strong>Invoice #:</strong> {invoiceData.invoice_number}
            </p>
            <p className="text-gray-600 text-sm">
              <strong>Date:</strong> {new Date(invoiceData.invoice_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>
            <p className="text-gray-600 text-sm">
              <strong>Time:</strong> {new Date(invoiceData.invoice_date).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </p>
          </div>
        </div>

        {/* Billing Information */}
        <div className="billing-section grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Bill To</h3>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">{invoiceData.customer?.name || 'Walk-in Customer'}</p>
              {invoiceData.customer?.address && (
                <p className="text-gray-600 text-sm">{invoiceData.customer.address}</p>
              )}
              {(invoiceData.customer?.city || invoiceData.customer?.state || invoiceData.customer?.pincode) && (
                <p className="text-gray-600 text-sm">
                  {[invoiceData.customer.city, invoiceData.customer.state, invoiceData.customer.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {invoiceData.customer?.phone && (
                <p className="text-gray-600 text-sm">Phone: {invoiceData.customer.phone}</p>
              )}
              {invoiceData.customer?.email && (
                <p className="text-gray-600 text-sm">Email: {invoiceData.customer.email}</p>
              )}
              {invoiceData.customer?.gstin && (
                <p className="text-gray-600 text-sm">GSTIN: {invoiceData.customer.gstin}</p>
              )}
            </div>
          </div>
          <div>
            {invoiceData.sales_person && (
              <>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Sales Person</h3>
                <p className="text-gray-900 font-medium">{invoiceData.sales_person}</p>
              </>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-8">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Item</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">HSN</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Qty</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">MRP</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Rate</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Discount</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, index) => {
              const mrpTotal = (item.mrp || item.unit_price) * item.quantity
              const itemDiscount = item.mrp && item.mrp > item.unit_price 
                ? (item.mrp - item.unit_price) * item.quantity 
                : 0
              const itemSavings = mrpTotal - item.total
              
              return (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {item.gst_rate !== undefined && (
                        <p className="text-xs text-gray-500">GST @ {item.gst_rate}%</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600 text-sm">
                    {item.hsn_code || '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {item.quantity} {item.unit || 'pcs'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.mrp && item.mrp > item.unit_price ? (
                      <span className="text-gray-400 line-through">₹{(item.mrp * item.quantity).toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-600">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    ₹{item.unit_price.toFixed(2)}
                    {item.mrp && item.mrp > item.unit_price && (
                      <span className="block text-xs text-green-600 font-medium">
                        {item.discount_percentage?.toFixed(1)}% OFF
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {itemDiscount > 0 ? (
                      <span className="text-green-600 font-medium">-₹{itemDiscount.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    ₹{item.total.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-2">
            {(() => {
              const totalMRP = invoiceData.items.reduce((sum, item) => {
                const mrp = item.mrp || item.unit_price
                return sum + (mrp * item.quantity)
              }, 0)
              const totalSavings = totalMRP - invoiceData.subtotal
              const hasSavings = totalSavings > 0
              
              return (
                <>
                  {hasSavings && (
                    <div className="flex justify-between text-gray-400 text-sm mb-2">
                      <span>Total MRP:</span>
                      <span className="line-through">₹{totalMRP.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>₹{invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  {hasSavings && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Total Savings:</span>
                      <span>₹{totalSavings.toFixed(2)}</span>
                    </div>
                  )}
                  {invoiceData.discount && invoiceData.discount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Additional Discount:</span>
                      <span>-₹{invoiceData.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {invoiceData.tax_amount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (GST):</span>
                      <span>₹{invoiceData.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t-2 border-gray-900">
                    <span>Total:</span>
                    <span>₹{invoiceData.grand_total.toFixed(2)}</span>
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Payment Information */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Payment Method:</span>
              <span className="ml-2 font-semibold text-gray-900 capitalize">{invoiceData.payment_method}</span>
            </div>
            <div>
              <span className="text-gray-600">Payment Status:</span>
              <span className={`ml-2 font-semibold ${
                invoiceData.payment_status === 'paid' ? 'text-green-600' : 'text-red-600'
              }`}>
                {invoiceData.payment_status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoiceData.notes && (
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes:</h4>
            <p className="text-sm text-gray-600">{invoiceData.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
          <p>Thank you for your business!</p>
          {invoiceData.company_info?.website && (
            <p className="mt-1">Visit us at: {invoiceData.company_info.website}</p>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          .invoice-container {
            box-shadow: none;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  )
}

// Helper function to generate HTML for download
const generateInvoiceHTML = (invoiceData: InvoiceData): string => {
  return `
    <div class="invoice-container">
      <div class="invoice-header">
        <div class="company-info">
          <h1>${invoiceData.company_info?.name || 'HisabKitab'}</h1>
          ${invoiceData.company_info?.address ? `<p>${invoiceData.company_info.address}</p>` : ''}
          ${invoiceData.company_info?.phone ? `<p>Phone: ${invoiceData.company_info.phone}</p>` : ''}
          ${invoiceData.company_info?.email ? `<p>Email: ${invoiceData.company_info.email}</p>` : ''}
          ${invoiceData.company_info?.gstin ? `<p>GSTIN: ${invoiceData.company_info.gstin}</p>` : ''}
        </div>
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> ${invoiceData.invoice_number}</p>
          <p><strong>Date:</strong> ${new Date(invoiceData.invoice_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })}</p>
          <p><strong>Time:</strong> ${new Date(invoiceData.invoice_date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })}</p>
        </div>
      </div>
      <div class="billing-section">
        <div class="billing-box">
          <h3>Bill To</h3>
          <p><strong>${invoiceData.customer?.name || 'Walk-in Customer'}</strong></p>
          ${invoiceData.customer?.address ? `<p>${invoiceData.customer.address}</p>` : ''}
          ${invoiceData.customer?.phone ? `<p>Phone: ${invoiceData.customer.phone}</p>` : ''}
          ${invoiceData.customer?.gstin ? `<p>GSTIN: ${invoiceData.customer.gstin}</p>` : ''}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>HSN</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.hsn_code || '—'}</td>
              <td class="text-right">${item.quantity} ${item.unit || 'pcs'}</td>
              <td class="text-right">₹${item.unit_price.toFixed(2)}</td>
              <td class="text-right">₹${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        ${(() => {
          const totalMRP = invoiceData.items.reduce((sum, item) => {
            const mrp = item.mrp || item.unit_price
            return sum + (mrp * item.quantity)
          }, 0)
          const totalSavings = totalMRP - invoiceData.subtotal
          const hasSavings = totalSavings > 0
          
          return `
            ${hasSavings ? `
              <div class="totals-row" style="color: #9ca3af; text-decoration: line-through;">
                <span>Total MRP:</span>
                <span>₹${totalMRP.toFixed(2)}</span>
              </div>
              <div class="totals-row" style="color: #16a34a; font-weight: 600;">
                <span>Total Savings:</span>
                <span>₹${totalSavings.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            ${invoiceData.tax_amount > 0 ? `
              <div class="totals-row">
                <span>Tax (GST):</span>
                <span>₹${invoiceData.tax_amount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row grand-total">
              <span>Total:</span>
              <span>₹${invoiceData.grand_total.toFixed(2)}</span>
            </div>
          `
        })()}
      </div>
      <div class="footer">
        <p>Thank you for your business!</p>
      </div>
    </div>
  `
}

export default Invoice

