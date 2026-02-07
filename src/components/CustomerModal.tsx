import { useState, useEffect, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { customerService } from '../services/customerService'
import { priceSegmentService } from '../services/priceListService'
import { Customer } from '../types/customer'
import { X, Save, User } from 'lucide-react'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onCustomerAdded: (customer: Customer) => void
}

const CustomerModal = ({ isOpen, onClose, onCustomerAdded }: CustomerModalProps) => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_person: '',
    credit_limit: '',
    price_segment_id: '',
    is_active: true,
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const [priceSegments, setPriceSegments] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    if (isOpen) {
      priceSegmentService.getAll(getCurrentCompanyId()).then(segs =>
        setPriceSegments(segs.map(s => ({ id: s.id, name: s.name })))
      )
    }
  }, [isOpen, getCurrentCompanyId])

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required'
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format'
      }
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[0-9]{10}$/
      if (!phoneRegex.test(formData.phone.replace(/\s+/g, ''))) {
        newErrors.phone = 'Phone number must be 10 digits'
      }
    }

    if (formData.gstin && formData.gstin.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      if (!gstinRegex.test(formData.gstin.toUpperCase())) {
        newErrors.gstin = 'Invalid GSTIN format (15 characters)'
      }
    }

    if (formData.pincode && formData.pincode.trim()) {
      const pincodeRegex = /^[0-9]{6}$/
      if (!pincodeRegex.test(formData.pincode)) {
        newErrors.pincode = 'Pincode must be 6 digits'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      const customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        gstin: formData.gstin.trim().toUpperCase() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        contact_person: formData.contact_person.trim() || undefined,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
        is_active: formData.is_active,
        company_id: getCurrentCompanyId() || undefined,
      }

      const newCustomer = await customerService.create(customerData)
      onCustomerAdded(newCustomer)

      setFormData({
        name: '',
        email: '',
        phone: '',
        gstin: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contact_person: '',
        credit_limit: '',
        price_segment_id: '',
        is_active: true,
      })
      setErrors({})
      onClose()
      toast.success('Customer added! You can continue with the sale.')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error saving customer'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      gstin: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_person: '',
      credit_limit: '',
      price_segment_id: '',
      is_active: true,
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  const modal = (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Add New Customer</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-sm text-gray-600 -mt-2">Add a customer and they will be selected for this sale. Your cart and other entries are preserved.</p>

          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter customer name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10-digit phone"
                  maxLength={10}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="customer@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({ ...formData, gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) })
                  }
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono ${
                    errors.gstin ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                />
                {errors.gstin && <p className="mt-1 text-sm text-red-600">{errors.gstin}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Contact name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })
                  }
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.pincode ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="6 digits"
                  maxLength={6}
                />
                {errors.pincode && <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price Segment</label>
              <select
                value={formData.price_segment_id}
                onChange={(e) => setFormData({ ...formData, price_segment_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Default (Retail)</option>
                {priceSegments.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Limit (₹)</label>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Add Customer & Continue Sale
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

export default CustomerModal
