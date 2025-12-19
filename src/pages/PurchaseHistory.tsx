import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { purchaseService } from '../services/purchaseService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Purchase, PurchaseType } from '../types/purchase'
import { Plus, Eye, Edit, Filter, FileText, TrendingUp, Home, FileSpreadsheet } from 'lucide-react'

type TimePeriod = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'

const PurchaseHistory = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [filterType, setFilterType] = useState<PurchaseType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [stats, setStats] = useState<{
    total: number
    gst: { count: number; total: number; tax: number }
    simple: { count: number; total: number }
  }>({
    total: 0,
    gst: { count: 0, total: 0, tax: 0 },
    simple: { count: 0, total: 0 },
  })

  useEffect(() => {
    loadPurchases()
  }, [filterType, timePeriod, customStartDate, customEndDate])

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

  const loadPurchases = async () => {
    setLoading(true)
    try {
      const [allPurchasesResult, statistics] = await Promise.all([
        (async () => {
          const companyId = getCurrentCompanyId()
          let allPurchases = filterType === 'all' 
            ? await purchaseService.getAll(undefined, companyId || undefined) 
            : await purchaseService.getAll(filterType, companyId || undefined)
          
          // Filter by date range
          const { startDate, endDate } = getDateRange()
          if (startDate || endDate) {
            allPurchases = allPurchases.filter(purchase => {
              const purchaseDate = new Date(purchase.purchase_date).getTime()
              if (startDate && purchaseDate < new Date(startDate).getTime()) return false
              if (endDate) {
                const endDateTime = new Date(endDate).getTime() + 86400000
                if (purchaseDate > endDateTime) return false
              }
              return true
            })
          }
          
          // Sort by date (newest first)
          return allPurchases.sort((a, b) => 
            new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
          )
        })(),
        purchaseService.getStats(getCurrentCompanyId() || undefined)
      ])
      
      setPurchases(allPurchasesResult)
      setStats(statistics)
    } catch (error) {
      console.error('Error loading purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    const headers = ['Date', 'Type', 'Invoice', 'Supplier', 'Items', 'Amount', 'Payment Status', 'Last Modified']
    const rows = purchases.map(purchase => [
      new Date(purchase.purchase_date).toLocaleDateString('en-IN'),
      purchase.type === 'gst' ? 'GST' : 'Simple',
      (purchase as any).invoice_number || 'N/A',
      (purchase as any).supplier_name || 'N/A',
      purchase.items.length,
      purchase.type === 'gst' ? (purchase as any).grand_total.toFixed(2) : (purchase as any).total_amount.toFixed(2),
      purchase.payment_status,
      (purchase as any).updated_at ? new Date((purchase as any).updated_at).toLocaleDateString('en-IN') : new Date(purchase.created_at).toLocaleDateString('en-IN')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `purchase_history_${timePeriod}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase History Report</title>
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
            <h1>Purchase History Report</h1>
            <p>Type: ${filterType === 'all' ? 'All Types' : filterType}</p>
            <p>Period: ${timePeriod === 'all' ? 'All Time' : timePeriod}</p>
            <p>Total Records: ${purchases.length}</p>
            <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Invoice</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              ${purchases.map(purchase => `
                <tr>
                  <td>${new Date(purchase.purchase_date).toLocaleDateString('en-IN')}</td>
                  <td>${purchase.type === 'gst' ? 'GST' : 'Simple'}</td>
                  <td>${(purchase as any).invoice_number || 'N/A'}</td>
                  <td>${(purchase as any).supplier_name || 'N/A'}</td>
                  <td>${purchase.items.length}</td>
                  <td>₹${purchase.type === 'gst' ? (purchase as any).grand_total.toFixed(2) : (purchase as any).total_amount.toFixed(2)}</td>
                  <td>${purchase.payment_status}</td>
                  <td>${(purchase as any).updated_at ? new Date((purchase as any).updated_at).toLocaleDateString('en-IN') : new Date(purchase.created_at).toLocaleDateString('en-IN')}</td>
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


  return (
    <ProtectedRoute requiredPermission="purchases:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Purchase History</h1>
                  <p className="text-sm text-gray-600 mt-1">View and manage all purchase records</p>
                </div>
              </div>
              <div className="flex gap-3">
                {hasPermission('purchases:create') && (
                  <>
                    <button
                      onClick={() => navigate('/purchases/new-simple')}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Simple Purchase
                    </button>
                    <button
                      onClick={() => navigate('/purchases/new-gst')}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      GST Purchase
                    </button>
                  </>
                )}
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
                  title="Export to Excel"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
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
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Purchases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">GST Purchases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.gst.count}</p>
                  <p className="text-sm text-gray-500">₹{stats.gst.total.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-indigo-500" />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-6 border border-white/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Simple Purchases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.simple.count}</p>
                  <p className="text-sm text-gray-500">₹{stats.simple.total.toFixed(2)}</p>
                </div>
                <FileText className="w-10 h-10 text-green-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50 space-y-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Filter by Type:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('gst')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'gst'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  GST Purchases
                </button>
                <button
                  onClick={() => setFilterType('simple')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'simple'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Simple Purchases
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
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
              <div className="flex flex-wrap items-center gap-3 pt-2">
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

          {/* Purchases Table */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading purchases...</p>
              </div>
            ) : purchases.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No purchases found</h3>
                <p className="text-gray-600 mb-6">
                  {filterType === 'all'
                    ? 'Get started by creating your first purchase'
                    : `No ${filterType} purchases found`}
                </p>
                {hasPermission('purchases:create') && (
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => navigate('/purchases/new-gst')}
                      className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create GST Purchase
                    </button>
                    <button
                      onClick={() => navigate('/purchases/new-simple')}
                      className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create Simple Purchase
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Modified</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(purchase.purchase_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.type === 'gst'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {purchase.type === 'gst' ? 'GST' : 'Simple'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {purchase.type === 'gst' 
                              ? (purchase as any).invoice_number 
                              : (purchase as any).invoice_number || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {purchase.type === 'gst'
                              ? (purchase as any).supplier_name || 'N/A'
                              : (purchase as any).supplier_name || 'N/A'}
                          </div>
                          {purchase.type === 'gst' && (purchase as any).supplier_gstin && (
                            <div className="text-xs text-gray-500">
                              GSTIN: {(purchase as any).supplier_gstin}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{purchase.type === 'gst' 
                              ? (purchase as any).grand_total.toFixed(2)
                              : (purchase as any).total_amount.toFixed(2)}
                          </div>
                          {purchase.type === 'gst' && (purchase as any).total_tax > 0 && (
                            <div className="text-xs text-gray-500">
                              Tax: ₹{(purchase as any).total_tax.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : purchase.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(purchase as any).updated_at 
                              ? new Date((purchase as any).updated_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : purchase.created_at 
                              ? new Date(purchase.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(purchase as any).updated_at 
                              ? new Date((purchase as any).updated_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: true
                                })
                              : purchase.created_at
                              ? new Date(purchase.created_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  hour12: true
                                })
                              : ''}
                          </div>
                          {(purchase as any).updated_at && (
                            <div className="text-xs text-blue-600 font-medium mt-0.5">
                              Modified
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('purchases:update') && (
                              <button
                                onClick={() => navigate(
                                  purchase.type === 'gst' 
                                    ? `/purchases/${purchase.id}/edit-gst`
                                    : `/purchases/${purchase.id}/edit-simple`
                                )}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Edit Purchase"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/purchases/${purchase.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
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
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default PurchaseHistory

