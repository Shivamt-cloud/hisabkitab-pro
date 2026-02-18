import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { expenseService } from '../services/expenseService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { getLocalLocale } from '../utils/pricing'
import { Expense, ExpenseType } from '../types/expense'
import { Plus, Search, Edit, Trash2, Home, DollarSign, Calendar, User, BarChart3 } from 'lucide-react'

const Expenses = () => {
  const navigate = useNavigate()
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<ExpenseType | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const allExpenses = await expenseService.getAll(companyId)
      setExpenses(allExpenses)
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      if (hasPermission('expenses:delete')) {
        await expenseService.delete(id)
        loadExpenses()
      } else {
        alert('You do not have permission to delete expenses')
      }
    }
  }

  const expenseTypeLabels: Record<ExpenseType, string> = {
    opening: 'Opening Balance',
    closing: 'Closing Balance',
    salary: 'Employee Salary',
    sales_person_payment: 'Sales Person Payment',
    employee_commission: 'Employee Commission',
    employee_goods_purchase: 'Employee Goods Purchase',
    purchase: 'Purchase',
    transport: 'Transport',
    office: 'Office',
    utility: 'Utility',
    maintenance: 'Maintenance',
    marketing: 'Marketing',
    other: 'Other',
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchQuery || 
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.sales_person_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = filterType === 'all' || expense.expense_type === filterType
    
    return matchesSearch && matchesType
  })

  const totalExpenses = filteredExpenses
    .filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing')
    .reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="expenses:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading expenses...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="expenses:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
                  <h1 className="text-3xl font-bold text-gray-900">Daily Expenses</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage and track daily expenses</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasPermission('reports:read') && (
                  <button
                    onClick={() => navigate('/reports/expenses')}
                    className="bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                    title="Expense Reports"
                  >
                    <BarChart3 className="w-5 h-5" />
                    Reports
                  </button>
                )}
                {hasPermission('expenses:create') && (
                  <>
                    <button
                      onClick={() => navigate('/expenses/new?type=opening')}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 transform hover:scale-105"
                    title="Add Opening Balance"
                  >
                    <Plus className="w-5 h-5" />
                    Opening
                  </button>
                  <button
                    onClick={() => navigate('/expenses/new?type=closing')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 transform hover:scale-105"
                    title="Add Closing Balance"
                  >
                    <Plus className="w-5 h-5" />
                    Closing
                  </button>
                  <button
                    onClick={() => navigate('/expenses/new')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 transform hover:scale-105"
                  >
                    <Plus className="w-5 h-5" />
                    Add Expense
                  </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm mb-1">Total Expenses</p>
                <p className="text-3xl font-bold">₹{totalExpenses.toLocaleString(getLocalLocale(), { maximumFractionDigits: 2 })}</p>
                <p className="text-red-100 text-sm mt-1">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}</p>
              </div>
              <DollarSign className="w-12 h-12 opacity-80" />
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by description, sales person, or receipt number..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as ExpenseType | 'all')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="all">All Expense Types</option>
                  {Object.entries(expenseTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Sales Person</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Payment</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No expenses found
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-900">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(expense.expense_date).toLocaleDateString(getLocalLocale(), {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                            {expenseTypeLabels[expense.expense_type]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{expense.description}</div>
                          {expense.receipt_number && (
                            <div className="text-xs text-gray-500">Receipt: {expense.receipt_number}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {expense.sales_person_name ? (
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <User className="w-4 h-4 text-gray-400" />
                              {expense.sales_person_name}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-red-600">
                            {expense.expense_type === 'opening' || expense.expense_type === 'closing'
                              ? (() => {
                                  const manual = expense.manual_extra || {}
                                  const manualSum = (manual.cash || 0) + (manual.upi || 0) + (manual.card || 0) + (manual.other || 0)
                                  const grandTotal = expense.amount + manualSum
                                  return <>₹{grandTotal.toLocaleString(getLocalLocale(), { maximumFractionDigits: 2 })}</>
                                })()
                              : <>₹{expense.amount.toLocaleString(getLocalLocale(), { maximumFractionDigits: 2 })}</>
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {expense.expense_type === 'opening' || expense.expense_type === 'closing' ? (
                            (() => {
                              const manual = expense.manual_extra || {}
                              const parts: string[] = []
                              if (expense.expense_type === 'closing') {
                                if (expense.amount > 0) parts.push(`Cash ₹${expense.amount.toLocaleString(getLocalLocale(), { maximumFractionDigits: 0 })}`)
                                if ((manual.cash || 0) > 0) parts.push(`Cash(sales) ₹${(manual.cash || 0).toLocaleString(getLocalLocale(), { maximumFractionDigits: 0 })}`)
                              } else {
                                const cashPart = expense.amount - ((manual.upi || 0) + (manual.card || 0) + (manual.other || 0))
                                if (cashPart > 0) parts.push(`Cash ₹${cashPart.toLocaleString(getLocalLocale(), { maximumFractionDigits: 0 })}`)
                              }
                              if ((manual.upi || 0) > 0) parts.push(`UPI ₹${(manual.upi || 0).toLocaleString(getLocalLocale(), { maximumFractionDigits: 0 })}`)
                              if ((manual.card || 0) > 0) parts.push(`Card ₹${(manual.card || 0).toLocaleString(getLocalLocale(), { maximumFractionDigits: 0 })}`)
                              if ((manual.other || 0) > 0) parts.push(`Other ₹${(manual.other || 0).toLocaleString(getLocalLocale(), { maximumFractionDigits: 0 })}`)
                              return (
                                <span className="text-xs text-gray-600">
                                  {parts.length > 0 ? parts.join(' · ') : <span className="capitalize">{expense.payment_method}</span>}
                                </span>
                              )
                            })()
                          ) : (
                            <span className="text-xs text-gray-600 capitalize">{expense.payment_method}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {hasPermission('expenses:update') && (
                              <button
                                onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission('expenses:delete') && (
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default Expenses

