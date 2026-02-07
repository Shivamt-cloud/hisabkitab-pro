import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { reportService } from '../services/reportService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  SalesByProductReport,
  CategoryProfitReport,
  ProfitAnalysisReport,
  ReportTimePeriod,
} from '../types/reports'
import { Home, Package, TrendingUp, Filter, FileSpreadsheet, FileText, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { exportToExcel as exportExcel, exportDataToPDF } from '../utils/exportUtils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type ViewTab = 'product' | 'category' | 'period'
type GroupBy = 'day' | 'week' | 'month' | 'year'

const formatPeriod = (period: string, groupBy: GroupBy) => {
  if (groupBy === 'year') return period
  if (groupBy === 'month') {
    const [y, m] = period.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(m || '1', 10) - 1]} ${y}`
  }
  if (groupBy === 'week' || groupBy === 'day') {
    const d = new Date(period)
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit' })
  }
  return period
}

const ProfitAnalysis = () => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<ViewTab>('product')
  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [loading, setLoading] = useState(false)

  const [productReports, setProductReports] = useState<SalesByProductReport[]>([])
  const [categoryReports, setCategoryReports] = useState<CategoryProfitReport[]>([])
  const [periodReports, setPeriodReports] = useState<ProfitAnalysisReport[]>([])

  useEffect(() => {
    loadReports()
  }, [timePeriod, customStartDate, customEndDate, activeView, groupBy])

  const loadReports = async () => {
    setLoading(true)
    const { startDate, endDate } = reportService.getDateRange(timePeriod, customStartDate, customEndDate)
    const companyId = getCurrentCompanyId()
    try {
      const [products, categories, periods] = await Promise.all([
        reportService.getSalesByProduct(startDate, endDate, companyId),
        reportService.getCategoryProfit(startDate, endDate, companyId),
        activeView === 'period' ? reportService.getProfitAnalysis(groupBy, startDate, endDate, companyId) : Promise.resolve([]),
      ])
      setProductReports(products)
      setCategoryReports(categories)
      setPeriodReports(periods)
    } catch (error) {
      console.error('Error loading profit analysis:', error)
      toast.error('Failed to load profit analysis')
    } finally {
      setLoading(false)
    }
  }

  const bestProducts = useMemo(() => [...productReports].sort((a, b) => b.total_profit - a.total_profit).slice(0, 5), [productReports])
  const worstProducts = useMemo(() => [...productReports].filter(p => p.total_profit > 0).sort((a, b) => a.total_profit - b.total_profit).slice(0, 5), [productReports])
  const bestCategories = useMemo(() => [...categoryReports].sort((a, b) => b.total_profit - a.total_profit).slice(0, 5), [categoryReports])
  const worstCategories = useMemo(() => [...categoryReports].filter(c => c.total_profit > 0).sort((a, b) => a.total_profit - b.total_profit).slice(0, 5), [categoryReports])

  const periodChartData = useMemo(() => periodReports.map(r => ({
    period: formatPeriod(r.period, groupBy),
    rawPeriod: r.period,
    profit: Math.round(r.total_profit * 100) / 100,
    margin: Math.round(r.profit_margin * 10) / 10,
    revenue: r.total_revenue,
  })), [periodReports, groupBy])

  const formatCurrency = (v: number) => `₹${v.toFixed(2)}`
  const formatMargin = (v: number) => `${v.toFixed(1)}%`

  const exportToExcel = () => {
    const headers: string[] = []
    const rows: any[][] = []
    let sheetName = 'Profit Analysis'
    if (activeView === 'product') {
      headers.push('Product', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Quantity', 'Sales')
      productReports.forEach(r => {
        rows.push([r.product_name, r.total_revenue, r.total_cost, r.total_profit, r.profit_margin.toFixed(1), r.total_quantity, r.sale_count])
      })
      sheetName = 'Profit by Product'
    } else if (activeView === 'category') {
      headers.push('Category', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Products', 'Sales')
      categoryReports.forEach(r => {
        rows.push([r.category_name, r.total_revenue, r.total_cost, r.total_profit, r.profit_margin.toFixed(1), r.product_count, r.sale_count])
      })
      sheetName = 'Profit by Category'
    } else {
      headers.push('Period', 'Revenue', 'Cost', 'Profit', 'Margin %', 'Sales', 'Returns')
      periodReports.forEach(r => {
        rows.push([formatPeriod(r.period, groupBy), r.total_revenue, r.total_cost, r.total_profit, r.profit_margin.toFixed(1), r.sale_count, r.return_count])
      })
      sheetName = 'Profit by Time Period'
    }
    exportExcel(rows, headers, `profit_analysis_${activeView}_${timePeriod}`, sheetName)
    toast.success('Exported to Excel')
  }

  const exportToPDF = () => {
    const title = activeView === 'product' ? 'Profit by Product' : activeView === 'category' ? 'Profit by Category' : 'Profit by Time Period'
    const headers = activeView === 'product' ? ['Product', 'Profit', 'Margin'] : activeView === 'category' ? ['Category', 'Profit', 'Margin'] : ['Period', 'Profit', 'Margin']
    const rows = activeView === 'product'
      ? productReports.map(r => [r.product_name, formatCurrency(r.total_profit), formatMargin(r.profit_margin)])
      : activeView === 'category'
        ? categoryReports.map(r => [r.category_name, formatCurrency(r.total_profit), formatMargin(r.profit_margin)])
        : periodReports.map(r => [formatPeriod(r.period, groupBy), formatCurrency(r.total_profit), formatMargin(r.profit_margin)])
    exportDataToPDF(rows, headers, title)
    toast.success('Exported to PDF')
  }

  return (
    <ProtectedRoute requiredPermission="reports:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Back to Dashboard">
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Profit Analysis</h1>
                  <p className="text-sm text-gray-600 mt-1">Profit by product, category, time period, margin trends, and best/worst performers</p>
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
          {/* Time Period */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-wrap items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Time Period:</span>
              <div className="flex flex-wrap gap-2">
                {(['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'all'] as ReportTimePeriod[]).map(p => (
                  <button key={p} onClick={() => setTimePeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timePeriod === p ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>
                    {p === 'thisWeek' ? 'This Week' : p === 'lastWeek' ? 'Last Week' : p === 'thisMonth' ? 'This Month' : p === 'lastMonth' ? 'Last Month' : p === 'thisYear' ? 'This Year' : p === 'lastYear' ? 'Last Year' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
                <button onClick={() => setTimePeriod('custom')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timePeriod === 'custom' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>Custom Range</button>
              </div>
            </div>
            {timePeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* Best & Worst Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                Top 5 by Profit (Products)
              </h2>
              {bestProducts.length === 0 ? <p className="text-sm text-gray-500">No data</p> : (
                <ul className="space-y-3">
                  {bestProducts.map((r, i) => (
                    <li key={r.product_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-900">{i + 1}. {r.product_name}</span>
                      <span className="text-sm font-semibold text-emerald-600">{formatCurrency(r.total_profit)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-amber-600" />
                Lowest Profit Products
              </h2>
              {worstProducts.length === 0 ? <p className="text-sm text-gray-500">No data</p> : (
                <ul className="space-y-3">
                  {worstProducts.map((r, i) => (
                    <li key={r.product_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-900">{i + 1}. {r.product_name}</span>
                      <span className="text-sm font-semibold text-amber-600">{formatCurrency(r.total_profit)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                Top 5 by Profit (Categories)
              </h2>
              {bestCategories.length === 0 ? <p className="text-sm text-gray-500">No data</p> : (
                <ul className="space-y-3">
                  {bestCategories.map((r, i) => (
                    <li key={r.category_name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-900">{i + 1}. {r.category_name}</span>
                      <span className="text-sm font-semibold text-emerald-600">{formatCurrency(r.total_profit)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-amber-600" />
                Lowest Profit Categories
              </h2>
              {worstCategories.length === 0 ? <p className="text-sm text-gray-500">No data</p> : (
                <ul className="space-y-3">
                  {worstCategories.map((r, i) => (
                    <li key={r.category_name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-900">{i + 1}. {r.category_name}</span>
                      <span className="text-sm font-semibold text-amber-600">{formatCurrency(r.total_profit)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Tabs: By Product | By Category | By Time Period */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-wrap gap-4 border-b border-gray-200 mb-6 pb-4">
              <button onClick={() => setActiveView('product')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'product' ? 'text-emerald-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <Package className="w-4 h-4" />
                By Product ({productReports.length})
                {activeView === 'product' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></span>}
              </button>
              <button onClick={() => setActiveView('category')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'category' ? 'text-emerald-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <TrendingUp className="w-4 h-4" />
                By Category ({categoryReports.length})
                {activeView === 'category' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></span>}
              </button>
              <button onClick={() => setActiveView('period')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'period' ? 'text-emerald-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <BarChart3 className="w-4 h-4" />
                Margin Trends ({periodReports.length})
                {activeView === 'period' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></span>}
              </button>
              {activeView === 'period' && (
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-xs font-medium text-gray-500">Group by:</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm">
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {activeView === 'product' && (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Profit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Margin %</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {productReports.map(r => (
                          <tr key={r.product_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.product_name}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(r.total_revenue)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(r.total_cost)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">{formatCurrency(r.total_profit)}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatMargin(r.profit_margin)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{r.total_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeView === 'category' && (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Profit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Margin %</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Products</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {categoryReports.map(r => (
                          <tr key={r.category_name} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.category_name}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(r.total_revenue)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(r.total_cost)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">{formatCurrency(r.total_profit)}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatMargin(r.profit_margin)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{r.product_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeView === 'period' && (
                  <div className="space-y-6">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={periodChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis yAxisId="left" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                          <Tooltip
                            formatter={(value: number | undefined, name?: string) => [value != null ? (name === 'profit' ? formatCurrency(value) : `${value}%`) : '', name === 'profit' ? 'Profit' : 'Margin %']}
                            labelFormatter={(label) => label}
                          />
                          <Line yAxisId="left" type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="profit" dot={{ r: 4 }} />
                          <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#3b82f6" strokeWidth={2} name="margin" dot={{ r: 4 }} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full min-w-[500px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Period</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Profit</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Margin %</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {periodReports.map(r => (
                            <tr key={r.period} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatPeriod(r.period, groupBy)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCurrency(r.total_revenue)}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">{formatCurrency(r.total_profit)}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatMargin(r.profit_margin)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">{r.sale_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default ProfitAnalysis
