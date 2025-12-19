import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/userService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { User, UserRole } from '../types/auth'
import { Home, Plus, Edit, Trash2, Users, Shield, UserCheck, Eye, UserCog } from 'lucide-react'

const UserManagement = () => {
  const { user: currentUser, hasPermission } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<(User & { password?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const allUsers = await userService.getAll()
      // Remove password from display
      const usersWithoutPassword = allUsers.map(({ password, ...user }) => user)
      setUsers(usersWithoutPassword)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (userId: string, userName: string) => {
    // Prevent deleting yourself
    if (userId === currentUser?.id) {
      alert('You cannot delete your own account')
      return
    }

    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      const handleDelete = async () => {
        try {
          await userService.delete(userId)
          await loadUsers()
          alert('User deleted successfully')
        } catch (error: any) {
          alert('Failed to delete user: ' + (error.message || 'Unknown error'))
        }
      }
      handleDelete()
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />
      case 'manager':
        return <UserCog className="w-4 h-4" />
      case 'staff':
        return <UserCheck className="w-4 h-4" />
      case 'viewer':
        return <Eye className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'staff':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <ProtectedRoute requiredPermission="users:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                  title="Back to Dashboard"
                >
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage system users and their roles</p>
                </div>
              </div>
              {hasPermission('users:create') && (
                <button
                  onClick={() => navigate('/users/new')}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add New User
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-6 border border-white/50">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <Users className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">
                  {searchQuery ? 'No users found matching your search' : 'No users found'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{user.name}</p>
                              {user.id === currentUser?.id && (
                                <p className="text-xs text-blue-600">(You)</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-gray-600">{user.email}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}
                          >
                            {getRoleIcon(user.role)}
                            <span className="capitalize">{user.role}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('users:update') && (
                              <button
                                onClick={() => navigate(`/users/${user.id}/edit`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            )}
                            {hasPermission('users:delete') && user.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDelete(user.id, user.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
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
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-white/50">
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-white/50">
              <p className="text-sm text-gray-600 mb-1">Admins</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-white/50">
              <p className="text-sm text-gray-600 mb-1">Managers</p>
              <p className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.role === 'manager').length}
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-white/50">
              <p className="text-sm text-gray-600 mb-1">Staff</p>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'staff').length}
              </p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default UserManagement

