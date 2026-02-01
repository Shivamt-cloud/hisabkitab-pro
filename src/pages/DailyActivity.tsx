import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { saleService } from '../services/saleService'
import { purchaseService, supplierService } from '../services/purchaseService'
import { customerService } from '../services/customerService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Package,
  DollarSign,
  FileText,
  Clock,
  Filter,
  Home
} from 'lucide-react'
import { Sale } from '../types/sale'
import { Purchase } from '../types/purchase'

type DateFilter = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'

interface DailySummary {
  date: string
  salesCount: number
  salesTotal: number
  purchasesCount: number
  purchasesTotal: number
  netAmount: number
}

const DailyActivity = () => {
  const navigate = useNavigate()
  const { getCurrentCompanyId, user } = useAuth()
  const companyId = getCurrentCompanyId()
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [sales, setSales] = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Map<number, string>>(new Map())
  const [suppliers, setSuppliers] = useState<Map<number, string>>(new Map())

  // Get date range based on filter
  const getDateRange = (filter: DateFilter): { startDate: string; endDate: string } => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (filter) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0]
        return { startDate: todayStr, endDate: todayStr }
      
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        return { startDate: yesterdayStr, endDate: yesterdayStr }
      
      case 'last7days':
        const last7Days = new Date(today)
        last7Days.setDate(last7Days.getDate() - 6)
        return { 
          startDate: last7Days.toISOString().split('T')[0], 
          endDate: today.toISOString().split('T')[0] 
        }
      
      case 'last30days':
        const last30Days = new Date(today)
        last30Days.setDate(last30Days.getDate() - 29)
        return { 
          startDate: last30Days.toISOString().split('T')[0], 
          endDate: today.toISOString().split('T')[0] 
        }
      
      case 'custom':
        return { 
          startDate: customStartDate || today.toISOString().split('T')[0], 
          endDate: customEndDate || today.toISOString().split('T')[0] 
        }
      
      default:
        return { 
          startDate: today.toISOString().split('T')[0], 
          endDate: today.toISOString().split('T')[0] 
        }
    }
  }

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const { startDate, endDate } = getDateRange(dateFilter)
        
        // Load all sales and purchases (filtered by company)
        const [allSales, allPurchases, allCustomers, allSuppliers] = await Promise.all([
          saleService.getAll(true, companyId),
          purchaseService.getAll(undefined, companyId),
          customerService.getAll(true, companyId),
          supplierService.getAll(companyId)
        ])

        // Filter by date range
        const filteredSales = allSales.filter((sale: Sale) => {
          const saleDate = new Date(sale.sale_date).toISOString().split('T')[0]
          return saleDate >= startDate && saleDate <= endDate
        })

        const filteredPurchases = allPurchases.filter((purchase: Purchase) => {
          const purchaseDate = new Date(purchase.purchase_date).toISOString().split('T')[0]
          return purchaseDate >= startDate && purchaseDate <= endDate
        })

        setSales(filteredSales)
        setPurchases(filteredPurchases)

        // Create customer and supplier maps
        const customerMap = new Map<number, string>()
        allCustomers.forEach((c: any) => customerMap.set(c.id, c.name))
        setCustomers(customerMap)

        const supplierMap = new Map<number, string>()
        allSuppliers.forEach((s: any) => supplierMap.set(s.id, s.name))
        setSuppliers(supplierMap)

      } catch (error) {
        console.error('Error loading daily activity:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dateFilter, customStartDate, customEndDate, companyId])

  // Calculate summary statistics
  const summary = useMemo(() => {
    const salesTotal = sales.reduce((sum, sale) => sum + sale.grand_total, 0)
    const purchasesTotal = purchases.reduce((sum, purchase) => {
      const total = purchase.type === 'gst' 
        ? (purchase as any).grand_total 
        : (purchase as any).total_amount
      return sum + total
    }, 0)
    const netAmount = salesTotal - purchasesTotal

    return {
      salesCount: sales.length,
      salesTotal,
      purchasesCount: purchases.length,
      purchasesTotal,
      netAmount,
    }
  }, [sales, purchases])

  // Group by date for daily summary
  const dailySummary = useMemo(() => {
    const summaryMap = new Map<string, DailySummary>()

    // Process sales
    sales.forEach(sale => {
      const date = new Date(sale.sale_date).toISOString().split('T')[0]
      const existing = summaryMap.get(date) || {
        date,
        salesCount: 0,
        salesTotal: 0,
        purchasesCount: 0,
        purchasesTotal: 0,
        netAmount: 0,
      }
      existing.salesCount++
      existing.salesTotal += sale.grand_total
      existing.netAmount += sale.grand_total
      summaryMap.set(date, existing)
    })

    // Process purchases
    purchases.forEach(purchase => {
      const date = new Date(purchase.purchase_date).toISOString().split('T')[0]
      const total = purchase.type === 'gst' 
        ? (purchase as any).grand_total 
        : (purchase as any).total_amount
      const existing = summaryMap.get(date) || {
        date,
        salesCount: 0,
        salesTotal: 0,
        purchasesCount: 0,
        purchasesTotal: 0,
        netAmount: 0,
      }
      existing.purchasesCount++
      existing.purchasesTotal += total
      existing.netAmount -= total
      summaryMap.set(date, existing)
    })

    return Array.from(summaryMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [sales, purchases])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading daily activity...</div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center"
              title="Back to Dashboard"
            >
              <Home className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Daily Activity Report</h1>
              <p className="text-gray-600">View sales and purchases for today or recent days</p>
            </div>
          </div>

          {/* Date Filter */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Date Filter</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setDateFilter('today')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter('yesterday')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'yesterday'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateFilter('last7days')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'last7days'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateFilter('last30days')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'last30days'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom Range
              </button>
            </div>

            {dateFilter === 'custom' && (
              <div className="mt-4 flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Sales</span>
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{summary.salesCount}</div>
              <div className="text-lg font-semibold text-green-600 mt-1">
                {formatCurrency(summary.salesTotal)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Purchases</span>
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{summary.purchasesCount}</div>
              <div className="text-lg font-semibold text-blue-600 mt-1">
                {formatCurrency(summary.purchasesTotal)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Net Amount</span>
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div className={`text-2xl font-bold mt-1 ${
                summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summary.netAmount)}
              </div>
              {summary.netAmount >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600 mt-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mt-1" />
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Date Range</span>
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {(() => {
                  const { startDate, endDate } = getDateRange(dateFilter)
                  return startDate === endDate 
                    ? formatDate(startDate)
                    : `${formatDate(startDate)} - ${formatDate(endDate)}`
                })()}
              </div>
            </div>
          </div>

          {/* Daily Summary Table */}
          {dailySummary.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Summary</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sales
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchases
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailySummary.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(day.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <div>{day.salesCount} transactions</div>
                          <div className="text-green-600 font-semibold">
                            {formatCurrency(day.salesTotal)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <div>{day.purchasesCount} transactions</div>
                          <div className="text-blue-600 font-semibold">
                            {formatCurrency(day.purchasesTotal)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className={`font-semibold ${
                            day.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(day.netAmount)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Sales */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
              <span className="text-sm text-gray-500">{sales.length} transactions</span>
            </div>
            {sales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sales found for the selected period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Invoice
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Items
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.slice(0, 20).map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sale.sale_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.invoice_number}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {sale.customer_id ? (customers.get(sale.customer_id) || 'Walk-in Customer') : 'Walk-in Customer'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {sale.items.length} items
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                          {formatCurrency(sale.grand_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sales.length > 20 && (
                  <div className="mt-4 text-center text-sm text-gray-500">
                    Showing first 20 of {sales.length} sales
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Purchases */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Purchases</h2>
              <span className="text-sm text-gray-500">{purchases.length} transactions</span>
            </div>
            {purchases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No purchases found for the selected period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Invoice
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchases.slice(0, 20).map((purchase) => {
                      const total = purchase.type === 'gst' 
                        ? (purchase as any).grand_total 
                        : (purchase as any).total_amount
                      return (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(purchase.purchase_date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {purchase.invoice_number}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {purchase.supplier_id ? (suppliers.get(purchase.supplier_id) || 'Unknown Supplier') : 'Unknown Supplier'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              purchase.type === 'gst' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {purchase.type === 'gst' ? 'GST' : 'Simple'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-blue-600">
                            {formatCurrency(total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {purchases.length > 20 && (
                  <div className="mt-4 text-center text-sm text-gray-500">
                    Showing first 20 of {purchases.length} purchases
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default DailyActivity

