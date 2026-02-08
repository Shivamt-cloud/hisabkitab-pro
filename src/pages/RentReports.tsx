import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rentService } from '../services/rentService'
import { reportService } from '../services/reportService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Rental, RentalStatus } from '../types/rental'
import type { ReportTimePeriod } from '../types/reports'
import { Home, FileSpreadsheet, Calendar, User, Package, Shield } from 'lucide-react'
import { exportToExcel } from '../utils/exportUtils'

const STATUS_LABELS: Record<RentalStatus, string> = {
  booked: 'Booked',
  picked_up: 'Picked up',
  returned: 'Returned',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

const PERIOD_OPTIONS: { value: ReportTimePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This week' },
  { value: 'lastWeek', label: 'Last week' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'thisYear', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'custom', label: 'Custom' },
  { value: 'all', label: 'All time' },
]

const RentReports = () => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState<RentalStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [rentals, setRentals] = useState<Rental[]>([])

  const companyId = getCurrentCompanyId() ?? undefined

  const { startDate, endDate } = reportService.getDateRange(
    timePeriod,
    customStartDate || undefined,
    customEndDate || undefined
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    rentService
      .getAllFast(companyId)
      .then((list) => {
        if (!cancelled) setRentals(list)
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e)
          toast.error('Failed to load rentals')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId])

  const filteredRentals = useMemo(() => {
    let list = rentals
    if (startDate && endDate && timePeriod !== 'all') {
      list = list.filter((r) => {
        const d = r.booking_date?.split('T')[0] ?? r.booking_date
        return d >= startDate && d <= endDate
      })
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter)
    }
    return list.sort(
      (a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
    )
  }, [rentals, startDate, endDate, timePeriod, statusFilter])

  const totals = useMemo(
    () => ({
      rent: filteredRentals.reduce((s, r) => s + r.total_rent_amount, 0),
      security: filteredRentals.reduce((s, r) => s + r.total_security_deposit, 0),
      count: filteredRentals.length,
    }),
    [filteredRentals]
  )

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  const formatCurrency = (n: number) =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const exportToExcelReport = () => {
    const headers = [
      'Rental #',
      'Customer',
      'Booking date',
      'Pickup',
      'Return',
      'Status',
      'Total rent (₹)',
      'Security (₹)',
    ]
    const rows = filteredRentals.map((r) => [
      r.rental_number,
      r.customer_name,
      r.booking_date?.split('T')[0] ?? '',
      r.pickup_date?.split('T')[0] ?? '',
      r.return_date?.split('T')[0] ?? '',
      STATUS_LABELS[r.status],
      r.total_rent_amount,
      r.total_security_deposit,
    ])
    const filename = `rent_report_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    exportToExcel(rows, headers, filename, 'Rent & Bookings')
    toast.success('Exported to Excel')
  }

  return (
    <ProtectedRoute requiredPermission="sales:read" requiredPlanFeature="sales_rent">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 hover:text-indigo-600"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <span>/</span>
            <button
              onClick={() => navigate('/rentals')}
              className="hover:text-indigo-600"
            >
              Rent & Bookings
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">Report</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-7 h-7 text-indigo-600" />
                Rent & Booking Report
              </h1>
              <p className="text-gray-600 mt-1">
                View rentals by period and status; export to Excel
              </p>
            </div>
            <button
              onClick={() => navigate('/rentals')}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
            >
              Back to Rentals
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value as ReportTimePeriod)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {timePeriod === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as RentalStatus | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All</option>
                  {(Object.keys(STATUS_LABELS) as RentalStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={exportToExcelReport}
                disabled={filteredRentals.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Export Excel
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-600">Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{totals.count}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Package className="w-4 h-4" /> Total rent
              </p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.rent)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Shield className="w-4 h-4 text-amber-500" /> Total security
              </p>
              <p className="text-2xl font-bold text-amber-700">{formatCurrency(totals.security)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading…</div>
            ) : filteredRentals.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No rentals in this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Rental #
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Booking
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Pickup
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Return
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Rent
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Security
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRentals.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm font-medium text-gray-900">
                          {r.rental_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {r.customer_name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(r.booking_date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(r.pickup_date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(r.return_date)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              r.status === 'returned'
                                ? 'bg-green-100 text-green-800'
                                : r.status === 'picked_up' || r.status === 'overdue'
                                  ? 'bg-amber-100 text-amber-800'
                                  : r.status === 'cancelled'
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {STATUS_LABELS[r.status]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(r.total_rent_amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-amber-700">
                          {formatCurrency(r.total_security_deposit)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate(`/rentals/${r.id}`)}
                            className="text-indigo-600 font-medium hover:underline text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default RentReports
