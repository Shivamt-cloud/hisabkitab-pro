import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ReceiptText, Download, Eye, RefreshCw } from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../context/AuthContext'
import { subscriptionPaymentService } from '../services/subscriptionPaymentService'
import type { SubscriptionPayment } from '../types/subscriptionPayment'
import { companyService } from '../services/companyService'
import { downloadSubscriptionReceiptPDF, openSubscriptionReceiptInNewWindow } from '../utils/subscriptionReceipt'

const SubscriptionPaymentsPage = () => {
  const navigate = useNavigate()
  const { getCurrentCompanyId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<SubscriptionPayment[]>([])
  const [companyName, setCompanyName] = useState<string>('')

  const companyId = getCurrentCompanyId?.()

  const load = async () => {
    setLoading(true)
    try {
      if (companyId) {
        const company = await companyService.getById(companyId)
        setCompanyName(company?.name || '')
      } else {
        setCompanyName('')
      }
      const list = await subscriptionPaymentService.getAll(companyId ?? undefined)
      setItems(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const stats = useMemo(() => {
    const total = items.length
    const success = items.filter(i => i.payment_status === 'success').length
    const pending = items.filter(i => i.payment_status === 'pending' || i.payment_status === 'processing').length
    const failed = items.filter(i => i.payment_status === 'failed').length
    return { total, success, pending, failed }
  }, [items])

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
                    <ReceiptText className="w-8 h-8 text-blue-600" />
                    Subscription Payments
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Payment history and receipts
                    {companyName ? (
                      <span className="ml-2 text-gray-500">
                        • Company: <span className="font-semibold text-gray-700">{companyName}</span>
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <button
                onClick={load}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow p-4 border border-white/50">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow p-4 border border-white/50">
              <div className="text-xs text-gray-500">Success</div>
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow p-4 border border-white/50">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow p-4 border border-white/50">
              <div className="text-xs text-gray-500">Failed</div>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
              <p className="text-xs text-gray-500">Receipts available for all payments</p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-600">Loading payments...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-600">No subscription payments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Date</th>
                      <th className="text-left px-4 py-3 font-semibold">Plan</th>
                      <th className="text-left px-4 py-3 font-semibold">Duration</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-right px-4 py-3 font-semibold">Total</th>
                      <th className="text-left px-4 py-3 font-semibold">Gateway</th>
                      <th className="text-right px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map(p => (
                      <tr key={p.id} className="hover:bg-white/60">
                        <td className="px-4 py-3 text-gray-900">
                          {new Date(p.created_at).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-gray-900 capitalize">{p.subscription_tier}</td>
                        <td className="px-4 py-3 text-gray-700">{p.duration_months} mo</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                              p.payment_status === 'success'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : p.payment_status === 'failed'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                          >
                            {p.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {(p.currency === 'INR' ? '₹' : p.currency === 'USD' ? '$' : '') + p.total_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-700 uppercase">{p.payment_gateway || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openSubscriptionReceiptInNewWindow({ payment: p, companyName })}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                              title="View receipt"
                            >
                              <Eye className="w-4 h-4 text-gray-700" />
                              <span className="hidden md:inline">View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadSubscriptionReceiptPDF({ payment: p, companyName })}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              title="Download receipt PDF"
                            >
                              <Download className="w-4 h-4" />
                              <span className="hidden md:inline">PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SubscriptionPaymentsPage

