import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supplierPaymentService } from '../services/supplierPaymentService'
import { supplierService } from '../services/purchaseService'
import { SupplierAccountSummary } from '../types/supplierPayment'
import { Supplier } from '../types/purchase'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  Home,
  ArrowLeft,
  Plus,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Trash2,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react'
import { exportMultiSheetExcel, exportSupplierAccountReportToPDF } from '../utils/exportUtils'
import { useToast } from '../context/ToastContext'

const SupplierAccount = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPartyLedger = (location.state as { from?: string })?.from === 'party-ledger'
  const { getCurrentCompanyId, hasPermission } = useAuth()
  const { toast } = useToast()
  const companyId = getCurrentCompanyId()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [accountSummary, setAccountSummary] = useState<SupplierAccountSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id, companyId])

  const loadData = async () => {
    if (!id) return

    setLoading(true)
    try {
      const supplierId = parseInt(id)
      const [supplierData, summary] = await Promise.all([
        supplierService.getById(supplierId),
        supplierPaymentService.getAccountSummary(supplierId, companyId),
      ])

      setSupplier(supplierData || null)
      setAccountSummary(summary)
    } catch (error) {
      console.error('Error loading supplier account:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to delete this payment? This cannot be undone.')) return
    try {
      await supplierPaymentService.deletePayment(paymentId)
      await loadData()
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert('Failed to delete payment.')
    }
  }

  const getCheckStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: AlertCircle },
      cleared: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle },
      bounced: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <span className={`px-2 py-1 ${config.bg} ${config.text} border ${config.border} rounded-lg text-xs font-semibold flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const exportToExcelReport = () => {
    const safeName = (supplier?.name || 'Supplier').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)
    const filename = `Supplier_Account_${safeName}_${new Date().toISOString().split('T')[0]}`
    const sheets: { sheetName: string; headers: string[]; rows: any[][] }[] = [
      {
        sheetName: 'Summary',
        headers: ['Metric', 'Amount'],
        rows: [
          ['Total Purchases', accountSummary!.total_purchases.toFixed(2)],
          ['Total Paid', accountSummary!.total_paid.toFixed(2)],
          ['Pending Amount', accountSummary!.pending_amount.toFixed(2)],
        ],
      },
      {
        sheetName: 'Payment History',
        headers: ['Date', 'Purchase Invoice', 'Amount', 'Payment Method', 'Reference'],
        rows: accountSummary!.payment_history.map(p => [
          new Date(p.payment_date).toLocaleDateString('en-IN'),
          p.purchase_invoice_number || '-',
          p.amount.toFixed(2),
          p.payment_method,
          p.reference_number || '-',
        ]),
      },
      {
        sheetName: 'Upcoming Checks',
        headers: ['Check Number', 'Bank', 'Amount', 'Due Date', 'Status'],
        rows: accountSummary!.upcoming_checks.map(c => [
          c.check_number,
          c.bank_name || '-',
          c.amount.toFixed(2),
          new Date(c.due_date).toLocaleDateString('en-IN'),
          c.status,
        ]),
      },
      {
        sheetName: 'Overdue Checks',
        headers: ['Check Number', 'Bank', 'Amount', 'Due Date', 'Status'],
        rows: accountSummary!.overdue_checks.map(c => [
          c.check_number,
          c.bank_name || '-',
          c.amount.toFixed(2),
          new Date(c.due_date).toLocaleDateString('en-IN'),
          c.status,
        ]),
      },
      {
        sheetName: 'Check History',
        headers: ['Check Number', 'Bank', 'Amount', 'Issue Date', 'Due Date', 'Status', 'Cleared Date'],
        rows: accountSummary!.check_history.map(c => [
          c.check_number,
          c.bank_name || '-',
          c.amount.toFixed(2),
          new Date(c.issue_date).toLocaleDateString('en-IN'),
          new Date(c.due_date).toLocaleDateString('en-IN'),
          c.status,
          c.cleared_date ? new Date(c.cleared_date).toLocaleDateString('en-IN') : '-',
        ]),
      },
    ]
    exportMultiSheetExcel(sheets, filename)
    toast.success('Report exported to Excel')
  }

  const exportToPDFReport = () => {
    const safeName = (supplier?.name || 'Supplier').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)
    const filename = `Supplier_Account_${safeName}_${new Date().toISOString().split('T')[0]}`
    exportSupplierAccountReportToPDF(
      supplier!.name,
      {
        total_purchases: accountSummary!.total_purchases,
        total_paid: accountSummary!.total_paid,
        pending_amount: accountSummary!.pending_amount,
      },
      accountSummary!.payment_history,
      accountSummary!.check_history,
      filename
    )
    toast.success('Report exported to PDF')
  }

  const getPaymentMethodBadge = (method: string) => {
    const methodLabels: Record<string, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      upi: 'UPI',
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      other: 'Other',
    }

    return (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold">
        {methodLabels[method] || method}
      </span>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="purchases:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading supplier account...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!supplier || !accountSummary) {
    return (
      <ProtectedRoute requiredPermission="purchases:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Supplier Not Found</h2>
            <p className="text-gray-600 mb-6">The supplier you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate(fromPartyLedger ? '/payments/party-ledger' : '/suppliers')}
              className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {fromPartyLedger ? 'Back to Party Ledger' : 'Back to Suppliers'}
            </button>
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
                  onClick={() => navigate(fromPartyLedger ? '/payments/party-ledger' : '/suppliers')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200 bg-white"
                  title={fromPartyLedger ? 'Back to Party Ledger Summary' : 'Back to Suppliers'}
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
                  <p className="text-sm text-gray-600 mt-1">Supplier Account Management</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
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
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200 bg-white"
                  title="Home"
                >
                  <Home className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Account Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Purchases</h3>
                <TrendingUp className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold">₹{accountSummary.total_purchases.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Total Paid</h3>
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold">₹{accountSummary.total_paid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>

            <div className={`bg-gradient-to-br ${accountSummary.pending_amount > 0 ? 'from-red-500 to-pink-600' : 'from-gray-500 to-gray-600'} rounded-2xl shadow-xl p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Pending Amount</h3>
                <TrendingDown className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold">₹{accountSummary.pending_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mb-8">
            {hasPermission('purchases:create') && (
              <>
                <button
                  onClick={() => navigate(`/suppliers/${id}/payment/new`)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Payment
                </button>
                <button
                  onClick={() => navigate(`/suppliers/${id}/check/new`)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Add Check
                </button>
              </>
            )}
          </div>

          {/* Upcoming Checks */}
          {accountSummary.upcoming_checks.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Checks ({accountSummary.upcoming_checks.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bank</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountSummary.upcoming_checks.map((check) => (
                      <tr key={check.id} className="hover:bg-blue-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{check.check_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{check.bank_name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{check.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(check.due_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">{getCheckStatusBadge(check.status)}</td>
                        <td className="px-4 py-3 text-right">
                          {hasPermission('purchases:update') && (
                            <button
                              onClick={() => navigate(`/suppliers/${id}/check/${check.id}/edit`)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Overdue Checks */}
          {accountSummary.overdue_checks.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-red-200">
              <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Overdue Checks ({accountSummary.overdue_checks.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bank</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountSummary.overdue_checks.map((check) => (
                      <tr key={check.id} className="hover:bg-red-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{check.check_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{check.bank_name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{check.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-red-600 font-semibold">{new Date(check.due_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">{getCheckStatusBadge(check.status)}</td>
                        <td className="px-4 py-3 text-right">
                          {hasPermission('purchases:update') && (
                            <button
                              onClick={() => navigate(`/suppliers/${id}/check/${check.id}/edit`)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Payment History
            </h2>
            {accountSummary.payment_history.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Purchase Invoice</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reference</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountSummary.payment_history.map((payment) => (
                      <tr key={payment.id} className="hover:bg-green-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{new Date(payment.payment_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{payment.purchase_invoice_number || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">₹{payment.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3">{getPaymentMethodBadge(payment.payment_method)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{payment.reference_number || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('purchases:update') && (
                              <button
                                onClick={() => navigate(`/suppliers/${id}/payment/${payment.id}/edit`)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                            )}
                            {(hasPermission('purchases:delete') || hasPermission('purchases:update')) && (
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-sm text-gray-700">Total paid (Payments)</td>
                      <td className="px-4 py-3 text-sm text-green-700 text-right">₹{accountSummary.payment_history.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td colSpan={3} className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Check History */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Check History
            </h2>
            {accountSummary.check_history.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No checks recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bank</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Issue Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cleared Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountSummary.check_history.map((check) => (
                      <tr key={check.id} className="hover:bg-blue-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{check.check_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{check.bank_name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{check.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(check.issue_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(check.due_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">{getCheckStatusBadge(check.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{check.cleared_date ? new Date(check.cleared_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {hasPermission('purchases:update') && (
                            <button
                              onClick={() => navigate(`/suppliers/${id}/check/${check.id}/edit`)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reconciliation Summary */}
          <div className="bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl shadow-xl p-6 border border-slate-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reconciliation Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-gray-600 mb-1">Total Purchases</p>
                <p className="text-xl font-bold text-gray-900">₹{accountSummary.total_purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                <p className="text-xl font-bold text-green-600">₹{accountSummary.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-gray-600 mb-1">Outstanding / Pending</p>
                <p className={`text-xl font-bold ${accountSummary.pending_amount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  ₹{accountSummary.pending_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Total Paid = Payments recorded + Amount paid at purchase. Outstanding = Total Purchases − Total Paid.
            </p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SupplierAccount




