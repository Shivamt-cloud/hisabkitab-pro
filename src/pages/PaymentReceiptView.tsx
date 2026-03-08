import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { saleService } from '../services/saleService'
import { customerService } from '../services/customerService'
import { companyService } from '../services/companyService'
import { settingsService } from '../services/settingsService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Breadcrumbs } from '../components/Breadcrumbs'
import Invoice from '../components/Invoice'
import { InvoiceData } from '../types/invoice'
import { Sale } from '../types/sale'
import { Home } from 'lucide-react'

/** Get payments that have received_at (balance collections), sorted by received_at desc */
function getReceivedPayments(sale: Sale): Array<{ method: string; amount: number; received_at: string }> {
  let raw = sale.payment_methods
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as Array<{ method: string; amount: number; received_at?: string }>
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p: { received_at?: string }) => p?.received_at)
    .map((p: { method?: string; amount?: number; received_at?: string }) => ({
      method: String(p?.method || '').trim() || 'other',
      amount: Number(p?.amount) || 0,
      received_at: p?.received_at || '',
    }))
    .filter(p => p.amount > 0)
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
}

const PaymentReceiptView = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const autoPrint = (location.state as { print?: boolean })?.print === true
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (id) {
      loadReceipt(parseInt(id))
    }
  }, [id])

  const loadReceipt = async (saleId: number) => {
    setLoading(true)
    setNotFound(false)
    try {
      const sale = await saleService.getById(saleId)
      if (!sale) {
        setNotFound(true)
        return
      }
      const received = getReceivedPayments(sale)
      const latest = received[0]
      if (!latest) {
        setNotFound(true)
        return
      }

      let customerInfo: InvoiceData['customer']
      if (sale.customer_id) {
        const customer = await customerService.getById(sale.customer_id)
        if (customer) {
          customerInfo = {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            gstin: customer.gstin,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            pincode: customer.pincode,
          }
        }
      }
      if (!customerInfo) {
        customerInfo = { name: sale.customer_name || 'Walk-in Customer' }
      }

      const settings = await settingsService.getAll().catch(() => null)
      const companyLogo = settings?.company?.company_logo
      const sysCompany = settings?.company
      let companyInfo: InvoiceData['company_info']
      if (sale.company_id) {
        const company = await companyService.getById(sale.company_id)
        if (company) {
          const addressParts = []
          if (company.address) addressParts.push(company.address)
          if (company.city) addressParts.push(company.city)
          if (company.state) addressParts.push(company.state)
          if (company.pincode) addressParts.push(company.pincode)
          companyInfo = {
            name: company.name || sysCompany?.company_name || 'HisabKitab',
            address: addressParts.join(', ') || company.address || sysCompany?.company_address,
            city: company.city || sysCompany?.company_city,
            state: company.state || sysCompany?.company_state,
            pincode: company.pincode || sysCompany?.company_pincode,
            phone: company.phone || sysCompany?.company_phone,
            email: company.email || sysCompany?.company_email,
            gstin: company.gstin || sysCompany?.company_gstin,
            website: company.website || sysCompany?.company_website,
            logo: companyLogo || (company as any).logo,
          }
        }
      }
      if (!companyInfo) {
        companyInfo = {
          name: sysCompany?.company_name || 'HisabKitab',
          address: sysCompany?.company_address,
          city: sysCompany?.company_city,
          state: sysCompany?.company_state,
          pincode: sysCompany?.company_pincode,
          phone: sysCompany?.company_phone,
          email: sysCompany?.company_email,
          gstin: sysCompany?.company_gstin,
          website: sysCompany?.company_website,
          logo: companyLogo,
        }
      }

      const receiptDate = latest.received_at
      const receiptData: InvoiceData = {
        invoice_number: `${sale.invoice_number} (Balance received)`,
        invoice_date: receiptDate,
        created_at: receiptDate,
        customer: customerInfo,
        items: [
          {
            product_name: `Balance received against Invoice #${sale.invoice_number}`,
            quantity: 1,
            unit_price: latest.amount,
            total: latest.amount,
          },
        ],
        subtotal: latest.amount,
        tax_amount: 0,
        grand_total: latest.amount,
        payment_method: latest.method,
        payment_methods: [{ method: latest.method, amount: latest.amount }],
        payment_status: 'paid',
        company_info: companyInfo,
      }
      setInvoiceData(receiptData)
    } catch (e) {
      console.error(e)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="sales:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading receipt...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (notFound || !invoiceData) {
    return (
      <ProtectedRoute requiredPermission="sales:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 flex items-center justify-center">
          <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
            <p className="text-gray-600 mb-4">No payment receipt found for this invoice (no balance collection recorded yet).</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => navigate('/sales/balance-collection')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Balance on collection
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="sales:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 py-8">
        <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex items-center justify-between bg-white/80 backdrop-blur-lg shadow-lg rounded-xl p-4 border border-amber-200/50">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center border border-amber-200"
                title="Go to Dashboard"
              >
                <Home className="w-5 h-5 text-amber-700" />
              </button>
              <div className="min-w-0">
                <Breadcrumbs
                  items={[
                    { label: 'Dashboard', path: '/' },
                    { label: 'Balance on collection', path: '/sales/balance-collection' },
                    { label: 'Payment receipt' },
                  ]}
                  className="mb-1"
                />
                <h1 className="text-2xl font-bold text-gray-900">Payment receipt</h1>
                <p className="text-sm text-gray-600">View and print receipt for balance received</p>
              </div>
            </div>
          </div>
        </div>

        <Invoice
          invoiceData={invoiceData}
          documentTitle="PAYMENT RECEIVED"
          showActions={true}
          onNewSale={() => navigate('/sales/new')}
          autoPrint={autoPrint}
        />
      </div>
    </ProtectedRoute>
  )
}

export default PaymentReceiptView
