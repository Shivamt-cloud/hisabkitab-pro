import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { reportService } from '../services/reportService'
import { expenseService } from '../services/expenseService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  ExpensesByCategoryReport,
  ExpensesByPeriodReport,
  ExpenseVsIncomeReport,
  ReportTimePeriod,
} from '../types/reports'
import { Home, Filter, FileSpreadsheet, FileText, DollarSign, TrendingUp, TrendingDown, Package, Download } from 'lucide-react'
import { exportToExcel as exportExcel, exportDataToPDF, exportMultiSheetExcel } from '../utils/exportUtils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type ViewTab = 'category' | 'period' | 'vsIncome'
type GroupBy = 'day' | 'week' | 'month'

const CATEGORY_LABELS: Record<string, string> = {
  salary: 'Employee Salary',
  sales_person_payment: 'Sales Person Payment',
  employee_commission: 'Employee Commission',
  employee_goods_purchase: 'Employee Goods Purchase',
  purchase: 'Purchase',
  transport: 'Transport',
  office: 'Office / Rent',
  utility: 'Utilities',
  maintenance: 'Maintenance',
  marketing: 'Marketing',
  other: 'Other',
}

const formatPeriod = (period: string, groupBy: GroupBy) => {
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

const ExpenseReports = () => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<ViewTab>('category')
  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [loading, setLoading] = useState(false)

  const [categoryReports, setCategoryReports] = useState<ExpensesByCategoryReport[]>([])
  const [periodReports, setPeriodReports] = useState<ExpensesByPeriodReport[]>([])
  const [vsIncomeReports, setVsIncomeReports] = useState<ExpenseVsIncomeReport[]>([])
  const [expenses, setExpenses] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [timePeriod, customStartDate, customEndDate, activeView, groupBy])

  const { startDate, endDate } = reportService.getDateRange(timePeriod, customStartDate, customEndDate)

  const loadData = async () => {
    setLoading(true)
    const companyId = getCurrentCompanyId()
    try {
      const [allExpenses, cats, periods, vsIncome] = await Promise.all([
        expenseService.getAll(companyId),
        reportService.getExpensesByCategory(startDate, endDate, companyId),
        reportService.getExpensesByPeriod(groupBy, startDate, endDate, companyId),
        reportService.getExpenseVsIncome(groupBy, startDate, endDate, companyId),
      ])
      const filtered = reportService.filterExpensesByDate(allExpenses, startDate, endDate)
      const operational = filtered.filter((e: any) => e.expense_type !== 'opening' && e.expense_type !== 'closing')
      setExpenses(operational)
      setCategoryReports(cats)
      setPeriodReports(periods)
      setVsIncomeReports(vsIncome)
    } catch (error) {
      console.error('Error loading expense reports:', error)
      toast.error('Failed to load expense reports')
    } finally {
      setLoading(false)
    }
  }

  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])

  const vsIncomeChartData = useMemo(() => vsIncomeReports.map(r => ({
    period: formatPeriod(r.period, groupBy),
    rawPeriod: r.period,
    expense: Math.round(r.total_expense * 100) / 100,
    income: Math.round(r.total_income * 100) / 100,
    net: Math.round(r.net * 100) / 100,
  })), [vsIncomeReports, groupBy])

  const formatCurrency = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const exportToExcel = () => {
    const filename = `expense_report_${activeView}_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    if (activeView === 'category') {
      const headers = ['Category', 'Amount', 'Count', 'Cash', 'Card', 'UPI', 'Other']
      const rows = categoryReports.map(r => [
        r.category_label,
        r.total_amount.toFixed(2),
        r.expense_count,
        (r.payment_methods?.cash || 0).toFixed(2),
        (r.payment_methods?.card || 0).toFixed(2),
        (r.payment_methods?.upi || 0).toFixed(2),
        (r.payment_methods?.other || 0).toFixed(2),
      ])
      exportExcel(rows, headers, filename, 'Expenses by Category')
    } else if (activeView === 'period') {
      const headers = ['Period', 'Amount', 'Count']
      const rows = periodReports.map(r => [formatPeriod(r.period, groupBy), r.total_amount.toFixed(2), r.expense_count])
      exportExcel(rows, headers, filename, 'Expenses by Period')
    } else {
      const headers = ['Period', 'Expense', 'Income', 'Net']
      const rows = vsIncomeReports.map(r => [formatPeriod(r.period, groupBy), r.total_expense.toFixed(2), r.total_income.toFixed(2), r.net.toFixed(2)])
      exportExcel(rows, headers, filename, 'Expense vs Income')
    }
    toast.success('Exported to Excel')
  }

  const exportForCA = () => {
    const caHeaders = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Receipt No']
    const caRows = expenses.map((e: any) => [
      e.expense_date?.split('T')[0] || '',
      CATEGORY_LABELS[e.expense_type] || e.expense_type,
      e.description || '',
      e.amount.toFixed(2),
      e.payment_method || '',
      e.receipt_number || '',
    ])
    const filename = `expense_register_ca_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    exportMultiSheetExcel(
      [
        { sheetName: 'Expense Register', headers: caHeaders, rows: caRows },
        { sheetName: 'By Category', headers: ['Category', 'Amount', 'Count'], rows: categoryReports.map(r => [r.category_label, r.total_amount.toFixed(2), r.expense_count]) },
      ],
      filename
    )
    toast.success('Exported for CA')
  }

  const exportToPDF = () => {
    const title = activeView === 'category' ? 'Expenses by Category' : activeView === 'period' ? 'Expenses by Period' : 'Expense vs Income'
    const headers = activeView === 'category' ? ['Category', 'Amount', 'Count'] : activeView === 'period' ? ['Period', 'Amount', 'Count'] : ['Period', 'Expense', 'Income', 'Net']
    const rows = activeView === 'category'
      ? categoryReports.map(r => [r.category_label, formatCurrency(r.total_amount), r.expense_count])
      : activeView === 'period'
        ? periodReports.map(r => [formatPeriod(r.period, groupBy), formatCurrency(r.total_amount), r.expense_count])
        : vsIncomeReports.map(r => [formatPeriod(r.period, groupBy), formatCurrency(r.total_expense), formatCurrency(r.total_income), formatCurrency(r.net)])
    exportDataToPDF(rows, headers, `expense_report_${activeView}`, title)
    toast.success('Exported to PDF')
  }

  return (
    <ProtectedRoute requiredPermission="reports:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-orange-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Back to Dashboard">
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Expense Reports</h1>
                  <p className="text-sm text-gray-600 mt-1">By category, period, expense vs income, and CA export</p>
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
                <button onClick={exportForCA} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors" title="Export for CA">
                  <Download className="w-5 h-5" />
                  CA Export
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
                  <button key={p} onClick={() => setTimePeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timePeriod === p ? 'bg-rose-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>
                    {p === 'thisWeek' ? 'This Week' : p === 'lastWeek' ? 'Last Week' : p === 'thisMonth' ? 'This Month' : p === 'lastMonth' ? 'Last Month' : p === 'thisYear' ? 'This Year' : p === 'lastYear' ? 'Last Year' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
                <button onClick={() => setTimePeriod('custom')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timePeriod === 'custom' ? 'bg-rose-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}>Custom Range</button>
              </div>
            </div>
            {timePeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                <DollarSign className="w-5 h-5 text-rose-600" />
                Total Expenses
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalExpense)}</p>
              <p className="text-xs text-gray-500 mt-1">{expenses.length} transactions</p>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                <Package className="w-5 h-5 text-rose-600" />
                Categories
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{categoryReports.length}</p>
            </div>
            {vsIncomeReports.length > 0 && (
              <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
                <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                  {vsIncomeReports.reduce((s, r) => s + r.net, 0) >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-rose-600" />}
                  Net (Income - Expense)
                </div>
                <p className={`text-2xl font-bold mt-2 ${vsIncomeReports.reduce((s, r) => s + r.net, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(vsIncomeReports.reduce((s, r) => s + r.net, 0))}
                </p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-wrap gap-4 border-b border-gray-200 mb-6 pb-4">
              <button onClick={() => setActiveView('category')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'category' ? 'text-rose-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <Package className="w-4 h-4" />
                By Category ({categoryReports.length})
                {activeView === 'category' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600"></span>}
              </button>
              <button onClick={() => setActiveView('period')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'period' ? 'text-rose-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <TrendingUp className="w-4 h-4" />
                By Period ({periodReports.length})
                {activeView === 'period' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600"></span>}
              </button>
              <button onClick={() => setActiveView('vsIncome')} className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${activeView === 'vsIncome' ? 'text-rose-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <DollarSign className="w-4 h-4" />
                Expense vs Income ({vsIncomeReports.length})
                {activeView === 'vsIncome' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600"></span>}
              </button>
              {(activeView === 'period' || activeView === 'vsIncome') && (
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-xs font-medium text-gray-500">Group by:</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none text-sm">
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {activeView === 'category' && (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full min-w-[500px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Count</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Cash</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Card</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">UPI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {categoryReports.map(r => (
                          <tr key={r.expense_type} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.category_label}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-rose-600">{formatCurrency(r.total_amount)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{r.expense_count}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(r.payment_methods?.cash || 0)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(r.payment_methods?.card || 0)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(r.payment_methods?.upi || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeView === 'period' && (
                  <div className="space-y-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={periodReports.map(r => ({ period: formatPeriod(r.period, groupBy), amount: r.total_amount }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: number | undefined) => (v != null ? formatCurrency(v) : '')} />
                          <Bar dataKey="amount" fill="#e11d48" name="Expense" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full min-w-[400px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Period</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {periodReports.map(r => (
                            <tr key={r.period} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatPeriod(r.period, groupBy)}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-rose-600">{formatCurrency(r.total_amount)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">{r.expense_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeView === 'vsIncome' && (
                  <div className="space-y-6">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={vsIncomeChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: number | undefined) => (v != null ? formatCurrency(v) : '')} />
                          <Legend />
                          <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="expense" stroke="#e11d48" strokeWidth={2} name="Expense" dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="Net" dot={{ r: 4 }} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full min-w-[500px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Period</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Expense</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Income</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Net</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {vsIncomeReports.map(r => (
                            <tr key={r.period} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatPeriod(r.period, groupBy)}</td>
                              <td className="px-4 py-3 text-sm text-right text-rose-600">{formatCurrency(r.total_expense)}</td>
                              <td className="px-4 py-3 text-sm text-right text-emerald-600">{formatCurrency(r.total_income)}</td>
                              <td className={`px-4 py-3 text-sm text-right font-semibold ${r.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(r.net)}</td>
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

export default ExpenseReports
