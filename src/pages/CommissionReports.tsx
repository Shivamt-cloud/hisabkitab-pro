import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { salesCommissionService, salesPersonService } from '../services/salespersonService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  TrendingUp, 
  Calendar,
  User,
  DollarSign,
  Filter,
  Download,
  Home
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SalesPersonCommission } from '../types/salesperson'

interface CommissionSummary {
  sales_person_id: number
  sales_person_name: string
  total_commissions: number
  total_sales: number
  commission_count: number
  average_commission: number
}

const CommissionReports = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [commissions, setCommissions] = useState<SalesPersonCommission[]>([])
  const [summary, setSummary] = useState<CommissionSummary[]>([])
  const [filterType, setFilterType] = useState<'day' | 'period'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [totalCommission, setTotalCommission] = useState(0)
  const [totalSales, setTotalSales] = useState(0)

  useEffect(() => {
    loadCommissions()
  }, [filterType, selectedDate, startDate, endDate])

  const loadCommissions = async () => {
    setLoading(true)
    try {
      const allCommissions = await salesCommissionService.getAll()
      
      let filtered: SalesPersonCommission[] = []
      
      if (filterType === 'day') {
        filtered = allCommissions.filter(c => {
          const commissionDate = new Date(c.sale_date).toISOString().split('T')[0]
          return commissionDate === selectedDate
        })
      } else {
        filtered = allCommissions.filter(c => {
          const commissionDate = new Date(c.sale_date).toISOString().split('T')[0]
          return commissionDate >= startDate && commissionDate <= endDate
        })
      }

      setCommissions(filtered)
      calculateSummary(filtered)
    } catch (error) {
      console.error('Error loading commissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSummary = (commissionsData: SalesPersonCommission[]) => {
    const summaryMap = new Map<number, CommissionSummary>()

    commissionsData.forEach(comm => {
      const existing = summaryMap.get(comm.sales_person_id)
      
      if (existing) {
        existing.total_commissions += comm.commission_amount
        existing.commission_count += 1
        existing.average_commission = existing.total_commissions / existing.commission_count
      } else {
        summaryMap.set(comm.sales_person_id, {
          sales_person_id: comm.sales_person_id,
          sales_person_name: comm.sales_person_name || 'Unknown',
          total_commissions: comm.commission_amount,
          total_sales: 1,
          commission_count: 1,
          average_commission: comm.commission_amount,
        })
      }
    })

    // Count unique sales per person
    const salesCountMap = new Map<number, Set<number>>()
    commissionsData.forEach(comm => {
      if (!salesCountMap.has(comm.sales_person_id)) {
        salesCountMap.set(comm.sales_person_id, new Set())
      }
      salesCountMap.get(comm.sales_person_id)!.add(comm.sale_id)
    })

    const summaryArray = Array.from(summaryMap.values()).map(s => ({
      ...s,
      total_sales: salesCountMap.get(s.sales_person_id)?.size || 0,
    }))

    // Sort by total commissions (descending)
    summaryArray.sort((a, b) => b.total_commissions - a.total_commissions)
    
    setSummary(summaryArray)
    setTotalCommission(commissionsData.reduce((sum, c) => sum + c.commission_amount, 0))
    setTotalSales(new Set(commissionsData.map(c => c.sale_id)).size)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const exportToCSV = () => {
    const headers = ['Sales Person', 'Category', 'Product', 'Quantity', 'Unit Price', 'Subtotal', 'Commission Type', 'Commission Rate', 'Commission Amount', 'Sale Date']
    const rows = commissions.map(c => [
      c.sales_person_name || 'Unknown',
      c.category_name || 'N/A',
      c.product_name || 'N/A',
      c.quantity.toString(),
      c.unit_price.toFixed(2),
      c.subtotal.toFixed(2),
      c.commission_type === 'percentage' ? 'Percentage' : 'Per Piece',
      c.commission_type === 'percentage' ? `${c.commission_rate}%` : `₹${c.commission_rate}`,
      c.commission_amount.toFixed(2),
      formatDate(c.sale_date),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `commission-report-${filterType === 'day' ? selectedDate : `${startDate}-to-${endDate}`}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <ProtectedRoute requiredPermission="reports:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200 bg-white"
                  title="Back to Dashboard"
                >
                  <Home className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Commission Reports</h1>
                  <p className="text-sm text-gray-600 mt-1">Sales person-wise commission details</p>
                </div>
              </div>
              {commissions.length > 0 && hasPermission('reports:export') && (
                <button
                  onClick={exportToCSV}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex items-center gap-4 mb-6">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filter Options</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="filter-day"
                  name="filter-type"
                  checked={filterType === 'day'}
                  onChange={() => setFilterType('day')}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="filter-day" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Specific Day
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="filter-period"
                  name="filter-type"
                  checked={filterType === 'period'}
                  onChange={() => setFilterType('period')}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="filter-period" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Date Range
                </label>
              </div>
            </div>

            {filterType === 'day' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {filterType === 'day' && (
              <p className="mt-3 text-sm text-gray-600">
                Showing commissions for: <span className="font-semibold">{formatDate(selectedDate)}</span>
              </p>
            )}
            {filterType === 'period' && (
              <p className="mt-3 text-sm text-gray-600">
                Showing commissions from <span className="font-semibold">{formatDate(startDate)}</span> to{' '}
                <span className="font-semibold">{formatDate(endDate)}</span>
              </p>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Total Commission</p>
                  <p className="text-3xl font-bold">₹{totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-green-100 text-sm mb-1">Total Sales</p>
                  <p className="text-3xl font-bold">{totalSales}</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Sales Persons</p>
                  <p className="text-3xl font-bold">{summary.length}</p>
                </div>
                <User className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* Sales Person Summary */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading commission data...</div>
          ) : summary.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-12 border border-white/50 text-center">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No commission data found</h3>
              <p className="text-gray-600">
                {filterType === 'day' 
                  ? 'No commissions found for the selected date.'
                  : 'No commissions found for the selected date range.'}
              </p>
            </div>
          ) : (
            <>
              {/* Summary by Sales Person */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 mb-8 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Summary by Sales Person</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Sales Person
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Total Sales
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Commission Entries
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Total Commission
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Average Commission
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summary.map((s) => (
                        <tr key={s.sales_person_id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                                {s.sales_person_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-sm font-semibold text-gray-900">{s.sales_person_name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-semibold">
                            {s.total_sales}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                            {s.commission_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                            ₹{s.total_commissions.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                            ₹{s.average_commission.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Commission List */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Detailed Commission Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Sales Person
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Subtotal
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Commission Type
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Commission Rate
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Commission Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Sale Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {commissions.map((comm, index) => (
                        <tr key={index} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {comm.sales_person_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {comm.category_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {comm.product_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                            {comm.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                            ₹{comm.unit_price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                            ₹{comm.subtotal.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              comm.commission_type === 'percentage' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {comm.commission_type === 'percentage' ? '%' : '₹'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                            {comm.commission_type === 'percentage' 
                              ? `${comm.commission_rate}%`
                              : `₹${comm.commission_rate}`
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                            ₹{comm.commission_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(comm.sale_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default CommissionReports

