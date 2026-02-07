/**
 * Customer Insights
 * - Last purchase date
 * - Purchase frequency
 * - At-risk customers (no recent purchases)
 * - Quick filter by outstanding balance
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { customerService } from '../services/customerService'
import { saleService } from '../services/saleService'
import { paymentService } from '../services/paymentService'
import { Home, Users, AlertTriangle, DollarSign, Calendar, TrendingUp, Filter } from 'lucide-react'
import { Customer } from '../types/customer'
import { OutstandingPayment } from '../types/payment'

const AT_RISK_DAYS = 60 // No purchase in this many days = at-risk

export interface CustomerInsight {
  customer: Customer
  lastPurchaseDate: string | null
  purchaseFrequency: number
  totalSales: number
  outstandingBalance: number
  isAtRisk: boolean
}

type FilterType = 'all' | 'at_risk' | 'has_outstanding'

const CustomerInsights = () => {
  const navigate = useNavigate()
  const { getCurrentCompanyId } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [outstandingPayments, setOutstandingPayments] = useState<OutstandingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const companyId = getCurrentCompanyId()
      try {
        const [custs, outstanding] = await Promise.all([
          customerService.getAll(true, companyId),
          paymentService.getOutstandingPayments('sale', companyId),
        ])
        setCustomers(custs)
        setOutstandingPayments(outstanding)
      } catch (e) {
        console.error('CustomerInsights load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getCurrentCompanyId])

  const insights = useMemo((): CustomerInsight[] => {
    return customers.map(c => {
          const lastPurchaseDate = null
          const purchaseFrequency = 0
          const totalSales = 0
          const outstandingBalance = outstandingPayments
            .filter(p => p.customer_id === c.id)
            .reduce((sum, p) => sum + p.pending_amount, 0)
          const isAtRisk = true // Placeholder
          return {
            customer: c,
            lastPurchaseDate,
            purchaseFrequency,
            totalSales,
            outstandingBalance,
            isAtRisk,
        }
      })
  }, [customers, outstandingPayments])

  // Compute insights from sales - we need sales data
  const [sales, setSales] = useState<any[]>([])
  useEffect(() => {
    const loadSales = async () => {
      const companyId = getCurrentCompanyId()
      try {
        const allSales = await saleService.getAll(true, companyId ?? undefined)
        setSales(allSales)
      } catch (e) {
        console.error('Sales load error:', e)
      }
    }
    loadSales()
  }, [getCurrentCompanyId])

  const computedInsights = useMemo((): CustomerInsight[] => {
    const now = new Date()
    const atRiskCutoff = new Date(now)
    atRiskCutoff.setDate(atRiskCutoff.getDate() - AT_RISK_DAYS)

    const customerSalesMap = new Map<number, { dates: string[]; total: number }>()
    sales.forEach(sale => {
      const cid = sale.customer_id
      if (cid) {
        const existing = customerSalesMap.get(cid) || { dates: [], total: 0 }
        existing.dates.push(sale.sale_date)
        existing.total += sale.grand_total || 0
        customerSalesMap.set(cid, existing)
      }
    })

    const outstandingByCustomer = new Map<number, number>()
    outstandingPayments
      .filter(p => p.customer_id)
      .forEach(p => {
        const cid = p.customer_id!
        outstandingByCustomer.set(cid, (outstandingByCustomer.get(cid) || 0) + p.pending_amount)
      })

    return customers.map(customer => {
      const salesData = customerSalesMap.get(customer.id)
      const dates = salesData?.dates || []
      const lastPurchaseDate = dates.length > 0
        ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null
      const purchaseFrequency = dates.length
      const totalSales = salesData?.total || 0
      const outstandingBalance = outstandingByCustomer.get(customer.id) || 0
      // At-risk: had purchases before but none in last AT_RISK_DAYS
      const isAtRisk = purchaseFrequency > 0 && lastPurchaseDate
        ? new Date(lastPurchaseDate) < atRiskCutoff
        : false

      return {
        customer,
        lastPurchaseDate,
        purchaseFrequency,
        totalSales,
        outstandingBalance,
        isAtRisk: purchaseFrequency === 0 ? false : isAtRisk, // Don't mark walk-in-only as at-risk
      }
    })
  }, [customers, sales, outstandingPayments])

  const filtered = useMemo(() => {
    let list = computedInsights
    if (filter === 'at_risk') list = list.filter(i => i.isAtRisk)
    if (filter === 'has_outstanding') list = list.filter(i => i.outstandingBalance > 0)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(i =>
        i.customer.name.toLowerCase().includes(q) ||
        i.customer.email?.toLowerCase().includes(q) ||
        i.customer.phone?.includes(q)
      )
    }
    return list
  }, [computedInsights, filter, searchQuery])

  const atRiskCount = computedInsights.filter(i => i.isAtRisk).length
  const hasOutstandingCount = computedInsights.filter(i => i.outstandingBalance > 0).length

  return (
    <ProtectedRoute requiredPermission="sales:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Back to Dashboard"
                  >
                    <Home className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => navigate('/customers')}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  >
                    ← Customers
                  </button>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Customer Insights</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Last purchase · Purchase frequency · At-risk · Outstanding balance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter:
            </span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All ({computedInsights.length})
            </button>
            <button
              onClick={() => setFilter('at_risk')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                filter === 'at_risk' ? 'bg-amber-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              At-risk ({atRiskCount})
            </button>
            <button
              onClick={() => setFilter('has_outstanding')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                filter === 'has_outstanding' ? 'bg-rose-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Has outstanding ({hasOutstandingCount})
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="ml-auto px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-48"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {filter === 'all' ? 'No customers found.' : `No customers match the "${filter}" filter.`}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Last Purchase</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Purchase Freq.</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Sales</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Outstanding</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(({ customer, lastPurchaseDate, purchaseFrequency, totalSales, outstandingBalance, isAtRisk }) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {lastPurchaseDate
                            ? new Date(lastPurchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{purchaseFrequency}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={outstandingBalance > 0 ? 'font-semibold text-rose-600' : 'text-gray-500'}>
                            ₹{outstandingBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isAtRisk && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3" />
                              At-risk
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4">
            At-risk = no purchase in the last {AT_RISK_DAYS} days. Based on sales data.
          </p>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default CustomerInsights
