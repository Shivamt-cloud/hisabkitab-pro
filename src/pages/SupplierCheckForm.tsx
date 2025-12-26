import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supplierPaymentService } from '../services/supplierPaymentService'
import { purchaseService } from '../services/purchaseService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Home, Save, X } from 'lucide-react'
import { SupplierCheck, CheckStatus } from '../types/supplierPayment'
import { Purchase } from '../types/purchase'

const SupplierCheckForm = () => {
  const navigate = useNavigate()
  const { supplierId, id } = useParams<{ supplierId: string; id: string }>()
  const { hasPermission, user, getCurrentCompanyId } = useAuth()
  const companyId = getCurrentCompanyId()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    purchase_id: '',
    check_number: '',
    bank_name: '',
    account_number: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'pending' as CheckStatus,
    cleared_date: '',
    notes: '',
  })

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const loadData = async () => {
      if (supplierId) {
        // Load purchases for this supplier
        const allPurchases = await purchaseService.getAll(undefined, companyId)
        const supplierPurchases = allPurchases.filter(p => {
          if (p.type === 'gst') {
            return (p as any).supplier_id === parseInt(supplierId)
          }
          return (p as any).supplier_id === parseInt(supplierId)
        })
        setPurchases(supplierPurchases)

        // Load check if editing
        if (isEditing && id) {
          const check = await supplierPaymentService.getCheckById(parseInt(id))
          if (check) {
            setFormData({
              purchase_id: check.purchase_id?.toString() || '',
              check_number: check.check_number,
              bank_name: check.bank_name,
              account_number: check.account_number || '',
              amount: check.amount.toString(),
              issue_date: check.issue_date.split('T')[0],
              due_date: check.due_date.split('T')[0],
              status: check.status,
              cleared_date: check.cleared_date ? check.cleared_date.split('T')[0] : '',
              notes: check.notes || '',
            })
          }
        } else {
          // Set default due date (30 days from issue date)
          const defaultDueDate = new Date()
          defaultDueDate.setDate(defaultDueDate.getDate() + 30)
          setFormData(prev => ({
            ...prev,
            due_date: defaultDueDate.toISOString().split('T')[0],
          }))
        }
      }
    }
    loadData()
  }, [isEditing, id, supplierId, companyId])

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.check_number.trim()) {
      newErrors.check_number = 'Check number is required'
    }

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Bank name is required'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required'
    }

    if (!formData.issue_date) {
      newErrors.issue_date = 'Issue date is required'
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required'
    }

    if (new Date(formData.due_date) < new Date(formData.issue_date)) {
      newErrors.due_date = 'Due date must be after issue date'
    }

    if (formData.status === 'cleared' && !formData.cleared_date) {
      newErrors.cleared_date = 'Cleared date is required when status is cleared'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !supplierId || !user) return

    if (!hasPermission('purchases:create') && !isEditing) {
      alert('You do not have permission to create checks')
      return
    }

    if (!hasPermission('purchases:update') && isEditing) {
      alert('You do not have permission to update checks')
      return
    }

    try {
      const checkData: Omit<SupplierCheck, 'id' | 'created_at' | 'updated_at'> = {
        supplier_id: parseInt(supplierId),
        purchase_id: formData.purchase_id ? parseInt(formData.purchase_id) : undefined,
        check_number: formData.check_number,
        bank_name: formData.bank_name,
        account_number: formData.account_number || undefined,
        amount: parseFloat(formData.amount),
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        status: formData.status,
        cleared_date: formData.cleared_date || undefined,
        notes: formData.notes || undefined,
        company_id: companyId,
        created_by: user.id,
        created_by_name: user.name,
      }

      if (isEditing && id) {
        await supplierPaymentService.updateCheck(parseInt(id), checkData)
      } else {
        await supplierPaymentService.createCheck(checkData)
      }

      navigate(`/suppliers/${supplierId}/account`)
    } catch (error) {
      console.error('Error saving check:', error)
      alert('Failed to save check')
    }
  }

  return (
    <ProtectedRoute requiredPermission={isEditing ? 'purchases:update' : 'purchases:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Edit Check' : 'Add Check'}
              </h1>
              <button
                onClick={() => navigate(supplierId ? `/suppliers/${supplierId}/account` : '/suppliers')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back"
              >
                <Home className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Purchase (Optional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Invoice (Optional)
                </label>
                <select
                  value={formData.purchase_id}
                  onChange={(e) => setFormData({ ...formData, purchase_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Select Purchase</option>
                  {purchases.map((purchase) => (
                    <option key={purchase.id} value={purchase.id}>
                      {purchase.type === 'gst'
                        ? `${(purchase as any).invoice_number} - ₹${(purchase as any).grand_total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                        : `PUR-${purchase.id} - ₹${(purchase as any).total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Check Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.check_number}
                  onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                  className={`w-full px-4 py-2 border ${errors.check_number ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                  placeholder="Enter check number"
                />
                {errors.check_number && <p className="mt-1 text-sm text-red-600">{errors.check_number}</p>}
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className={`w-full px-4 py-2 border ${errors.bank_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                  placeholder="Enter bank name"
                />
                {errors.bank_name && <p className="mt-1 text-sm text-red-600">{errors.bank_name}</p>}
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Optional"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className={`w-full px-4 py-2 border ${errors.amount ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                  placeholder="0.00"
                />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className={`w-full px-4 py-2 border ${errors.issue_date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                />
                {errors.issue_date && <p className="mt-1 text-sm text-red-600">{errors.issue_date}</p>}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className={`w-full px-4 py-2 border ${errors.due_date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                />
                {errors.due_date && <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CheckStatus, cleared_date: e.target.value === 'cleared' && !formData.cleared_date ? new Date().toISOString().split('T')[0] : formData.cleared_date })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="cleared">Cleared</option>
                  <option value="bounced">Bounced</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Cleared Date (if status is cleared) */}
              {formData.status === 'cleared' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cleared Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.cleared_date}
                    onChange={(e) => setFormData({ ...formData, cleared_date: e.target.value })}
                    className={`w-full px-4 py-2 border ${errors.cleared_date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                  />
                  {errors.cleared_date && <p className="mt-1 text-sm text-red-600">{errors.cleared_date}</p>}
                </div>
              )}

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(supplierId ? `/suppliers/${supplierId}/account` : '/suppliers')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Check' : 'Add Check'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SupplierCheckForm

