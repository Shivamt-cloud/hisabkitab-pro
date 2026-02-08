import { useRef, useState, useEffect } from 'react'
import { InvoiceData } from '../types/invoice'
import { Printer, Download, X, Share2, Plus, Receipt } from 'lucide-react'
import { exportInvoiceToPDF, exportHTMLToPDF, printReceipt, buildReceiptHTML } from '../utils/exportUtils'
import { settingsService } from '../services/settingsService'

type InvoiceTemplateType = 'compact' | 'detailed' | 'with_logo'

interface InvoiceProps {
  invoiceData: InvoiceData
  onClose?: () => void
  onNewSale?: () => void
  showActions?: boolean
}

const TZ_INDIA = 'Asia/Kolkata'

const Invoice = ({ invoiceData, onClose, onNewSale, showActions = true }: InvoiceProps) => {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [template, setTemplate] = useState<InvoiceTemplateType>('detailed')
  const [timeFormat12h, setTimeFormat12h] = useState(true)

  useEffect(() => {
    settingsService.getAll()
      .then(s => {
        const t = s?.invoice?.invoice_template
        if (t === 'compact' || t === 'detailed' || t === 'with_logo') setTemplate(t)
        else if (t === 'standard') setTemplate('detailed')
        else if (t === 'minimal') setTemplate('compact')
        setTimeFormat12h((s?.general?.time_format ?? '12h') === '12h')
      })
      .catch(() => {})
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      if (invoiceRef.current) {
        // Add ID to invoice container for PDF export
        const tempId = `invoice-${Date.now()}`
        invoiceRef.current.setAttribute('id', tempId)
        
        await exportHTMLToPDF(tempId, `Invoice_${invoiceData.invoice_number}`, {
          format: 'a4',
          orientation: 'portrait',
          margin: 10,
        })
        
        invoiceRef.current.removeAttribute('id')
      } else {
        // Fallback to simplified PDF export
        exportInvoiceToPDF(invoiceData, `Invoice_${invoiceData.invoice_number}`)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Fallback to simplified PDF export
      exportInvoiceToPDF(invoiceData, `Invoice_${invoiceData.invoice_number}`)
    }
  }

  const handleShareWhatsApp = () => {
    // Generate invoice summary text
    const customerName = invoiceData.customer?.name || 'Walk-in Customer'
    const invoiceNumber = invoiceData.invoice_number
    const invoiceDate = new Date(invoiceData.invoice_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: TZ_INDIA
    })
    const grandTotal = invoiceData.grand_total.toFixed(2)
    const companyName = invoiceData.company_info?.name || 'HisabKitab'
    
    // Create WhatsApp message
    let message = `*${companyName}*\n\n`
    message += `*Invoice #${invoiceNumber}*\n`
    message += `Date: ${invoiceDate}\n`
    message += `Customer: ${customerName}\n\n`
    message += `*Items:*\n`
    
    invoiceData.items.forEach((item, index) => {
      message += `${index + 1}. ${item.product_name} - Qty: ${item.quantity} - ₹${item.total.toFixed(2)}\n`
    })
    
    message += `\n*Total Amount: ₹${grandTotal}*\n`
    if (invoiceData.payment_methods && invoiceData.payment_methods.length > 0) {
      message += `Payment Methods:\n`
      invoiceData.payment_methods.forEach((pm: { method: string; amount: number }, idx: number) => {
        message += `  ${idx + 1}. ${pm.method.toUpperCase()}: ₹${pm.amount.toFixed(2)}\n`
      })
      if (invoiceData.return_amount && invoiceData.return_amount > 0) {
        message += `  Return: ₹${invoiceData.return_amount.toFixed(2)}\n`
      }
    } else {
      message += `Payment Method: ${invoiceData.payment_method}\n`
    }
    message += `Payment Status: ${invoiceData.payment_status.toUpperCase()}\n\n`
    message += `Thank you for your business! 🙏`
    
    // Encode message for WhatsApp
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank')
  }

  const handleDownload = () => {
    handleDownloadPDF()
  }

  const handlePrintReceipt = async () => {
    let receiptSettings: any = undefined
    // Try Electron printer with receipt settings first
    if (window.electronAPI?.print?.html) {
      try {
        const settings = await settingsService.getAll()
        receiptSettings = settings.receipt_printer
        const paperWidthMm = receiptSettings?.paper_width_mm || 80
        const html = buildReceiptHTML(invoiceData, paperWidthMm, receiptSettings)

        const res = await window.electronAPI.print.html({
          html,
          silent: !!receiptSettings?.silent_print,
          deviceName: receiptSettings?.printer_device_name || undefined,
        })

        if (!res.ok) {
          alert(`Receipt print failed: ${res.error || 'Unknown error'}. Falling back to browser print.`)
          printReceipt(invoiceData, paperWidthMm, receiptSettings)
        }
        return
      } catch (e) {
        console.error('Electron receipt print failed, falling back to browser print:', e)
        printReceipt(invoiceData, undefined, receiptSettings)
        return
      }
    }

    // Browser fallback
    printReceipt(invoiceData)
  }

  return (
    <div className="invoice-view">
      {/* Action Buttons - Hidden when printing */}
      {showActions !== false && (
        <div className="no-print fixed top-4 right-4 z-50 flex flex-wrap gap-2 bg-white shadow-lg rounded-lg p-2 border border-gray-200">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {onNewSale && (
            <button
              onClick={onNewSale}
              className="p-2 hover:bg-blue-50 rounded transition-colors"
              title="New Sale"
            >
              <Plus className="w-5 h-5 text-blue-600" />
            </button>
          )}
          <button
            onClick={handleShareWhatsApp}
            className="p-2 hover:bg-green-50 rounded transition-colors"
            title="Share on WhatsApp"
          >
            <Share2 className="w-5 h-5 text-green-600" />
          </button>
          <button
            onClick={handlePrintReceipt}
            className="px-3 py-2 hover:bg-purple-50 rounded transition-colors flex items-center gap-2 text-sm font-medium text-purple-700 border border-purple-200"
            title="Print Receipt (Thermal)"
          >
            <Receipt className="w-5 h-5 text-purple-600" />
            <span className="hidden sm:inline">Thermal Receipt</span>
          </button>
          <button
            onClick={handlePrint}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Print Invoice"
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
      <div
        ref={invoiceRef}
        className={`invoice-container bg-white shadow-xl rounded-lg max-w-4xl mx-auto ${
          template === 'compact' ? 'p-4' : 'p-8'
        }`}
      >
        {/* Header */}
        <div className={`invoice-header border-b-2 border-gray-200 ${template === 'compact' ? 'pb-4 mb-4' : 'pb-6 mb-8'}`}>
          <div className="company-info">
            {/* With Logo template: show company logo prominently */}
            {template === 'with_logo' && invoiceData.company_info?.logo && (
              <div className="mb-4">
                <img
                  src={invoiceData.company_info.logo}
                  alt="Company logo"
                  className="h-16 object-contain object-left"
                  style={{ maxWidth: '200px' }}
                />
              </div>
            )}
            <h1 className={`font-bold text-gray-900 mb-2 ${template === 'compact' ? 'text-xl' : 'text-3xl'}`}>
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
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <span>Phone: {invoiceData.company_info.phone}</span>
                  <span className="text-green-600 font-semibold" title="Available on WhatsApp">📱</span>
                </p>
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
                year: 'numeric',
                timeZone: TZ_INDIA
              })}
            </p>
            <p className="text-gray-600 text-sm">
              <strong>Time:</strong> {getInvoiceTimeStr(invoiceData, timeFormat12h)}
            </p>
          </div>
        </div>

        {/* Billing Information */}
        <div className={`billing-section grid grid-cols-2 ${template === 'compact' ? 'gap-4 mb-4' : 'gap-8 mb-8'}`}>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Bill To</h3>
            <div className={`space-y-1 ${template === 'compact' ? 'text-sm' : ''}`}>
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
        <table className={`w-full border-collapse ${template === 'compact' ? 'mb-4 text-sm' : 'mb-8'}`}>
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Item</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Qty</th>
              {template !== 'compact' && (
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">MRP</th>
              )}
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Rate</th>
              {template !== 'compact' && (
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Discount</th>
              )}
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, index) => {
              const itemDiscount = item.mrp && item.mrp > item.unit_price 
                ? (item.mrp - item.unit_price) * item.quantity 
                : 0
              return (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {template !== 'compact' && item.gst_rate !== undefined && (
                        <p className="text-xs text-gray-500">GST @ {item.gst_rate}%</p>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900">
                    {item.quantity} {item.unit || 'pcs'}
                  </td>
                  {template !== 'compact' && (
                    <td className="py-2 px-3 text-right">
                      {item.mrp && item.mrp > item.unit_price ? (
                        <span className="text-gray-400 line-through">₹{(item.mrp * item.quantity).toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-600">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                      )}
                    </td>
                  )}
                  <td className="py-2 px-3 text-right text-gray-900">
                    ₹{item.unit_price.toFixed(2)}
                    {template !== 'compact' && item.mrp && item.mrp > item.unit_price && (
                      <span className="block text-xs text-green-600 font-medium">
                        {item.discount_percentage?.toFixed(1)}% OFF
                      </span>
                    )}
                  </td>
                  {template !== 'compact' && (
                    <td className="py-2 px-3 text-right">
                      {itemDiscount > 0 ? (
                        <span className="text-green-600 font-medium">-₹{itemDiscount.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="py-2 px-3 text-right font-semibold text-gray-900">
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
              <span className="text-gray-600">Payment Method{invoiceData.payment_methods && invoiceData.payment_methods.length > 1 ? 's' : ''}:</span>
              {invoiceData.payment_methods && invoiceData.payment_methods.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {invoiceData.payment_methods.map((pm: { method: string; amount: number }, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 capitalize">{pm.method}:</span>
                      <span className="ml-2 font-semibold text-gray-900">₹{pm.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {invoiceData.credit_applied && invoiceData.credit_applied > 0 && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <span className="font-semibold text-green-700">Credit Applied:</span>
                      <span className="ml-2 font-semibold text-green-600">-₹{invoiceData.credit_applied.toFixed(2)}</span>
                    </div>
                  )}
                  {invoiceData.return_amount && invoiceData.return_amount > 0 && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <span className="font-semibold text-green-700">Return:</span>
                      <span className="ml-2 font-semibold text-green-600">₹{invoiceData.return_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="ml-2 font-semibold text-gray-900 capitalize">{invoiceData.payment_method}</span>
              )}
            </div>
            <div>
              <span className="text-gray-600">Payment Status:</span>
              <span className={`ml-2 font-semibold ${
                invoiceData.payment_status === 'paid' ? 'text-green-600' : 'text-red-600'
              }`}>
                {invoiceData.payment_status.toUpperCase()}
              </span>
              {invoiceData.credit_balance !== undefined && invoiceData.credit_balance >= 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-600">Available Credit Balance:</span>
                  <div className={`mt-1 font-semibold text-lg ${
                    invoiceData.credit_balance > 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    ₹{invoiceData.credit_balance.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Credit can be used on future purchases</p>
                </div>
              )}
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

        {/* Terms & Conditions, Return Policy, Rules & Regulations */}
        <div className="border-t-2 border-gray-300 pt-6 mt-8 space-y-6">
          {/* Return Policy */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase">Return & Exchange Policy</h4>
            <div className="text-xs text-gray-600 space-y-2">
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Items can be returned within 7 days of purchase with original invoice.</li>
                <li>Products must be in original condition with all tags and packaging intact.</li>
                <li>Refund will be processed through the original payment method within 5-7 business days.</li>
                <li>Items purchased on sale or with special discounts may have different return policies.</li>
                <li>Customized or personalized items are not eligible for return unless defective.</li>
                <li>Returned items will be inspected before processing the refund.</li>
              </ul>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase">Terms & Conditions</h4>
            <div className="text-xs text-gray-600 space-y-2">
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All prices are inclusive of applicable taxes unless stated otherwise.</li>
                <li>Payment must be made as per the payment method selected at the time of purchase.</li>
                <li>Goods once sold will not be taken back unless covered under return policy.</li>
                <li>Any dispute will be subject to the jurisdiction of local courts.</li>
                <li>The company reserves the right to modify terms and conditions without prior notice.</li>
                <li>Original invoice must be presented for any warranty claims or returns.</li>
                <li>Warranty terms are as per manufacturer's guidelines and may vary by product.</li>
              </ul>
            </div>
          </div>

          {/* Rules & Regulations */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase">Rules & Regulations</h4>
            <div className="text-xs text-gray-600 space-y-2">
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>This invoice is a valid document for accounting and tax purposes.</li>
                <li>Please retain this invoice for warranty and return purposes.</li>
                <li>Any discrepancy must be reported within 24 hours of purchase.</li>
                <li>Company is not responsible for any damage after delivery if not reported immediately.</li>
                <li>All transactions are subject to verification and may be cancelled if found fraudulent.</li>
                <li>Customer is responsible for providing accurate information at the time of purchase.</li>
                <li>Company reserves the right to refuse service to anyone without prior notice.</li>
              </ul>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-bold text-gray-900 mb-2">Important Information</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>For Returns/Exchanges:</strong> Please contact us within 7 days of purchase with this invoice.</p>
              <p><strong>For Warranty Claims:</strong> Please keep this invoice safe and contact us with invoice number.</p>
              <p><strong>Customer Support:</strong> For any queries, please contact us using the details mentioned above.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 mt-6 text-center text-xs text-gray-500">
          <p className="font-semibold mb-2">Thank you for your business!</p>
          <p>We appreciate your trust in us. For any queries or support, please contact us.</p>
          {invoiceData.company_info?.website && (
            <p className="mt-2">Visit us at: {invoiceData.company_info.website}</p>
          )}
          <p className="mt-4 pt-3 border-t border-gray-100 text-indigo-600 font-semibold">
            Powered by <a href="https://hisabkitabpro.com" target="_blank" rel="noopener noreferrer" className="hover:underline">HisabKitab Pro</a> · hisabkitabpro.com
          </p>
          <p className="mt-2 text-gray-400">This is a computer-generated invoice and does not require a signature.</p>
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

// Helper: use created_at for time when invoice_date is date-only (Supabase DATE column → 5:30 AM IST)
const getInvoiceTimeStr = (invoiceData: InvoiceData, hour12 = true): string => {
  const invDate = new Date(invoiceData.invoice_date)
  const isDateOnly = !invoiceData.invoice_date.includes('T') || (invDate.getUTCHours() === 0 && invDate.getUTCMinutes() === 0 && invDate.getUTCSeconds() === 0)
  const timeSource = (isDateOnly && invoiceData.created_at) ? new Date(invoiceData.created_at) : invDate
  return timeSource.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12,
    timeZone: TZ_INDIA
  })
}

// Helper function to generate HTML for download
const generateInvoiceHTML = (invoiceData: InvoiceData): string => {
  const timeStr = getInvoiceTimeStr(invoiceData)
  return `
    <div class="invoice-container">
      <div class="invoice-header">
        <div class="company-info">
          <h1>${invoiceData.company_info?.name || 'HisabKitab'}</h1>
          ${invoiceData.company_info?.address ? `<p>${invoiceData.company_info.address}</p>` : ''}
          ${(invoiceData.company_info?.city || invoiceData.company_info?.state || invoiceData.company_info?.pincode) ? `
            <p>${[invoiceData.company_info.city, invoiceData.company_info.state, invoiceData.company_info.pincode].filter(Boolean).join(', ')}</p>
          ` : ''}
          ${invoiceData.company_info?.phone ? `<p>Phone: ${invoiceData.company_info.phone} <span style="color: #16a34a; font-weight: 600;" title="Available on WhatsApp">📱</span></p>` : ''}
          ${invoiceData.company_info?.email ? `<p>Email: ${invoiceData.company_info.email}</p>` : ''}
          ${invoiceData.company_info?.gstin ? `<p>GSTIN: ${invoiceData.company_info.gstin}</p>` : ''}
        </div>
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> ${invoiceData.invoice_number}</p>
          <p><strong>Date:</strong> ${new Date(invoiceData.invoice_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: TZ_INDIA
          })}</p>
          <p><strong>Time:</strong> ${timeStr}</p>
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
            <th class="text-right">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map(item => `
            <tr>
              <td>${item.product_name}</td>
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
      <div class="payment-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Payment Method${invoiceData.payment_methods && invoiceData.payment_methods.length > 1 ? 's' : ''}:</p>
            ${invoiceData.payment_methods && invoiceData.payment_methods.length > 0 ? `
              <div style="margin-top: 8px;">
                ${invoiceData.payment_methods.map((pm: { method: string; amount: number }) => `
                  <p style="margin: 4px 0; font-weight: 600; color: #111827;">
                    ${pm.method.charAt(0).toUpperCase() + pm.method.slice(1)}: ₹${pm.amount.toFixed(2)}
                  </p>
                `).join('')}
                ${invoiceData.credit_applied && invoiceData.credit_applied > 0 ? `
                  <p style="margin: 8px 0 4px 0; padding-top: 8px; border-top: 1px solid #e5e7eb; font-weight: 600; color: #16a34a;">
                    Credit Applied: -₹${invoiceData.credit_applied.toFixed(2)}
                  </p>
                ` : ''}
                ${invoiceData.return_amount && invoiceData.return_amount > 0 ? `
                  <p style="margin: 8px 0 4px 0; padding-top: 8px; border-top: 1px solid #e5e7eb; font-weight: 600; color: #16a34a;">
                    Return: ₹${invoiceData.return_amount.toFixed(2)}
                  </p>
                ` : ''}
              </div>
            ` : `
              <p style="margin: 8px 0 0 0; font-weight: 600; color: #111827; text-transform: capitalize;">
                ${invoiceData.payment_method}
              </p>
            `}
          </div>
          <div>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Payment Status:</p>
            <p style="margin: 8px 0 0 0; font-weight: 600; color: ${invoiceData.payment_status === 'paid' ? '#16a34a' : '#dc2626'}; text-transform: uppercase;">
              ${invoiceData.payment_status}
            </p>
            ${invoiceData.credit_balance !== undefined && invoiceData.credit_balance >= 0 ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Available Credit Balance:</p>
                <p style="margin: 4px 0 0 0; font-weight: 600; font-size: 18px; color: ${invoiceData.credit_balance > 0 ? '#16a34a' : '#6b7280'};">
                  ₹${invoiceData.credit_balance.toFixed(2)}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">Credit can be used on future purchases</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
      <div class="terms-section">
        <h4>Return & Exchange Policy</h4>
        <ul>
          <li>Items can be returned within 7 days of purchase with original invoice.</li>
          <li>Products must be in original condition with all tags and packaging intact.</li>
          <li>Refund will be processed through the original payment method within 5-7 business days.</li>
          <li>Items purchased on sale or with special discounts may have different return policies.</li>
          <li>Customized or personalized items are not eligible for return unless defective.</li>
        </ul>
        
        <h4 style="margin-top: 20px;">Terms & Conditions</h4>
        <ul>
          <li>All prices are inclusive of applicable taxes unless stated otherwise.</li>
          <li>Payment must be made as per the payment method selected at the time of purchase.</li>
          <li>Goods once sold will not be taken back unless covered under return policy.</li>
          <li>Any dispute will be subject to the jurisdiction of local courts.</li>
          <li>Original invoice must be presented for any warranty claims or returns.</li>
        </ul>
        
        <h4 style="margin-top: 20px;">Rules & Regulations</h4>
        <ul>
          <li>This invoice is a valid document for accounting and tax purposes.</li>
          <li>Please retain this invoice for warranty and return purposes.</li>
          <li>Any discrepancy must be reported within 24 hours of purchase.</li>
          <li>All transactions are subject to verification and may be cancelled if found fraudulent.</li>
        </ul>
      </div>
      <div class="footer">
        <p><strong>Thank you for your business!</strong></p>
        <p style="margin-top: 12px; font-weight: 600; color: #4f46e5; font-size: 13px;">Powered by HisabKitab Pro · hisabkitabpro.com</p>
        <p style="margin-top: 8px;"><a href="https://hisabkitabpro.com" target="_blank" rel="noopener noreferrer" style="color: #4f46e5;">hisabkitabpro.com</a></p>
        <p style="margin-top: 12px;">This is a computer-generated invoice and does not require a signature.</p>
      </div>
    </div>
  `
}

export default Invoice

