import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { expenseService } from '../services/expenseService'
import { salesPersonService } from '../services/salespersonService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Home, Save, X } from 'lucide-react'
import { Expense, ExpenseType, CashDenominations, ManualExtraAmounts } from '../types/expense'
import { SalesPerson } from '../types/salesperson'

const ExpenseForm = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { hasPermission, user, getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const isEditing = !!id
  
  // Get type from URL params for quick access
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get('type') as ExpenseType | null

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    expense_type: (typeParam && (typeParam === 'opening' || typeParam === 'closing')) ? typeParam : 'other' as ExpenseType,
    amount: '',
    description: '',
    sales_person_id: '',
    payment_method: 'cash' as 'cash' | 'card' | 'upi' | 'other',
    receipt_number: '',
    category: '',
  })

  const [manualExtra, setManualExtra] = useState<ManualExtraAmounts>({ cash: 0, upi: 0, card: 0, other: 0 })
  const [remark, setRemark] = useState('')

  const [cashDenominations, setCashDenominations] = useState<CashDenominations>({
    notes_2000: 0,
    notes_500: 0,
    notes_200: 0,
    notes_100: 0,
    notes_50: 0,
    notes_20: 0,
    notes_10: 0,
    coins_10: 0,
    coins_5: 0,
    coins_2: 0,
    coins_1: 0,
  })

  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const loadData = async () => {
      // Load sales persons
      const allSalesPersons = await salesPersonService.getAll(false)
      setSalesPersons(allSalesPersons)

      // Load expense if editing
      if (isEditing && id) {
        const expense = await expenseService.getById(parseInt(id))
        if (expense) {
          setFormData({
            expense_date: expense.expense_date.split('T')[0],
            expense_type: expense.expense_type,
            amount: expense.amount.toString(),
            description: expense.description,
            sales_person_id: expense.sales_person_id?.toString() || '',
            payment_method: expense.payment_method,
            receipt_number: expense.receipt_number || '',
            category: expense.category || '',
          })
          if (expense.cash_denominations) {
            setCashDenominations(expense.cash_denominations)
          }
          if (expense.manual_extra) {
            setManualExtra(expense.manual_extra)
          }
          setRemark(expense.remark || '')
        }
      }
    }
    loadData()
  }, [isEditing, id])

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.expense_date) {
      newErrors.expense_date = 'Expense date is required'
    }

    const cashTotal = (formData.expense_type === 'opening' || formData.expense_type === 'closing')
      ? calculateTotalFromDenominations(cashDenominations)
      : parseFloat(formData.amount) || 0
    const manualTotal = (manualExtra.cash || 0) + (manualExtra.upi || 0) + (manualExtra.card || 0) + (manualExtra.other || 0)
    const totalAmount = (formData.expense_type === 'opening' || formData.expense_type === 'closing')
      ? cashTotal + manualTotal
      : parseFloat(formData.amount) || 0
    if (totalAmount <= 0) {
      newErrors.amount = 'Valid amount is required (cash denominations + manual/extra)'
    }

    if (!formData.description.trim() && formData.expense_type !== 'opening' && formData.expense_type !== 'closing') {
      newErrors.description = 'Description is required'
    }

    const employeeRelatedTypes = ['sales_person_payment', 'salary', 'employee_commission', 'employee_goods_purchase']
    const salaryTypesRequireSalesPerson = employeeRelatedTypes.includes(formData.expense_type)
    if (salaryTypesRequireSalesPerson && !formData.sales_person_id) {
      newErrors.sales_person_id = 'Sales person is required (payment will appear in Employee Salary)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      const selectedSalesPerson = formData.sales_person_id 
        ? salesPersons.find(sp => sp.id === parseInt(formData.sales_person_id))
        : null

      const cashTotal = (formData.expense_type === 'opening' || formData.expense_type === 'closing')
        ? calculateTotalFromDenominations(cashDenominations)
        : 0
      const manualTotal = (formData.expense_type === 'opening' || formData.expense_type === 'closing')
        ? (manualExtra.cash || 0) + (manualExtra.upi || 0) + (manualExtra.card || 0) + (manualExtra.other || 0)
        : 0
      // Opening: amount = cash + manual (full total). Closing: amount = cash only (manual is for report; physical cash is in denominations)
      const finalAmount = formData.expense_type === 'opening'
        ? cashTotal + manualTotal
        : formData.expense_type === 'closing'
          ? cashTotal
          : parseFloat(formData.amount)

      const expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'> = {
        expense_date: new Date(formData.expense_date).toISOString(),
        expense_type: formData.expense_type,
        amount: finalAmount,
        description: formData.description.trim() || (formData.expense_type === 'opening' ? 'Opening Balance' : formData.expense_type === 'closing' ? 'Closing Balance' : ''),
        sales_person_id: formData.sales_person_id ? parseInt(formData.sales_person_id) : undefined,
        sales_person_name: selectedSalesPerson?.name,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number.trim() || undefined,
        category: formData.category.trim() || undefined,
        cash_denominations: (formData.expense_type === 'opening' || formData.expense_type === 'closing') ? cashDenominations : undefined,
        manual_extra: (formData.expense_type === 'opening' || formData.expense_type === 'closing') && ((manualExtra.cash || 0) + (manualExtra.upi || 0) + (manualExtra.card || 0) + (manualExtra.other || 0)) > 0
          ? manualExtra
          : undefined,
        remark: (formData.expense_type === 'opening' || formData.expense_type === 'closing') ? (remark.trim() || undefined) : undefined,
        company_id: getCurrentCompanyId() || undefined,
        created_by: parseInt(user?.id || '1'),
      }

      if (isEditing && id) {
        await expenseService.update(parseInt(id), expenseData)
      } else {
        await expenseService.create(expenseData)
      }
      toast.success(isEditing ? 'Expense updated!' : 'Expense saved!')
      navigate('/expenses')
    } catch (error: any) {
      toast.error(error.message || 'Error saving expense')
    }
  }

  const expenseTypes: { value: ExpenseType; label: string }[] = [
    { value: 'opening', label: 'Opening Balance (Morning)' },
    { value: 'closing', label: 'Closing Balance (Evening)' },
    { value: 'salary', label: 'Employee Salary' },
    { value: 'sales_person_payment', label: 'Sales Person Payment' },
    { value: 'employee_commission', label: 'Employee Commission' },
    { value: 'employee_goods_purchase', label: 'Employee Goods Purchase' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'transport', label: 'Transport' },
    { value: 'office', label: 'Office' },
    { value: 'utility', label: 'Utility' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'other', label: 'Other' },
  ]

  // Calculate total from denominations
  const calculateTotalFromDenominations = (denoms: CashDenominations): number => {
    return (
      (denoms.notes_2000 || 0) * 2000 +
      (denoms.notes_500 || 0) * 500 +
      (denoms.notes_200 || 0) * 200 +
      (denoms.notes_100 || 0) * 100 +
      (denoms.notes_50 || 0) * 50 +
      (denoms.notes_20 || 0) * 20 +
      (denoms.notes_10 || 0) * 10 +
      (denoms.coins_10 || 0) * 10 +
      (denoms.coins_5 || 0) * 5 +
      (denoms.coins_2 || 0) * 2 +
      (denoms.coins_1 || 0) * 1
    )
  }

  // Update amount when denominations or manual extra change
  useEffect(() => {
    if (formData.expense_type === 'opening' || formData.expense_type === 'closing') {
      const cashTotal = calculateTotalFromDenominations(cashDenominations)
      const manualTotal = (manualExtra.cash || 0) + (manualExtra.upi || 0) + (manualExtra.card || 0) + (manualExtra.other || 0)
      setFormData(prev => ({ ...prev, amount: (cashTotal + manualTotal).toString() }))
    }
  }, [cashDenominations, manualExtra, formData.expense_type])

  return (
    <ProtectedRoute requiredPermission={isEditing ? 'expenses:update' : 'expenses:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/expenses')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200 bg-white"
                  title="Back to Expenses"
                >
                  <Home className="w-5 h-5 text-gray-700" />
                </button>
                <div className="min-w-0">
                  <Breadcrumbs
                    items={[
                      { label: 'Dashboard', path: '/' },
                      { label: 'Expenses', path: '/expenses' },
                      { label: isEditing ? 'Edit Expense' : 'New Expense' },
                    ]}
                    className="mb-1"
                  />
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? 'Edit Expense' : 'Add Daily Expense'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update expense information' : 'Record a new expense'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expense Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expense Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.expense_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.expense_date && <p className="text-sm text-red-600 mt-1">{errors.expense_date}</p>}
              </div>

              {/* Expense Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expense Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.expense_type}
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value as ExpenseType })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  {expenseTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  readOnly={formData.expense_type === 'opening' || formData.expense_type === 'closing'}
                />
                {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount}</p>}
                {(formData.expense_type === 'opening' || formData.expense_type === 'closing') && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.expense_type === 'opening'
                      ? 'Amount = Grand total (Cash + Extra money) from below'
                      : 'Amount = Grand total (Cash + Manual sales) from below'}
                  </p>
                )}
              </div>

              {/* Payment Method - Hidden for opening/closing */}
              {formData.expense_type !== 'opening' && formData.expense_type !== 'closing' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Cash Denominations for Opening/Closing */}
              {(formData.expense_type === 'opening' || formData.expense_type === 'closing') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Cash Denominations <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4">
                    Add full information below so that it gets registered as data in the system.
                  </p>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Notes */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Notes</h4>
                        {[
                          { key: 'notes_2000', label: '₹2000', value: 2000 },
                          { key: 'notes_500', label: '₹500', value: 500 },
                          { key: 'notes_200', label: '₹200', value: 200 },
                          { key: 'notes_100', label: '₹100', value: 100 },
                          { key: 'notes_50', label: '₹50', value: 50 },
                          { key: 'notes_20', label: '₹20', value: 20 },
                          { key: 'notes_10', label: '₹10', value: 10 },
                        ].map(note => (
                          <div key={note.key} className="flex items-center justify-between">
                            <label className="text-sm text-gray-700">{note.label}:</label>
                            <input
                              type="number"
                              min="0"
                              value={cashDenominations[note.key as keyof CashDenominations] || 0}
                              onChange={(e) => setCashDenominations({
                                ...cashDenominations,
                                [note.key]: parseInt(e.target.value) || 0
                              })}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </div>
                        ))}
                      </div>
                      {/* Coins */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Coins</h4>
                        {[
                          { key: 'coins_10', label: '₹10', value: 10 },
                          { key: 'coins_5', label: '₹5', value: 5 },
                          { key: 'coins_2', label: '₹2', value: 2 },
                          { key: 'coins_1', label: '₹1', value: 1 },
                        ].map(coin => (
                          <div key={coin.key} className="flex items-center justify-between">
                            <label className="text-sm text-gray-700">{coin.label}:</label>
                            <input
                              type="number"
                              min="0"
                              value={cashDenominations[coin.key as keyof CashDenominations] || 0}
                              onChange={(e) => setCashDenominations({
                                ...cashDenominations,
                                [coin.key]: parseInt(e.target.value) || 0
                              })}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">
                          {formData.expense_type === 'opening' ? 'Cash (denominations)' : 'Cash (denominations)'}:
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ₹{calculateTotalFromDenominations(cashDenominations).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Manual sales (closing) or Extra money (opening) */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        {formData.expense_type === 'closing' ? 'Manual sales (outside system)' : 'Extra money / Carry forward'}
                      </h4>
                      <p className="text-xs text-gray-500 mb-3">
                        {formData.expense_type === 'closing'
                          ? 'Sales received manually (cash, UPI, card) not recorded in system - included in final report'
                          : 'Extra cash, UPI balance, or other money you have - included in opening'}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { key: 'cash' as const, label: 'Cash (₹)' },
                          { key: 'upi' as const, label: 'UPI (₹)' },
                          { key: 'card' as const, label: 'Card (₹)' },
                          { key: 'other' as const, label: 'Other (₹)' },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-xs text-gray-600 mb-1">{label}</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={manualExtra[key] || ''}
                              onChange={(e) => setManualExtra((prev: ManualExtraAmounts) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                      {((manualExtra.cash || 0) + (manualExtra.upi || 0) + (manualExtra.card || 0) + (manualExtra.other || 0)) > 0 && (
                        <div className="mt-3 flex justify-between text-sm">
                          <span className="text-gray-600">
                            {formData.expense_type === 'closing' ? 'Manual sales total:' : 'Extra money total:'}
                          </span>
                          <span className="font-semibold text-blue-600">
                            ₹{((manualExtra.cash || 0) + (manualExtra.upi || 0) + (manualExtra.card || 0) + (manualExtra.other || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {/* Grand total = Amount (cash) + Manual/Extra - clear for opening vs closing */}
                      <div className="mt-4 pt-4 border-t border-gray-200 bg-green-50 rounded-lg px-4 py-3 border border-green-200">
                        <div className="flex justify-between items-center gap-2 text-sm text-gray-700 mb-1">
                          <span>Cash (denominations)</span>
                          <span>₹{calculateTotalFromDenominations(cashDenominations).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2 text-sm text-gray-700 mb-1">
                          <span>{formData.expense_type === 'closing' ? 'Manual sales' : 'Extra money'}</span>
                          <span>₹{((manualExtra.cash || 0) + (manualExtra.upi || 0) + (manualExtra.card || 0) + (manualExtra.other || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-green-200">
                          <span className="font-bold text-gray-900">
                            Grand total ({formData.expense_type === 'opening' ? 'Cash + Extra money' : 'Cash + Manual sales'})
                          </span>
                          <span className="text-xl font-bold text-green-700">
                            ₹{(calculateTotalFromDenominations(cashDenominations) + (manualExtra.cash || 0) + (manualExtra.upi || 0) + (manualExtra.card || 0) + (manualExtra.other || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Remark - optional */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Remark <span className="text-gray-400 font-normal">(optional)</span></label>
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="Add any remark or note (optional)..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Person - Required for Employee Salary, Sales Person Payment, Employee Commission (syncs to Employee Salary tab) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sales Person {(formData.expense_type === 'sales_person_payment' || formData.expense_type === 'salary' || formData.expense_type === 'employee_commission' || formData.expense_type === 'employee_goods_purchase') && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.sales_person_id}
                  onChange={(e) => setFormData({ ...formData, sales_person_id: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.sales_person_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required={formData.expense_type === 'sales_person_payment' || formData.expense_type === 'salary' || formData.expense_type === 'employee_commission'}
                >
                  <option value="">{(formData.expense_type === 'sales_person_payment' || formData.expense_type === 'salary' || formData.expense_type === 'employee_commission' || formData.expense_type === 'employee_goods_purchase') ? 'Select Employee (required – appears in Employee Salary)' : 'Select Sales Person (Optional)'}</option>
                  {salesPersons.length === 0 ? (
                    <option value="" disabled>No sales persons available</option>
                  ) : (
                    salesPersons.map(sp => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} {sp.phone ? `(${sp.phone})` : ''}
                      </option>
                    ))
                  )}
                </select>
                {errors.sales_person_id && <p className="text-sm text-red-600 mt-1">{errors.sales_person_id}</p>}
                {(formData.expense_type === 'sales_person_payment' || formData.expense_type === 'salary' || formData.expense_type === 'employee_commission') && (
                  <p className="text-xs text-gray-500 mt-1">This payment will be recorded in Sales &amp; Category Management → Employee Salary (salary vs commission)</p>
                )}
                {formData.expense_type === 'employee_goods_purchase' && (
                  <p className="text-xs text-gray-500 mt-1">This amount will be recorded in Employee Salary as goods/advance to deduct from pay</p>
                )}
                {formData.expense_type !== 'sales_person_payment' && formData.expense_type !== 'salary' && formData.expense_type !== 'employee_commission' && formData.expense_type !== 'employee_goods_purchase' && (
                  <p className="text-xs text-gray-500 mt-1">Optional: Link this expense to a sales person</p>
                )}
              </div>

              {/* Description - Optional for opening/closing */}
              {formData.expense_type !== 'opening' && formData.expense_type !== 'closing' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter expense description"
                    rows={3}
                    required
                  />
                  {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                </div>
              )}

              {/* Receipt Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt/Bill Number</label>
                <input
                  type="text"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Optional"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Optional category for grouping"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 transform hover:scale-105"
              >
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Expense' : 'Save Expense'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default ExpenseForm
