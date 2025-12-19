import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { paymentService } from '../services/paymentService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { OutstandingPayment } from '../types/payment'
import { Home, Users, Building2, AlertTriangle, DollarSign, Clock, CheckCircle } from 'lucide-react'

type PaymentTab = 'customers' | 'suppliers'

const OutstandingPayments = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<PaymentTab>('customers')
  const [loading, setLoading] = useState(true)
  const [customerPayments, setCustomerPayments] = useState<OutstandingPayment[]>([])
  const [supplierPayments, setSupplierPayments] = useState<OutstandingPayment[]>([])
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    customerOutstanding: 0,
    supplierOutstanding: 0,
    customerCount: 0,
    supplierCount: 0,
    overdueCount: 0,
  })

  useEffect(() => {
    loadPayments()
  }, [activeTab])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const [outstanding, paymentStats] = await Promise.all([
        paymentService.getOutstandingPayments(),
        paymentService.getStats()
      ])
      setCustomerPayments(outstanding.filter(p => p.type === 'sale'))
      setSupplierPayments(outstanding.filter(p => p.type === 'purchase'))
      setStats(paymentStats)
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const activePayments = activeTab === 'customers' ? customerPayments : supplierPayments

  const getStatusBadge = (status: string, daysOverdue?: number) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Overdue {daysOverdue ? `(${daysOverdue} days)` : ''}
          </span>
        )
      case 'partial':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            Partial
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </span>
        )
    }
  }

  return (
    <ProtectedRoute requiredPermission="sales:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Outstanding Payments</h1>
                  <p className="text-sm text-gray-600 mt-1">Track pending payments from customers and to suppliers</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-xl p-6 border border-white/50 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Total Outstanding</p>
                  <p className="text-3xl font-bold">₹{stats.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <DollarSign className="w-12 h-12 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-xl p-6 border border-white/50 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">From Customers</p>
                  <p className="text-3xl font-bold">₹{stats.customerOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs opacity-75 mt-1">{stats.customerCount} customers</p>
                </div>
                <Users className="w-12 h-12 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-xl p-6 border border-white/50 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">To Suppliers</p>
                  <p className="text-3xl font-bold">₹{stats.supplierOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs opacity-75 mt-1">{stats.supplierCount} suppliers</p>
                </div>
                <Building2 className="w-12 h-12 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-xl p-6 border border-white/50 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Overdue</p>
                  <p className="text-3xl font-bold">{stats.overdueCount}</p>
                  <p className="text-xs opacity-75 mt-1">Payments overdue</p>
                </div>
                <AlertTriangle className="w-12 h-12 opacity-80" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex gap-4 border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'customers' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Customer Payments ({customerPayments.length})
                {activeTab === 'customers' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'suppliers' ? 'text-orange-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Supplier Payments ({supplierPayments.length})
                {activeTab === 'suppliers' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></span>
                )}
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payments...</p>
              </div>
            ) : activePayments.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Outstanding Payments
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'customers' 
                    ? 'All customer payments are cleared' 
                    : 'All supplier payments are cleared'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {activeTab === 'customers' ? 'Customer' : 'Supplier'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice Date</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Paid</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Pending</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activePayments.map((payment) => (
                      <tr key={payment.payment_record_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {activeTab === 'customers' ? payment.customer_name : payment.supplier_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{payment.reference_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {new Date(payment.invoice_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-gray-900">₹{payment.total_amount.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-green-600">₹{payment.paid_amount.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-red-600">₹{payment.pending_amount.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {payment.due_date ? (
                            <div className="text-sm text-gray-600">
                              {new Date(payment.due_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">—</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.payment_status, payment.days_overdue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          {!loading && activePayments.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Showing {activePayments.length} {activeTab === 'customers' ? 'customer' : 'supplier'} payments
                </span>
                <span className="font-semibold text-gray-900">
                  Total Pending: ₹{activePayments.reduce((sum, p) => sum + p.pending_amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default OutstandingPayments

