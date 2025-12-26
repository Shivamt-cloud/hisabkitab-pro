import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { salesPersonCategoryAssignmentService } from '../services/salespersonService'
import { categoryService } from '../services/productService'
import { salesPersonService } from '../services/salespersonService'
import { SalesPersonCategoryAssignment } from '../types/salesperson'
import { ArrowLeft, Save, UserCheck } from 'lucide-react'

const SalesPersonCategoryAssignmentForm = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isEditing = !!id
  const returnTo = searchParams.get('returnTo')
  const tab = searchParams.get('tab') || 'assignments'

  const [formData, setFormData] = useState({
    sales_person_id: '',
    category_id: '',
    is_active: true,
  })

  const [subCategories, setSubCategories] = useState<any[]>([])
  const [salesPersons, setSalesPersons] = useState<any[]>([])
  const [availableSalesPersons, setAvailableSalesPersons] = useState<any[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const loadFormData = async () => {
      await loadData()
      if (isEditing && id) {
        try {
          const allAssignments = await salesPersonCategoryAssignmentService.getAll(true)
          const assignment = allAssignments.find(a => a.id === parseInt(id))
          if (assignment) {
            setFormData({
              sales_person_id: assignment.sales_person_id.toString(),
              category_id: assignment.category_id.toString(),
              is_active: assignment.is_active,
            })
          } else {
            alert('Assignment not found')
            if (returnTo === 'management') {
  navigate(`/sales-category-management?tab=${tab}`)
} else {
  navigate('/sales-person-category-assignments')
}
          }
        } catch (error) {
          console.error('Error loading assignment:', error)
          alert('Assignment not found')
          if (returnTo === 'management') {
  navigate(`/sales-category-management?tab=${tab}`)
} else {
  navigate('/sales-person-category-assignments')
}
        }
      }
    }
    loadFormData()
  }, [id, isEditing, navigate, returnTo, tab])

  const loadData = async () => {
    try {
      const [allSubCategoriesResult, activeSalesPersonsResult] = await Promise.all([
        categoryService.getAll(),
        salesPersonService.getAll(false)
      ])
      setSubCategories(allSubCategoriesResult.filter(c => c.is_subcategory))
      setSalesPersons(activeSalesPersonsResult)
      setAvailableSalesPersons(activeSalesPersonsResult) // Initially all are available
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  useEffect(() => {
    const updateAvailableSalesPersons = async () => {
      if (!formData.category_id) {
        setAvailableSalesPersons(salesPersons)
        return
      }
      
      try {
        // Filter out sales persons already assigned to this category
        const existingAssignments = await salesPersonCategoryAssignmentService.getByCategory(parseInt(formData.category_id))
        const assignedIds = isEditing && id
          ? existingAssignments.filter(a => a.id !== parseInt(id)).map(a => a.sales_person_id)
          : existingAssignments.map(a => a.sales_person_id)
        setAvailableSalesPersons(salesPersons.filter(sp => !assignedIds.includes(sp.id)))
      } catch (error) {
        console.error('Error getting available sales persons:', error)
        setAvailableSalesPersons(salesPersons)
      }
    }
    updateAvailableSalesPersons()
  }, [formData.category_id, salesPersons, isEditing, id])

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.sales_person_id) {
      newErrors.sales_person_id = 'Please select a sales person'
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Please select a sub-category'
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
      const assignmentData: Omit<SalesPersonCategoryAssignment, 'id' | 'created_at' | 'updated_at' | 'sales_person_name' | 'category_name'> = {
        sales_person_id: parseInt(formData.sales_person_id),
        category_id: parseInt(formData.category_id),
        is_active: formData.is_active,
      }

      if (isEditing) {
        if (!hasPermission('users:update')) {
          alert('You do not have permission to update assignments')
          return
        }
        salesPersonCategoryAssignmentService.update(parseInt(id!), assignmentData)
        alert('Assignment updated successfully!')
      } else {
        if (!hasPermission('users:create')) {
          alert('You do not have permission to create assignments')
          return
        }
        salesPersonCategoryAssignmentService.create(assignmentData)
        alert('Assignment created successfully!')
      }

      if (returnTo === 'management') {
  navigate(`/sales-category-management?tab=${tab}`)
} else {
  navigate('/sales-person-category-assignments')
}
    } catch (error) {
      alert('Error saving assignment: ' + (error as Error).message)
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
                  onClick={() => {
                    if (returnTo === 'management') {
                      navigate(`/sales-category-management?tab=${tab}`)
                    } else {
                      navigate('/sales-person-category-assignments')
                    }
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Assignments"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? 'Edit Assignment' : 'Assign Sales Person to Category'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update assignment' : 'Assign a sales person to a sub-category'}
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
                  <UserCheck className="w-6 h-6 text-blue-600" />
                  Assignment Details
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sub-Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    disabled={isEditing}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.category_id ? 'border-red-300' : 'border-gray-300'
                    } ${isEditing ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  >
                    <option value="">Select Sub-Category</option>
                    {subCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.parent_name})
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
                  {!isEditing && subCategories.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">No sub-categories available. Please create sub-categories first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sales Person <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.sales_person_id}
                    onChange={(e) => setFormData({ ...formData, sales_person_id: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.sales_person_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Sales Person</option>
                    {availableSalesPersons.map(person => (
                      <option key={person.id} value={person.id}>
                        {person.name} {person.employee_id && `(${person.employee_id})`}
                      </option>
                    ))}
                  </select>
                  {errors.sales_person_id && <p className="mt-1 text-sm text-red-600">{errors.sales_person_id}</p>}
                  {availableSalesPersons.length === 0 && formData.category_id && (
                    <p className="mt-1 text-xs text-orange-600">All available sales persons are already assigned to this category.</p>
                  )}
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
                  <p className="mt-1 text-xs text-gray-500">Only active assignments are considered for sales</p>
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
                    navigate('/sales-person-category-assignments')
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
                {isEditing ? 'Update Assignment' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesPersonCategoryAssignmentForm

