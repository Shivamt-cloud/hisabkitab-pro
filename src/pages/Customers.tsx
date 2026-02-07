import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { customerService } from '../services/customerService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { CustomerCard } from '../components/CustomerCard'
import { Plus, Search, Home, Users } from 'lucide-react'
import { Customer } from '../types/customer'

const Customers = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [location.pathname])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const allCustomers = await customerService.getAll(true, companyId)
      setCustomers(allCustomers)
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchTerm = searchQuery.trim()
  const filteredCustomers = customers.filter(customer =>
    !searchTerm ||
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.replace(/\s/g, '').includes(searchTerm.replace(/\s/g, ''))) ||
    customer.gstin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerService.delete(id)
        loadCustomers()
      } catch (error) {
        console.error('Error deleting customer:', error)
        alert('Failed to delete customer')
      }
    }
  }

  return (
    <ProtectedRoute requiredPermission="sales:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage your customer database</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/customers/insights')}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-2.5 px-5 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                >
                  Customer Insights
                </button>
                {hasPermission('sales:create') && (
                <button
                  onClick={() => navigate('/customers/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 transform hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  Add Customer
                </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, email, phone, GSTIN, or city..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg shadow-sm"
              />
            </div>
          </div>

          {/* Customers Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center border border-white/50">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No customers found' : 'No customers yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Get started by adding your first customer'}
              </p>
              {!searchTerm && hasPermission('sales:create') && (
                <button
                  onClick={() => navigate('/customers/new')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-6 rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add First Customer
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  hasPermission={hasPermission}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default Customers

