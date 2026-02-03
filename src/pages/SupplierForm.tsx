import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { supplierService } from '../services/purchaseService'
import { Supplier } from '../types/purchase'
import { ArrowLeft, Save, Building2 } from 'lucide-react'

const SupplierForm = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (isEditing) {
      const loadSupplier = async () => {
        const supplier = await supplierService.getById(parseInt(id!))
        if (supplier) {
          setFormData({
            name: supplier.name || '',
            gstin: supplier.gstin || '',
            contact_person: supplier.contact_person || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            city: supplier.city || '',
            state: supplier.state || '',
            pincode: supplier.pincode || '',
          })
        } else {
          alert('Supplier not found')
          navigate('/suppliers')
        }
      }
      loadSupplier()
    }
  }, [id, isEditing, navigate])

  const validateGSTIN = (gstin: string): boolean => {
    if (!gstin) return true // GSTIN is optional
    // GSTIN format: 15 alphanumeric characters
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstinRegex.test(gstin.toUpperCase())
  }

  const validateEmail = (email: string): boolean => {
    if (!email) return true // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true // Phone is optional
    // Allow various phone formats (with/without country code, spaces, dashes)
    const phoneRegex = /^[\d\s\-\+\(\)]{10,15}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required'
    }

    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      newErrors.gstin = 'Invalid GSTIN format (should be 15 alphanumeric characters)'
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      const supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name.trim(),
        gstin: formData.gstin.trim() || undefined,
        contact_person: formData.contact_person.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        is_registered: !!formData.gstin.trim(),
        company_id: getCurrentCompanyId() || undefined,
      }

      if (isEditing) {
        if (!hasPermission('purchases:update')) {
          toast.error('You do not have permission to update suppliers')
          return
        }
        await supplierService.update(parseInt(id!), supplierData)
        toast.success('Supplier updated successfully!')
      } else {
        if (!hasPermission('purchases:create')) {
          toast.error('You do not have permission to create suppliers')
          return
        }
        await supplierService.create(supplierData)
        toast.success('Supplier created successfully!')
      }
      navigate('/suppliers')
    } catch (error) {
      toast.error('Error saving supplier: ' + (error as Error).message)
    }
  }

  return (
    <ProtectedRoute requiredPermission={isEditing ? 'purchases:update' : 'purchases:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/suppliers')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Suppliers"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="min-w-0">
                  <Breadcrumbs
                    items={[
                      { label: 'Dashboard', path: '/' },
                      { label: 'Suppliers', path: '/suppliers' },
                      { label: isEditing ? 'Edit Supplier' : 'New Supplier' },
                    ]}
                    className="mb-1"
                  />
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update supplier information' : 'Add a new supplier to your system'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Form */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  Basic Information
                </h2>
                <p className="text-sm text-gray-600">Enter the supplier's basic details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplier Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter supplier name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                {/* GSTIN */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    GSTIN (15 characters)
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                      setFormData({ ...formData, gstin: value })
                    }}
                    maxLength={15}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono ${
                      errors.gstin ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="29ABCDE1234F1Z5"
                  />
                  {errors.gstin && <p className="mt-1 text-sm text-red-600">{errors.gstin}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty if supplier is not GST registered
                  </p>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Contact person name"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Contact Information</h2>
                <p className="text-sm text-gray-600">Phone and email details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+91 1234567890"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="supplier@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Address Information</h2>
                <p className="text-sm text-gray-600">Supplier location details</p>
              </div>

              <div className="space-y-6">
                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    placeholder="Street address, building, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="City"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="State"
                    />
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setFormData({ ...formData, pincode: value })
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/suppliers')}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Supplier' : 'Create Supplier'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SupplierForm

