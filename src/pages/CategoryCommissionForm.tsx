import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { categoryCommissionService } from '../services/salespersonService'
import { categoryService } from '../services/productService'
import { CategoryCommission, CommissionType } from '../types/salesperson'
import { ArrowLeft, Save, Percent, DollarSign } from 'lucide-react'

const CategoryCommissionForm = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isEditing = !!id
  const returnTo = searchParams.get('returnTo')
  const tab = searchParams.get('tab') || 'commissions'

  const [formData, setFormData] = useState({
    category_id: '',
    commission_type: 'percentage' as CommissionType,
    commission_value: '',
    is_active: true,
  })

  const [categories, setCategories] = useState<any[]>([])
  const [configuredCategoryIds, setConfiguredCategoryIds] = useState<number[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    loadCategories()
    if (isEditing) {
      const loadCommission = async () => {
        const commissions = await categoryCommissionService.getAll(true)
        const commission = commissions.find(c => c.id === parseInt(id!))
        if (commission) {
          setFormData({
            category_id: commission.category_id.toString(),
            commission_type: commission.commission_type,
            commission_value: commission.commission_value.toString(),
            is_active: commission.is_active,
          })
        } else {
          alert('Commission configuration not found')
          if (returnTo === 'management') {
            navigate(`/sales-category-management?tab=${tab}`)
          } else {
            navigate('/category-commissions')
          }
        }
      }
      loadCommission()
    }
  }, [id, isEditing, navigate])

  const loadCategories = async () => {
    const [allCategories, existingCommissions] = await Promise.all([
      categoryService.getAll(),
      categoryCommissionService.getAll(true)
    ])
    setCategories(allCategories)
    const configuredIds = isEditing 
      ? existingCommissions.filter(c => c.id !== parseInt(id!)).map(c => c.category_id)
      : existingCommissions.map(c => c.category_id)
    setConfiguredCategoryIds(configuredIds)
  }

  const getAvailableCategories = () => {
    return categories.filter(cat => !configuredCategoryIds.includes(cat.id))
  }

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required'
    }

    if (!formData.commission_value || parseFloat(formData.commission_value) < 0) {
      newErrors.commission_value = 'Commission value must be a positive number'
    }

    if (formData.commission_type === 'percentage' && parseFloat(formData.commission_value) > 100) {
      newErrors.commission_value = 'Percentage cannot exceed 100%'
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
      const commissionData: Omit<CategoryCommission, 'id' | 'created_at' | 'updated_at' | 'category_name'> = {
        category_id: parseInt(formData.category_id),
        commission_type: formData.commission_type,
        commission_value: parseFloat(formData.commission_value),
        is_active: formData.is_active,
      }

      if (isEditing) {
        if (!hasPermission('users:update')) {
          alert('You do not have permission to update commission configurations')
          return
        }
        categoryCommissionService.update(parseInt(id!), commissionData)
        alert('Commission configuration updated successfully!')
      } else {
        if (!hasPermission('users:create')) {
          alert('You do not have permission to create commission configurations')
          return
        }
        categoryCommissionService.create(commissionData)
        alert('Commission configuration created successfully!')
      }

      // Navigate back to management page with tab if returnTo is set, otherwise go to commissions list
      if (returnTo === 'management') {
        navigate(`/sales-category-management?tab=${tab}`)
      } else {
        navigate('/category-commissions')
      }
    } catch (error) {
      alert('Error saving commission configuration: ' + (error as Error).message)
    }
  }

  const availableCategories = getAvailableCategories()

  return (
    <ProtectedRoute requiredPermission={isEditing ? 'users:update' : 'users:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (returnTo === 'management') {
                      navigate(`/sales-category-management?tab=${tab}`)
                    } else {
                      navigate('/category-commissions')
                    }
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Category Commissions"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? 'Edit Commission' : 'Add Category Commission'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update commission configuration' : 'Configure commission for a product category'}
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
                <h2 className="text-xl font-bold text-gray-900 mb-2">Commission Configuration</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    disabled={isEditing}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.category_id ? 'border-red-300' : 'border-gray-300'
                    } ${isEditing ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  >
                    <option value="">Select Category</option>
                    {availableCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
                  {!isEditing && availableCategories.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">All categories already have commission configurations</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commission Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, commission_type: 'percentage' })}
                      className={`p-4 border-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        formData.commission_type === 'percentage'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Percent className="w-5 h-5" />
                      <span className="font-semibold">Percentage (%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, commission_type: 'per_piece' })}
                      className={`p-4 border-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        formData.commission_type === 'per_piece'
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <DollarSign className="w-5 h-5" />
                      <span className="font-semibold">Per Piece (₹)</span>
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {formData.commission_type === 'percentage'
                      ? 'Commission calculated as percentage of item subtotal'
                      : 'Fixed amount per piece sold'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commission Value <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    {formData.commission_type === 'percentage' ? (
                      <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    ) : (
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    )}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.commission_type === 'percentage' ? '100' : undefined}
                      value={formData.commission_value}
                      onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                        errors.commission_value ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={formData.commission_type === 'percentage' ? '5.00' : '10.00'}
                    />
                  </div>
                  {errors.commission_value && <p className="mt-1 text-sm text-red-600">{errors.commission_value}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.commission_type === 'percentage'
                      ? 'Enter percentage (0-100)'
                      : 'Enter amount per piece in rupees'}
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Active</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">Only active commissions are used in calculations</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  if (returnTo === 'management') {
                    navigate(`/sales-category-management?tab=${tab}`)
                  } else {
                    navigate('/category-commissions')
                  }
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Commission' : 'Create Commission'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default CategoryCommissionForm

