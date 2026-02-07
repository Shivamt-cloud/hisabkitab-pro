import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { reportService } from '../services/reportService'
import { saleService } from '../services/saleService'
import { purchaseService } from '../services/purchaseService'
import { expenseService } from '../services/expenseService'
import { Home, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, FileSpreadsheet, FileText, Filter, RefreshCw } from 'lucide-react'
import { exportMultiSheetExcel, exportDataToPDF } from '../utils/exportUtils'
import type { Sale } from '../types/sale'
import type { Purchase } from '../types/purchase'
import type { Expense } from '../types/expense'
import type { ReportTimePeriod } from '../types/reports'

interface PeriodStats {
  sales: number
  purchases: number
  expenses: number
  profit: number
  saleCount: number
  purchaseCount: number
}

type PeriodFilter = {
  preset: ReportTimePeriod
  customStart: string
  customEnd: string
}

const PERIOD_OPTIONS: { value: ReportTimePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
]

const getDefaultCustomDates = () => {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

const formatPeriodLabel = (filter: PeriodFilter, range: { startDate?: string; endDate?: string }) => {
  if (filter.preset === 'custom' && range.startDate && range.endDate) {
    if (range.startDate === range.endDate) return range.startDate
    return `${range.startDate} to ${range.endDate}`
  }
  if (filter.preset === 'all') return 'All Time'
  const opt = PERIOD_OPTIONS.find(o => o.value === filter.preset)
  return opt?.label ?? filter.preset
}

const ComparativeReports = () => {
  const { getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const defaultDates = getDefaultCustomDates()

  const [loading, setLoading] = useState(true)
  const [filterA, setFilterA] = useState<PeriodFilter>({
    preset: 'thisMonth',
    customStart: defaultDates.start,
    customEnd: defaultDates.end,
  })
  const [filterB, setFilterB] = useState<PeriodFilter>({
    preset: 'lastMonth',
    customStart: defaultDates.start,
    customEnd: defaultDates.end,
  })
  const [statsA, setStatsA] = useState<PeriodStats | null>(null)
  const [statsB, setStatsB] = useState<PeriodStats | null>(null)
  const [rawData, setRawData] = useState<{ sales: Sale[]; purchases: Purchase[]; expenses: Expense[] } | null>(null)

  const getRange = (f: PeriodFilter) =>
    reportService.getDateRange(f.preset, f.customStart, f.customEnd)

  useEffect(() => {
    loadRawData()
  }, [])

  useEffect(() => {
    if (rawData) computeAndSetStats()
  }, [rawData, filterA, filterB])

  const loadRawData = async () => {
    setLoading(true)
    const companyId = getCurrentCompanyId()
    try {
      const [sales, purchases, expenses] = await Promise.all([
        saleService.getAll(true, companyId),
        purchaseService.getAll(undefined, companyId),
        expenseService.getAll(companyId),
      ])
      setRawData({ sales, purchases, expenses })
    } catch (err) {
      console.error('Failed to load comparative data', err)
    } finally {
      setLoading(false)
    }
  }

  const getPurchaseTotal = (p: Purchase) => {
    if ((p as any).type === 'gst') return (p as any).grand_total ?? 0
    return (p as any).total_amount ?? 0
  }

  const getSaleProfit = (sale: Sale) => {
    return sale.items.reduce((sum, item) => {
      if (item.sale_type === 'sale' && item.purchase_price != null) {
        return sum + ((item.unit_price - item.purchase_price) * item.quantity)
      }
      return sum
    }, 0)
  }

  const filterByDateRange = <T extends { sale_date?: string; purchase_date?: string; expense_date?: string }>(
    items: T[],
    startDate: string | undefined,
    endDate: string | undefined,
    dateKey: 'sale_date' | 'purchase_date' | 'expense_date'
  ): T[] => {
    if (!startDate && !endDate) return items
    return items.filter(item => {
      const raw = (item as any)[dateKey]
      if (!raw) return false
      const d = new Date(raw).getTime()
      if (startDate && d < new Date(startDate).getTime()) return false
      if (endDate && d > new Date(endDate).getTime() + 86400000) return false
      return true
    })
  }

  const computePeriodStats = (
    sales: Sale[],
    purchases: Purchase[],
    expenses: Expense[],
    startDate?: string,
    endDate?: string
  ): PeriodStats => {
    const filteredSales = filterByDateRange(sales, startDate, endDate, 'sale_date')
    const filteredPurchases = filterByDateRange(purchases, startDate, endDate, 'purchase_date')
    const filteredExpenses = expenses.filter(e => {
      if (e.expense_type === 'opening' || e.expense_type === 'closing') return false
      if (!startDate && !endDate) return true
      const d = new Date(e.expense_date).getTime()
      if (startDate && d < new Date(startDate).getTime()) return false
      if (endDate && d > new Date(endDate).getTime() + 86400000) return false
      return true
    })

    return {
      sales: filteredSales.reduce((s, x) => s + x.grand_total, 0),
      purchases: filteredPurchases.reduce((s, p) => s + getPurchaseTotal(p), 0),
      expenses: filteredExpenses.reduce((s, e) => s + e.amount, 0),
      profit: filteredSales.reduce((s, x) => s + getSaleProfit(x), 0),
      saleCount: filteredSales.length,
      purchaseCount: filteredPurchases.length,
    }
  }

  const computeAndSetStats = () => {
    if (!rawData) return
    const rangeA = getRange(filterA)
    const rangeB = getRange(filterB)
    setStatsA(computePeriodStats(rawData.sales, rawData.purchases, rawData.expenses, rangeA.startDate, rangeA.endDate))
    setStatsB(computePeriodStats(rawData.sales, rawData.purchases, rawData.expenses, rangeB.startDate, rangeB.endDate))
  }

  const formatCurr = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100

  const ComparisonCard = ({
    title,
    valA,
    valB,
    labelA,
    labelB,
    format = formatCurr,
  }: {
    title: string
    valA: number
    valB: number
    labelA: string
    labelB: string
    format?: (v: number) => string
  }) => {
    const pct = pctChange(valA, valB)
    const trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'
    const isProfit = title.toLowerCase().includes('profit')

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1 truncate" title={labelA}>{labelA}</p>
            <p className="text-xl font-bold text-gray-900">{format(valA)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1 truncate" title={labelB}>{labelB}</p>
            <p className="text-xl font-bold text-gray-700">{format(valB)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          {trend === 'up' && (
            <ArrowUpRight className={`w-5 h-5 flex-shrink-0 ${isProfit ? 'text-green-600' : 'text-red-600'}`} />
          )}
          {trend === 'down' && (
            <ArrowDownRight className={`w-5 h-5 flex-shrink-0 ${isProfit ? 'text-red-600' : 'text-green-600'}`} />
          )}
          {trend === 'neutral' && <Minus className="w-5 h-5 text-gray-400 flex-shrink-0" />}
          <span
            className={`font-semibold ${
              trend === 'neutral'
                ? 'text-gray-500'
                : (isProfit && trend === 'up') || (!isProfit && trend === 'down')
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {pct >= 0 ? '+' : ''}
            {pct.toFixed(1)}%
          </span>
          <span className="text-sm text-gray-500">Period A vs Period B</span>
        </div>
      </div>
    )
  }

  const rangeA = getRange(filterA)
  const rangeB = getRange(filterB)
  const labelA = formatPeriodLabel(filterA, rangeA)
  const labelB = formatPeriodLabel(filterB, rangeB)

  const exportToExcel = () => {
    if (!statsA || !statsB) return
    const headers = ['Metric', `Period A (${labelA})`, `Period B (${labelB})`, '% Change']
    const mPct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100)
    const rows: (string | number)[][] = [
      ['Sales', statsA.sales, statsB.sales, mPct(statsA.sales, statsB.sales)],
      ['Purchases', statsA.purchases, statsB.purchases, mPct(statsA.purchases, statsB.purchases)],
      ['Expenses', statsA.expenses, statsB.expenses, mPct(statsA.expenses, statsB.expenses)],
      ['Profit', statsA.profit, statsB.profit, mPct(statsA.profit, statsB.profit)],
    ]
    exportMultiSheetExcel([{ sheetName: 'Comparative Report', headers, rows }], 'Comparative_Report.xlsx')
  }

  const exportToPDF = () => {
    if (!statsA || !statsB) return
    const headers = ['Metric', `Period A (${labelA})`, `Period B (${labelB})`, '% Chg']
    const rows = [
      ['Sales', formatCurr(statsA.sales), formatCurr(statsB.sales), `${pctChange(statsA.sales, statsB.sales).toFixed(1)}%`],
      ['Purchases', formatCurr(statsA.purchases), formatCurr(statsB.purchases), `${pctChange(statsA.purchases, statsB.purchases).toFixed(1)}%`],
      ['Expenses', formatCurr(statsA.expenses), formatCurr(statsB.expenses), `${pctChange(statsA.expenses, statsB.expenses).toFixed(1)}%`],
      ['Profit', formatCurr(statsA.profit), formatCurr(statsB.profit), `${pctChange(statsA.profit, statsB.profit).toFixed(1)}%`],
    ]
    exportDataToPDF(rows, headers, 'Comparative_Report.pdf', 'Comparative Report')
  }

  const FilterSection = ({
    label,
    filter,
    onChange,
  }: {
    label: string
    filter: PeriodFilter
    onChange: (f: PeriodFilter) => void
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 mb-3">{label}</p>
      <div className="space-y-3">
        <select
          value={filter.preset}
          onChange={e => onChange({ ...filter, preset: e.target.value as ReportTimePeriod })}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800"
        >
          {PERIOD_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {filter.preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={filter.customStart}
                onChange={e => onChange({ ...filter, customStart: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={filter.customEnd}
                onChange={e => onChange({ ...filter, customEnd: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <Home className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Comparative Reports</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Compare any two periods with dynamic filters
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadRawData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportToExcel}
                disabled={loading || !statsA}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Excel
              </button>
              <button
                onClick={exportToPDF}
                disabled={loading || !statsA}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dynamic Filters */}
        <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            Select periods to compare
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FilterSection label="Period A (first period)" filter={filterA} onChange={setFilterA} />
            <FilterSection label="Period B (second period)" filter={filterB} onChange={setFilterB} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              {labelA} vs {labelB}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsA && statsB && (
                <>
                  <ComparisonCard
                    title="Sales"
                    valA={statsA.sales}
                    valB={statsB.sales}
                    labelA={`Period A (${statsA.saleCount} invoices)`}
                    labelB={`Period B (${statsB.saleCount} invoices)`}
                  />
                  <ComparisonCard
                    title="Purchases"
                    valA={statsA.purchases}
                    valB={statsB.purchases}
                    labelA={`Period A (${statsA.purchaseCount})`}
                    labelB={`Period B (${statsB.purchaseCount})`}
                  />
                  <ComparisonCard
                    title="Expenses"
                    valA={statsA.expenses}
                    valB={statsB.expenses}
                    labelA="Period A"
                    labelB="Period B"
                  />
                  <ComparisonCard
                    title="Profit"
                    valA={statsA.profit}
                    valB={statsB.profit}
                    labelA="Period A"
                    labelB="Period B"
                  />
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default ComparativeReports
