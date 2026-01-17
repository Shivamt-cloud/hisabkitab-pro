import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { saleService } from '../services/saleService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Sale } from '../types/sale'
import { Eye, ShoppingCart, TrendingUp, DollarSign, Archive, Home, FileSpreadsheet, FileText, Trash2 } from 'lucide-react'
import { exportToExcel, exportDataToPDF } from '../utils/exportUtils'

type TimePeriod = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'

const SalesHistory = () => {
  const { user, hasPermission, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    archived: 0,
    active: 0,
    totalRevenue: 0,
    thisMonth: 0,
  })
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    // Only admin can access this page
    if (user?.role !== 'admin') {
      navigate('/')
      return
    }
    loadSales()
  }, [user, timePeriod, customStartDate, customEndDate])

  const getDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    switch (timePeriod) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        startDate = today.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'thisWeek':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = monthStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        startDate = yearStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'custom':
        startDate = customStartDate || undefined
        endDate = customEndDate || undefined
        break
      default: // 'all'
        startDate = undefined
        endDate = undefined
    }

    return { startDate, endDate }
  }

  // Clear selections when sales change
  useEffect(() => {
    setSelectedSaleIds(new Set())
  }, [sales.length])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSaleIds(new Set(sales.map(s => s.id)))
    } else {
      setSelectedSaleIds(new Set())
    }
  }

  // Handle individual selection
  const handleSelectSale = (saleId: number, checked: boolean) => {
    const newSelected = new Set(selectedSaleIds)
    if (checked) {
      newSelected.add(saleId)
    } else {
      newSelected.delete(saleId)
    }
    setSelectedSaleIds(newSelected)
  }

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedSaleIds.size === 0) {
      alert('No sales selected. Please select sales to delete.')
      return
    }
    setShowDeleteConfirm(true)
  }

  // Actually perform the deletion after confirmation
  const confirmAndDelete = async () => {
    setShowDeleteConfirm(false)
    const count = selectedSaleIds.size
    setIsDeleting(true)
    
    try {
      const idsToDelete = Array.from(selectedSaleIds)
      let successCount = 0
      let failCount = 0

      // Delete in batches
      const batchSize = 10
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (id) => {
          try {
            const success = await saleService.delete(id)
            if (success) {
              successCount++
            } else {
              failCount++
            }
          } catch (error) {
            console.error(`Failed to delete sale ${id}:`, error)
            failCount++
          }
        })
        
        await Promise.all(batchPromises)
      }

      // Clear selections and reload
      setSelectedSaleIds(new Set())
      await loadSales()

      if (failCount === 0) {
        alert(`✅ Successfully deleted ${successCount} sale${successCount !== 1 ? 's' : ''}!`)
      } else {
        alert(`⚠️ Deleted ${successCount} sale${successCount !== 1 ? 's' : ''}, but ${failCount} failed. Check console for details.`)
      }
    } catch (error) {
      console.error('Error during bulk delete:', error)
      alert('❌ Error deleting sales: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsDeleting(false)
    }
  }

  const loadSales = async () => {
    setLoading(true)
    try {
      // Admin sees all sales including archived
      const companyId = getCurrentCompanyId()
      // Pass companyId directly - services will handle null by returning empty array for data isolation
      // undefined means admin hasn't selected a company (show all), null means user has no company (show nothing)
      const allSales = await saleService.getAll(true, companyId)
      
      // Filter by date range
      const { startDate, endDate } = getDateRange()
      let filteredSales = allSales
    
    if (startDate || endDate) {
      filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.sale_date).getTime()
        if (startDate && saleDate < new Date(startDate).getTime()) return false
        if (endDate) {
          const endDateTime = new Date(endDate).getTime() + 86400000
          if (saleDate > endDateTime) return false
        }
        return true
      })
    }
    
      // Sort by date (newest first)
      const sorted = filteredSales.sort((a, b) => 
        new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
      )
      
      // Load stats
      const salesStats = await saleService.getStats()
      setSales(sorted)
      setStats(salesStats)
    } catch (error) {
      console.error('Error loading sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    const headers = ['Date', 'Invoice', 'Customer', 'Items', 'Amount', 'Payment Status', 'Payment Method', 'Status']
    const rows = sales.map(sale => [
      new Date(sale.sale_date).toLocaleDateString('en-IN'),
      sale.invoice_number,
      sale.customer_name || 'Walk-in Customer',
      sale.items.length,
      parseFloat(sale.grand_total.toFixed(2)),
      sale.payment_status,
      sale.payment_method || '',
      sale.archived ? 'Archived' : 'Active'
    ])

    const filename = `sales_history_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    exportToExcel(rows, headers, filename, 'Sales History')
  }

  const exportToPDF = () => {
    const headers = ['Date', 'Invoice', 'Customer', 'Items', 'Amount', 'Payment Status', 'Payment Method', 'Status']
    const rows = sales.map(sale => [
      new Date(sale.sale_date).toLocaleDateString('en-IN'),
      sale.invoice_number,
      sale.customer_name || 'Walk-in Customer',
      sale.items.length,
      `₹${sale.grand_total.toFixed(2)}`,
      sale.payment_status,
      sale.payment_method || '',
      sale.archived ? 'Archived' : 'Active'
    ])

    const period = timePeriod === 'all' ? 'All Time' : timePeriod
    const title = `Sales History Report (${period})`
    const filename = `sales_history_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    
    exportDataToPDF(rows, headers, filename, title)
  }

  // Block non-admin access
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            Sales history is only available to administrators.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-block bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
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
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">
                      ADMIN ONLY
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">View all sales including archived records</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Export to Excel"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Export to PDF"
                >
                  <FileText className="w-5 h-5" />
                  PDF
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Time Period Filter */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Filter by Period:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTimePeriod('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimePeriod('today')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'today'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimePeriod('thisWeek')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'thisWeek'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setTimePeriod('thisMonth')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'thisMonth'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setTimePeriod('thisYear')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'thisYear'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  This Year
                </button>
                <button
                  onClick={() => setTimePeriod('custom')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'custom'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>
            {timePeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.thisMonth.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500" />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Archived</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.archived}</p>
                  <p className="text-xs text-gray-500">Products sold</p>
                </div>
                <Archive className="w-10 h-10 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading sales history...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No sales found</h3>
                <p className="text-gray-600 mb-6">
                  Sales history will appear here after sales are created
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      {hasPermission('sales:delete') && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={sales.length > 0 && selectedSaleIds.size === sales.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            title="Select All"
                          />
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Modified</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sales.map((sale) => (
                      <tr key={sale.id} className={`hover:bg-gray-50 transition-colors ${sale.archived ? 'opacity-75' : ''} ${selectedSaleIds.has(sale.id) ? 'bg-blue-50' : ''}`}>
                        {hasPermission('sales:delete') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedSaleIds.has(sale.id)}
                              onChange={(e) => handleSelectSale(sale.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(sale.sale_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            {new Date(sale.sale_date).toLocaleTimeString('en-IN', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.invoice_number}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {sale.customer_name || 'Walk-in Customer'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                          </div>
                          {sale.archived && (
                            <div className="text-xs text-orange-600 font-medium">Archived</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{sale.grand_total.toFixed(2)}
                          </div>
                          {sale.tax_amount > 0 && (
                            <div className="text-xs text-gray-500">
                              Tax: ₹{sale.tax_amount.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sale.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}
                          </span>
                          {sale.payment_method && (
                            <div className="text-xs text-gray-500 mt-1">{sale.payment_method}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {sale.archived ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              <Archive className="w-3 h-3 mr-1" />
                              Archived
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {sale.updated_at 
                              ? new Date(sale.updated_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : sale.created_at 
                              ? new Date(sale.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sale.updated_at 
                              ? new Date(sale.updated_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: true
                                })
                              : sale.created_at
                              ? new Date(sale.created_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: true
                                })
                              : ''}
                          </div>
                          {sale.updated_at && (
                            <div className="text-xs text-blue-600 font-medium mt-0.5">
                              Modified
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('sales:delete') && (
                              <button
                                onClick={async () => {
                                  const confirmed = window.confirm(
                                    `Are you sure you want to delete this sale?\n\nInvoice: ${sale.invoice_number}\nDate: ${new Date(sale.sale_date).toLocaleDateString()}\n\nThis action cannot be undone!`
                                  )
                                  if (confirmed) {
                                    try {
                                      const success = await saleService.delete(sale.id)
                                      if (success) {
                                        alert('Sale deleted successfully!')
                                        await loadSales()
                                      } else {
                                        alert('Failed to delete sale')
                                      }
                                    } catch (error) {
                                      console.error('Error deleting sale:', error)
                                      alert('Error deleting sale: ' + (error instanceof Error ? error.message : 'Unknown error'))
                                    }
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Sale"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/invoice/${sale.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bulk Actions */}
            {hasPermission('sales:delete') && selectedSaleIds.size > 0 && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between mb-4">
                <p className="text-sm text-red-900 font-medium">
                  <span className="font-bold">{selectedSaleIds.size}</span> sale{selectedSaleIds.size !== 1 ? 's' : ''} selected
                </p>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : `Delete Selected (${selectedSaleIds.size})`}
                </button>
              </div>
            )}

            {/* Summary */}
            {sales.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Showing {sales.length} sales (including archived)</span>
                  <span>
                    Total Revenue: ₹{sales.reduce((sum, s) => sum + s.grand_total, 0).toFixed(2)} | 
                    This Month: ₹{stats.thisMonth.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              <div 
                className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" 
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Delete Sales?</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <span className="font-bold text-red-600">{selectedSaleIds.size}</span> sale{selectedSaleIds.size !== 1 ? 's' : ''}?
                  <br /><br />
                  This will permanently remove {selectedSaleIds.size === 1 ? 'this sale' : 'these sales'} from the database.
                </p>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Delete {selectedSaleIds.size} Sale{selectedSaleIds.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesHistory
