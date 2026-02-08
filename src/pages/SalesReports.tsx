import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { reportService } from '../services/reportService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  SalesByProductReport,
  SalesByCategoryReport,
  SalesByCustomerReport,
  SalesBySalesPersonReport,
  ReportTimePeriod,
} from '../types/reports'
import { Home, TrendingUp, Package, Users, UserCheck, Filter, FileSpreadsheet, FileText, Eye, ShoppingCart, Search, X, Columns3 } from 'lucide-react'
import { saleService } from '../services/saleService'
import { Sale } from '../types/sale'
import { exportToExcel as exportExcel, exportDataToPDF } from '../utils/exportUtils'
import { productService, Product } from '../services/productService'
import { categoryService } from '../services/productService'
import { customerService } from '../services/customerService'
import { salesPersonService } from '../services/salespersonService'
import type { Category } from '../services/productService'
import type { Customer } from '../types/customer'
import type { SalesPerson } from '../types/salesperson'
import {
  SALES_REPORT_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  getStorageKey,
  type SalesReportView,
} from '../utils/salesReportColumns'

type ReportView = SalesReportView

/** Format time for display: use created_at (actual record time) when available, else date-only as 12:00 AM */
function formatRecordTime(dateStr: string, createdAt?: string | null): string {
  if (createdAt) {
    const d = new Date(createdAt)
    if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
  const d = !dateStr ? new Date() : dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00')
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const SalesReports = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<ReportView>('product')
  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  // Search / filter state
  const [filterProductId, setFilterProductId] = useState<number | ''>('')
  const [filterCategoryName, setFilterCategoryName] = useState<string>('')
  const [filterCustomerId, setFilterCustomerId] = useState<number | ''>('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [filterSalesPersonId, setFilterSalesPersonId] = useState<number | ''>('')

  // Options for filter dropdowns
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])

  const [productReports, setProductReports] = useState<SalesByProductReport[]>([])
  const [categoryReports, setCategoryReports] = useState<SalesByCategoryReport[]>([])
  const [customerReports, setCustomerReports] = useState<SalesByCustomerReport[]>([])
  const [salesPersonReports, setSalesPersonReports] = useState<SalesBySalesPersonReport[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<ReportView, Set<string>>>(() => {
    const init: Record<ReportView, Set<string>> = {} as Record<ReportView, Set<string>>
    ;(['product', 'category', 'customer', 'salesperson', 'sales'] as ReportView[]).forEach(view => {
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

  // Load filter options (products, categories, customers, sales persons)
  useEffect(() => {
    const companyId = getCurrentCompanyId()
    const load = async () => {
      try {
        const [prods, cats, custs, persons] = await Promise.all([
          productService.getAll(true, companyId),
          categoryService.getAll(),
          customerService.getAll(true, companyId),
          salesPersonService.getAll(true),
        ])
        setProducts(prods)
        setCategories(cats)
        setCustomers(custs)
        setSalesPersons(persons)
      } catch (e) {
        console.error('Error loading filter options:', e)
      }
    }
    load()
  }, [getCurrentCompanyId])

  useEffect(() => {
    loadReports()
  }, [timePeriod, customStartDate, customEndDate, activeView])

  // Load sales data on mount and when filters change (even if not on sales tab)
  useEffect(() => {
    const loadSalesData = async () => {
      const { startDate, endDate } = reportService.getDateRange(timePeriod, customStartDate, customEndDate)
      const companyId = getCurrentCompanyId()
      try {
        const allSales = await saleService.getAll(true, companyId)
        // Filter by date range
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
        setSales(filteredSales)
      } catch (error) {
        console.error('Error loading sales:', error)
      }
    }
    loadSalesData()
  }, [timePeriod, customStartDate, customEndDate])

  const loadReports = async () => {
    setLoading(true)
    const { startDate, endDate } = reportService.getDateRange(timePeriod, customStartDate, customEndDate)
    const companyId = getCurrentCompanyId()
    // Pass companyId directly - services will handle null by returning empty array for data isolation
    // undefined means admin hasn't selected a company (show all), null means user has no company (show nothing)

    try {
      switch (activeView) {
        case 'product':
          const productReports = await reportService.getSalesByProduct(startDate, endDate, companyId)
          setProductReports(productReports)
          break
        case 'category':
          const categoryReports = await reportService.getSalesByCategory(startDate, endDate, companyId)
          setCategoryReports(categoryReports)
          break
        case 'customer':
          const customerReports = await reportService.getSalesByCustomer(startDate, endDate, companyId)
          setCustomerReports(customerReports)
          break
        case 'salesperson':
          const salesPersonReports = await reportService.getSalesBySalesPerson(startDate, endDate, companyId)
          setSalesPersonReports(salesPersonReports)
          break
        case 'sales':
          const allSales = await saleService.getAll(true, companyId)
          // Filter by date range
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
          setSales(filteredSales)
          break
      }
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  // Selected customer for display
  const selectedCustomer = useMemo(
    () => (filterCustomerId ? customers.find(c => c.id === filterCustomerId) : null),
    [customers, filterCustomerId]
  )

  // Filtered customer list for dropdown (search by name or mobile)
  const customersFilteredForDropdown = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers
    const q = customerSearchQuery.trim().toLowerCase()
    return customers.filter(
      c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(customerSearchQuery.trim()))
    )
  }, [customers, customerSearchQuery])

  // Apply filters to report data and sales list
  const {
    filteredProductReports,
    filteredCategoryReports,
    filteredCustomerReports,
    filteredSalesPersonReports,
    filteredSales,
  } = useMemo(() => {
    let fProduct = productReports
    let fCategory = categoryReports
    let fCustomer = customerReports
    let fSalesPerson = salesPersonReports
    let fSales = sales

    if (filterProductId !== '') {
      fProduct = productReports.filter(r => r.product_id === filterProductId)
      const product = products.find(p => p.id === filterProductId)
      const catName = product?.category_name || 'Uncategorized'
      if (filterCategoryName === '' || catName === filterCategoryName) {
        fCategory = categoryReports.filter(r => r.category_name === catName)
      }
      fSales = fSales.filter(s =>
        s.items.some(item => item.product_id === filterProductId)
      )
    }

    if (filterCategoryName !== '') {
      fCategory = fCategory.filter(r => r.category_name === filterCategoryName)
      if (filterProductId === '') {
        const productIdsInCategory = new Set(
          products
            .filter(p => (p.category_name || 'Uncategorized') === filterCategoryName)
            .map(p => p.id)
        )
        fProduct = productReports.filter(r => productIdsInCategory.has(r.product_id))
        fSales = fSales.filter(s =>
          s.items.some(item => productIdsInCategory.has(item.product_id))
        )
      }
    }

    if (filterCustomerId !== '') {
      fCustomer = customerReports.filter(r => r.customer_id === filterCustomerId)
      fSales = fSales.filter(s => s.customer_id === filterCustomerId)
    }

    if (filterSalesPersonId !== '') {
      fSalesPerson = salesPersonReports.filter(
        r => r.sales_person_id === filterSalesPersonId
      )
      fSales = fSales.filter(s => s.sales_person_id === filterSalesPersonId)
    }

    // Global search across all views
    const q = globalSearchQuery.trim().toLowerCase()
    if (q) {
      fProduct = fProduct.filter(
        r =>
          r.product_name.toLowerCase().includes(q) ||
          (products.find(p => p.id === r.product_id)?.category_name || 'Uncategorized').toLowerCase().includes(q)
      )
      fCategory = fCategory.filter(r => r.category_name.toLowerCase().includes(q))
      fCustomer = fCustomer.filter(r => r.customer_name.toLowerCase().includes(q))
      fSalesPerson = fSalesPerson.filter(r => r.sales_person_name.toLowerCase().includes(q))
      fSales = fSales.filter(s => {
        const invMatch = (s.invoice_number || '').toLowerCase().includes(q)
        const custMatch = (s.customer_name || '').toLowerCase().includes(q)
        const cust = s.customer_id ? customers.find(c => c.id === s.customer_id) : null
        const phoneMatch = cust?.phone ? cust.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) : false
        const salesPersonMatch = (s.sales_person_name || '').toLowerCase().includes(q)
        const productMatch = s.items.some(it => (it.product_name || '').toLowerCase().includes(q))
        return invMatch || custMatch || phoneMatch || salesPersonMatch || productMatch
      })
    }

    return {
      filteredProductReports: fProduct,
      filteredCategoryReports: fCategory,
      filteredCustomerReports: fCustomer,
      filteredSalesPersonReports: fSalesPerson,
      filteredSales: fSales,
    }
  }, [
    productReports,
    categoryReports,
    customerReports,
    salesPersonReports,
    sales,
    products,
    customers,
    filterProductId,
    filterCategoryName,
    filterCustomerId,
    filterSalesPersonId,
    globalSearchQuery,
  ])

  const exportToExcel = () => {
    const headers: string[] = []
    const rows: any[][] = []
    let sheetName = 'Sales Report'

    switch (activeView) {
      case 'product':
        headers.push('Product', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Avg Price', 'Sales Count')
        filteredProductReports.forEach(r => {
          rows.push([
            r.product_name,
            r.total_quantity,
            parseFloat(r.total_revenue.toFixed(2)),
            parseFloat(r.total_cost.toFixed(2)),
            parseFloat(r.total_profit.toFixed(2)),
            parseFloat(r.profit_margin.toFixed(2)),
            parseFloat(r.average_price.toFixed(2)),
            r.sale_count,
          ])
        })
        sheetName = 'Sales by Product'
        break
      case 'category':
        headers.push('Category', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Products', 'Sales Count')
        filteredCategoryReports.forEach(r => {
          rows.push([
            r.category_name,
            r.total_quantity,
            parseFloat(r.total_revenue.toFixed(2)),
            parseFloat(r.total_cost.toFixed(2)),
            parseFloat(r.total_profit.toFixed(2)),
            parseFloat(r.profit_margin.toFixed(2)),
            r.product_count,
            r.sale_count,
          ])
        })
        sheetName = 'Sales by Category'
        break
      case 'customer':
        headers.push('Customer', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Orders', 'Avg Order Value')
        filteredCustomerReports.forEach(r => {
          rows.push([
            r.customer_name,
            r.total_quantity,
            parseFloat(r.total_revenue.toFixed(2)),
            parseFloat(r.total_cost.toFixed(2)),
            parseFloat(r.total_profit.toFixed(2)),
            parseFloat(r.profit_margin.toFixed(2)),
            r.sale_count,
            parseFloat(r.average_order_value.toFixed(2)),
          ])
        })
        sheetName = 'Sales by Customer'
        break
      case 'salesperson':
        headers.push('Sales Person', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Commission', 'Sales Count')
        filteredSalesPersonReports.forEach(r => {
          rows.push([
            r.sales_person_name,
            r.total_quantity,
            parseFloat(r.total_revenue.toFixed(2)),
            parseFloat(r.total_cost.toFixed(2)),
            parseFloat(r.total_profit.toFixed(2)),
            parseFloat(r.profit_margin.toFixed(2)),
            parseFloat(r.commission_amount.toFixed(2)),
            r.sale_count,
          ])
        })
        sheetName = 'Sales by Sales Person'
        break
      case 'sales':
        headers.push('Date', 'Invoice', 'Customer', 'Items', 'Amount', 'Payment Status', 'Payment Method')
        filteredSales.forEach(s => {
          rows.push([
            new Date(s.sale_date).toLocaleDateString('en-IN'),
            s.invoice_number,
            s.customer_name || 'Walk-in Customer',
            s.items.length,
            parseFloat(s.grand_total.toFixed(2)),
            s.payment_status,
            s.payment_method || '',
          ])
        })
        sheetName = 'All Sales'
        break
    }

    const filename = `sales_report_${activeView}_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    exportExcel(rows, headers, filename, sheetName)
    toast.success('Report exported to Excel')
  }

  const exportToPDF = () => {
    const headers: string[] = []
    const rows: any[][] = []
    let title = 'Sales Report'

    switch (activeView) {
      case 'product':
        headers.push('Product', 'Quantity', 'Revenue', 'Profit', 'Margin %')
        filteredProductReports.forEach(r => {
          rows.push([
            r.product_name,
            r.total_quantity,
            `₹${r.total_revenue.toFixed(2)}`,
            `₹${r.total_profit.toFixed(2)}`,
            `${r.profit_margin.toFixed(2)}%`,
          ])
        })
        title = 'Sales Report - By Product'
        break
      case 'category':
        headers.push('Category', 'Quantity', 'Revenue', 'Profit', 'Margin %')
        filteredCategoryReports.forEach(r => {
          rows.push([
            r.category_name,
            r.total_quantity,
            `₹${r.total_revenue.toFixed(2)}`,
            `₹${r.total_profit.toFixed(2)}`,
            `${r.profit_margin.toFixed(2)}%`,
          ])
        })
        title = 'Sales Report - By Category'
        break
      case 'customer':
        headers.push('Customer', 'Quantity', 'Revenue', 'Profit', 'Orders')
        filteredCustomerReports.forEach(r => {
          rows.push([
            r.customer_name,
            r.total_quantity,
            `₹${r.total_revenue.toFixed(2)}`,
            `₹${r.total_profit.toFixed(2)}`,
            r.sale_count,
          ])
        })
        title = 'Sales Report - By Customer'
        break
      case 'salesperson':
        headers.push('Sales Person', 'Quantity', 'Revenue', 'Profit', 'Commission')
        filteredSalesPersonReports.forEach(r => {
          rows.push([
            r.sales_person_name,
            r.total_quantity,
            `₹${r.total_revenue.toFixed(2)}`,
            `₹${r.total_profit.toFixed(2)}`,
            `₹${r.commission_amount.toFixed(2)}`,
          ])
        })
        title = 'Sales Report - By Sales Person'
        break
      case 'sales':
        headers.push('Date', 'Invoice', 'Customer', 'Items', 'Amount', 'Payment Status')
        filteredSales.forEach(s => {
          rows.push([
            new Date(s.sale_date).toLocaleDateString('en-IN'),
            s.invoice_number,
            s.customer_name || 'Walk-in Customer',
            s.items.length,
            `₹${s.grand_total.toFixed(2)}`,
            s.payment_status,
          ])
        })
        title = 'Sales Report - All Sales'
        break
    }

    const period = timePeriod === 'all' ? 'All Time' : timePeriod
    const fullTitle = `${title} (${period})`
    const filename = `sales_report_${activeView}_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    
    exportDataToPDF(rows, headers, filename, fullTitle)
    toast.success('Report exported to PDF')
  }

  const renderProductReport = () => (
    <div className="overflow-x-auto overflow-y-auto max-h-[55vh] border border-gray-200 rounded-lg" style={{ scrollbarGutter: 'stable' }}>
      <table className="w-full min-w-[700px]">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            {isColumnVisible('product', 'product_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>}
            {isColumnVisible('product', 'total_quantity') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>}
            {isColumnVisible('product', 'total_revenue') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Revenue</th>}
            {isColumnVisible('product', 'total_cost') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Cost</th>}
            {isColumnVisible('product', 'total_profit') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Profit</th>}
            {isColumnVisible('product', 'profit_margin') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Margin %</th>}
            {isColumnVisible('product', 'average_price') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Avg Price</th>}
            {isColumnVisible('product', 'sale_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sales Count</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredProductReports.map((report) => (
            <tr key={report.product_id} className="hover:bg-gray-50 transition-colors">
              {isColumnVisible('product', 'product_name') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{report.product_name}</td>}
              {isColumnVisible('product', 'total_quantity') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{report.total_quantity}</td>}
              {isColumnVisible('product', 'total_revenue') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-600">₹{report.total_revenue.toFixed(2)}</td>}
              {isColumnVisible('product', 'total_cost') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{report.total_cost.toFixed(2)}</td>}
              {isColumnVisible('product', 'total_profit') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-blue-600">₹{report.total_profit.toFixed(2)}</td>}
              {isColumnVisible('product', 'profit_margin') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${report.profit_margin >= 30 ? 'bg-green-100 text-green-700' : report.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{report.profit_margin.toFixed(2)}%</span>
              </td>}
              {isColumnVisible('product', 'average_price') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{report.average_price.toFixed(2)}</td>}
              {isColumnVisible('product', 'sale_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{report.sale_count}</td>}
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
            {isColumnVisible('category', 'total_revenue') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Revenue</th>}
            {isColumnVisible('category', 'total_cost') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Cost</th>}
            {isColumnVisible('category', 'total_profit') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Profit</th>}
            {isColumnVisible('category', 'profit_margin') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Margin %</th>}
            {isColumnVisible('category', 'product_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Products</th>}
            {isColumnVisible('category', 'sale_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sales Count</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredCategoryReports.map((report) => (
            <tr key={report.category_name} className="hover:bg-gray-50 transition-colors">
              {isColumnVisible('category', 'category_name') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{report.category_name}</td>}
              {isColumnVisible('category', 'total_quantity') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{report.total_quantity}</td>}
              {isColumnVisible('category', 'total_revenue') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-600">₹{report.total_revenue.toFixed(2)}</td>}
              {isColumnVisible('category', 'total_cost') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{report.total_cost.toFixed(2)}</td>}
              {isColumnVisible('category', 'total_profit') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-blue-600">₹{report.total_profit.toFixed(2)}</td>}
              {isColumnVisible('category', 'profit_margin') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${report.profit_margin >= 30 ? 'bg-green-100 text-green-700' : report.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{report.profit_margin.toFixed(2)}%</span>
              </td>}
              {isColumnVisible('category', 'product_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{report.product_count}</td>}
              {isColumnVisible('category', 'sale_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{report.sale_count}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderCustomerReport = () => (
    <div className="overflow-x-auto overflow-y-auto max-h-[55vh] border border-gray-200 rounded-lg" style={{ scrollbarGutter: 'stable' }}>
      <table className="w-full min-w-[700px]">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            {isColumnVisible('customer', 'customer_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>}
            {isColumnVisible('customer', 'total_quantity') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>}
            {isColumnVisible('customer', 'total_revenue') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Revenue</th>}
            {isColumnVisible('customer', 'total_cost') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Cost</th>}
            {isColumnVisible('customer', 'total_profit') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Profit</th>}
            {isColumnVisible('customer', 'profit_margin') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Margin %</th>}
            {isColumnVisible('customer', 'sale_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Orders</th>}
            {isColumnVisible('customer', 'average_order_value') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Avg Order</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredCustomerReports.map((report) => (
            <tr key={report.customer_name} className="hover:bg-gray-50 transition-colors">
              {isColumnVisible('customer', 'customer_name') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{report.customer_name}</td>}
              {isColumnVisible('customer', 'total_quantity') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{report.total_quantity}</td>}
              {isColumnVisible('customer', 'total_revenue') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-600">₹{report.total_revenue.toFixed(2)}</td>}
              {isColumnVisible('customer', 'total_cost') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{report.total_cost.toFixed(2)}</td>}
              {isColumnVisible('customer', 'total_profit') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-blue-600">₹{report.total_profit.toFixed(2)}</td>}
              {isColumnVisible('customer', 'profit_margin') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${report.profit_margin >= 30 ? 'bg-green-100 text-green-700' : report.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{report.profit_margin.toFixed(2)}%</span>
              </td>}
              {isColumnVisible('customer', 'sale_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{report.sale_count}</td>}
              {isColumnVisible('customer', 'average_order_value') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{report.average_order_value.toFixed(2)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderSalesPersonReport = () => (
    <div className="overflow-x-auto overflow-y-auto max-h-[55vh] border border-gray-200 rounded-lg" style={{ scrollbarGutter: 'stable' }}>
      <table className="w-full min-w-[700px]">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            {isColumnVisible('salesperson', 'sales_person_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales Person</th>}
            {isColumnVisible('salesperson', 'total_quantity') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>}
            {isColumnVisible('salesperson', 'total_revenue') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Revenue</th>}
            {isColumnVisible('salesperson', 'total_cost') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Cost</th>}
            {isColumnVisible('salesperson', 'total_profit') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Profit</th>}
            {isColumnVisible('salesperson', 'profit_margin') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Margin %</th>}
            {isColumnVisible('salesperson', 'commission_amount') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Commission</th>}
            {isColumnVisible('salesperson', 'sale_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sales Count</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {filteredSalesPersonReports.map((report) => (
            <tr key={report.sales_person_name} className="hover:bg-gray-50 transition-colors">
              {isColumnVisible('salesperson', 'sales_person_name') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{report.sales_person_name}</td>}
              {isColumnVisible('salesperson', 'total_quantity') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{report.total_quantity}</td>}
              {isColumnVisible('salesperson', 'total_revenue') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-green-600">₹{report.total_revenue.toFixed(2)}</td>}
              {isColumnVisible('salesperson', 'total_cost') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{report.total_cost.toFixed(2)}</td>}
              {isColumnVisible('salesperson', 'total_profit') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-blue-600">₹{report.total_profit.toFixed(2)}</td>}
              {isColumnVisible('salesperson', 'profit_margin') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${report.profit_margin >= 30 ? 'bg-green-100 text-green-700' : report.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{report.profit_margin.toFixed(2)}%</span>
              </td>}
              {isColumnVisible('salesperson', 'commission_amount') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-purple-600">₹{report.commission_amount.toFixed(2)}</td>}
              {isColumnVisible('salesperson', 'sale_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{report.sale_count}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const getCurrentReport = () => {
    switch (activeView) {
      case 'product': return filteredProductReports
      case 'category': return filteredCategoryReports
      case 'customer': return filteredCustomerReports
      case 'salesperson': return filteredSalesPersonReports
      case 'sales': return filteredSales
    }
  }

  const salesGroupedByDate = useMemo(() => {
    const groups: Record<string, Sale[]> = {}
    filteredSales.forEach(sale => {
      const dateKey = sale.sale_date.split('T')[0]
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(sale)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredSales])

  const renderSalesList = () => (
    <div className="overflow-x-auto overflow-y-auto max-h-[60vh] border border-gray-200 rounded-lg" style={{ scrollbarGutter: 'stable' }}>
      {salesGroupedByDate.map(([dateStr, dateSales]) => (
        <div key={dateStr} className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-t-lg sticky top-0 z-10">
            <span className="font-bold">{new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="ml-2 text-blue-100">({dateSales.length} sale{dateSales.length !== 1 ? 's' : ''})</span>
          </div>
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                {isColumnVisible('sales', 'sale_date') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Time</th>}
                {isColumnVisible('sales', 'invoice_number') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invoice</th>}
                {isColumnVisible('sales', 'customer_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>}
                {isColumnVisible('sales', 'sales_person_name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales Person</th>}
                {isColumnVisible('sales', 'items_count') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Items</th>}
                {isColumnVisible('sales', 'subtotal') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Subtotal</th>}
                {isColumnVisible('sales', 'discount') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Discount</th>}
                {isColumnVisible('sales', 'tax_amount') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Tax</th>}
                {isColumnVisible('sales', 'grand_total') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>}
                {isColumnVisible('sales', 'payment_status') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>}
                {isColumnVisible('sales', 'payment_method') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Method</th>}
                {isColumnVisible('sales', 'internal_remarks') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Remark</th>}
                {isColumnVisible('sales', 'notes') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {dateSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  {isColumnVisible('sales', 'sale_date') && <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{formatRecordTime(sale.sale_date, sale.created_at)}</td>}
                  {isColumnVisible('sales', 'invoice_number') && <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{sale.invoice_number}</td>}
                  {isColumnVisible('sales', 'customer_name') && <td className="px-4 py-3 text-sm text-gray-900">{sale.customer_name || 'Walk-in'}</td>}
                  {isColumnVisible('sales', 'sales_person_name') && <td className="px-4 py-3 text-sm text-gray-600">{sale.sales_person_name || '—'}</td>}
                  {isColumnVisible('sales', 'items_count') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</td>}
                  {isColumnVisible('sales', 'subtotal') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{sale.subtotal.toFixed(2)}</td>}
                  {isColumnVisible('sales', 'discount') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">{(sale.discount ?? 0) > 0 ? `₹${(sale.discount ?? 0).toFixed(2)}` : '—'}</td>}
                  {isColumnVisible('sales', 'tax_amount') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600">₹{sale.tax_amount.toFixed(2)}</td>}
                  {isColumnVisible('sales', 'grand_total') && <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-gray-900">₹{sale.grand_total.toFixed(2)}</td>}
                  {isColumnVisible('sales', 'payment_status') && <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{sale.payment_status.charAt(0).toUpperCase() + sale.payment_status.slice(1)}</span>
                  </td>}
                  {isColumnVisible('sales', 'payment_method') && <td className="px-4 py-3 text-sm text-gray-600">{sale.payment_method || (sale.payment_methods?.map(p => p.method).join(', ') ?? '—')}</td>}
                  {isColumnVisible('sales', 'internal_remarks') && <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate" title={sale.internal_remarks}>{sale.internal_remarks || '—'}</td>}
                  {isColumnVisible('sales', 'notes') && <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate" title={sale.notes}>{sale.notes || '—'}</td>}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => navigate(`/invoice/${sale.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View Receipt"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )

  const currentReport = getCurrentReport()

  return (
    <ProtectedRoute requiredPermission="reports:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
                  <p className="text-sm text-gray-600 mt-1">Detailed sales analysis by product, category, customer, and salesperson</p>
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
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Time Period:</span>
              <div className="flex flex-wrap gap-2">
                {(['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'all'] as ReportTimePeriod[]).map(period => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timePeriod === period
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    {period === 'thisWeek' ? 'This Week' :
                     period === 'lastWeek' ? 'Last Week' :
                     period === 'thisMonth' ? 'This Month' :
                     period === 'lastMonth' ? 'Last Month' :
                     period === 'thisYear' ? 'This Year' :
                     period === 'lastYear' ? 'Last Year' :
                     period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
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

          {/* Search / Filter by Product, Category, Customer, Sales Person */}
          <div className={`bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50 ${customerDropdownOpen ? 'relative z-[100]' : ''}`}>
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
                    placeholder="Search by customer, product, category, invoice..."
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full"
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
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">By Product</label>
                <select
                  value={filterProductId === '' ? '' : filterProductId}
                  onChange={(e) => setFilterProductId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[180px]"
                >
                  <option value="">All products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">By Category</label>
                <select
                  value={filterCategoryName}
                  onChange={(e) => setFilterCategoryName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[160px]"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 relative">
                <label className="text-xs font-medium text-gray-500">By Customer (name or mobile)</label>
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={customerDropdownOpen ? customerSearchQuery : (selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.phone ? ` • ${selectedCustomer.phone}` : ''}` : '')}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value)
                      if (!customerDropdownOpen) setCustomerDropdownOpen(true)
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 180)}
                    placeholder={filterCustomerId ? '' : 'All customers – search by name or mobile...'}
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full"
                  />
                  {filterCustomerId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setFilterCustomerId('')
                        setCustomerSearchQuery('')
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Clear customer filter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {customerDropdownOpen && (
                    <div className="absolute z-[110] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-auto">
                      <ul className="py-1">
                        <li>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-600"
                            onClick={() => {
                              setFilterCustomerId('')
                              setCustomerSearchQuery('')
                              setCustomerDropdownOpen(false)
                            }}
                          >
                            All customers
                          </button>
                        </li>
                        {customersFilteredForDropdown.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-500">No customers match</li>
                        ) : (
                          customersFilteredForDropdown.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${filterCustomerId === c.id ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}
                                onClick={() => {
                                  setFilterCustomerId(c.id)
                                  setCustomerSearchQuery('')
                                  setCustomerDropdownOpen(false)
                                }}
                              >
                                {c.name}
                                {c.phone ? <span className="text-gray-500 ml-1">• {c.phone}</span> : ''}
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
                <label className="text-xs font-medium text-gray-500">By Sales Person</label>
                <select
                  value={filterSalesPersonId === '' ? '' : filterSalesPersonId}
                  onChange={(e) => setFilterSalesPersonId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[160px]"
                >
                  <option value="">All sales persons</option>
                  {salesPersons.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
              {(filterProductId !== '' || filterCategoryName !== '' || filterCustomerId !== '' || filterSalesPersonId !== '' || globalSearchQuery !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterProductId('')
                    setFilterCategoryName('')
                    setFilterCustomerId('')
                    setCustomerSearchQuery('')
                    setFilterSalesPersonId('')
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

          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 mb-6 pb-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveView('product')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeView === 'product' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4" />
                By Product ({filteredProductReports.length})
                {activeView === 'product' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveView('category')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeView === 'category' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                By Category ({filteredCategoryReports.length})
                {activeView === 'category' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveView('customer')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeView === 'customer' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                By Customer ({filteredCustomerReports.length})
                {activeView === 'customer' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveView('salesperson')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeView === 'salesperson' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                By Sales Person ({filteredSalesPersonReports.length})
                {activeView === 'salesperson' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveView('sales')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeView === 'sales' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                All Sales ({filteredSales.length})
                {activeView === 'sales' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowColumnSettings(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700"
              title="Show / Hide columns"
            >
              <Columns3 className="w-4 h-4" />
              Columns
            </button>
            </div>

            {showColumnSettings && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowColumnSettings(false)}>
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Show / Hide Columns</h3>
                  <p className="text-sm text-gray-500 mb-2">View: <span className="font-semibold">{activeView === 'product' ? 'By Product' : activeView === 'category' ? 'By Category' : activeView === 'customer' ? 'By Customer' : activeView === 'salesperson' ? 'By Sales Person' : 'All Sales'}</span></p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {SALES_REPORT_COLUMNS[activeView].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input type="checkbox" checked={visibleColumns[activeView]?.has(key) ?? true} onChange={() => toggleColumnVisibility(activeView, key)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                        <span className="text-sm text-gray-800">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { const all = new Set(SALES_REPORT_COLUMNS[activeView].map(c => c.key)); setVisibleColumns(prev => ({ ...prev, [activeView]: all })); localStorage.setItem(getStorageKey(activeView), JSON.stringify([...all])) }} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">Select All</button>
                    <button type="button" onClick={() => { const def = new Set(DEFAULT_VISIBLE_COLUMNS[activeView]); setVisibleColumns(prev => ({ ...prev, [activeView]: def })); localStorage.setItem(getStorageKey(activeView), JSON.stringify([...def])) }} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">Reset</button>
                    <button type="button" onClick={() => setShowColumnSettings(false)} className="ml-auto px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Done</button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report data...</p>
              </div>
            ) : currentReport.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No data found</h3>
                <p className="text-gray-600">No sales data available for the selected period</p>
              </div>
            ) : (
              <>
                {activeView === 'product' && renderProductReport()}
                {activeView === 'category' && renderCategoryReport()}
                {activeView === 'customer' && renderCustomerReport()}
                {activeView === 'salesperson' && renderSalesPersonReport()}
                {activeView === 'sales' && renderSalesList()}
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesReports

