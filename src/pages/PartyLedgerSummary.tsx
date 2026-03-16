import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supplierPaymentService } from '../services/supplierPaymentService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { exportToExcel, exportDataToPDF } from '../utils/exportUtils'
import { useToast } from '../context/ToastContext'
import type { ReportTimePeriod } from '../types/reports'
import { Home, Building2, Search, Eye, FileText, Plus, Edit3, FileSpreadsheet, FileDown } from 'lucide-react'

interface SupplierSummary {
  id: number
  name: string
  pending_amount: number
  total_amount: number
  paid_amount: number
}

const PartyLedgerSummary = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [reportFilter, setReportFilter] = useState<'all' | 'outstanding'>('all')
  const [timePeriod, setTimePeriod] = useState<ReportTimePeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const supplierSummaries = await supplierPaymentService.getSupplierLedgerSummariesFast(companyId)
      const list: SupplierSummary[] = supplierSummaries.map(s => ({
        id: s.supplier_id,
        name: s.supplier_name,
        pending_amount: s.pending_amount,
        total_amount: s.total_purchases,
        paid_amount: s.total_paid,
      }))
      setSuppliers(list)
    } catch (error) {
      console.error('Error loading party ledger:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = suppliers.filter(s => {
    const q = searchQuery.trim().toLowerCase()
    return !q || s.name.toLowerCase().includes(q)
  })

  const totalPending = filtered.reduce((s, p) => s + p.pending_amount, 0)
  const reportData = reportFilter === 'outstanding' ? filtered.filter(s => s.pending_amount > 0) : filtered
  const periodLabel = timePeriod === 'all' ? 'All Time' : timePeriod === 'thisWeek' ? 'This Week' : timePeriod === 'lastWeek' ? 'Last Week' : timePeriod === 'thisMonth' ? 'This Month' : timePeriod === 'lastMonth' ? 'Last Month' : timePeriod === 'thisYear' ? 'This Year' : timePeriod === 'lastYear' ? 'Last Year' : timePeriod === 'custom' && customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)

  const exportToExcelReport = () => {
    const headers = ['Supplier', 'Total Purchases', 'Paid', 'Outstanding']
    const rows = reportData.map(s => [
      s.name,
      s.total_amount.toFixed(2),
      s.paid_amount.toFixed(2),
      s.pending_amount.toFixed(2),
    ])
    const filename = `Party_Ledger_Summary_${reportFilter}_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    exportToExcel(rows, headers, filename, 'Party Ledger Summary')
    toast.success('Report exported to Excel')
  }

  const exportToPDFReport = () => {
    const headers = ['Supplier', 'Total Purchases', 'Paid', 'Outstanding']
    const rows = reportData.map(s => [
      s.name,
      `Rs.${s.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `Rs.${s.paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `Rs.${s.pending_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    ])
    const filename = `Party_Ledger_Summary_${reportFilter}_${timePeriod}_${new Date().toISOString().split('T')[0]}`
    const title = `Party Ledger Summary (${reportFilter === 'outstanding' ? 'With Outstanding' : 'All Suppliers'}) - ${periodLabel}`
    exportDataToPDF(rows, headers, filename, title, { orientation: 'landscape' })
    toast.success('Report exported to PDF')
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
                  <h1 className="text-3xl font-bold text-gray-900">Party Ledger Summary</h1>
                  <p className="text-sm text-gray-600 mt-1">Supplier ledger summary with total purchases, paid, and outstanding amounts</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">Report period:</span>
                  <select
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value as ReportTimePeriod)}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="thisYear">This Year</option>
                    <option value="all">All Time</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {timePeriod === 'custom' && (
                    <span className="flex items-center gap-1">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                      />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value as 'all' | 'outstanding')}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="all">All suppliers</option>
                    <option value="outstanding">With outstanding only</option>
                  </select>
                  <button
                    onClick={exportToExcelReport}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                    title="Export to Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={exportToPDFReport}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                    title="Export to PDF"
                  >
                    <FileDown className="w-4 h-4" />
                    PDF
                  </button>
                </div>
                <button
                onClick={() => navigate('/payments/outstanding')}
                className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg border border-orange-200 transition-colors"
              >
                Outstanding Payments
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-xl p-6 border border-white/50 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Suppliers</p>
                  <p className="text-3xl font-bold">{filtered.length}</p>
                </div>
                <Building2 className="w-12 h-12 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-xl p-6 border border-white/50 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Total Outstanding</p>
                  <p className="text-3xl font-bold">₹{totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-4 mb-6 border border-white/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by supplier name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-white/50">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading party ledger...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No suppliers found</h3>
                <p className="text-gray-600">No suppliers with purchases in the system.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Total Purchases</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Paid</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Outstanding</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{s.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          ₹{s.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                          ₹{s.paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-semibold ${s.pending_amount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            ₹{s.pending_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasPermission('purchases:read') && (
                              <button
                                onClick={() => navigate(`/suppliers/${s.id}/account`, { state: { from: 'party-ledger' } })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded"
                                title="View ledger"
                              >
                                <Eye className="w-3 h-3" />
                                Ledger
                              </button>
                            )}
                            {hasPermission('purchases:create') && (
                              <button
                                onClick={() => navigate(`/suppliers/${s.id}/payment/new`, { state: { from: 'party-ledger' } })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded"
                                title="Add payment"
                              >
                                <Plus className="w-3 h-3" />
                                Add Payment
                              </button>
                            )}
                            {hasPermission('purchases:update') && (
                              <button
                                onClick={() => navigate(`/suppliers/${s.id}/account`, { state: { from: 'party-ledger', changeStatus: true } })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                                title="Change payment status"
                              >
                                <Edit3 className="w-3 h-3" />
                                Change status
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default PartyLedgerSummary
