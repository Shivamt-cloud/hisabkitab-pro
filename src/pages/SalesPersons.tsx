import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { salesPersonService } from '../services/salespersonService'
import { SalesPerson } from '../types/salesperson'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User, 
  Home,
  TrendingUp
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'

const SalesPersons = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSalesPersons()
  }, [])

  const loadSalesPersons = async () => {
    setLoading(true)
    const allSalesPersons = await salesPersonService.getAll(true)
    setSalesPersons(allSalesPersons)
    setLoading(false)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this sales person?')) {
      if (hasPermission('users:delete')) {
        salesPersonService.delete(id)
        loadSalesPersons()
      } else {
        alert('You do not have permission to delete sales persons')
      }
    }
  }

  const filteredSalesPersons = salesPersons.filter(person => {
    const matchesSearch = !searchQuery || 
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.phone?.includes(searchQuery) ||
      person.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <ProtectedRoute requiredPermission="users:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
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
                  <h1 className="text-3xl font-bold text-gray-900">Sales Persons</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage your sales team</p>
                </div>
              </div>
              {hasPermission('users:create') && (
                <button
                  onClick={() => navigate('/sales-persons/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Sales Person
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sales persons by name, email, phone, or employee ID..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Sales Persons Table */}
          {loading ? (
            <LoadingState message="Loading sales persons..." />
          ) : filteredSalesPersons.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-12 border border-white/50 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No sales persons found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Get started by adding your first sales person'}
              </p>
              {hasPermission('users:create') && (
                <button
                  onClick={() => navigate('/sales-persons/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Sales Person
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
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Default Commission
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
                    {filteredSalesPersons.map((person) => (
                      <tr key={person.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                              {person.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{person.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {person.phone && <div className="mb-1">📞 {person.phone}</div>}
                            {person.email && <div className="text-xs text-gray-600">✉️ {person.email}</div>}
                            {!person.phone && !person.email && (
                              <span className="text-gray-400 text-xs">No contact info</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-mono">
                            {person.employee_id || <span className="text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {person.commission_rate !== undefined ? (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-gray-900">
                                {person.commission_rate}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {person.is_active ? (
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
                                onClick={() => navigate(`/sales-persons/${person.id}/edit`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit sales person"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            {hasPermission('users:delete') && (
                              <button
                                onClick={() => handleDelete(person.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete sales person"
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
                  Showing <span className="font-semibold">{filteredSalesPersons.length}</span> of{' '}
                  <span className="font-semibold">{salesPersons.length}</span> sales persons
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesPersons

