import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { reportService } from '../services/reportService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  PurchasesBySupplierReport,
  PurchasesByProductReport,
  PurchasesByCategoryReport,
  ReportTimePeriod,
} from '../types/reports'
import { Home, Package, TrendingUp, Filter, FileSpreadsheet, FileText, Eye, ShoppingBag, Columns3, Building2, Search, X } from 'lucide-react'
import { exportToExcel as exportExcel, exportDataToPDF } from '../utils/exportUtils'
import { productService, categoryService, Product, Category } from '../services/productService'
import { purchaseService, supplierService } from '../services/purchaseService'
import type { Purchase, Supplier } from '../types/purchase'
import {
  PURCHASE_REPORT_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  getStorageKey,
  type PurchaseReportView,
} from '../utils/purchaseReportColumns'

type ReportView = PurchaseReportView

const PurchaseReports = () => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<ReportView>('supplier')
  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  const [filterSupplierId, setFilterSupplierId] = useState<number | ''>('')
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false)
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('')
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [filterCategoryName, setFilterCategoryName] = useState<string>('')
  const [filterProductId, setFilterProductId] = useState<number | ''>('')

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [supplierReports, setSupplierReports] = useState<PurchasesBySupplierReport[]>([])
  const [productReports, setProductReports] = useState<PurchasesByProductReport[]>([])
  const [categoryReports, setCategoryReports] = useState<PurchasesByCategoryReport[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<ReportView, Set<string>>>(() => {
    const init: Record<ReportView, Set<string>> = {} as Record<ReportView, Set<string>>
    ;(['supplier', 'product', 'category', 'purchases'] as ReportView[]).forEach(view => {
      try {
        const stored = localStorage.getItem(getStorageKey(view))
        init[view] = stored ? new Set(JSON.parse(stored) as string[]) : new Set(DEFAULT_VISIBLE_COLUMNS[view])
      } catch (_) {
        init[view] = new Set(DEFAULT_VISIBLE_COLUMNS[view])
      }
    })
    return init
  })
  const toggleColumnVisibility = (view: ReportView, key: string) => {
    setVisibleColumns(prev => {
      const next = { ...prev }
      const set = new Set(next[view])
      if (set.has(key)) set.delete(key)
      else set.add(key)
      next[view] = set
      localStorage.setItem(getStorageKey(view), JSON.stringify([...set]))
      return next
    })
  }
  const isColumnVisible = (view: ReportView, key: string) => visibleColumns[view]?.has(key) ?? true

  useEffect(() => {
    const companyId = getCurrentCompanyId()
    const load = async () => {
      try {
        const [prods, cats, sups] = await Promise.all([
          productService.getAll(true, companyId),
          categoryService.getAll(),
          supplierService.getAll(companyId),
        ])
        setProducts(prods)
        setCategories(cats)
        setSuppliers(sups)
      } catch (e) {
        console.error('Error loading filter options:', e)
      }
    }
    load()
  }, [getCurrentCompanyId])

  useEffect(() => {
    loadReports()
  }, [timePeriod, customStartDate, customEndDate, activeView])

  useEffect(() => {
    const loadPurchases = async () => {
      const { startDate, endDate } = reportService.getDateRange(timePeriod, customStartDate, customEndDate)
      const companyId = getCurrentCompanyId()
      try {
        const all = await purchaseService.getAll(undefined, companyId)
        let filtered = all
        if (startDate || endDate) {
          filtered = reportService.filterPurchasesByDate(all, startDate, endDate)
        }
        setPurchases(filtered)
      } catch (error) {
        console.error('Error loading purchases:', error)
      }
    }
    loadPurchases()
  }, [timePeriod, customStartDate, customEndDate])

  const loadReports = async () => {
    setLoading(true)
    const { startDate, endDate } = reportService.getDateRange(timePeriod, customStartDate, customEndDate)
    const companyId = getCurrentCompanyId()
    try {
      switch (activeView) {
        case 'supplier':
          const sReports = await reportService.getPurchasesBySupplier(startDate, endDate, companyId)
          setSupplierReports(sReports)
          break
        case 'product':
          const pReports = await reportService.getPurchasesByProduct(startDate, endDate, companyId)
          setProductReports(pReports)
          break
        case 'category':
          const cReports = await reportService.getPurchasesByCategory(startDate, endDate, companyId)
          setCategoryReports(cReports)
          break
        case 'purchases':
          const all = await purchaseService.getAll(undefined, companyId)
          const filtered = reportService.filterPurchasesByDate(all, startDate, endDate)
          setPurchases(filtered)
          break
      }
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedSupplier = useMemo(() => suppliers.find(s => s.id === filterSupplierId), [suppliers, filterSupplierId])

  const suppliersFilteredForDropdown = useMemo(() => {
    const q = supplierSearchQuery.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(s => {
      const name = (s.name || '').toLowerCase()
      const phone = (s.phone || '').replace(/\D/g, '')
      const qClean = q.replace(/\D/g, '')
      return name.includes(q) || (qClean && phone.includes(qClean))
    })
  }, [suppliers, supplierSearchQuery])

  const filteredSupplierReports = useMemo(() => {
    let f = supplierReports
    if (filterSupplierId !== '') {
      f = f.filter(r => r.supplier_id === filterSupplierId)
    }
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.trim().toLowerCase()
      f = f.filter(r => r.supplier_name.toLowerCase().includes(q))
    }
    return f
  }, [supplierReports, filterSupplierId, globalSearchQuery])

  const filteredProductReports = useMemo(() => {
    let f = productReports
    if (filterProductId !== '') f = f.filter(r => r.product_id === filterProductId)
    if (filterCategoryName !== '') f = f.filter(r => r.category_name === filterCategoryName)
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.trim().toLowerCase()
      f = f.filter(r =>
        r.product_name.toLowerCase().includes(q) ||
        r.category_name.toLowerCase().includes(q) ||
        r.supplier_names.some(sn => sn.toLowerCase().includes(q))
      )
    }
    return f
  }, [productReports, filterProductId, filterCategoryName, globalSearchQuery])

  const filteredCategoryReports = useMemo(() => {
    let f = categoryReports
    if (filterCategoryName !== '') f = f.filter(r => r.category_name === filterCategoryName)
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.trim().toLowerCase()
      f = f.filter(r => r.category_name.toLowerCase().includes(q))
    }
    return f
  }, [categoryReports, filterCategoryName, globalSearchQuery])

  const filteredPurchases = useMemo(() => {
    let f = purchases
    if (filterSupplierId !== '') {
      f = f.filter(p => (p.type === 'gst' ? (p as any).supplier_id === filterSupplierId : (p as any).supplier_id === filterSupplierId))
    }
    if (filterCategoryName !== '') {
      f = f.filter(p => p.items.some(i => {
        const prod = products.find(pr => pr.id === i.product_id)
        return (prod?.category_name || 'Uncategorized') === filterCategoryName
      }))
    }
    if (filterProductId !== '') {
      f = f.filter(p => p.items.some(i => i.product_id === filterProductId))
    }
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.trim().toLowerCase()
      f = f.filter(p => {
        const inv = ((p as any).invoice_number || `PUR-${p.id}`).toLowerCase()
        const supName = ((p as any).supplier_name || '').toLowerCase()
        const productMatch = p.items.some((i: any) => (i.product_name || '').toLowerCase().includes(q))
        const categoryMatch = p.items.some((i: any) => {
          const prod = products.find(pr => pr.id === i.product_id)
          return (prod?.category_name || 'Uncategorized').toLowerCase().includes(q)
        })
        return inv.includes(q) || supName.includes(q) || productMatch || categoryMatch
      })
    }
    return f
  }, [purchases, filterSupplierId, filterCategoryName, filterProductId, products, globalSearchQuery])

  const getPurchaseTotal = (p: Purchase) => p.type === 'gst' ? (p as any).grand_total : (p as any).total_amount
  const getPurchaseSubtotal = (p: Purchase) => p.type === 'gst' ? (p as any).subtotal : (p as any).total_amount
  const getPurchaseTax = (p: Purchase) => p.type === 'gst' ? (p as any).total_tax : 0

  const exportToExcel = () => {
    const headers: string[] = []
    const rows: any[][] = []
    let sheetName = 'Purchase Report'
    switch (activeView) {
      case 'supplier':
        headers.push('Supplier', 'Quantity', 'Amount', 'Purchases', 'Pending', 'Avg Order')
        filteredSupplierReports.forEach(r => {
          rows.push([r.supplier_name, r.total_quantity, parseFloat(r.total_amount.toFixed(2)), r.purchase_count, parseFloat(r.pending_amount.toFixed(2)), parseFloat(r.average_order_value.toFixed(2))])
        })
        sheetName = 'Purchases by Supplier'
        break
      case 'product':
        headers.push('Product', 'Category', 'Quantity', 'Amount', 'Avg Price', 'Purchases', 'Suppliers')
        filteredProductReports.forEach(r => {
          rows.push([r.product_name, r.category_name, r.total_quantity, parseFloat(r.total_amount.toFixed(2)), parseFloat(r.average_unit_price.toFixed(2)), r.purchase_count, r.supplier_names.join(', ')])
        })
        sheetName = 'Purchases by Product'
        break
      case 'category':
        headers.push('Category', 'Quantity', 'Amount', 'Products', 'Purchases')
        filteredCategoryReports.forEach(r => {
          rows.push([r.category_name, r.total_quantity, parseFloat(r.total_amount.toFixed(2)), r.product_count, r.purchase_count])
        })
        sheetName = 'Purchases by Category'
        break
      case 'purchases':
        headers.push('Date', 'Invoice', 'Supplier', 'Items', 'Amount', 'Payment')
        filteredPurchases.forEach(p => {
          rows.push([
            new Date(p.purchase_date).toLocaleDateString('en-IN'),
            (p as any).invoice_number || `PUR-${p.id}`,
            (p as any).supplier_name || '—',
            p.items.length,
            parseFloat(getPurchaseTotal(p).toFixed(2)),
            p.payment_status,
          ])
        })
        sheetName = 'All Purchases'
        break
    }
    const filename = `purchase_report_${activeView}_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    exportExcel(rows, headers, filename, sheetName)
    toast.success('Report exported to Excel')
  }

  const exportToPDF = () => {
    const headers: string[] = []
    const rows: any[][] = []
    let title = 'Purchase Report'
    switch (activeView) {
      case 'supplier':
        headers.push('Supplier', 'Quantity', 'Amount', 'Pending')
        filteredSupplierReports.forEach(r => {
          rows.push([r.supplier_name, r.total_quantity, `₹${r.total_amount.toFixed(2)}`, `₹${r.pending_amount.toFixed(2)}`])
        })
        title = 'Purchase Report - By Supplier'
        break
      case 'product':
        headers.push('Product', 'Category', 'Quantity', 'Amount')
        filteredProductReports.forEach(r => {
          rows.push([r.product_name, r.category_name, r.total_quantity, `₹${r.total_amount.toFixed(2)}`])
        })
        title = 'Purchase Report - By Product'
        break
      case 'category':
        headers.push('Category', 'Quantity', 'Amount')
        filteredCategoryReports.forEach(r => {
          rows.push([r.category_name, r.total_quantity, `₹${r.total_amount.toFixed(2)}`])
        })
        title = 'Purchase Report - By Category'
        break
      case 'purchases':
        headers.push('Date', 'Invoice', 'Supplier', 'Amount', 'Payment')
        filteredPurchases.forEach(p => {
          rows.push([
            new Date(p.purchase_date).toLocaleDateString('en-IN'),
            (p as any).invoice_number || `PUR-${p.id}`,
            (p as any).supplier_name || '—',
            `₹${getPurchaseTotal(p).toFixed(2)}`,
            p.payment_status,
          ])
        })
        title = 'Purchase Report - All Purchases'
        break
    }
    const period = timePeriod === 'all' ? 'All Time' : timePeriod
    const fullTitle = `${title} (${period})`
    const filename = `purchase_report_${activeView}_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    exportDataToPDF(rows, headers, filename, fullTitle)
    toast.success('Report exported to PDF')
  }

  const renderSupplierReport = () => (
    <div className="overflow-x-auto overflow-y-auto max-h-[55vh] border border-gray-200 rounded-lg" style={{ scrollbarGutter: 'stable' }}>
      <table className="w-full min-w-[700px]">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            {isColumnVisible('supplier', 'supplier_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>}
            {isColumnVisible('supplier', 'total_quantity') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>}
            {isColumnVisible('supplier', 'total_amount') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>}
            {isColumnVisible('supplier', 'purchase_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Purchases</th>}
            {isColumnVisible('supplier', 'pending_amount') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Pending</th>}
            {isColumnVisible('supplier', 'average_order_value') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Avg Order</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredSupplierReports.map((r, i) => (
            <tr key={r.supplier_name + (r.supplier_id ?? '') + i} className="hover:bg-gray-50 transition-colors">
              {isColumnVisible('supplier', 'supplier_name') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.supplier_name}</td>}
              {isColumnVisible('supplier', 'total_quantity') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{r.total_quantity}</td>}
              {isColumnVisible('supplier', 'total_amount') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-blue-600">₹{r.total_amount.toFixed(2)}</td>}
              {isColumnVisible('supplier', 'purchase_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{r.purchase_count}</td>}
              {isColumnVisible('supplier', 'pending_amount') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm"><span className={r.pending_amount > 0 ? 'text-amber-600 font-semibold' : 'text-gray-600'}>₹{r.pending_amount.toFixed(2)}</span></td>}
              {isColumnVisible('supplier', 'average_order_value') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{r.average_order_value.toFixed(2)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderProductReport = () => (
    <div className="overflow-x-auto overflow-y-auto max-h-[55vh] border border-gray-200 rounded-lg" style={{ scrollbarGutter: 'stable' }}>
      <table className="w-full min-w-[700px]">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            {isColumnVisible('product', 'product_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>}
            {isColumnVisible('product', 'category_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>}
            {isColumnVisible('product', 'total_quantity') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>}
            {isColumnVisible('product', 'total_amount') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>}
            {isColumnVisible('product', 'average_unit_price') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Avg Price</th>}
            {isColumnVisible('product', 'purchase_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Purchases</th>}
            {isColumnVisible('product', 'supplier_names') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Suppliers</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredProductReports.map((r) => (
            <tr key={r.product_id} className="hover:bg-gray-50 transition-colors">
              {isColumnVisible('product', 'product_name') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.product_name}</td>}
              {isColumnVisible('product', 'category_name') && <td className="px-4 py-3 text-sm text-gray-600">{r.category_name}</td>}
              {isColumnVisible('product', 'total_quantity') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{r.total_quantity}</td>}
              {isColumnVisible('product', 'total_amount') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-blue-600">₹{r.total_amount.toFixed(2)}</td>}
              {isColumnVisible('product', 'average_unit_price') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{r.average_unit_price.toFixed(2)}</td>}
              {isColumnVisible('product', 'purchase_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{r.purchase_count}</td>}
              {isColumnVisible('product', 'supplier_names') && <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={r.supplier_names.join(', ')}>{r.supplier_names.join(', ')}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderCategoryReport = () => (
    <div className="overflow-x-auto overflow-y-auto max-h-[55vh] border border-gray-200 rounded-lg" style={{ scrollbarGutter: 'stable' }}>
      <table className="w-full min-w-[700px]">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            {isColumnVisible('category', 'category_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>}
            {isColumnVisible('category', 'total_quantity') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>}
            {isColumnVisible('category', 'total_amount') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>}
            {isColumnVisible('category', 'product_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Products</th>}
            {isColumnVisible('category', 'purchase_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Purchases</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredCategoryReports.map((r) => (
            <tr key={r.category_name} className="hover:bg-gray-50 transition-colors">
              {isColumnVisible('category', 'category_name') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.category_name}</td>}
              {isColumnVisible('category', 'total_quantity') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{r.total_quantity}</td>}
              {isColumnVisible('category', 'total_amount') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-blue-600">₹{r.total_amount.toFixed(2)}</td>}
              {isColumnVisible('category', 'product_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{r.product_count}</td>}
              {isColumnVisible('category', 'purchase_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{r.purchase_count}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const purchasesGroupedByDate = useMemo(() => {
    const groups: Record<string, Purchase[]> = {}
    filteredPurchases.forEach(p => {
      const dateKey = p.purchase_date.split('T')[0]
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(p)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredPurchases])

  const renderPurchasesList = () => (
    <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-gray-200 rounded-lg" style={{ scrollbarGutter: 'stable' }}>
      {purchasesGroupedByDate.map(([dateStr, datePurchases]) => (
        <div key={dateStr} className="mb-6">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3 rounded-t-lg sticky top-0 z-10">
            <span className="font-bold">{new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="ml-2 text-amber-100">({datePurchases.length} purchase{datePurchases.length !== 1 ? 's' : ''})</span>
          </div>
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                {isColumnVisible('purchases', 'purchase_date') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Time</th>}
                {isColumnVisible('purchases', 'invoice_number') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice</th>}
                {isColumnVisible('purchases', 'supplier_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>}
                {isColumnVisible('purchases', 'items_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Items</th>}
                {isColumnVisible('purchases', 'subtotal') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Subtotal</th>}
                {isColumnVisible('purchases', 'tax_amount') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Tax</th>}
                {isColumnVisible('purchases', 'grand_total') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>}
                {isColumnVisible('purchases', 'payment_status') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>}
                {isColumnVisible('purchases', 'notes') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {datePurchases.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  {isColumnVisible('purchases', 'purchase_date') && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{new Date(p.purchase_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>}
                  {isColumnVisible('purchases', 'invoice_number') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{(p as any).invoice_number || `PUR-${p.id}`}</td>}
                  {isColumnVisible('purchases', 'supplier_name') && <td className="px-4 py-3 text-sm text-gray-900">{(p as any).supplier_name || '—'}</td>}
                  {isColumnVisible('purchases', 'items_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{p.items.length} item{p.items.length !== 1 ? 's' : ''}</td>}
                  {isColumnVisible('purchases', 'subtotal') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{getPurchaseSubtotal(p).toFixed(2)}</td>}
                  {isColumnVisible('purchases', 'tax_amount') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{getPurchaseTax(p).toFixed(2)}</td>}
                  {isColumnVisible('purchases', 'grand_total') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-gray-900">₹{getPurchaseTotal(p).toFixed(2)}</td>}
                  {isColumnVisible('purchases', 'payment_status') && <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : p.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-amber-100 text-amber-700'}`}>{p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1)}</span>
                  </td>}
                  {isColumnVisible('purchases', 'notes') && <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate" title={(p as any).notes}>{(p as any).notes || '—'}</td>}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => navigate(p.type === 'gst' ? `/purchases/${p.id}/edit-gst` : `/purchases/${p.id}/edit-simple`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )

  const getCurrentReport = () => {
    switch (activeView) {
      case 'supplier': return filteredSupplierReports
      case 'product': return filteredProductReports
      case 'category': return filteredCategoryReports
      case 'purchases': return filteredPurchases
    }
  }
  const currentReport = getCurrentReport()

  return (
    <ProtectedRoute requiredPermission="reports:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Back to Dashboard">
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Purchase Reports</h1>
                  <p className="text-sm text-gray-600 mt-1">Purchase analysis by supplier, product, category, and date-wise list</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" title="Export to Excel">
                  <FileSpreadsheet className="w-5 h-5" />
                  Excel
                </button>
                <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors" title="Export to PDF">
                  <FileText className="w-5 h-5" />
                  PDF
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-wrap items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Time Period:</span>
              <div className="flex flex-wrap gap-2">
                {(['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'all'] as ReportTimePeriod[]).map(period => (
                  <button key={period} onClick={() => setTimePeriod(period)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timePeriod === period ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>
                    {period === 'thisWeek' ? 'This Week' : period === 'lastWeek' ? 'Last Week' : period === 'thisMonth' ? 'This Month' : period === 'lastMonth' ? 'Last Month' : period === 'thisYear' ? 'This Year' : period === 'lastYear' ? 'Last Year' : period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
                <button onClick={() => setTimePeriod('custom')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timePeriod === 'custom' ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>Custom Range</button>
              </div>
            </div>
            {timePeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* Search / Filter - same pattern as Sales Report with global search */}
          <div className={`bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50 ${supplierDropdownOpen ? 'relative z-[100]' : ''}`}>
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <Search className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Filter report:</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Global search</label>
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    placeholder="Search by supplier, product, category, invoice..."
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none w-full"
                  />
                  {globalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGlobalSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 relative">
                <label className="text-xs font-medium text-gray-500">By Supplier (name or mobile)</label>
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={supplierDropdownOpen ? supplierSearchQuery : (selectedSupplier ? `${selectedSupplier.name}${selectedSupplier.phone ? ` • ${selectedSupplier.phone}` : ''}` : '')}
                    onChange={(e) => {
                      setSupplierSearchQuery(e.target.value)
                      if (!supplierDropdownOpen) setSupplierDropdownOpen(true)
                    }}
                    onFocus={() => setSupplierDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setSupplierDropdownOpen(false), 180)}
                    placeholder={filterSupplierId ? '' : 'All suppliers – search by name or mobile...'}
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none w-full"
                  />
                  {filterSupplierId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setFilterSupplierId('')
                        setSupplierSearchQuery('')
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Clear supplier filter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {supplierDropdownOpen && (
                    <div className="absolute z-[110] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-auto">
                      <ul className="py-1">
                        <li>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-600"
                            onClick={() => {
                              setFilterSupplierId('')
                              setSupplierSearchQuery('')
                              setSupplierDropdownOpen(false)
                            }}
                          >
                            All suppliers
                          </button>
                        </li>
                        {suppliersFilteredForDropdown.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-500">No suppliers match</li>
                        ) : (
                          suppliersFilteredForDropdown.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${filterSupplierId === s.id ? 'bg-amber-50 text-amber-700 font-medium' : ''}`}
                                onClick={() => {
                                  setFilterSupplierId(s.id)
                                  setSupplierSearchQuery('')
                                  setSupplierDropdownOpen(false)
                                }}
                              >
                                {s.name}
                                {s.phone ? <span className="text-gray-500 ml-1">• {s.phone}</span> : ''}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">By Category</label>
                <select value={filterCategoryName} onChange={(e) => setFilterCategoryName(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none min-w-[160px]">
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">By Product</label>
                <select value={filterProductId === '' ? '' : filterProductId} onChange={(e) => setFilterProductId(e.target.value === '' ? '' : Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none min-w-[180px]">
                  <option value="">All products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {(filterSupplierId !== '' || filterCategoryName !== '' || filterProductId !== '' || globalSearchQuery !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSupplierId('')
                    setFilterCategoryName('')
                    setFilterProductId('')
                    setSupplierSearchQuery('')
                    setGlobalSearchQuery('')
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mt-6"
                  title="Clear all filters"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 mb-6 pb-4">
              <div className="flex gap-4">
                <button onClick={() => setActiveView('supplier')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'supplier' ? 'text-amber-600' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Building2 className="w-4 h-4" />
                  By Supplier ({filteredSupplierReports.length})
                  {activeView === 'supplier' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></span>}
                </button>
                <button onClick={() => setActiveView('product')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'product' ? 'text-amber-600' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Package className="w-4 h-4" />
                  By Product ({filteredProductReports.length})
                  {activeView === 'product' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></span>}
                </button>
                <button onClick={() => setActiveView('category')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'category' ? 'text-amber-600' : 'text-gray-600 hover:text-gray-900'}`}>
                  <TrendingUp className="w-4 h-4" />
                  By Category ({filteredCategoryReports.length})
                  {activeView === 'category' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></span>}
                </button>
                <button onClick={() => setActiveView('purchases')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'purchases' ? 'text-amber-600' : 'text-gray-600 hover:text-gray-900'}`}>
                  <ShoppingBag className="w-4 h-4" />
                  All Purchases ({filteredPurchases.length})
                  {activeView === 'purchases' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></span>}
                </button>
              </div>
              <button type="button" onClick={() => setShowColumnSettings(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700" title="Show / Hide columns">
                <Columns3 className="w-4 h-4" />
                Columns
              </button>
            </div>

            {showColumnSettings && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowColumnSettings(false)}>
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Show / Hide Columns</h3>
                  <p className="text-sm text-gray-500 mb-2">View: <span className="font-semibold">{activeView === 'supplier' ? 'By Supplier' : activeView === 'product' ? 'By Product' : activeView === 'category' ? 'By Category' : 'All Purchases'}</span></p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {PURCHASE_REPORT_COLUMNS[activeView].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input type="checkbox" checked={visibleColumns[activeView]?.has(key) ?? true} onChange={() => toggleColumnVisibility(activeView, key)} className="w-4 h-4 text-amber-600 rounded border-gray-300" />
                        <span className="text-sm text-gray-800">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { const all = new Set(PURCHASE_REPORT_COLUMNS[activeView].map(c => c.key)); setVisibleColumns(prev => ({ ...prev, [activeView]: all })); localStorage.setItem(getStorageKey(activeView), JSON.stringify([...all])) }} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">Select All</button>
                    <button type="button" onClick={() => { const def = new Set(DEFAULT_VISIBLE_COLUMNS[activeView]); setVisibleColumns(prev => ({ ...prev, [activeView]: def })); localStorage.setItem(getStorageKey(activeView), JSON.stringify([...def])) }} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">Reset</button>
                    <button type="button" onClick={() => setShowColumnSettings(false)} className="ml-auto px-4 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">Done</button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report data...</p>
              </div>
            ) : currentReport.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No data found</h3>
                <p className="text-gray-600">No purchase data available for the selected period</p>
              </div>
            ) : (
              <>
                {activeView === 'supplier' && renderSupplierReport()}
                {activeView === 'product' && renderProductReport()}
                {activeView === 'category' && renderCategoryReport()}
                {activeView === 'purchases' && renderPurchasesList()}
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default PurchaseReports
