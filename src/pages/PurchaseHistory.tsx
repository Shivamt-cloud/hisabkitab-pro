import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { purchaseService } from '../services/purchaseService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Purchase, PurchaseType } from '../types/purchase'
import { Plus, Eye, Edit, Filter, FileText, TrendingUp, Home, FileSpreadsheet, Search, X, Trash2 } from 'lucide-react'
import { exportToExcel } from '../utils/exportUtils'

type TimePeriod = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'

const PurchaseHistory = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]) // Store all purchases for filtering
  const [filterType, setFilterType] = useState<PurchaseType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Debounce search query to avoid excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms delay
    
    return () => clearTimeout(timer)
  }, [searchQuery])
  const [stats, setStats] = useState<{
    total: number
    gst: { count: number; total: number; tax: number }
    simple: { count: number; total: number }
  }>({
    total: 0,
    gst: { count: 0, total: 0, tax: 0 },
    simple: { count: 0, total: 0 },
  })

  const loadPurchases = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      console.log('[PurchaseHistory] Loading purchases, companyId:', companyId, 'type:', typeof companyId)
      // Pass companyId directly - services will handle null by returning empty array for data isolation
      // undefined means admin hasn't selected a company (show all), null means user has no company (show nothing)
      const [allPurchasesResult, statistics] = await Promise.all([
        purchaseService.getAll(undefined, companyId),
        purchaseService.getStats(companyId)
      ])
      console.log('[PurchaseHistory] Loaded purchases:', allPurchasesResult.length)
      console.log('[PurchaseHistory] Purchase company_ids:', allPurchasesResult.map(p => ({ id: p.id, company_id: p.company_id })))
      
      // Sort by date (newest first) - no normalization here, do it lazily when needed
      const sortedPurchases = allPurchasesResult.sort((a, b) => 
        new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
      )
      
      setAllPurchases(sortedPurchases)
      setStats(statistics)
    } catch (error) {
      console.error('Error loading purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPurchases()
  }, [])

  // Clear selections when purchases change
  useEffect(() => {
    setSelectedPurchaseIds(new Set())
  }, [purchases.length])

  // Debug: Log when modal state changes
  useEffect(() => {
    console.log('[Bulk Delete] Modal visibility changed:', showDeleteConfirm)
  }, [showDeleteConfirm])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPurchaseIds(new Set(purchases.map(p => p.id)))
    } else {
      setSelectedPurchaseIds(new Set())
    }
  }

  // Handle individual selection
  const handleSelectPurchase = (purchaseId: number, checked: boolean) => {
    const newSelected = new Set(selectedPurchaseIds)
    if (checked) {
      newSelected.add(purchaseId)
    } else {
      newSelected.delete(purchaseId)
    }
    setSelectedPurchaseIds(newSelected)
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    console.log('[Bulk Delete] Function called', { selectedCount: selectedPurchaseIds.size })
    
    if (selectedPurchaseIds.size === 0) {
      console.warn('[Bulk Delete] No purchases selected for deletion')
      alert('No purchases selected. Please select purchases to delete.')
      return
    }
    
    const count = selectedPurchaseIds.size
    console.log(`[Bulk Delete] Starting deletion of ${count} purchases`)
    console.log('[Bulk Delete] Selected IDs:', Array.from(selectedPurchaseIds))
    
    // Show custom confirmation modal
    console.log('[Bulk Delete] Setting showDeleteConfirm to true')
    setShowDeleteConfirm(true)
    console.log('[Bulk Delete] Modal state updated, should be visible now')
  }

  // Actually perform the deletion after confirmation
  const confirmAndDelete = async () => {
    setShowDeleteConfirm(false)
    const count = selectedPurchaseIds.size
    console.log('[Bulk Delete] User confirmed deletion, proceeding...')
    setIsDeleting(true)
    
    try {
      const idsToDelete = Array.from(selectedPurchaseIds)
      console.log('[Bulk Delete] IDs to delete:', idsToDelete)
      let successCount = 0
      let failCount = 0
      const errors: Array<{ id: number; error: any }> = []

      // Delete in batches to avoid overwhelming the database
      const batchSize = 10
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize)
        console.log(`[Bulk Delete] Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} purchases`)
        
        const batchPromises = batch.map(async (id) => {
          try {
            console.log(`[Bulk Delete] Attempting to delete purchase ${id}`)
            await purchaseService.delete(id) // Now throws on error
            console.log(`[Bulk Delete] ✅ Successfully deleted purchase ${id}`)
            successCount++
          } catch (error) {
            console.error(`[Bulk Delete] ❌ Exception deleting purchase ${id}:`, error)
            failCount++
            errors.push({ id, error: error instanceof Error ? error.message : String(error) })
          }
        })
        
        await Promise.all(batchPromises)
        console.log(`[Bulk Delete] Batch ${Math.floor(i / batchSize) + 1} completed. Success: ${successCount}, Failed: ${failCount}`)
      }

      console.log(`[Bulk Delete] All batches completed. Total - Success: ${successCount}, Failed: ${failCount}`)
      console.log('[Bulk Delete] Errors:', errors)

      // Clear selections
      setSelectedPurchaseIds(new Set())
      
      // Reload purchases
      console.log('[Bulk Delete] Reloading purchases...')
      await loadPurchases()
      console.log('[Bulk Delete] Purchases reloaded')

      if (failCount === 0) {
        alert(`✅ Successfully deleted ${successCount} purchase${successCount !== 1 ? 's' : ''}!`)
      } else {
        const errorDetails = errors.slice(0, 5).map(e => `Purchase ${e.id}: ${e.error}`).join('\n')
        const moreErrors = errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''
        alert(`⚠️ Deleted ${successCount} purchase${successCount !== 1 ? 's' : ''}, but ${failCount} failed.\n\nFirst few errors:\n${errorDetails}${moreErrors}\n\nCheck browser console (F12) for full details.`)
      }
    } catch (error) {
      console.error('[Bulk Delete] ❌ Fatal error during bulk delete:', error)
      alert('❌ Error deleting purchases: ' + (error instanceof Error ? error.message : 'Unknown error') + '\n\nCheck browser console (F12) for details.')
    } finally {
      setIsDeleting(false)
      console.log('[Bulk Delete] Deletion process completed')
    }
  }

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

  // Helper function to get sold_quantity safely (lazy normalization)
  const getSoldQuantity = (item: any): number => {
    return item.sold_quantity !== undefined ? item.sold_quantity : 0
  }

  // Memoize filtered purchases to avoid recalculating on every render
  const filteredPurchases = useMemo(() => {
    let filtered = [...allPurchases]
    
    // Apply search filter (use debounced query)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filtered = filtered.filter(purchase => {
        const supplierName = (purchase as any).supplier_name?.toLowerCase() || ''
        const invoiceNumber = (purchase as any).invoice_number?.toLowerCase() || ''
        const items = purchase.items || []
        
        // Search in supplier name
        if (supplierName.includes(query)) return true
        // Search in invoice number
        if (invoiceNumber.includes(query)) return true
        // Search in article codes
        if (items.some(item => item.article?.toLowerCase().includes(query))) return true
        // Search in barcodes
        if (items.some(item => item.barcode?.toLowerCase().includes(query))) return true
        // Search in product names
        if (items.some(item => item.product_name?.toLowerCase().includes(query))) return true
        
        return false
      })
    }
    
    // Apply supplier filter
    if (selectedSupplier !== 'all') {
      filtered = filtered.filter(purchase => 
        (purchase as any).supplier_name === selectedSupplier
      )
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType)
    }
    
    // Apply date range filter
    const { startDate, endDate } = getDateRange()
    if (startDate || endDate) {
      filtered = filtered.filter(purchase => {
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
    filtered.sort((a, b) => 
      new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    )
    
    return filtered
  }, [allPurchases, debouncedSearchQuery, selectedSupplier, filterType, timePeriod, customStartDate, customEndDate])
  
  // Update purchases state only when filteredPurchases changes
  useEffect(() => {
    setPurchases(filteredPurchases)
  }, [filteredPurchases])

  // Reload when navigating back to this page
  useEffect(() => {
    const handleFocus = () => {
      loadPurchases()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Get unique suppliers for filter dropdown
  const getUniqueSuppliers = (): string[] => {
    const suppliers = allPurchases
      .map(p => (p as any).supplier_name)
      .filter((name): name is string => !!name && name !== 'N/A')
    return [...new Set(suppliers)].sort()
  }

  const exportToExcel = () => {
    const headers = ['Date', 'Type', 'Invoice', 'Supplier', 'Items', 'Available Qty', 'Total Qty', 'Sold Qty', 'Articles', 'Barcodes', 'Amount', 'Payment Status', 'Last Modified']
    const rows = purchases.map(purchase => {
      const barcodes = purchase.items
        .map(item => item.barcode)
        .filter((barcode): barcode is string => !!barcode)
      const uniqueBarcodes = [...new Set(barcodes)]
      const barcodeString = uniqueBarcodes.length > 0 
        ? uniqueBarcodes.join(', ') 
        : 'No barcodes'
      
      const articles = purchase.items
        .map(item => item.article)
        .filter((article): article is string => !!article && article.trim() !== '')
      const uniqueArticles = [...new Set(articles)]
      const articleString = uniqueArticles.length > 0 
        ? uniqueArticles.join(', ') 
        : 'No articles'
      
      const totalQuantity = purchase.items.reduce((sum, item) => sum + item.quantity, 0)
      const totalSoldQuantity = purchase.items.reduce((sum, item) => sum + getSoldQuantity(item), 0)
      const totalAvailable = totalQuantity - totalSoldQuantity
      
      return [
        new Date(purchase.purchase_date).toLocaleDateString('en-IN'),
        purchase.type === 'gst' ? 'GST' : 'Simple',
        (purchase as any).invoice_number || 'N/A',
        (purchase as any).supplier_name || 'N/A',
        purchase.items.length,
        totalAvailable,
        totalQuantity,
        totalSoldQuantity,
        articleString,
        barcodeString,
        purchase.type === 'gst' ? (purchase as any).grand_total.toFixed(2) : (purchase as any).total_amount.toFixed(2),
        purchase.payment_status,
        (purchase as any).updated_at ? new Date((purchase as any).updated_at).toLocaleDateString('en-IN') : new Date(purchase.created_at).toLocaleDateString('en-IN')
      ]
    })

    const filename = `purchase_history_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    exportToExcel(rows, headers, filename, 'Purchase History')
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
                <th>Available Qty</th>
                <th>Articles</th>
                <th>Barcodes</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              ${purchases.map(purchase => {
                const barcodes = purchase.items
                  .map(item => item.barcode)
                  .filter((barcode): barcode is string => !!barcode)
                const uniqueBarcodes = [...new Set(barcodes)]
                const barcodeString = uniqueBarcodes.length > 0 
                  ? uniqueBarcodes.join(', ') 
                  : 'No barcodes'
                
                const totalQuantity = purchase.items.reduce((sum, item) => sum + item.quantity, 0)
                const totalSoldQuantity = purchase.items.reduce((sum, item) => sum + getSoldQuantity(item), 0)
                const totalAvailable = totalQuantity - totalSoldQuantity
                
                const articles = purchase.items
                  .map(item => item.article)
                  .filter((article): article is string => !!article && article.trim() !== '')
                const uniqueArticles = [...new Set(articles)]
                const articleString = uniqueArticles.length > 0 
                  ? uniqueArticles.join(', ') 
                  : 'No articles'
                
                return `
                <tr>
                  <td>${new Date(purchase.purchase_date).toLocaleDateString('en-IN')}</td>
                  <td>${purchase.type === 'gst' ? 'GST' : 'Simple'}</td>
                  <td>${(purchase as any).invoice_number || 'N/A'}</td>
                  <td>${(purchase as any).supplier_name || 'N/A'}</td>
                  <td>${purchase.items.length}</td>
                  <td>${totalAvailable} / ${totalQuantity} (${totalSoldQuantity} sold)</td>
                  <td>${articleString}</td>
                  <td>${barcodeString}</td>
                  <td>₹${purchase.type === 'gst' ? (purchase as any).grand_total.toFixed(2) : (purchase as any).total_amount.toFixed(2)}</td>
                  <td>${purchase.payment_status}</td>
                  <td>${(purchase as any).updated_at ? new Date((purchase as any).updated_at).toLocaleDateString('en-IN') : new Date(purchase.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              `
              }).join('')}
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

          {/* Search and Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50 space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
              <Search className="w-5 h-5 text-gray-500" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by supplier, invoice, article, barcode, or product..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Supplier:</span>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="all">All Suppliers</option>
                  {allPurchases.length > 0 && getUniqueSuppliers().map(supplier => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Type:</span>
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

          {/* Results Count and Bulk Actions */}
          <div className="mb-4 space-y-2">
            {(searchQuery || selectedSupplier !== 'all' || filterType !== 'all' || timePeriod !== 'all') && (
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  Showing <span className="font-bold">{purchases.length}</span> of <span className="font-bold">{allPurchases.length}</span> purchases
                  {searchQuery && <span> matching "{searchQuery}"</span>}
                  {selectedSupplier !== 'all' && <span> from {selectedSupplier}</span>}
                </p>
              </div>
            )}
            
            {/* Bulk Delete Button - Only show if admin and items are selected */}
            {hasPermission('purchases:delete') && selectedPurchaseIds.size > 0 && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                <p className="text-sm text-red-900 font-medium">
                  <span className="font-bold">{selectedPurchaseIds.size}</span> purchase{selectedPurchaseIds.size !== 1 ? 's' : ''} selected
                </p>
                <button
                  type="button"
                  onClick={() => {
                    console.log('[Bulk Delete Button] Clicked!', {
                      selectedCount: selectedPurchaseIds.size,
                      selectedIds: Array.from(selectedPurchaseIds),
                      isDeleting,
                      hasPermission: hasPermission('purchases:delete')
                    })
                    handleBulkDelete()
                  }}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : `Delete Selected (${selectedPurchaseIds.size})`}
                </button>
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
                  {searchQuery || selectedSupplier !== 'all' || filterType !== 'all' || timePeriod !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first purchase'}
                </p>
                {(searchQuery || selectedSupplier !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedSupplier('all')
                      setFilterType('all')
                      setTimePeriod('all')
                    }}
                    className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Clear All Filters
                  </button>
                )}
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
                      {hasPermission('purchases:delete') && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={purchases.length > 0 && selectedPurchaseIds.size === purchases.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            title="Select All"
                          />
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Available Qty</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Articles</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Barcodes</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Modified</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className={`hover:bg-gray-50 transition-colors ${selectedPurchaseIds.has(purchase.id) ? 'bg-blue-50' : ''}`}>
                        {hasPermission('purchases:delete') && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedPurchaseIds.has(purchase.id)}
                              onChange={(e) => handleSelectPurchase(purchase.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
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
                          <div className="text-sm text-gray-900">
                            {(() => {
                              // Calculate total available quantity for all items in this purchase
                              const totalQuantity = purchase.items.reduce((sum, item) => sum + item.quantity, 0)
                              const totalSoldQuantity = purchase.items.reduce((sum, item) => sum + getSoldQuantity(item), 0)
                              const totalAvailable = totalQuantity - totalSoldQuantity
                              
                              return (
                                <div className="flex flex-col gap-1">
                                  <span className={`font-semibold ${
                                    totalAvailable === 0 
                                      ? 'text-red-600' 
                                      : totalAvailable < totalQuantity * 0.2 
                                      ? 'text-orange-600' 
                                      : 'text-green-600'
                                  }`}>
                                    {totalAvailable} / {totalQuantity}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {totalSoldQuantity > 0 ? `${totalSoldQuantity} sold` : 'All available'}
                                  </span>
                                </div>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {(() => {
                              const articles = purchase.items
                                .map(item => item.article)
                                .filter((article): article is string => !!article && article.trim() !== '')
                              const uniqueArticles = [...new Set(articles)]
                              
                              if (uniqueArticles.length === 0) {
                                return <span className="text-gray-400 italic text-xs">No articles</span>
                              }
                              
                              if (uniqueArticles.length <= 3) {
                                return (
                                  <div className="space-y-1">
                                    {uniqueArticles.map((article, idx) => (
                                      <div key={idx} className="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 text-blue-900">
                                        {article}
                                      </div>
                                    ))}
                                  </div>
                                )
                              }
                              
                              return (
                                <div className="space-y-1">
                                  {uniqueArticles.slice(0, 2).map((article, idx) => (
                                    <div key={idx} className="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 text-blue-900">
                                      {article}
                                    </div>
                                  ))}
                                  <div className="text-xs text-gray-500 font-medium">
                                    +{uniqueArticles.length - 2} more
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {(() => {
                              const barcodes = purchase.items
                                .map(item => item.barcode)
                                .filter((barcode): barcode is string => !!barcode)
                              const uniqueBarcodes = [...new Set(barcodes)]
                              
                              if (uniqueBarcodes.length === 0) {
                                return <span className="text-gray-400 italic text-xs">No barcodes</span>
                              }
                              
                              if (uniqueBarcodes.length <= 3) {
                                return (
                                  <div className="space-y-1">
                                    {uniqueBarcodes.map((barcode, idx) => (
                                      <div key={idx} className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                        {barcode}
                                      </div>
                                    ))}
                                  </div>
                                )
                              }
                              
                              return (
                                <div className="space-y-1">
                                  {uniqueBarcodes.slice(0, 2).map((barcode, idx) => (
                                    <div key={idx} className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                      {barcode}
                                    </div>
                                  ))}
                                  <div className="text-xs text-gray-500 font-medium">
                                    +{uniqueBarcodes.length - 2} more
                                  </div>
                                </div>
                              )
                            })()}
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
                            {hasPermission('purchases:delete') && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const confirmed = window.confirm(
                                    `Are you sure you want to delete this purchase?\n\nInvoice: ${(purchase as any).invoice_number || purchase.id}\nDate: ${new Date(purchase.purchase_date).toLocaleDateString()}\n\nThis action cannot be undone!`
                                  )
                                  if (confirmed) {
                                    try {
                                      await purchaseService.delete(purchase.id) // Now throws on error
                                      alert('Purchase deleted successfully!')
                                      await loadPurchases()
                                      // Remove from selection if it was selected
                                      if (selectedPurchaseIds.has(purchase.id)) {
                                        const newSelected = new Set(selectedPurchaseIds)
                                        newSelected.delete(purchase.id)
                                        setSelectedPurchaseIds(newSelected)
                                      }
                                    } catch (error) {
                                      console.error('Error deleting purchase:', error)
                                      alert('Error deleting purchase: ' + (error instanceof Error ? error.message : 'Unknown error'))
                                    }
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Purchase"
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
              onClick={() => {
                console.log('[Bulk Delete] Modal backdrop clicked, closing')
                setShowDeleteConfirm(false)
              }}
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
                    <h3 className="text-xl font-bold text-gray-900">Delete Purchases?</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <span className="font-bold text-red-600">{selectedPurchaseIds.size}</span> purchase{selectedPurchaseIds.size !== 1 ? 's' : ''}?
                  <br /><br />
                  This will permanently remove {selectedPurchaseIds.size === 1 ? 'this purchase' : 'these purchases'} from the database.
                </p>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('[Bulk Delete] User cancelled in modal')
                      setShowDeleteConfirm(false)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('[Bulk Delete] User confirmed in modal')
                      confirmAndDelete()
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Delete {selectedPurchaseIds.size} Purchase{selectedPurchaseIds.size !== 1 ? 's' : ''}
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

export default PurchaseHistory

