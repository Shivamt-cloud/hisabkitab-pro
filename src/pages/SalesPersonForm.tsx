import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { salesPersonService } from '../services/salespersonService'
import { SalesPerson } from '../types/salesperson'
import { ArrowLeft, Save, User } from 'lucide-react'

const SalesPersonForm = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    commission_rate: '',
    is_active: true,
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (isEditing && id) {
      const loadSalesPerson = async () => {
        try {
          const person = await salesPersonService.getById(parseInt(id))
          if (person) {
            setFormData({
              name: person.name || '',
              email: person.email || '',
              phone: person.phone || '',
              employee_id: person.employee_id || '',
              commission_rate: person.commission_rate?.toString() || '',
              is_active: person.is_active !== undefined ? person.is_active : true,
            })
          } else {
            alert('Sales person not found')
            navigate('/sales-persons')
          }
        } catch (error) {
          console.error('Error loading sales person:', error)
          alert('Sales person not found')
          navigate('/sales-persons')
        }
      }
      loadSalesPerson()
    }
  }, [id, isEditing, navigate])

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.commission_rate && (parseFloat(formData.commission_rate) < 0 || parseFloat(formData.commission_rate) > 100)) {
      newErrors.commission_rate = 'Commission rate must be between 0 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      const personData: Omit<SalesPerson, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        employee_id: formData.employee_id.trim() || undefined,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : undefined,
        is_active: formData.is_active,
      }

      if (isEditing) {
        if (!hasPermission('users:update')) {
          alert('You do not have permission to update sales persons')
          return
        }
        salesPersonService.update(parseInt(id!), personData)
        alert('Sales person updated successfully!')
      } else {
        if (!hasPermission('users:create')) {
          alert('You do not have permission to create sales persons')
          return
        }
        salesPersonService.create(personData)
        alert('Sales person created successfully!')
      }

      navigate('/sales-persons')
    } catch (error) {
      alert('Error saving sales person: ' + (error as Error).message)
    }
  }

  return (
    <ProtectedRoute requiredPermission={isEditing ? 'users:update' : 'users:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/sales-persons')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Sales Persons"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? 'Edit Sales Person' : 'Add New Sales Person'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update sales person information' : 'Add a new sales person to your team'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-600" />
                  Basic Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter sales person name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
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
                    placeholder="email@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="+91 1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Default Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.commission_rate ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="5.00"
                  />
                  {errors.commission_rate && <p className="mt-1 text-sm text-red-600">{errors.commission_rate}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    Default commission rate. Can be overridden by category-specific commissions.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Active</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">Only active sales persons can be assigned to sales</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/sales-persons')}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Sales Person' : 'Create Sales Person'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesPersonForm

