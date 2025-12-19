import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supplierService } from '../services/purchaseService'
import { Supplier } from '../types/purchase'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Filter,
  Home
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Suppliers = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRegistered, setFilterRegistered] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const allSuppliers = await supplierService.getAll(companyId || undefined)
      setSuppliers(allSuppliers)
    } catch (error) {
      console.error('Error loading suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      if (hasPermission('purchases:delete')) {
        try {
          await supplierService.delete(id)
          await loadSuppliers()
        } catch (error) {
          console.error('Error deleting supplier:', error)
          alert('Failed to delete supplier')
        }
      } else {
        alert('You do not have permission to delete suppliers')
      }
    }
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = !searchQuery || 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.gstin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone?.includes(searchQuery) ||
      supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filterRegistered === null || supplier.is_registered === filterRegistered

    return matchesSearch && matchesFilter
  })

  const getRegisteredBadge = (supplier: Supplier) => {
    if (supplier.is_registered) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-semibold">
          GST Registered
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold">
        Unregistered
      </span>
    )
  }

  return (
    <ProtectedRoute requiredPermission="purchases:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage your supplier contacts</p>
                </div>
              </div>
              {hasPermission('purchases:create') && (
                <button
                  onClick={() => navigate('/suppliers/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Supplier
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
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
                  placeholder="Search suppliers by name, GSTIN, contact, phone, or email..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <button
                  onClick={() => setFilterRegistered(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterRegistered === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterRegistered(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterRegistered === true
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  GST Registered
                </button>
                <button
                  onClick={() => setFilterRegistered(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterRegistered === false
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Unregistered
                </button>
              </div>
            </div>
          </div>

          {/* Suppliers Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading suppliers...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-12 border border-white/50 text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No suppliers found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterRegistered !== null
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first supplier'}
              </p>
              {hasPermission('purchases:create') && (
                <button
                  onClick={() => navigate('/suppliers/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Supplier
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
                        Supplier
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        GSTIN
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                              {supplier.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{supplier.name}</div>
                              {supplier.contact_person && (
                                <div className="text-xs text-gray-500">Contact: {supplier.contact_person}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {supplier.phone && <div className="mb-1">📞 {supplier.phone}</div>}
                            {supplier.email && <div className="text-xs text-gray-600">✉️ {supplier.email}</div>}
                            {!supplier.phone && !supplier.email && (
                              <span className="text-gray-400 text-xs">No contact info</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {supplier.city && <div>{supplier.city}</div>}
                            {supplier.state && (
                              <div className="text-xs text-gray-600">{supplier.state}</div>
                            )}
                            {supplier.pincode && (
                              <div className="text-xs text-gray-500">{supplier.pincode}</div>
                            )}
                            {!supplier.city && !supplier.state && (
                              <span className="text-gray-400 text-xs">Not provided</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRegisteredBadge(supplier)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-mono">
                            {supplier.gstin || <span className="text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('purchases:update') && (
                              <button
                                onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit supplier"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            {hasPermission('purchases:delete') && (
                              <button
                                onClick={() => handleDelete(supplier.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete supplier"
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
                  Showing <span className="font-semibold">{filteredSuppliers.length}</span> of{' '}
                  <span className="font-semibold">{suppliers.length}</span> suppliers
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default Suppliers

