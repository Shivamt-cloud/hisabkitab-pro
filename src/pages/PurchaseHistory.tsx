import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlanUpgrade } from '../context/PlanUpgradeContext'
import { useToast } from '../context/ToastContext'
import { useNavigate } from 'react-router-dom'
import { purchaseService } from '../services/purchaseService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Purchase, PurchaseType } from '../types/purchase'
import { Plus, Eye, Edit, Filter, FileText, TrendingUp, Home, FileSpreadsheet, Search, X, Trash2, AlertCircle, CalendarClock, Package, Columns3, Lock } from 'lucide-react'
import { exportToExcel as exportExcel } from '../utils/exportUtils'

type TimePeriod = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'

const COLUMN_KEYS = [
  { key: 'date', label: 'Date' },
  { key: 'purchase_id', label: 'Purchase #' },
  { key: 'type', label: 'Type' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'product_name', label: 'Product' },
  { key: 'article', label: 'Article' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'qty', label: 'Qty' },
  { key: 'remaining', label: 'Remaining' },
  { key: 'purchase_price', label: 'Purchase Price' },
  { key: 'sale_price', label: 'Sale Price' },
  { key: 'mrp', label: 'MRP' },
  { key: 'item_total', label: 'Item Total' },
  { key: 'tax', label: 'Tax' },
  { key: 'status', label: 'Status' },
  { key: 'last_modified', label: 'Last Modified' },
] as const
const DEFAULT_VISIBLE_COLUMNS = ['date', 'purchase_id', 'invoice', 'supplier', 'product_name', 'article', 'qty', 'remaining', 'purchase_price', 'sale_price', 'mrp', 'item_total', 'status']
const COLUMNS_STORAGE_KEY = 'purchaseHistory_visibleColumns'

const PurchaseHistory = () => {
  const { hasPermission, hasPlanFeature, getCurrentCompanyId } = useAuth()
  const { showPlanUpgrade } = usePlanUpgrade()
  const { toast } = useToast()
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
  const [selectedProduct, setSelectedProduct] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('') // Specific date filter
  const [groupBySupplier, setGroupBySupplier] = useState<boolean>(true) // Group by supplier
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        return new Set(parsed)
      }
    } catch (_) {}
    return new Set(DEFAULT_VISIBLE_COLUMNS)
  })
  
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

  const toggleColumnVisibility = (key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }
  const isColumnVisible = (key: string) => visibleColumns.has(key)

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
      case 'today': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        startDate = endDate = today.toISOString().split('T')[0]
        break
      }
      case 'yesterday': {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        startDate = endDate = yesterday.toISOString().split('T')[0]
        break
      }
      case 'thisWeek': {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      }
      case 'lastWeek': {
        const lastWeekEnd = new Date(now)
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
        const lastWeekStart = new Date(lastWeekEnd)
        lastWeekStart.setDate(lastWeekStart.getDate() - 6)
        startDate = lastWeekStart.toISOString().split('T')[0]
        endDate = lastWeekEnd.toISOString().split('T')[0]
        break
      }
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'custom':
        startDate = customStartDate || undefined
        endDate = customEndDate || undefined
        break
      default: // 'all'
        startDate = endDate = undefined
    }

    return { startDate, endDate }
  }

  // Helper function to get sold_quantity safely (lazy normalization)
  const getSoldQuantity = (item: any): number => {
    // Check multiple possible field names and types
    if (item.sold_quantity !== undefined && item.sold_quantity !== null) {
      const soldQty = typeof item.sold_quantity === 'number' ? item.sold_quantity : parseFloat(item.sold_quantity) || 0
      // Debug log for specific barcode
      if (item.barcode === '8906528006178') {
        console.log(`[PurchaseHistory] Item with barcode 8906528006178:`, {
          item_id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          sold_quantity: item.sold_quantity,
          sold_quantity_type: typeof item.sold_quantity,
          calculated_sold: soldQty,
          remaining: item.quantity - soldQty
        })
      }
      return soldQty
    }
    // Debug log if sold_quantity is missing
    if (item.barcode === '8906528006178') {
      console.warn(`[PurchaseHistory] Item with barcode 8906528006178 has no sold_quantity:`, {
        item_id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        item_keys: Object.keys(item)
      })
    }
    return 0
  }
  
  // Helper function to get remaining quantity for an item
  const getRemainingQuantity = (item: any): number => {
    const quantity = item.quantity || 0
    const soldQty = getSoldQuantity(item)
    return Math.max(0, quantity - soldQty)
  }

  // Supplier display: highlight unknown supplier
  const getSupplierDisplayName = (purchase: Purchase): string => {
    const name = (purchase as any).supplier_name
    return name && String(name).trim() !== '' ? String(name).trim() : 'Unknown supplier'
  }
  const isUnknownSupplier = (purchase: Purchase): boolean => {
    const name = (purchase as any).supplier_name
    return !name || String(name).trim() === '' || name === 'N/A'
  }

  // Same product from other suppliers: for each product name, which other suppliers have it (so we can show "Also from: X" per item)
  const productNameToOtherSuppliersMap = useMemo(() => {
    const productToSuppliers = new Map<string, Map<string, Set<number>>>() // productName -> supplierName -> purchaseIds
    allPurchases.forEach(purchase => {
      const supplierName = getSupplierDisplayName(purchase)
      ;(purchase.items || []).forEach(item => {
        const pn = item.product_name?.trim()
        if (!pn) return
        if (!productToSuppliers.has(pn)) {
          productToSuppliers.set(pn, new Map())
        }
        const supplierMap = productToSuppliers.get(pn)!
        if (!supplierMap.has(supplierName)) supplierMap.set(supplierName, new Set())
        supplierMap.get(supplierName)!.add(purchase.id)
      })
    })
    return productToSuppliers
  }, [allPurchases])

  const getOtherSuppliersForProduct = (productName: string | undefined, currentSupplierName: string): string[] => {
    if (!productName?.trim()) return []
    const supplierMap = productNameToOtherSuppliersMap.get(productName.trim())
    if (!supplierMap) return []
    const others = [...supplierMap.keys()].filter(s => s !== currentSupplierName)
    return others
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
        getSupplierDisplayName(purchase) === selectedSupplier
      )
    }
    
    // Apply product filter
    if (selectedProduct !== 'all') {
      filtered = filtered.filter(purchase => 
        purchase.items.some(item => item.product_name === selectedProduct)
      )
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType)
    }
    
    // Apply date range filter (time period)
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
    
    // Apply specific date filter (if selected)
    if (selectedDate) {
      filtered = filtered.filter(purchase => {
        const purchaseDateStr = new Date(purchase.purchase_date).toISOString().split('T')[0]
        return purchaseDateStr === selectedDate
      })
    }
    
    // Sort by date (newest first) - will be re-sorted when grouping
    filtered.sort((a, b) => 
      new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    )
    
    return filtered
  }, [allPurchases, debouncedSearchQuery, selectedSupplier, selectedProduct, filterType, timePeriod, customStartDate, customEndDate, selectedDate])
  
  // Due for payment / Overdue (bills with due_date set and not paid)
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const overdueBills = useMemo(() => {
    return allPurchases.filter(p => {
      const due = (p as any).due_date
      if (!due || p.payment_status === 'paid') return false
      return due < today
    }).sort((a, b) => (a as any).due_date.localeCompare((b as any).due_date))
  }, [allPurchases, today])
  const dueSoonBills = useMemo(() => {
    return allPurchases.filter(p => {
      const due = (p as any).due_date
      if (!due || p.payment_status === 'paid') return false
      return due >= today
    }).sort((a, b) => (a as any).due_date.localeCompare((b as any).due_date))
  }, [allPurchases, today])
  // Unpaid bills without due date (hint: add due date to see them in reminders)
  const unpaidWithoutDueDate = useMemo(() => {
    return allPurchases.filter(p => p.payment_status !== 'paid' && !(p as any).due_date)
  }, [allPurchases])

  // Group purchases by supplier
  const groupedPurchases = useMemo(() => {
    if (!groupBySupplier) {
      return { 'All Purchases': purchases }
    }
    
    const groups: Record<string, Purchase[]> = {}
    
    purchases.forEach(purchase => {
      const supplierName = (purchase as any).supplier_name || 'Unknown Supplier'
      if (!groups[supplierName]) {
        groups[supplierName] = []
      }
      groups[supplierName].push(purchase)
    })
    
    // Sort each group by date (newest first)
    Object.keys(groups).forEach(supplier => {
      groups[supplier].sort((a, b) => 
        new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
      )
    })
    
    // Sort suppliers alphabetically
    const sortedGroups: Record<string, Purchase[]> = {}
    Object.keys(groups).sort().forEach(supplier => {
      sortedGroups[supplier] = groups[supplier]
    })
    
    return sortedGroups
  }, [purchases, groupBySupplier])
  
  // Update purchases state only when filteredPurchases changes
  useEffect(() => {
    setPurchases(filteredPurchases)
  }, [filteredPurchases])

  // Reload when navigating back to this page or when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      loadPurchases()
    }
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPurchases()
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  // Also reload purchases periodically (every 30 seconds) to catch updates from other tabs/windows
  useEffect(() => {
    const interval = setInterval(() => {
      loadPurchases()
    }, 30000) // Reload every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  // Get unique suppliers for filter dropdown (include "Unknown supplier" when present)
  const getUniqueSuppliers = (): string[] => {
    const suppliers = allPurchases.map(p => getSupplierDisplayName(p))
    return [...new Set(suppliers)].sort()
  }

  // Get unique products for filter dropdown
  const getUniqueProducts = (): string[] => {
    const products = allPurchases
      .flatMap(p => p.items.map(item => item.product_name))
      .filter((name): name is string => !!name && name.trim() !== '')
    return [...new Set(products)].sort()
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
    exportExcel(rows, headers, filename, 'Purchase History')
    toast.success('Purchase history exported to Excel')
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
                {overdueBills.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium" title="Bills past due date">
                    <AlertCircle className="w-4 h-4" />
                    Overdue: {overdueBills.length}
                  </div>
                )}
                {dueSoonBills.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium" title="Bills due for payment">
                    <CalendarClock className="w-4 h-4" />
                    Due for payment: {dueSoonBills.length}
                  </div>
                )}
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
                    <button
                      onClick={() => hasPlanFeature('purchase_reorder') ? navigate('/purchases/reorders') : showPlanUpgrade('purchase_reorder')}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      {!hasPlanFeature('purchase_reorder') && <Lock className="w-5 h-5" />}
                      <Package className="w-5 h-5" />
                      Reorders
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
                <button
                  onClick={loadPurchases}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                  title="Refresh Purchases"
                >
                  <Filter className="w-5 h-5" />
                  Refresh
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

          {/* Purchase reminders: Overdue / Due for payment (always visible so user can see the section) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {overdueBills.length > 0 ? (
              <div className="bg-red-50/80 border border-red-200 rounded-xl p-4">
                <h3 className="flex items-center gap-2 text-red-800 font-semibold mb-3">
                  <AlertCircle className="w-5 h-5" />
                  Overdue ({overdueBills.length})
                </h3>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {overdueBills.slice(0, 10).map(p => {
                    const due = (p as any).due_date
                    const amount = p.type === 'gst' ? (p as any).grand_total : (p as any).total_amount
                    return (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {(p as any).supplier_name || 'N/A'} · {(p as any).invoice_number || `#${p.id}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 font-medium">
                            Due {due ? new Date(due).toLocaleDateString('en-IN') : ''}
                          </span>
                          <span>₹{amount?.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => navigate(p.type === 'gst' ? `/purchases/${p.id}/edit-gst` : `/purchases/${p.id}/edit-simple`)}
                            className="text-indigo-600 hover:underline font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {overdueBills.length > 10 && (
                  <p className="text-xs text-red-600 mt-2">+{overdueBills.length - 10} more</p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4">
                <h3 className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                  Overdue (0)
                </h3>
                <p className="text-sm text-gray-500">
                  Bills with <strong>Due date</strong> in the past and payment not Paid appear here. Edit a purchase and set <strong>Due date (optional)</strong> to use reminders.
                </p>
              </div>
            )}
            {dueSoonBills.length > 0 ? (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
                <h3 className="flex items-center gap-2 text-amber-800 font-semibold mb-3">
                  <CalendarClock className="w-5 h-5" />
                  Due for payment ({dueSoonBills.length})
                </h3>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {dueSoonBills.slice(0, 10).map(p => {
                    const due = (p as any).due_date
                    const amount = p.type === 'gst' ? (p as any).grand_total : (p as any).total_amount
                    return (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {(p as any).supplier_name || 'N/A'} · {(p as any).invoice_number || `#${p.id}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-700 font-medium">
                            Due {due ? new Date(due).toLocaleDateString('en-IN') : ''}
                          </span>
                          <span>₹{amount?.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => navigate(p.type === 'gst' ? `/purchases/${p.id}/edit-gst` : `/purchases/${p.id}/edit-simple`)}
                            className="text-indigo-600 hover:underline font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {dueSoonBills.length > 10 && (
                  <p className="text-xs text-amber-600 mt-2">+{dueSoonBills.length - 10} more</p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4">
                <h3 className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
                  <CalendarClock className="w-5 h-5 text-gray-500" />
                  Due for payment (0)
                </h3>
                <p className="text-sm text-gray-500 mb-2">
                  A bill appears here only when <strong>both</strong> are set: <strong>Due date</strong> and Payment status <strong>Pending</strong> or <strong>Partial</strong>.
                </p>
                {unpaidWithoutDueDate.length > 0 && (
                  <p className="text-sm text-amber-700 font-medium">
                    You have {unpaidWithoutDueDate.length} unpaid bill{unpaidWithoutDueDate.length !== 1 ? 's' : ''} with no due date. Edit each purchase and set <strong>Due date (optional)</strong> to see them here.
                  </p>
                )}
              </div>
            )}
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
                <span className="text-sm font-semibold text-gray-700">Product:</span>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="all">All Products</option>
                  {allPurchases.length > 0 && getUniqueProducts().map(product => (
                    <option key={product} value={product}>{product}</option>
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Group by Supplier:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupBySupplier}
                    onChange={(e) => setGroupBySupplier(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm text-gray-700">{groupBySupplier ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Filter by Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    if (e.target.value) {
                      setTimePeriod('all') // Clear time period when specific date is selected
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Date
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Filter by Period:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setTimePeriod('all')
                    setSelectedDate('') // Clear specific date when selecting time period
                  }}
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
                  onClick={() => setTimePeriod('yesterday')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'yesterday'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Yesterday
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
                  onClick={() => setTimePeriod('lastWeek')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'lastWeek'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Last Week
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
                  onClick={() => setTimePeriod('lastMonth')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === 'lastMonth'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Last Month
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

          {/* Column visibility + Results Count and Bulk Actions */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowColumnSettings(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                title="Choose which columns to show"
              >
                <Columns3 className="w-4 h-4" />
                Columns
              </button>
              {showColumnSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowColumnSettings(false)}>
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Show / Hide Columns</h3>
                    <p className="text-sm text-gray-500 mb-4">Select which columns to display in the purchase history grid.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {COLUMN_KEYS.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(key)}
                            onChange={() => toggleColumnVisibility(key)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-800">{label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVisibleColumns(new Set(COLUMN_KEYS.map(c => c.key)))
                          localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(COLUMN_KEYS.map(c => c.key)))
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS))
                          localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(DEFAULT_VISIBLE_COLUMNS))
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowColumnSettings(false)}
                        className="ml-auto px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {(searchQuery || selectedSupplier !== 'all' || selectedProduct !== 'all' || filterType !== 'all' || timePeriod !== 'all') && (
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  Showing <span className="font-bold">{purchases.length}</span> of <span className="font-bold">{allPurchases.length}</span> purchases
                  {searchQuery && <span> matching "{searchQuery}"</span>}
                  {selectedSupplier !== 'all' && <span> from {selectedSupplier}</span>}
                  {selectedProduct !== 'all' && <span> for {selectedProduct}</span>}
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
                  {searchQuery || selectedSupplier !== 'all' || selectedProduct !== 'all' || filterType !== 'all' || timePeriod !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first purchase'}
                </p>
                {(searchQuery || selectedSupplier !== 'all' || selectedProduct !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedSupplier('all')
                      setSelectedProduct('all')
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
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                {groupBySupplier ? (
                  // Grouped by supplier view
                  <div>
                    {Object.entries(groupedPurchases).map(([supplierName, supplierPurchases]) => (
                    <div key={supplierName} className="mb-8">
                      {/* Supplier Header - highlight when unknown supplier */}
                      <div className={`px-6 py-4 rounded-t-lg ${supplierName === 'Unknown Supplier' || supplierName === 'Unknown supplier'
                        ? 'bg-amber-500 text-amber-950 border-2 border-amber-600'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                              {supplierName}
                              {(supplierName === 'Unknown Supplier' || supplierName === 'Unknown supplier') && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-200/80 text-amber-900">No supplier set</span>
                              )}
                            </h3>
                            <p className={`text-sm ${supplierName === 'Unknown Supplier' || supplierName === 'Unknown supplier' ? 'text-amber-900/80' : 'text-blue-100'}`}>
                              {supplierPurchases.length} purchase{supplierPurchases.length !== 1 ? 's' : ''} •
                              Total: ₹{supplierPurchases.reduce((sum, p) =>
                                sum + (p.type === 'gst' ? (p as any).grand_total : (p as any).total_amount), 0
                              ).toFixed(2)}
                            </p>
                          </div>
                          <div className={`text-sm ${supplierName === 'Unknown Supplier' || supplierName === 'Unknown supplier' ? 'text-amber-900/80' : 'text-blue-100'}`}>
                            Latest: {new Date(supplierPurchases[0]?.purchase_date).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto overflow-y-auto max-h-[55vh] border border-t-0 border-gray-200 rounded-b-lg" style={{ scrollbarGutter: 'stable' }}>
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
                          <tr>
                            {hasPermission('purchases:delete') && (
                              <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-10">Select</th>
                            )}
                            {isColumnVisible('date') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>}
                            {isColumnVisible('purchase_id') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Purchase #</th>}
                            {isColumnVisible('type') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>}
                            {isColumnVisible('invoice') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice</th>}
                            {isColumnVisible('product_name') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>}
                            {isColumnVisible('article') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Article</th>}
                            {isColumnVisible('barcode') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Barcode</th>}
                            {isColumnVisible('qty') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>}
                            {isColumnVisible('remaining') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Remaining</th>}
                            {isColumnVisible('purchase_price') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Purchase</th>}
                            {isColumnVisible('sale_price') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sale</th>}
                            {isColumnVisible('mrp') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">MRP</th>}
                            {isColumnVisible('item_total') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item Total</th>}
                            {isColumnVisible('tax') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tax</th>}
                            {isColumnVisible('status') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>}
                            {isColumnVisible('last_modified') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Modified</th>}
                            <th className="px-2 sm:px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {supplierPurchases.flatMap((purchase) =>
                            (purchase.items || []).map((item, itemIdx) => (
                            <tr key={`${purchase.id}-${itemIdx}`} className={`hover:bg-gray-50 transition-colors ${selectedPurchaseIds.has(purchase.id) ? 'bg-blue-50' : ''}`}>
                              {hasPermission('purchases:delete') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                  {itemIdx === 0 ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedPurchaseIds.has(purchase.id)}
                                      onChange={(e) => handleSelectPurchase(purchase.id, e.target.checked)}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : null}
                                </td>
                              )}
                              {isColumnVisible('date') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {itemIdx === 0 ? new Date(purchase.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null}
                                </td>
                              )}
                              {isColumnVisible('purchase_id') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-700">
                                  {itemIdx === 0 ? `#${purchase.id}` : null}
                                </td>
                              )}
                              {isColumnVisible('type') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                  {itemIdx === 0 ? (
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${purchase.type === 'gst' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                                      {purchase.type === 'gst' ? 'GST' : 'Simple'}
                                    </span>
                                  ) : null}
                                </td>
                              )}
                              {isColumnVisible('invoice') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {itemIdx === 0 ? ((purchase as any).invoice_number || 'N/A') : null}
                                </td>
                              )}
                              {isColumnVisible('product_name') && (
                                <td className="px-2 sm:px-4 py-2 text-sm font-medium text-gray-900">
                                  {item.product_name || `Item ${itemIdx + 1}`}
                                  {getOtherSuppliersForProduct(item.product_name, getSupplierDisplayName(purchase)).length > 0 && (
                                    <div className="text-xs text-indigo-600 mt-0.5">Also from: {getOtherSuppliersForProduct(item.product_name, getSupplierDisplayName(purchase)).join(', ')}</div>
                                  )}
                                </td>
                              )}
                              {isColumnVisible('article') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-600">{item.article || '—'}</td>
                              )}
                              {isColumnVisible('barcode') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap font-mono text-sm text-gray-600">{item.barcode || '—'}</td>
                              )}
                              {isColumnVisible('qty') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-medium">{item.quantity ?? 0}</td>
                              )}
                              {isColumnVisible('remaining') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                  <span className={`font-semibold ${getRemainingQuantity(item) === 0 ? 'text-red-600' : getRemainingQuantity(item) < (item.quantity || 0) * 0.2 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {getRemainingQuantity(item)}/{(item.quantity ?? 0)}
                                  </span>
                                </td>
                              )}
                              {isColumnVisible('purchase_price') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap"><span className="inline-flex px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">₹{(item.unit_price ?? 0).toFixed(2)}</span></td>
                              )}
                              {isColumnVisible('sale_price') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap"><span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">₹{(item.sale_price ?? 0).toFixed(2)}</span></td>
                              )}
                              {isColumnVisible('mrp') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap"><span className="inline-flex px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-medium">₹{(item.mrp ?? 0).toFixed(2)}</span></td>
                              )}
                              {isColumnVisible('item_total') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-semibold">₹{(item.total ?? 0).toFixed(2)}</td>
                              )}
                              {isColumnVisible('tax') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-600">{(item.tax_amount != null && item.tax_amount > 0) ? `₹${(item.tax_amount ?? 0).toFixed(2)}` : '—'}</td>
                              )}
                              {isColumnVisible('status') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                                  {itemIdx === 0 ? (
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                      purchase.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                      purchase.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
                                    </span>
                                  ) : null}
                                </td>
                              )}
                              {isColumnVisible('last_modified') && (
                                <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                                  {itemIdx === 0 ? ((purchase as any).updated_at ? new Date((purchase as any).updated_at).toLocaleString('en-IN') : purchase.created_at ? new Date(purchase.created_at).toLocaleString('en-IN') : '—') : null}
                                </td>
                              )}
                              <td className="px-2 sm:px-4 py-2 text-right whitespace-nowrap">
                                {itemIdx === 0 ? (
                                  <div className="flex items-center justify-end gap-1">
                                    {hasPermission('purchases:update') && (
                                      <button onClick={() => navigate(purchase.type === 'gst' ? `/purchases/${purchase.id}/edit-gst` : `/purchases/${purchase.id}/edit-simple`)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Edit"><Edit className="w-4 h-4" /></button>
                                    )}
                                    {hasPermission('purchases:delete') && (
                                      <button onClick={async (e) => {
                                        e.stopPropagation()
                                        if (window.confirm('Delete this purchase?')) {
                                          try {
                                            await purchaseService.delete(purchase.id)
                                            toast.success('Purchase deleted')
                                            await loadPurchases()
                                          } catch (err) {
                                            toast.error('Failed to delete')
                                          }
                                        }
                                      }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                    )}
                                    <button onClick={() => navigate(purchase.type === 'gst' ? `/purchases/${purchase.id}/edit-gst` : `/purchases/${purchase.id}/edit-simple`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )))}
                        </tbody>
                        <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                          <tr>
                            <td colSpan={
                              (hasPermission('purchases:delete') ? 1 : 0) +
                              COLUMN_KEYS.filter(c => visibleColumns.has(c.key)).length + 1
                            } className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-semibold text-gray-800">
                                <span>{supplierPurchases.length} purchase{supplierPurchases.length !== 1 ? 's' : ''}</span>
                                <span>
                                  {(() => {
                                    const totQty = supplierPurchases.reduce((s, p) => s + p.items.reduce((a, i) => a + (i.quantity ?? 0), 0), 0)
                                    const totSold = supplierPurchases.reduce((s, p) => s + p.items.reduce((a, i) => a + getSoldQuantity(i), 0), 0)
                                    return `Qty: ${totQty - totSold} / ${totQty}`
                                  })()}
                                </span>
                                <span>
                                  {supplierPurchases.some(p => p.type === 'gst' && (p as any).total_tax > 0) && (
                                    <>Tax: ₹{supplierPurchases.reduce((sum, p) =>
                                      sum + ((p.type === 'gst' && (p as any).total_tax) ? (p as any).total_tax : 0), 0
                                    ).toFixed(2)} · </>
                                  )}
                                  <span className="text-indigo-700 font-bold">Total: ₹{supplierPurchases.reduce((sum, p) =>
                                    sum + (p.type === 'gst' ? (p as any).grand_total : (p as any).total_amount), 0
                                  ).toFixed(2)}</span>
                                </span>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  // Regular table view (not grouped) - item-level rows
                  <div className="overflow-x-auto overflow-y-auto max-h-[70vh]" style={{ scrollbarGutter: 'stable' }}>
                    <table className="w-full min-w-[900px]">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        {hasPermission('purchases:delete') && (
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-10">Select</th>
                        )}
                        {isColumnVisible('date') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>}
                        {isColumnVisible('purchase_id') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Purchase #</th>}
                        {isColumnVisible('type') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>}
                        {isColumnVisible('invoice') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice</th>}
                        {isColumnVisible('supplier') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>}
                        {isColumnVisible('product_name') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>}
                        {isColumnVisible('article') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Article</th>}
                        {isColumnVisible('barcode') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Barcode</th>}
                        {isColumnVisible('qty') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Qty</th>}
                        {isColumnVisible('remaining') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Remaining</th>}
                        {isColumnVisible('purchase_price') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Purchase</th>}
                        {isColumnVisible('sale_price') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sale</th>}
                        {isColumnVisible('mrp') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">MRP</th>}
                        {isColumnVisible('item_total') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Total</th>}
                        {isColumnVisible('tax') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tax</th>}
                        {isColumnVisible('status') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>}
                        {isColumnVisible('last_modified') && <th className="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Modified</th>}
                        <th className="px-2 sm:px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {purchases.flatMap((purchase) =>
                        (purchase.items || []).map((item, itemIdx) => (
                      <tr key={`${purchase.id}-${itemIdx}`} className={`hover:bg-gray-50 transition-colors ${selectedPurchaseIds.has(purchase.id) ? 'bg-blue-50' : ''}`}>
                        {hasPermission('purchases:delete') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                            {itemIdx === 0 ? (
                              <input
                                type="checkbox"
                                checked={selectedPurchaseIds.has(purchase.id)}
                                onChange={(e) => handleSelectPurchase(purchase.id, e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : null}
                          </td>
                        )}
                        {isColumnVisible('date') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {itemIdx === 0 ? new Date(purchase.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null}
                          </td>
                        )}
                        {isColumnVisible('purchase_id') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-700">
                            {itemIdx === 0 ? `#${purchase.id}` : null}
                          </td>
                        )}
                        {isColumnVisible('type') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                            {itemIdx === 0 ? (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${purchase.type === 'gst' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                                {purchase.type === 'gst' ? 'GST' : 'Simple'}
                              </span>
                            ) : null}
                          </td>
                        )}
                        {isColumnVisible('invoice') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {itemIdx === 0 ? ((purchase as any).invoice_number || 'N/A') : null}
                          </td>
                        )}
                        {isColumnVisible('supplier') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                            <div className={`text-sm ${isUnknownSupplier(purchase) ? 'font-semibold text-amber-800' : 'text-gray-900'}`}>
                              {itemIdx === 0 ? getSupplierDisplayName(purchase) : null}
                            </div>
                          </td>
                        )}
                        {isColumnVisible('product_name') && (
                          <td className="px-2 sm:px-4 py-2 text-sm font-medium text-gray-900">
                            {item.product_name || `Item ${itemIdx + 1}`}
                            {getOtherSuppliersForProduct(item.product_name, getSupplierDisplayName(purchase)).length > 0 && (
                              <div className="text-xs text-indigo-600 mt-0.5">Also from: {getOtherSuppliersForProduct(item.product_name, getSupplierDisplayName(purchase)).join(', ')}</div>
                            )}
                          </td>
                        )}
                        {isColumnVisible('article') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-600">{item.article || '—'}</td>
                        )}
                        {isColumnVisible('barcode') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap font-mono text-sm text-gray-600">{item.barcode || '—'}</td>
                        )}
                        {isColumnVisible('qty') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-medium">{item.quantity ?? 0}</td>
                        )}
                        {isColumnVisible('remaining') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                            <span className={`font-semibold ${getRemainingQuantity(item) === 0 ? 'text-red-600' : getRemainingQuantity(item) < (item.quantity || 0) * 0.2 ? 'text-orange-600' : 'text-green-600'}`}>
                              {getRemainingQuantity(item)}/{(item.quantity ?? 0)}
                            </span>
                          </td>
                        )}
                        {isColumnVisible('purchase_price') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap"><span className="inline-flex px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">₹{(item.unit_price ?? 0).toFixed(2)}</span></td>
                        )}
                        {isColumnVisible('sale_price') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap"><span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-xs font-medium">₹{(item.sale_price ?? 0).toFixed(2)}</span></td>
                        )}
                        {isColumnVisible('mrp') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap"><span className="inline-flex px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-medium">₹{(item.mrp ?? 0).toFixed(2)}</span></td>
                        )}
                        {isColumnVisible('item_total') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm font-semibold">₹{(item.total ?? 0).toFixed(2)}</td>
                        )}
                        {isColumnVisible('tax') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-gray-600">{(item.tax_amount != null && item.tax_amount > 0) ? `₹${(item.tax_amount ?? 0).toFixed(2)}` : '—'}</td>
                        )}
                        {isColumnVisible('status') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                            {itemIdx === 0 ? (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                purchase.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                purchase.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
                              </span>
                            ) : null}
                          </td>
                        )}
                        {isColumnVisible('last_modified') && (
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs text-gray-600">
                            {itemIdx === 0 ? ((purchase as any).updated_at ? new Date((purchase as any).updated_at).toLocaleString('en-IN') : purchase.created_at ? new Date(purchase.created_at).toLocaleString('en-IN') : '—') : null}
                          </td>
                        )}
                        <td className="px-2 sm:px-4 py-2 text-right whitespace-nowrap">
                          {itemIdx === 0 ? (
                            <div className="flex items-center justify-end gap-1">
                              {hasPermission('purchases:update') && (
                                <button onClick={() => navigate(purchase.type === 'gst' ? `/purchases/${purchase.id}/edit-gst` : `/purchases/${purchase.id}/edit-simple`)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Edit"><Edit className="w-4 h-4" /></button>
                              )}
                              {hasPermission('purchases:delete') && (
                                <button onClick={async (e) => {
                                  e.stopPropagation()
                                  if (window.confirm('Delete this purchase?')) {
                                    try {
                                      await purchaseService.delete(purchase.id)
                                      toast.success('Purchase deleted')
                                      await loadPurchases()
                                    } catch (err) {
                                      toast.error('Failed to delete')
                                    }
                                  }
                                }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                              )}
                              <button onClick={() => navigate(purchase.type === 'gst' ? `/purchases/${purchase.id}/edit-gst` : `/purchases/${purchase.id}/edit-simple`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                        ))
                      )}
                    </tbody>
                </table>
                  </div>
                )}
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

