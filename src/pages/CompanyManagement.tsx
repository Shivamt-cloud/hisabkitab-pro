import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { companyService } from '../services/companyService'
import { Company } from '../types/company'
import { Home, Plus, Edit, Trash2, Building2, Users, Eye, EyeOff } from 'lucide-react'

const CompanyManagement = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only admin can access this page
    if (user?.role !== 'admin') {
      navigate('/')
      return
    }
    loadCompanies()
  }, [user, navigate])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const allCompanies = await companyService.getAll(true) // Include inactive
      setCompanies(allCompanies)
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate company "${name}"? This will hide it from regular users but data will be preserved.`)) {
      try {
        await companyService.delete(id)
        alert('Company deactivated successfully')
        loadCompanies()
      } catch (error) {
        alert('Failed to deactivate company')
      }
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await companyService.update(id, { is_active: true })
      alert('Company activated successfully')
      loadCompanies()
    } catch (error) {
      alert('Failed to activate company')
    }
  }

  if (user?.role !== 'admin') {
    return null
  }

  return (
    <ProtectedRoute requiredPermission="users:read" requiredRole="admin">
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
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage all companies in the system</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/companies/new')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                New Company
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center border border-white/50">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Companies Found</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first company.</p>
              <button
                onClick={() => navigate('/companies/new')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-6 rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create First Company
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className={`bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                    !company.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{company.name}</h3>
                        {!company.is_active && (
                          <span className="text-xs text-red-600 font-semibold">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {company.email && (
                      <p className="text-sm text-gray-600">
                        <strong>Email:</strong> {company.email}
                      </p>
                    )}
                    {company.phone && (
                      <p className="text-sm text-gray-600">
                        <strong>Phone:</strong> {company.phone}
                      </p>
                    )}
                    {company.gstin && (
                      <p className="text-sm text-gray-600">
                        <strong>GSTIN:</strong> {company.gstin}
                      </p>
                    )}
                    {company.city && company.state && (
                      <p className="text-sm text-gray-600">
                        <strong>Location:</strong> {company.city}, {company.state}
                      </p>
                    )}
                    {company.valid_from && company.valid_to && (
                      <p className="text-sm text-gray-600">
                        <strong>License:</strong> {new Date(company.valid_from).toLocaleDateString()} - {new Date(company.valid_to).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/companies/${company.id}/edit`)}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Company"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {company.is_active ? (
                        <button
                          onClick={() => handleDelete(company.id, company.name)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate Company"
                        >
                          <EyeOff className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(company.id)}
                          className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                          title="Activate Company"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/companies/${company.id}/users`)}
                      className="text-indigo-600 hover:text-indigo-800 px-3 py-1.5 text-sm font-medium hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                      title="Manage Users"
                    >
                      <Users className="w-4 h-4" />
                      Users
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default CompanyManagement

