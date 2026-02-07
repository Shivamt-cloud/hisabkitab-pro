import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { settingsService } from '../services/settingsService'
import { ReceiptPrinterSettings } from '../types/settings'
import { Home, Receipt, Save } from 'lucide-react'
import { buildReceiptHTML, type ReceiptInvoiceData } from '../utils/exportUtils'
import { saleService } from '../services/saleService'
import { companyService } from '../services/companyService'
import { customerService } from '../services/customerService'

const DEFAULT_RECEIPT_PRINTER: ReceiptPrinterSettings = {
  paper_width_mm: 80,
  printer_type: 'GENERIC',
  printer_device_name: '',
  silent_print: false,
  show_company_name: true,
  show_company_address: true,
  show_company_phone: true,
  show_company_email: true,
  show_company_gstin: true,
  show_invoice_number: true,
  show_date: true,
  show_time: true,
  show_payment_status: true,
  show_customer_name: true,
  show_customer_phone: true,
  show_customer_address: true,
  show_customer_gstin: true,
  show_sales_person: true,
  show_notes: true,
  show_items: true,
  show_item_discount: true,
  show_item_mrp: true,
  show_subtotal: true,
  show_discount: true,
  show_tax: true,
  show_credit_applied: true,
  show_return_amount: true,
  show_credit_balance: true,
  show_footer: true,
}

const ReceiptPrinterSettingsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [receiptPrinter, setReceiptPrinter] = useState<ReceiptPrinterSettings>({ ...DEFAULT_RECEIPT_PRINTER })
  const [availablePrinters, setAvailablePrinters] = useState<
    Array<{ name: string; displayName?: string; isDefault?: boolean }>
  >([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
   const [previewHtml, setPreviewHtml] = useState<string>('')
   const [testingPrint, setTestingPrint] = useState(false)
   const [testResult, setTestResult] = useState<string>('')
  const [previewInvoice, setPreviewInvoice] = useState<ReceiptInvoiceData | null>(null)

  useEffect(() => {
    loadSettings()
    loadPrinters()
    loadPreviewInvoice()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getAll()
      const merged = settings.receipt_printer
        ? { ...DEFAULT_RECEIPT_PRINTER, ...settings.receipt_printer }
        : DEFAULT_RECEIPT_PRINTER
      setReceiptPrinter(merged)
      generatePreview(merged, previewInvoice)
    } catch (e) {
      console.error('Error loading receipt printer settings:', e)
    } finally {
      setLoading(false)
    }
  }

  const sampleInvoice: ReceiptInvoiceData = {
    invoice_number: 'INV-TEST-001',
    invoice_date: new Date().toISOString(),
    customer: {
      name: 'Demo Customer',
      phone: '+91-9876543210',
      gstin: '22DEMO0000D1Z5',
      address: '123 Sample Street',
      city: 'Demo City',
      state: 'Demo State',
      pincode: '110001',
    },
    sales_person: 'Sales Rep Name',
    notes: 'Thank you for your purchase. Visit again!',
    items: [
      { product_name: 'Sample Item A', quantity: 1, unit_price: 90, total: 90, mrp: 100, discount: 10, discount_percentage: 10 },
      { product_name: 'Sample Item B', quantity: 2, unit_price: 45, total: 90, mrp: 50, discount: 5, discount_percentage: 10 },
    ],
    subtotal: 180,
    tax_amount: 18,
    discount: 10,
    grand_total: 188,
    payment_method: 'cash',
    payment_methods: [{ method: 'Cash', amount: 188 }],
    payment_status: 'paid',
    return_amount: 0,
    credit_applied: 0,
    credit_balance: 0,
    company_info: {
      name: 'HisabKitab Demo Store',
      address: 'Main Road, Demo City',
      phone: '+91-9999999999',
      email: 'demo@hisabkitabpro.com',
      gstin: '22AAAAA0000A1Z5',
    },
  }

  const loadPreviewInvoice = async () => {
    try {
      const allSales = await saleService.getAll(false)
      if (!allSales || allSales.length === 0) {
        setPreviewInvoice(null)
        return
      }
      const sorted = [...allSales].sort(
        (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
      )
      const latest = sorted[0]
      let companyInfo: ReceiptInvoiceData['company_info'] | undefined
      try {
        if (latest.company_id) {
          const company = await companyService.getById(latest.company_id)
          if (company) {
            const addressParts: string[] = []
            if (company.address) addressParts.push(company.address)
            if (company.city) addressParts.push(company.city)
            if (company.state) addressParts.push(company.state)
            if (company.pincode) addressParts.push(company.pincode)
            companyInfo = {
              name: company.name,
              address: addressParts.join(', '),
              phone: company.phone,
              email: company.email,
              gstin: company.gstin,
            }
          }
        }
      } catch (err) {
        console.error('Error loading company for receipt preview:', err)
      }
      let customerWithAddress: ReceiptInvoiceData['customer'] | undefined
      if (latest.customer_name) {
        try {
          const cust = latest.customer_id ? await customerService.getById(latest.customer_id) : null
          customerWithAddress = {
            name: latest.customer_name,
            phone: cust?.phone ?? undefined,
            gstin: cust?.gstin ?? undefined,
            address: cust?.address ?? undefined,
            city: cust?.city ?? undefined,
            state: cust?.state ?? undefined,
            pincode: cust?.pincode ?? undefined,
          }
        } catch {
          customerWithAddress = { name: latest.customer_name, phone: undefined, gstin: undefined }
        }
      }
      const invoice: ReceiptInvoiceData = {
        invoice_number: latest.invoice_number,
        invoice_date: latest.sale_date,
        created_at: latest.created_at,
        customer: customerWithAddress,
        sales_person: latest.sales_person_name,
        notes: latest.notes,
        items: latest.items.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          unit: item.product_snapshot?.unit,
          discount: item.discount,
          discount_percentage: item.discount_percentage,
          mrp: item.mrp,
        })),
        subtotal: latest.subtotal,
        tax_amount: latest.tax_amount,
        discount: latest.discount,
        grand_total: latest.grand_total,
        payment_method: latest.payment_method,
        payment_methods: latest.payment_methods,
        payment_status: latest.payment_status,
        return_amount: latest.return_amount,
        credit_applied: latest.credit_applied,
        credit_balance: undefined,
        company_info: companyInfo,
      }
      setPreviewInvoice(invoice)
      generatePreview(receiptPrinter, invoice)
    } catch (e) {
      console.error('Error loading preview invoice:', e)
      setPreviewInvoice(null)
    }
  }

  const generatePreview = (settings: ReceiptPrinterSettings, invoiceOverride?: ReceiptInvoiceData | null) => {
    const source = invoiceOverride || previewInvoice || sampleInvoice
    const html = buildReceiptHTML(source, settings.paper_width_mm, settings)
    setPreviewHtml(html)
  }

  const loadPrinters = async () => {
    try {
      if (window.electronAPI?.printers?.list) {
        const printers = await window.electronAPI.printers.list()
        setAvailablePrinters(
          (printers || []).map(p => ({
            name: p.name,
            displayName: p.displayName,
            isDefault: p.isDefault,
          }))
        )
      }
    } catch (e) {
      console.error('Error loading printers:', e)
      setAvailablePrinters([])
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const toSave = { ...DEFAULT_RECEIPT_PRINTER, ...receiptPrinter }
      await settingsService.update({ receipt_printer: toSave }, user?.id ? parseInt(user.id) : undefined)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      alert('Failed to save receipt printer settings')
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewClick = () => {
    generatePreview(receiptPrinter)
  }

  const handleTestPrint = async () => {
    setTestResult('')
    const source = previewInvoice || sampleInvoice
    const html = buildReceiptHTML(source, receiptPrinter.paper_width_mm, receiptPrinter)

    // Electron path preferred
    if (window.electronAPI?.print?.html) {
      setTestingPrint(true)
      try {
        const res = await window.electronAPI.print.html({
          html,
          silent: false,
          deviceName: receiptPrinter.printer_device_name || undefined,
        })
        setTestResult(res.ok ? 'Test receipt sent to printer.' : `Test print failed: ${res.error || 'Unknown error'}`)
      } catch (e: any) {
        console.error('Test receipt print failed:', e)
        setTestResult(`Test print error: ${e?.message || String(e)}`)
      } finally {
        setTestingPrint(false)
      }
      return
    }

    // Browser fallback
    const w = window.open('', '_blank')
    if (!w) {
      alert('Please allow popups to test print')
      return
    }
    w.document.write(html)
    w.document.close()
    setTimeout(() => {
      w.print()
    }, 800)
    setTestResult('Test receipt opened in a new tab/window for printing.')
  }

  // Keep preview in sync with current settings so toggles immediately reflect in preview
  useEffect(() => {
    generatePreview(receiptPrinter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    receiptPrinter.paper_width_mm,
    receiptPrinter.show_company_name,
    receiptPrinter.show_company_address,
    receiptPrinter.show_company_phone,
    receiptPrinter.show_company_gstin,
    receiptPrinter.show_invoice_number,
    receiptPrinter.show_date,
    receiptPrinter.show_time,
    receiptPrinter.show_payment_status,
    receiptPrinter.show_customer_name,
    receiptPrinter.show_customer_phone,
    receiptPrinter.show_customer_address,
    receiptPrinter.show_customer_gstin,
    receiptPrinter.show_sales_person,
    receiptPrinter.show_notes,
    receiptPrinter.show_items,
    receiptPrinter.show_item_discount,
    receiptPrinter.show_item_mrp,
    receiptPrinter.show_subtotal,
    receiptPrinter.show_discount,
    receiptPrinter.show_tax,
    receiptPrinter.show_credit_applied,
    receiptPrinter.show_return_amount,
    receiptPrinter.show_credit_balance,
    receiptPrinter.show_footer,
    receiptPrinter.whatsapp_number,
    receiptPrinter.instagram_handle,
    receiptPrinter.facebook_page,
    receiptPrinter.custom_footer_line,
  ])

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading receipt printer settings...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                  title="Back to Dashboard"
                >
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Receipt className="w-8 h-8 text-indigo-600" />
                    Receipt Printer Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure thermal receipt printers for small retail bills.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {saved && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <Save className="w-5 h-5" />
              Receipt printer settings saved successfully!
            </div>
          )}

          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Paper & Layout</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Paper Width</label>
                    <select
                      value={receiptPrinter.paper_width_mm}
                      onChange={e =>
                        setReceiptPrinter({
                          ...receiptPrinter,
                          paper_width_mm: parseInt(e.target.value, 10) === 58 ? 58 : 80,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      <option value={58}>58mm (Small Roll)</option>
                      <option value={80}>80mm (Standard Roll)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Match this to your receipt printer roll width (58mm or 80mm).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Printer Type</label>
                    <select
                      value={receiptPrinter.printer_type || 'GENERIC'}
                      onChange={e =>
                        setReceiptPrinter({
                          ...receiptPrinter,
                          printer_type: e.target.value as any,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    >
                      <option value="GENERIC">Generic (Windows/macOS Print)</option>
                      <option value="ESC_POS">ESC/POS (Epson TM / compatible)</option>
                      <option value="STAR">Star Micronics</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Used for future direct-integration optimizations; currently all go via OS driver.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fields to Display */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900">Fields to Display</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">Store Header</p>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_company_name ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_company_name: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Store / Company Name
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_company_address ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_company_address: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Address
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_company_phone ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_company_phone: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Phone
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_company_email ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_company_email: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_company_gstin ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_company_gstin: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      GSTIN
                    </label>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">Bill Info & Customer</p>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_invoice_number ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_invoice_number: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Invoice Number
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_date ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_date: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Date
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_time ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_time: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Time
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_payment_status ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_payment_status: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Payment Status
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_customer_name ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_customer_name: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Customer Name
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_customer_phone ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_customer_phone: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Customer Phone
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_customer_address ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_customer_address: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Customer Address
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_customer_gstin ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_customer_gstin: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Customer GSTIN
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_sales_person ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_sales_person: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Sales Person
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_notes ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_notes: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Notes
                    </label>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">Amounts & Footer</p>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_items ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_items: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Show Items
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_item_discount ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_item_discount: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Item Discount Label
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_item_mrp ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_item_mrp: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Item MRP
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_subtotal ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_subtotal: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Subtotal
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_discount ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_discount: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Additional Discount
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_tax ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_tax: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Tax (GST)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_credit_applied ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_credit_applied: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Credit Applied
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_return_amount ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_return_amount: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Return Amount
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_credit_balance ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_credit_balance: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Credit Balance
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={receiptPrinter.show_footer ?? true}
                        onChange={e =>
                          setReceiptPrinter({ ...receiptPrinter, show_footer: e.target.checked })
                        }
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      Thank You Footer
                    </label>
                  </div>
                </div>
              </div>

              {/* Social / Contact Footer */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900">Social & Contact (Footer)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp Number</label>
                    <input
                      type="text"
                      value={receiptPrinter.whatsapp_number || ''}
                      onChange={e =>
                        setReceiptPrinter({ ...receiptPrinter, whatsapp_number: e.target.value })
                      }
                      placeholder="+91-9876543210"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Shown as “WhatsApp: &lt;number&gt;” at the bottom of the receipt.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Instagram Handle</label>
                    <input
                      type="text"
                      value={receiptPrinter.instagram_handle || ''}
                      onChange={e =>
                        setReceiptPrinter({ ...receiptPrinter, instagram_handle: e.target.value })
                      }
                      placeholder="@yourstore"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For example “@hisabkitabpro_store”.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Facebook Page</label>
                    <input
                      type="text"
                      value={receiptPrinter.facebook_page || ''}
                      onChange={e =>
                        setReceiptPrinter({ ...receiptPrinter, facebook_page: e.target.value })
                      }
                      placeholder="fb.com/yourstore"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Footer Line</label>
                    <input
                      type="text"
                      value={receiptPrinter.custom_footer_line || ''}
                      onChange={e =>
                        setReceiptPrinter({ ...receiptPrinter, custom_footer_line: e.target.value })
                      }
                      placeholder="e.g., Follow us for offers!"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Printer Device</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt Printer Device</label>
                    <select
                      value={receiptPrinter.printer_device_name || ''}
                      onChange={e =>
                        setReceiptPrinter({
                          ...receiptPrinter,
                          printer_device_name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      disabled={!window.electronAPI?.printers?.list}
                    >
                      <option value="">
                        {window.electronAPI?.printers?.list
                          ? 'Select receipt printer (optional)'
                          : 'Available in Electron app only'}
                      </option>
                      {availablePrinters.map(p => (
                        <option key={p.name} value={p.name}>
                          {p.displayName || p.name}
                          {p.isDefault ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={loadPrinters}
                      className="mt-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      disabled={!window.electronAPI?.printers?.list}
                    >
                      Refresh printers
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Install your POS printer driver first, then select it here.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="receipt_silent_print"
                      checked={!!receiptPrinter.silent_print}
                      onChange={e =>
                        setReceiptPrinter({
                          ...receiptPrinter,
                          silent_print: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      disabled={!window.electronAPI?.print?.html}
                    />
                    <label htmlFor="receipt_silent_print" className="text-sm font-medium text-gray-700">
                      Silent print (skip dialog) in desktop app
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview & Test Print */}
              <div className="space-y-4 border-t border-gray-200 pt-6 mt-2">
                <h3 className="text-lg font-semibold text-gray-900">Preview & Test</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePreviewClick}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Refresh Preview
                  </button>
                  <button
                    type="button"
                    onClick={handleTestPrint}
                    disabled={testingPrint}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingPrint ? 'Testing...' : 'Test Print Sample Receipt'}
                  </button>
                  {testResult && (
                    <p className="text-xs text-gray-600 mt-1">
                      {testResult}
                    </p>
                  )}
                </div>
                <div className="mt-4 border border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
                  {previewHtml ? (
                    <iframe
                      title="Receipt preview"
                      srcDoc={previewHtml}
                      style={{
                        width: receiptPrinter.paper_width_mm === 58 ? '240px' : '320px',
                        height: '320px',
                        border: '0',
                        transform: 'scale(0.95)',
                        transformOrigin: 'top left',
                        backgroundColor: 'white',
                      }}
                    />
                  ) : (
                    <div className="p-6 text-center text-sm text-gray-500">
                      Click “Refresh Preview” to see how your receipt will look on paper.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end items-center pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Receipt Printer Settings'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default ReceiptPrinterSettingsPage

