import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { reportService } from '../services/reportService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  SalesByProductReport,
  SalesByCategoryReport,
  SalesByCustomerReport,
  SalesBySalesPersonReport,
  ReportTimePeriod,
} from '../types/reports'
import { Home, TrendingUp, Package, Users, UserCheck, Filter, FileSpreadsheet, FileText } from 'lucide-react'

type ReportView = 'product' | 'category' | 'customer' | 'salesperson'

const SalesReports = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<ReportView>('product')
  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  const [productReports, setProductReports] = useState<SalesByProductReport[]>([])
  const [categoryReports, setCategoryReports] = useState<SalesByCategoryReport[]>([])
  const [customerReports, setCustomerReports] = useState<SalesByCustomerReport[]>([])
  const [salesPersonReports, setSalesPersonReports] = useState<SalesBySalesPersonReport[]>([])

  useEffect(() => {
    loadReports()
  }, [timePeriod, customStartDate, customEndDate, activeView])

  const loadReports = async () => {
    setLoading(true)
    const { startDate, endDate } = reportService.getDateRange(timePeriod, customStartDate, customEndDate)

    try {
      switch (activeView) {
        case 'product':
          const productReports = await reportService.getSalesByProduct(startDate, endDate)
          setProductReports(productReports)
          break
        case 'category':
          const categoryReports = await reportService.getSalesByCategory(startDate, endDate)
          setCategoryReports(categoryReports)
          break
        case 'customer':
          const customerReports = await reportService.getSalesByCustomer(startDate, endDate)
          setCustomerReports(customerReports)
          break
        case 'salesperson':
          const salesPersonReports = await reportService.getSalesBySalesPerson(startDate, endDate)
          setSalesPersonReports(salesPersonReports)
          break
      }
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    const headers: string[] = []
    const rows: any[][] = []

    switch (activeView) {
      case 'product':
        headers.push('Product', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Avg Price', 'Sales Count')
        productReports.forEach(r => {
          rows.push([
            r.product_name,
            r.total_quantity,
            r.total_revenue.toFixed(2),
            r.total_cost.toFixed(2),
            r.total_profit.toFixed(2),
            r.profit_margin.toFixed(2),
            r.average_price.toFixed(2),
            r.sale_count,
          ])
        })
        break
      case 'category':
        headers.push('Category', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Products', 'Sales Count')
        categoryReports.forEach(r => {
          rows.push([
            r.category_name,
            r.total_quantity,
            r.total_revenue.toFixed(2),
            r.total_cost.toFixed(2),
            r.total_profit.toFixed(2),
            r.profit_margin.toFixed(2),
            r.product_count,
            r.sale_count,
          ])
        })
        break
      case 'customer':
        headers.push('Customer', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Orders', 'Avg Order Value')
        customerReports.forEach(r => {
          rows.push([
            r.customer_name,
            r.total_quantity,
            r.total_revenue.toFixed(2),
            r.total_cost.toFixed(2),
            r.total_profit.toFixed(2),
            r.profit_margin.toFixed(2),
            r.sale_count,
            r.average_order_value.toFixed(2),
          ])
        })
        break
      case 'salesperson':
        headers.push('Sales Person', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Commission', 'Sales Count')
        salesPersonReports.forEach(r => {
          rows.push([
            r.sales_person_name,
            r.total_quantity,
            r.total_revenue.toFixed(2),
            r.total_cost.toFixed(2),
            r.total_profit.toFixed(2),
            r.profit_margin.toFixed(2),
            r.commission_amount.toFixed(2),
            r.sale_count,
          ])
        })
        break
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sales_report_${activeView}_${timePeriod}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const title = `Sales Report - ${activeView.charAt(0).toUpperCase() + activeView.slice(1)}`
    const period = timePeriod === 'all' ? 'All Time' : timePeriod
    const headers: string[] = []
    const rows: any[][] = []

    switch (activeView) {
      case 'product':
        headers.push('Product', 'Quantity', 'Revenue', 'Profit', 'Margin %')
        productReports.slice(0, 50).forEach(r => {
          rows.push([
            r.product_name,
            r.total_quantity,
            `₹${r.total_revenue.toFixed(2)}`,
            `₹${r.total_profit.toFixed(2)}`,
            `${r.profit_margin.toFixed(2)}%`,
          ])
        })
        break
      case 'category':
        headers.push('Category', 'Quantity', 'Revenue', 'Profit', 'Margin %')
        categoryReports.forEach(r => {
          rows.push([
            r.category_name,
            r.total_quantity,
            `₹${r.total_revenue.toFixed(2)}`,
            `₹${r.total_profit.toFixed(2)}`,
            `${r.profit_margin.toFixed(2)}%`,
          ])
        })
        break
      case 'customer':
        headers.push('Customer', 'Quantity', 'Revenue', 'Profit', 'Orders')
        customerReports.slice(0, 50).forEach(r => {
          rows.push([
            r.customer_name,
            r.total_quantity,
            `₹${r.total_revenue.toFixed(2)}`,
            `₹${r.total_profit.toFixed(2)}`,
            r.sale_count,
          ])
        })
        break
      case 'salesperson':
        headers.push('Sales Person', 'Quantity', 'Revenue', 'Profit', 'Commission')
        salesPersonReports.forEach(r => {
          rows.push([
            r.sales_person_name,
            r.total_quantity,
            `₹${r.total_revenue.toFixed(2)}`,
            `₹${r.total_profit.toFixed(2)}`,
            `₹${r.commission_amount.toFixed(2)}`,
          ])
        })
        break
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
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
            <h1>${title}</h1>
            <p>Period: ${period}</p>
            <p>Total Records: ${rows.length}</p>
            <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
          </div>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  const renderProductReport = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Cost</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Profit</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Margin %</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Price</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Sales Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {productReports.map((report, index) => (
            <tr key={report.product_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{report.product_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{report.total_quantity}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">₹{report.total_revenue.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">₹{report.total_cost.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-600">₹{report.total_profit.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.profit_margin >= 30 ? 'bg-green-100 text-green-700' :
                  report.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {report.profit_margin.toFixed(2)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">₹{report.average_price.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{report.sale_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderCategoryReport = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Cost</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Profit</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Margin %</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Products</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Sales Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {categoryReports.map((report) => (
            <tr key={report.category_name} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{report.category_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{report.total_quantity}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">₹{report.total_revenue.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">₹{report.total_cost.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-600">₹{report.total_profit.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.profit_margin >= 30 ? 'bg-green-100 text-green-700' :
                  report.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {report.profit_margin.toFixed(2)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{report.product_count}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{report.sale_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
  </div>
  )

  const renderCustomerReport = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Cost</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Profit</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Margin %</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Orders</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Order</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {customerReports.map((report) => (
            <tr key={report.customer_name} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{report.customer_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{report.total_quantity}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">₹{report.total_revenue.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">₹{report.total_cost.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-600">₹{report.total_profit.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.profit_margin >= 30 ? 'bg-green-100 text-green-700' :
                  report.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {report.profit_margin.toFixed(2)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{report.sale_count}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">₹{report.average_order_value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderSalesPersonReport = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sales Person</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Revenue</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Cost</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Profit</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Margin %</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Commission</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Sales Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {salesPersonReports.map((report) => (
            <tr key={report.sales_person_name} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{report.sales_person_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{report.total_quantity}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">₹{report.total_revenue.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">₹{report.total_cost.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-600">₹{report.total_profit.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.profit_margin >= 30 ? 'bg-green-100 text-green-700' :
                  report.profit_margin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {report.profit_margin.toFixed(2)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-purple-600">₹{report.commission_amount.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{report.sale_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const getCurrentReport = () => {
    switch (activeView) {
      case 'product': return productReports
      case 'category': return categoryReports
      case 'customer': return customerReports
      case 'salesperson': return salesPersonReports
    }
  }

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

          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex gap-4 border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveView('product')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeView === 'product' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4" />
                By Product ({productReports.length})
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
                By Category ({categoryReports.length})
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
                By Customer ({customerReports.length})
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
                By Sales Person ({salesPersonReports.length})
                {activeView === 'salesperson' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
            </div>

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
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesReports

