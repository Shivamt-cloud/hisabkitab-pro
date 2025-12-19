import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { categoryService, Category } from '../services/productService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FolderTree, 
  Home,
  ChevronRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SubCategories = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [mainCategories, setMainCategories] = useState<Category[]>([])
  const [selectedMainCategory, setSelectedMainCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedMainCategory) {
      loadSubcategories(selectedMainCategory)
    } else {
      loadAllSubcategories()
    }
  }, [selectedMainCategory])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const [allCategories, mainCats] = await Promise.all([
        categoryService.getAll(),
        categoryService.getMainCategories()
      ])
      setMainCategories(mainCats)
      setCategories(allCategories.filter(c => c.is_subcategory))
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSubcategories = async (parentId: number) => {
    try {
      const subcats = await categoryService.getSubcategories(parentId)
      setCategories(subcats)
    } catch (error) {
      console.error('Error loading subcategories:', error)
    }
  }

  const loadAllSubcategories = async () => {
    try {
      const allCategories = await categoryService.getAll()
      setCategories(allCategories.filter(c => c.is_subcategory))
    } catch (error) {
      console.error('Error loading all subcategories:', error)
    }
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this sub-category?')) {
      if (hasPermission('products:delete')) {
        categoryService.delete(id)
        loadCategories()
      } else {
        alert('You do not have permission to delete categories')
      }
    }
  }

  const filteredCategories = categories.filter(category => {
    const matchesSearch = !searchQuery || 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.parent_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <ProtectedRoute requiredPermission="products:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Sub-Categories</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage sub-categories for your products</p>
                </div>
              </div>
              {hasPermission('products:create') && (
                <button
                  onClick={() => navigate('/sub-categories/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Sub-Category
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter by Main Category */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sub-categories..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <select
                  value={selectedMainCategory || ''}
                  onChange={(e) => setSelectedMainCategory(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white min-w-[200px]"
                >
                  <option value="">All Main Categories</option>
                  {mainCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sub-Categories Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading sub-categories...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-12 border border-white/50 text-center">
              <FolderTree className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No sub-categories found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedMainCategory
                  ? 'Try adjusting your search or filter'
                  : 'Get started by adding your first sub-category'}
              </p>
              {hasPermission('products:create') && (
                <button
                  onClick={() => navigate('/sub-categories/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Sub-Category
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Sub-Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Parent Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCategories.map((category) => (
                      <tr key={category.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FolderTree className="w-5 h-5 text-blue-600 mr-3" />
                            <div className="text-sm font-semibold text-gray-900">{category.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <ChevronRight className="w-4 h-4 text-gray-400 mr-1" />
                            {category.parent_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {category.description || <span className="text-gray-400">No description</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('products:update') && (
                              <button
                                onClick={() => navigate(`/sub-categories/${category.id}/edit`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit sub-category"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            {hasPermission('products:delete') && (
                              <button
                                onClick={() => handleDelete(category.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete sub-category"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{filteredCategories.length}</span> sub-categories
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SubCategories

