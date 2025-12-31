import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supplierPaymentService } from '../services/supplierPaymentService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  Home,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
} from 'lucide-react'
import { SupplierCheck, CheckStatus } from '../types/supplierPayment'

const UpcomingChecks = () => {
  const navigate = useNavigate()
  const { getCurrentCompanyId, hasPermission } = useAuth()
  const companyId = getCurrentCompanyId()

  const [upcomingChecks, setUpcomingChecks] = useState<SupplierCheck[]>([])
  const [overdueChecks, setOverdueChecks] = useState<SupplierCheck[]>([])
  const [allChecks, setAllChecks] = useState<SupplierCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<CheckStatus | 'all'>('all')
  const [daysAhead, setDaysAhead] = useState(30)

  useEffect(() => {
    loadChecks()
  }, [companyId, daysAhead])

  const loadChecks = async () => {
    setLoading(true)
    try {
      const [upcoming, overdue, all] = await Promise.all([
        supplierPaymentService.getUpcomingChecks(companyId, daysAhead),
        supplierPaymentService.getOverdueChecks(companyId),
        // Get all checks by loading from all suppliers
        (async () => {
          const { supplierService } = await import('../services/purchaseService')
          const suppliers = await supplierService.getAll(companyId)
          const allChecksList: SupplierCheck[] = []
          for (const supplier of suppliers) {
            const checks = await supplierPaymentService.getChecksBySupplier(supplier.id, companyId)
            allChecksList.push(...checks)
          }
          return allChecksList.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
        })(),
      ])

      setUpcomingChecks(upcoming)
      setOverdueChecks(overdue)
      setAllChecks(all)
    } catch (error) {
      console.error('Error loading checks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCheckStatusBadge = (status: CheckStatus) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: AlertCircle },
      cleared: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle },
      bounced: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: XCircle },
    }

    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon

    return (
      <span className={`px-2 py-1 ${config.bg} ${config.text} border ${config.border} rounded-lg text-xs font-semibold flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredChecks = useMemo(() => {
    if (filterStatus === 'all') {
      return allChecks
    }
    return allChecks.filter(check => check.status === filterStatus)
  }, [allChecks, filterStatus])

  const summary = useMemo(() => {
    const totalAmount = filteredChecks.reduce((sum, check) => sum + check.amount, 0)
    const pendingAmount = filteredChecks.filter(c => c.status === 'pending').reduce((sum, check) => sum + check.amount, 0)
    const clearedAmount = filteredChecks.filter(c => c.status === 'cleared').reduce((sum, check) => sum + check.amount, 0)
    
    return {
      total: filteredChecks.length,
      totalAmount,
      pending: filteredChecks.filter(c => c.status === 'pending').length,
      pendingAmount,
      cleared: filteredChecks.filter(c => c.status === 'cleared').length,
      clearedAmount,
      overdue: overdueChecks.length,
      overdueAmount: overdueChecks.reduce((sum, check) => sum + check.amount, 0),
      upcoming: upcomingChecks.length,
      upcomingAmount: upcomingChecks.reduce((sum, check) => sum + check.amount, 0),
    }
  }, [filteredChecks, overdueChecks, upcomingChecks])

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="purchases:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading checks...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="purchases:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200 bg-white"
                  title="Back to Dashboard"
                >
                  <Home className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Upcoming Checks</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage and track supplier checks</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={daysAhead}
                  onChange={(e) => setDaysAhead(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={7}>Next 7 days</option>
                  <option value={15}>Next 15 days</option>
                  <option value={30}>Next 30 days</option>
                  <option value={60}>Next 60 days</option>
                  <option value={90}>Next 90 days</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Checks</h3>
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold">{summary.total}</p>
              <p className="text-blue-100 text-sm mt-2">₹{summary.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Upcoming</h3>
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold">{summary.upcoming}</p>
              <p className="text-yellow-100 text-sm mt-2">₹{summary.upcomingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Overdue</h3>
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold">{summary.overdue}</p>
              <p className="text-red-100 text-sm mt-2">₹{summary.overdueAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Pending</h3>
                <TrendingUp className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold">{summary.pending}</p>
              <p className="text-green-100 text-sm mt-2">₹{summary.pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as CheckStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Overdue Checks */}
          {overdueChecks.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-red-200">
              <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Overdue Checks ({overdueChecks.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bank</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Days Overdue</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overdueChecks.map((check) => {
                      const daysOverdue = -getDaysUntilDue(check.due_date)
                      return (
                        <tr key={check.id} className="hover:bg-red-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{check.check_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.supplier_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.bank_name}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{check.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-sm text-red-600 font-semibold">{new Date(check.due_date).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm text-red-600 font-semibold">{daysOverdue} days</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/suppliers/${check.supplier_id}/account`)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              {hasPermission('purchases:update') && (
                                <button
                                  onClick={() => navigate(`/suppliers/${check.supplier_id}/check/${check.id}/edit`)}
                                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upcoming Checks */}
          {upcomingChecks.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Checks ({upcomingChecks.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bank</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Days Until Due</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {upcomingChecks.map((check) => {
                      const daysUntil = getDaysUntilDue(check.due_date)
                      return (
                        <tr key={check.id} className="hover:bg-blue-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{check.check_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.supplier_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.bank_name}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{check.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{new Date(check.due_date).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600">{daysUntil} days</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/suppliers/${check.supplier_id}/account`)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              {hasPermission('purchases:update') && (
                                <button
                                  onClick={() => navigate(`/suppliers/${check.supplier_id}/check/${check.id}/edit`)}
                                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Checks */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              All Checks ({filteredChecks.length})
            </h2>
            {filteredChecks.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No checks found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bank</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredChecks.map((check) => {
                      const daysUntil = getDaysUntilDue(check.due_date)
                      const isOverdue = daysUntil < 0
                      return (
                        <tr key={check.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{check.check_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.supplier_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{check.bank_name}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{check.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                            {new Date(check.due_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3">{getCheckStatusBadge(check.status)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/suppliers/${check.supplier_id}/account`)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              {hasPermission('purchases:update') && (
                                <button
                                  onClick={() => navigate(`/suppliers/${check.supplier_id}/check/${check.id}/edit`)}
                                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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

export default UpcomingChecks



