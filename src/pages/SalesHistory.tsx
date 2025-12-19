import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { saleService } from '../services/saleService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Sale } from '../types/sale'
import { Eye, ShoppingCart, TrendingUp, DollarSign, Archive, Home, FileSpreadsheet, FileText } from 'lucide-react'

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

  const loadSales = async () => {
    setLoading(true)
    try {
      // Admin sees all sales including archived
      const companyId = getCurrentCompanyId()
      const allSales = await saleService.getAll(true, companyId || undefined)
      
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
    // Create CSV content (simplified Excel export)
    const headers = ['Date', 'Invoice', 'Customer', 'Items', 'Amount', 'Payment Status', 'Payment Method', 'Status']
    const rows = sales.map(sale => [
      new Date(sale.sale_date).toLocaleDateString('en-IN'),
      sale.invoice_number,
      sale.customer_name || 'Walk-in Customer',
      sale.items.length,
      sale.grand_total.toFixed(2),
      sale.payment_status,
      sale.payment_method || '',
      sale.archived ? 'Archived' : 'Active'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sales_history_${timePeriod}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    // Create a simple text-based PDF using window.print or generate HTML for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales History Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4f46e5; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sales History Report</h1>
            <p>Period: ${timePeriod === 'all' ? 'All Time' : timePeriod}</p>
            <p>Total Records: ${sales.length}</p>
            <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Payment Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map(sale => `
                <tr>
                  <td>${new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                  <td>${sale.invoice_number}</td>
                  <td>${sale.customer_name || 'Walk-in Customer'}</td>
                  <td>${sale.items.length}</td>
                  <td>₹${sale.grand_total.toFixed(2)}</td>
                  <td>${sale.payment_status}</td>
                  <td>${sale.payment_method || ''}</td>
                  <td>${sale.archived ? 'Archived' : 'Active'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
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
                      <tr key={sale.id} className={`hover:bg-gray-50 transition-colors ${sale.archived ? 'opacity-75' : ''}`}>
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
                          <button
                            onClick={() => navigate(`/invoice/${sale.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesHistory
