import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlanUpgrade } from '../context/PlanUpgradeContext'
import { useToast } from '../context/ToastContext'
import { serviceRecordService } from '../services/serviceRecordService'
import { reportService } from '../services/reportService'
import { exportToExcel, exportDataToPDF } from '../utils/exportUtils'
import type { ReportTimePeriod } from '../types/reports'
import type { ServiceRecord, ServiceVehicleType } from '../types/serviceRecord'
import { SERVICE_PAYMENT_METHODS, getServiceTotal } from '../types/serviceRecord'
import { Home, ChevronRight, Calendar, DollarSign, Receipt, FileText, Filter, Download, FileDown } from 'lucide-react'
import { LockIcon } from '../components/icons/LockIcon'

const VALID_VEHICLE_TYPES: ServiceVehicleType[] = ['bike', 'car', 'ebike', 'ecar']
const TIME_PERIODS: { value: ReportTimePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This week' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
]

export default function ServiceReports() {
  const navigate = useNavigate()
  const { vehicleType: paramType } = useParams<{ vehicleType: string }>()
  const { hasPermission, hasPlanFeature, getCurrentCompanyId } = useAuth()
  const { showPlanUpgrade } = usePlanUpgrade()
  const { toast } = useToast()

  const vehicleType: ServiceVehicleType = (VALID_VEHICLE_TYPES.includes((paramType as ServiceVehicleType))
    ? paramType
    : 'bike') as ServiceVehicleType

  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!paramType || !VALID_VEHICLE_TYPES.includes(paramType as ServiceVehicleType)) {
      navigate('/services/bike/report', { replace: true })
      return
    }
    if ((paramType === 'ebike' || paramType === 'ecar') && !hasPlanFeature('services_ebike_ecar')) {
      navigate('/services/bike/report', { replace: true })
    }
  }, [paramType, hasPlanFeature, navigate])

  const { startDate, endDate } = reportService.getDateRange(timePeriod, customStart, customEnd)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const companyId = getCurrentCompanyId()
        const all = await serviceRecordService.getAll(companyId, vehicleType)
        let list = all.filter((r) => (r.status || 'draft') === 'completed')
        if (startDate || endDate) {
          list = list.filter((r) => {
            const t = new Date(r.service_date).getTime()
            if (startDate && t < new Date(startDate).getTime()) return false
            if (endDate && t > new Date(endDate + 'T23:59:59').getTime()) return false
            return true
          })
        }
        list.sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())
        setRecords(list)
      } catch (e) {
        console.error('Failed to load service report:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [vehicleType, getCurrentCompanyId, startDate, endDate])

  const totalAmount = useMemo(() => records.reduce((sum, r) => sum + r.amount, 0), [records])
  const paidCount = useMemo(() => records.filter((r) => r.payment_status === 'paid').length, [records])

  const label = vehicleType === 'ebike' ? 'E-bike' : vehicleType === 'ecar' ? 'E-car' : vehicleType
  const canExport = hasPlanFeature('services_export')

  const reportHeaders = ['Date', 'Customer', 'Vehicle no.', 'Service type', 'Amount', 'Parts', 'Total', 'Payment status', 'Payment method', 'Receipt no.']
  const reportRows = records.map((r) => [
    new Date(r.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    r.customer_name || '',
    r.vehicle_number || '',
    r.service_type || '',
    r.amount,
    r.parts_total ?? 0,
    getServiceTotal(r),
    r.payment_status === 'paid' ? 'Paid' : 'Pending',
    (r.payment_method && SERVICE_PAYMENT_METHODS[r.payment_method]) || r.payment_method || '',
    r.receipt_number || '',
  ])
  const reportFilename = `service_report_${label.replace(/\s/g, '_')}_${startDate || 'all'}_${endDate || 'all'}`
  const reportTitle = `${label} Service Report`

  const handleExportExcel = () => {
    exportToExcel(reportRows, reportHeaders, reportFilename, reportTitle)
    toast.success('Report exported to Excel')
  }

  const handleExportPDF = () => {
    exportDataToPDF(reportRows, reportHeaders, reportFilename, reportTitle, { orientation: 'landscape' })
    toast.success('Report exported to PDF')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <button type="button" onClick={() => navigate('/')} className="hover:text-blue-600 font-medium">
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button type="button" onClick={() => navigate('/services/bike')} className="hover:text-blue-600 font-medium">
              Services
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button type="button" onClick={() => navigate(`/services/${vehicleType}`)} className="hover:text-blue-600 font-medium">
              {label}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">Report</span>
          </nav>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(`/services/${vehicleType}`)}
                className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200 bg-white"
                title="Back to list"
              >
                <Home className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-7 h-7" />
                  {label} service report
                </h1>
                <p className="text-sm text-gray-600 mt-1">Completed services · payment & receipt</p>
              </div>
            </div>
            {records.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={canExport ? handleExportPDF : () => showPlanUpgrade('services_export')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${
                    canExport
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border border-gray-300'
                  }`}
                  title={canExport ? 'Export to PDF' : 'Upgrade to Premium Plus to export'}
                >
                  {canExport ? <FileDown className="w-5 h-5" /> : <LockIcon className="w-5 h-5" />}
                  PDF
                </button>
                <button
                  type="button"
                  onClick={canExport ? handleExportExcel : () => showPlanUpgrade('services_export')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${
                    canExport
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border border-gray-300'
                  }`}
                  title={canExport ? 'Export to Excel (Premium Plus)' : 'Upgrade to Premium Plus to export'}
                >
                  {canExport ? <Download className="w-5 h-5" /> : <LockIcon className="w-5 h-5" />}
                  Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period filter */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Period
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {TIME_PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setTimePeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  timePeriod === p.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            {timePeriod === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}
          </div>
          {(startDate || endDate) && (
            <p className="text-xs text-gray-500 mt-2">
              {startDate} {endDate && `– ${endDate}`}
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-blue-100 text-sm mb-1">Total amount</p>
                <p className="text-3xl font-bold flex items-center gap-2">
                  <DollarSign className="w-8 h-8" />
                  ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Completed jobs</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Paid</p>
                <p className="text-2xl font-bold">{paidCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No completed services in this period.</p>
              <p className="text-sm mt-1">Change period or complete more jobs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vehicle no.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Service type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Receipt #</th>
                    {hasPermission('services:read') && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(r.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.vehicle_number || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">{r.service_type || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        ₹{r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${r.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                        {r.payment_method && (
                          <span className="ml-1 text-gray-600 text-xs">{SERVICE_PAYMENT_METHODS[r.payment_method] || r.payment_method}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.receipt_number || '—'}</td>
                      {hasPermission('services:read') && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/services/${vehicleType}/${r.id}/receipt`)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg font-medium"
                          >
                            <Receipt className="w-4 h-4" />
                            Receipt
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
