import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { categoryService, Category } from '../services/productService'
import { ArrowLeft, Save, FolderTree } from 'lucide-react'

const SubCategoryForm = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
  })

  const [mainCategories, setMainCategories] = useState<Category[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const loadMainCategories = async () => {
      const mainCats = await categoryService.getMainCategories()
      setMainCategories(mainCats)
    }
    loadMainCategories()
    
    if (isEditing) {
      const loadCategory = async () => {
        const category = await categoryService.getById(parseInt(id!))
        if (category) {
          setFormData({
            name: category.name || '',
            description: category.description || '',
            parent_id: category.parent_id?.toString() || '',
          })
        } else {
          alert('Sub-category not found')
          navigate('/sub-categories')
        }
      }
      loadCategory()
    }
  }, [id, isEditing, navigate])

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Sub-category name is required'
    }

    if (!formData.parent_id) {
      newErrors.parent_id = 'Please select a parent category'
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
      const categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: parseInt(formData.parent_id),
        is_subcategory: true,
      }

      if (isEditing) {
        if (!hasPermission('products:update')) {
          alert('You do not have permission to update sub-categories')
          return
        }
        categoryService.update(parseInt(id!), categoryData)
        alert('Sub-category updated successfully!')
      } else {
        if (!hasPermission('products:create')) {
          alert('You do not have permission to create sub-categories')
          return
        }
        categoryService.create(categoryData)
        alert('Sub-category created successfully!')
      }

      navigate('/sub-categories')
    } catch (error) {
      alert('Error saving sub-category: ' + (error as Error).message)
    }
  }

  return (
    <ProtectedRoute requiredPermission={isEditing ? 'products:update' : 'products:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/sub-categories')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Sub-Categories"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? 'Edit Sub-Category' : 'Add New Sub-Category'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update sub-category information' : 'Create a new sub-category under a main category'}
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
                  <FolderTree className="w-6 h-6 text-blue-600" />
                  Sub-Category Information
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Parent Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    disabled={isEditing}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.parent_id ? 'border-red-300' : 'border-gray-300'
                    } ${isEditing ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  >
                    <option value="">Select Parent Category</option>
                    {mainCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.parent_id && <p className="mt-1 text-sm text-red-600">{errors.parent_id}</p>}
                  {!isEditing && mainCategories.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">No main categories available. Please create a main category first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sub-Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Handloom, Kids Section"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    placeholder="Optional description for this sub-category"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/sub-categories')}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Sub-Category' : 'Create Sub-Category'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SubCategoryForm

