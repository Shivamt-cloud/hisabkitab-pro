import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { salesPersonCategoryAssignmentService } from '../services/salespersonService'
import { categoryService } from '../services/productService'
import { salesPersonService } from '../services/salespersonService'
import { SalesPersonCategoryAssignment } from '../types/salesperson'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserCheck, 
  Home,
  Users,
  FolderTree
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SalesPersonCategoryAssignments = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState<SalesPersonCategoryAssignment[]>([])
  const [subCategories, setSubCategories] = useState<any[]>([])
  const [salesPersons, setSalesPersons] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const loadCategoryAssignments = async () => {
      if (selectedCategory) {
        try {
          const categoryAssignments = await salesPersonCategoryAssignmentService.getByCategory(selectedCategory)
          setAssignments(categoryAssignments)
        } catch (error) {
          console.error('Error loading category assignments:', error)
        }
      } else {
        await loadAllAssignments()
      }
    }
    loadCategoryAssignments()
  }, [selectedCategory])

  const loadData = async () => {
    setLoading(true)
    try {
      const [allSubCategoriesResult, activeSalesPersonsResult, allAssignmentsResult] = await Promise.all([
        categoryService.getAll(),
        salesPersonService.getAll(false),
        salesPersonCategoryAssignmentService.getAll(true)
      ])
      setSubCategories(allSubCategoriesResult.filter(c => c.is_subcategory))
      setSalesPersons(activeSalesPersonsResult)
      setAssignments(allAssignmentsResult)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllAssignments = async () => {
    try {
      const all = await salesPersonCategoryAssignmentService.getAll(true)
      setAssignments(all)
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to remove this assignment?')) {
      if (hasPermission('users:delete')) {
        salesPersonCategoryAssignmentService.delete(id)
        loadAllAssignments()
      } else {
        alert('You do not have permission to delete assignments')
      }
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = !searchQuery || 
      assignment.sales_person_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

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
                  <h1 className="text-3xl font-bold text-gray-900">Sales Person Category Assignments</h1>
                  <p className="text-sm text-gray-600 mt-1">Assign sales persons to sub-categories</p>
                </div>
              </div>
              {hasPermission('users:create') && (
                <button
                  onClick={() => navigate('/sales-person-category-assignments/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Assignment
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by sales person or category..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white min-w-[200px]"
                >
                  <option value="">All Sub-Categories</option>
                  {subCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.parent_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assignments Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-12 border border-white/50 text-center">
              <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No assignments found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCategory
                  ? 'Try adjusting your search or filter'
                  : 'Assign sales persons to sub-categories to manage sales'}
              </p>
              {hasPermission('users:create') && (
                <button
                  onClick={() => navigate('/sales-person-category-assignments/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Assignment
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
                        Sales Person
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Sub-Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Parent Category
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
                    {filteredAssignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                              {assignment.sales_person_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              {assignment.sales_person_name || 'Unknown'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FolderTree className="w-5 h-5 text-blue-600 mr-2" />
                            <div className="text-sm font-semibold text-gray-900">
                              {assignment.category_name || 'Unknown'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {/* Parent category name would need to be fetched */}
                            —
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignment.is_active ? (
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
                                onClick={() => navigate(`/sales-person-category-assignments/${assignment.id}/edit`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit assignment"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            {hasPermission('users:delete') && (
                              <button
                                onClick={() => handleDelete(assignment.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove assignment"
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
                  Showing <span className="font-semibold">{filteredAssignments.length}</span> assignments
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesPersonCategoryAssignments

