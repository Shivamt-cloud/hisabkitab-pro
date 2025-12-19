import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { stockAdjustmentService } from '../services/stockAdjustmentService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { StockAdjustment, StockAdjustmentType } from '../types/stock'
import { Plus, Eye, Package, Home, Filter, TrendingUp, TrendingDown } from 'lucide-react'

const StockAdjustmentHistory = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<StockAdjustmentType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisMonth: 0,
    thisYear: 0,
    byType: {} as Record<string, number>,
  })


  const loadAdjustments = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const [allAdjustmentsResult, adjustmentStats] = await Promise.all([
        stockAdjustmentService.getAll(companyId || undefined),
        stockAdjustmentService.getStats(companyId || undefined)
      ])
      
      let allAdjustments = allAdjustmentsResult

      // Filter by type
      if (filterType !== 'all') {
        allAdjustments = allAdjustments.filter(adj => adj.adjustment_type === filterType)
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        allAdjustments = allAdjustments.filter(adj =>
          adj.product_name.toLowerCase().includes(query) ||
          adj.notes?.toLowerCase().includes(query) ||
          adj.adjusted_by_name?.toLowerCase().includes(query)
        )
      }

      // Sort by date (newest first)
      allAdjustments.sort((a, b) =>
        new Date(b.adjustment_date).getTime() - new Date(a.adjustment_date).getTime()
      )

      setAdjustments(allAdjustments)
      setStats(adjustmentStats)
    } catch (error) {
      console.error('Error loading adjustments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdjustments()
  }, [searchQuery, filterType])

  const getAdjustmentTypeBadge = (type: StockAdjustmentType) => {
    const badges = {
      increase: { bg: 'bg-green-100', text: 'text-green-700', icon: TrendingUp, label: 'Increase' },
      decrease: { bg: 'bg-red-100', text: 'text-red-700', icon: TrendingDown, label: 'Decrease' },
      set: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Package, label: 'Set' },
      damaged: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Package, label: 'Damaged' },
      expired: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Package, label: 'Expired' },
      returned: { bg: 'bg-purple-100', text: 'text-purple-700', icon: TrendingUp, label: 'Returned' },
      other: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Package, label: 'Other' },
    }

    const badge = badges[type]
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  return (
    <ProtectedRoute requiredPermission="products:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Stock Adjustment History</h1>
                  <p className="text-sm text-gray-600 mt-1">View all stock adjustments and corrections</p>
                </div>
              </div>
              {hasPermission('products:update') && (
                <button
                  onClick={() => navigate('/stock/adjust')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  New Adjustment
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Adjustments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Package className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
                </div>
                <Package className="w-10 h-10 text-purple-500" />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">This Year</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.thisYear}</p>
                </div>
                <TrendingDown className="w-10 h-10 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Filter by Type:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('increase')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'increase'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Increase
                </button>
                <button
                  onClick={() => setFilterType('decrease')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'decrease'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Decrease
                </button>
                <button
                  onClick={() => setFilterType('set')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'set'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Set
                </button>
                <button
                  onClick={() => setFilterType('damaged')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'damaged'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Damaged
                </button>
                <button
                  onClick={() => setFilterType('expired')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'expired'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Expired
                </button>
                <button
                  onClick={() => setFilterType('returned')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'returned'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Returned
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, notes, or adjusted by..."
                className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Adjustments Table */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading adjustments...</p>
              </div>
            ) : adjustments.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No adjustments found</h3>
                <p className="text-gray-600 mb-6">
                  Stock adjustments will appear here after they are created
                </p>
                {hasPermission('products:update') && (
                  <button
                    onClick={() => navigate('/stock/adjust')}
                    className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create First Adjustment
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Previous</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Change</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">New Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Adjusted By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adjustments.map((adjustment) => {
                      const stockChange = adjustment.new_stock - adjustment.previous_stock
                      const stockChangeDisplay = stockChange > 0 ? `+${stockChange}` : `${stockChange}`

                      return (
                        <tr key={adjustment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(adjustment.adjustment_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(adjustment.adjustment_date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{adjustment.product_name}</div>
                            {adjustment.notes && (
                              <div className="text-xs text-gray-500 mt-1">{adjustment.notes}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getAdjustmentTypeBadge(adjustment.adjustment_type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{adjustment.previous_stock}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-semibold ${
                              stockChange > 0 ? 'text-green-600' : stockChange < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {stockChangeDisplay}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{adjustment.new_stock}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 capitalize">
                              {adjustment.reason.replace(/_/g, ' ')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{adjustment.adjusted_by_name || 'Unknown'}</div>
                          </td>
                        </tr>
                      )
                    })}
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

export default StockAdjustmentHistory

