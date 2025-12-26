import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { saleService } from '../services/saleService'
import { customerService } from '../services/customerService'
import { productService } from '../services/productService'
import { companyService } from '../services/companyService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import Invoice from '../components/Invoice'
import { InvoiceData } from '../types/invoice'
import { Sale } from '../types/sale'
import { Home } from 'lucide-react'

const InvoiceView = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadInvoiceData(parseInt(id))
    }
  }, [id])

  const loadInvoiceData = async (saleId: number) => {
    setLoading(true)
    try {
      const sale = await saleService.getById(saleId)
      if (!sale) {
        alert('Sale not found')
        navigate('/sales/history')
        return
      }

      // Get customer information if available
      let customerInfo
      let customerCreditBalance: number | undefined
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
          // Get current credit balance (after this transaction)
          customerCreditBalance = customer.credit_balance || 0
        }
      } else if (sale.customer_name) {
        customerInfo = {
          name: sale.customer_name,
        }
      }

      // Get product details for items
      const invoiceItemsPromises = sale.items.map(async item => {
        // Try to get product details if available (for archived products, admin can still see)
        const product = await productService.getById(item.product_id, true) // Include archived
        
        return {
          product_name: item.product_name,
          quantity: item.quantity,
          mrp: item.mrp,
          unit_price: item.unit_price,
          discount: item.discount,
          discount_percentage: item.discount_percentage,
          total: item.total,
          hsn_code: product?.hsn_code,
          gst_rate: product?.gst_rate,
          unit: product?.unit,
        }
      })
      
      const invoiceItems = await Promise.all(invoiceItemsPromises)

      // Load company information from sale
      let companyInfo
      if (sale.company_id) {
        const company = await companyService.getById(sale.company_id)
        if (company) {
          // Build full address from components
          const addressParts = []
          if (company.address) addressParts.push(company.address)
          if (company.city) addressParts.push(company.city)
          if (company.state) addressParts.push(company.state)
          if (company.pincode) addressParts.push(company.pincode)
          const fullAddress = addressParts.join(', ')
          
          companyInfo = {
            name: company.name || 'HisabKitab',
            address: fullAddress || company.address,
            city: company.city,
            state: company.state,
            pincode: company.pincode,
            phone: company.phone,
            email: company.email,
            gstin: company.gstin, // Show GST if company has it
            website: company.website,
          }
        }
      }
      
      // Fallback to default if no company found
      if (!companyInfo) {
        companyInfo = {
          name: 'HisabKitab',
        }
      }

      const invoice: InvoiceData = {
        invoice_number: sale.invoice_number,
        invoice_date: sale.sale_date,
        customer: customerInfo,
        items: invoiceItems,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax_amount: sale.tax_amount,
        grand_total: sale.grand_total,
        payment_method: sale.payment_method,
        payment_methods: sale.payment_methods, // Include multiple payment methods
        return_amount: sale.return_amount, // Include return amount if any
        credit_applied: sale.credit_applied, // Include credit applied if any
        credit_balance: customerCreditBalance, // Include current credit balance
        payment_status: sale.payment_status,
        sales_person: sale.sales_person_name,
        notes: sale.notes,
        company_info: companyInfo,
      }

      setInvoiceData(invoice)
    } catch (error) {
      alert('Error loading invoice: ' + (error as Error).message)
      navigate('/sales/history')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="sales:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading invoice...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!invoiceData) {
    return (
      <ProtectedRoute requiredPermission="sales:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 font-medium mb-4">Invoice not found</p>
            <button
              onClick={() => navigate('/sales/history')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to Sales History
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="sales:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
        {/* Header - Hidden when printing */}
        <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex items-center justify-between bg-white/80 backdrop-blur-lg shadow-lg rounded-xl p-4 border border-gray-200/50">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200"
                title="Go to Dashboard"
              >
                <Home className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice #{invoiceData.invoice_number}</h1>
                <p className="text-sm text-gray-600">View and print invoice</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Component */}
        <Invoice 
          invoiceData={invoiceData} 
          showActions={true}
          onNewSale={() => navigate('/sales/new')}
        />
      </div>
    </ProtectedRoute>
  )
}

export default InvoiceView

