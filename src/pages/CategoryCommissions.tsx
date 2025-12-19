import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { categoryCommissionService } from '../services/salespersonService'
import { categoryService } from '../services/productService'
import { CategoryCommission } from '../types/salesperson'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Percent, 
  Package,
  Home,
  DollarSign
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const CategoryCommissions = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [commissions, setCommissions] = useState<CategoryCommission[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [allCommissions, allCategories] = await Promise.all([
        categoryCommissionService.getAll(true),
        categoryService.getAll()
      ])
      setCommissions(allCommissions)
      setCategories(allCategories)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this commission configuration?')) {
      if (hasPermission('users:delete')) {
        await categoryCommissionService.delete(id)
        loadData()
      } else {
        alert('You do not have permission to delete commission configurations')
      }
    }
  }

  const filteredCommissions = commissions.filter(comm => {
    const matchesSearch = !searchQuery || 
      comm.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getAvailableCategories = () => {
    const configuredCategoryIds = commissions.map(c => c.category_id)
    return categories.filter(cat => !configuredCategoryIds.includes(cat.id))
  }

  return (
    <ProtectedRoute requiredPermission="users:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Category Commissions</h1>
                  <p className="text-sm text-gray-600 mt-1">Configure commission rates by product category</p>
                </div>
              </div>
              {hasPermission('users:create') && getAvailableCategories().length > 0 && (
                <button
                  onClick={() => navigate('/category-commissions/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Commission
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by category name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Commissions Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading commissions...</div>
          ) : filteredCommissions.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-12 border border-white/50 text-center">
              <Percent className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No commission configurations found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Configure commission rates for product categories'}
              </p>
              {hasPermission('users:create') && getAvailableCategories().length > 0 && (
                <button
                  onClick={() => navigate('/category-commissions/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Commission
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
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Commission Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Commission Value
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCommissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="w-5 h-5 text-blue-600 mr-2" />
                            <div className="text-sm font-semibold text-gray-900">{comm.category_name || 'Unknown'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {comm.commission_type === 'percentage' ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 w-fit">
                              <Percent className="w-3 h-3" />
                              Percentage
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-semibold flex items-center gap-1 w-fit">
                              <DollarSign className="w-3 h-3" />
                              Per Piece
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {comm.commission_type === 'percentage' ? (
                              <span>{comm.commission_value}%</span>
                            ) : (
                              <span>₹{comm.commission_value} per piece</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {comm.is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-semibold">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('users:update') && (
                              <button
                                onClick={() => navigate(`/category-commissions/${comm.id}/edit`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit commission"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            {hasPermission('users:delete') && (
                              <button
                                onClick={() => handleDelete(comm.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete commission"
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
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default CategoryCommissions

