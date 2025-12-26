import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supplierPaymentService } from '../services/supplierPaymentService'
import { purchaseService } from '../services/purchaseService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Home, Save, X } from 'lucide-react'
import { SupplierPayment, SupplierPaymentMethod } from '../types/supplierPayment'
import { Purchase } from '../types/purchase'

const SupplierPaymentForm = () => {
  const navigate = useNavigate()
  const { supplierId, id } = useParams<{ supplierId: string; id: string }>()
  const { hasPermission, user, getCurrentCompanyId } = useAuth()
  const companyId = getCurrentCompanyId()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    purchase_id: '',
    amount: '',
    payment_method: 'cash' as SupplierPaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    check_id: '',
    reference_number: '',
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

        // Load payment if editing
        if (isEditing && id) {
          const payment = await supplierPaymentService.getPaymentById(parseInt(id))
          if (payment) {
            setFormData({
              purchase_id: payment.purchase_id?.toString() || '',
              amount: payment.amount.toString(),
              payment_method: payment.payment_method,
              payment_date: payment.payment_date.split('T')[0],
              check_id: payment.check_id?.toString() || '',
              reference_number: payment.reference_number || '',
              notes: payment.notes || '',
            })
          }
        }
      }
    }
    loadData()
  }, [isEditing, id, supplierId, companyId])

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required'
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required'
    }

    if (formData.payment_method === 'cheque' && !formData.check_id) {
      newErrors.check_id = 'Check is required when payment method is cheque'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !supplierId || !user) return

    if (!hasPermission('purchases:create') && !isEditing) {
      alert('You do not have permission to create payments')
      return
    }

    if (!hasPermission('purchases:update') && isEditing) {
      alert('You do not have permission to update payments')
      return
    }

    try {
      const paymentData: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at'> = {
        supplier_id: parseInt(supplierId),
        purchase_id: formData.purchase_id ? parseInt(formData.purchase_id) : undefined,
        purchase_invoice_number: formData.purchase_id
          ? purchases.find(p => p.id === parseInt(formData.purchase_id))?.type === 'gst'
            ? (purchases.find(p => p.id === parseInt(formData.purchase_id)) as any).invoice_number
            : `PUR-${formData.purchase_id}`
          : undefined,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        check_id: formData.check_id ? parseInt(formData.check_id) : undefined,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
        company_id: companyId || undefined,
        created_by: parseInt(user?.id || '1'),
        created_by_name: user.name,
      }

      if (isEditing && id) {
        await supplierPaymentService.updatePayment(parseInt(id), paymentData)
      } else {
        await supplierPaymentService.createPayment(paymentData)
      }

      navigate(`/suppliers/${supplierId}/account`)
    } catch (error) {
      console.error('Error saving payment:', error)
      alert('Failed to save payment')
    }
  }

  return (
    <ProtectedRoute requiredPermission={isEditing ? 'purchases:update' : 'purchases:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Edit Payment' : 'Add Payment'}
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

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className={`w-full px-4 py-2 border ${errors.payment_date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none`}
                />
                {errors.payment_date && <p className="mt-1 text-sm text-red-600">{errors.payment_date}</p>}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as SupplierPaymentMethod, check_id: e.target.value !== 'cheque' ? '' : formData.check_id })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number (Transaction ID, UPI Ref, etc.)
                </label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Optional"
                />
              </div>

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
                {isEditing ? 'Update Payment' : 'Add Payment'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SupplierPaymentForm

