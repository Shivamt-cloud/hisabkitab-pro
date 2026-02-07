import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/userService'
import { permissionService } from '../services/permissionService'
import { companyService } from '../services/companyService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { UserRole } from '../types/auth'
import { PermissionModule, PermissionAction, PERMISSION_MODULES, ModulePermission } from '../types/permissions'
import { Home, Save, X, Shield, UserCog, UserCheck, Eye, Lock, Unlock } from 'lucide-react'
import { Company } from '../types/company'

const UserForm = () => {
  const { hasPermission, user: currentUser, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [autoGenerateEmail, setAutoGenerateEmail] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff' as UserRole,
  })

  const [useCustomPermissions, setUseCustomPermissions] = useState(false)
  const [customPermissions, setCustomPermissions] = useState<ModulePermission[]>([])

  // Load companies for selection
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const allCompanies = await companyService.getAll(true)
        setCompanies(allCompanies)
        
        // If not editing and current user is not admin, pre-select their company
        if (!isEditing && currentUser && currentUser.role !== 'admin') {
          const currentCompanyId = getCurrentCompanyId()
          if (currentCompanyId) {
            setSelectedCompanyId(currentCompanyId)
          }
        }
      } catch (error) {
        console.error('Error loading companies:', error)
      }
    }
    loadCompanies()
  }, [isEditing, currentUser, getCurrentCompanyId])

  useEffect(() => {
    if (isEditing && id) {
      const loadUser = async () => {
        try {
          const user = await userService.getById(id)
          if (user) {
            setFormData({
              name: user.name,
              email: user.email,
              password: '',
              confirmPassword: '',
              role: user.role,
            })
            
            // Set company ID if user has one
            if (user.company_id) {
              setSelectedCompanyId(user.company_id)
            }
            
            // Load custom permissions if they exist
            const userPerms = await permissionService.getUserPermissions(id)
            if (userPerms) {
              setUseCustomPermissions(userPerms.useCustomPermissions)
              setCustomPermissions(userPerms.customPermissions.filter((p) => p.module !== 'settings'))
            }
          }
        } catch (error) {
          console.error('Error loading user:', error)
        }
      }
      loadUser()
    }
  }, [isEditing, id])

  // Auto-generate email when name or company changes (only for new users)
  useEffect(() => {
    if (!isEditing && autoGenerateEmail && formData.name.trim() && selectedCompanyId) {
      const generateEmail = async () => {
        try {
          const company = await companyService.getById(selectedCompanyId)
          if (company && company.unique_code) {
            // Generate email: username@companycode
            // Extract username from name (lowercase, remove spaces)
            const username = formData.name.trim().toLowerCase().replace(/\s+/g, '')
            const generatedEmail = `${username}@${company.unique_code}`
            setFormData(prev => ({ ...prev, email: generatedEmail }))
          }
        } catch (error) {
          console.error('Error generating email:', error)
        }
      }
      generateEmail()
    }
  }, [formData.name, selectedCompanyId, autoGenerateEmail, isEditing])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      alert('Name is required')
      return
    }

    if (!formData.email.trim()) {
      alert('Email is required')
      return
    }

    if (!formData.email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }

    if (!isEditing && !formData.password) {
      alert('Password is required for new users')
      return
    }

    // Trim passwords to avoid whitespace issues
    const trimmedPassword = formData.password.trim()
    const trimmedConfirmPassword = formData.confirmPassword.trim()
    
    // If password is provided when editing, validate it
    if (trimmedPassword) {
      // Check length first
      if (trimmedPassword.length < 6) {
        alert('Password must be at least 6 characters long')
        return
      }
      
      // Check if confirm password is provided
      if (!trimmedConfirmPassword) {
        alert('Please confirm your password')
        return
      }
      
      // Check if passwords match
      if (trimmedPassword !== trimmedConfirmPassword) {
        alert('Passwords do not match')
        return
      }
    }
    
    // If no password provided when editing, that's fine (keeping current password)

    setLoading(true)

    try {
      if (isEditing && id) {
        // Update existing user
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }
        
        // Update company_id if company is selected (unless user is admin)
        if (selectedCompanyId && formData.role !== 'admin') {
          updateData.company_id = selectedCompanyId
        } else if (formData.role === 'admin') {
          // Admin users should not have company_id
          updateData.company_id = undefined
        }
        
        // Only update password if provided
        if (formData.password) {
          updateData.password = formData.password
        }

        await userService.update(id, updateData)

        // Persist custom permissions so Barcode/Receipt settings etc. are visible when enabled
        if (useCustomPermissions) {
          await permissionService.saveUserPermissions({
            userId: id,
            useCustomPermissions: true,
            customPermissions: customPermissions.filter((p) => p.module !== 'settings'),
          })
        } else {
          await permissionService.deleteUserPermissions(id)
        }

        alert('User updated successfully!')
      } else {
        // Create new user (use trimmed password)
        // Auto-assign company_id if company is selected
        const userData: any = {
          name: formData.name,
          email: formData.email,
          password: trimmedPassword,
          role: formData.role,
        }
        
        // Auto-assign company_id if company is selected (unless user is admin)
        if (selectedCompanyId && formData.role !== 'admin') {
          userData.company_id = selectedCompanyId
        } else if (!selectedCompanyId && currentUser && currentUser.role !== 'admin' && formData.role !== 'admin') {
          // If no company selected but current user is not admin, assign their company_id
          const currentCompanyId = getCurrentCompanyId()
          if (currentCompanyId) {
            userData.company_id = currentCompanyId
            setSelectedCompanyId(currentCompanyId) // Also set it in state for consistency
          }
        }
        
        // Validate: non-admin users must have a company_id
        if (formData.role !== 'admin' && !userData.company_id) {
          alert('Please select a company for non-admin users')
          setLoading(false)
          return
        }
        
        const createdUser = await userService.create(userData)

        // Persist custom permissions for new user (e.g. Barcode/Receipt settings)
        if (createdUser?.id) {
          if (useCustomPermissions) {
            await permissionService.saveUserPermissions({
              userId: createdUser.id,
              useCustomPermissions: true,
              customPermissions: customPermissions.filter((p) => p.module !== 'settings'),
            })
          } else {
            await permissionService.deleteUserPermissions(createdUser.id)
          }
        }

        alert('User created successfully!')
      }
      navigate('/users')
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Failed to save user'))
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-5 h-5" />
      case 'manager':
        return <UserCog className="w-5 h-5" />
      case 'staff':
        return <UserCheck className="w-5 h-5" />
      case 'viewer':
        return <Eye className="w-5 h-5" />
      default:
        return null
    }
  }

  return (
    <ProtectedRoute requiredPermission={isEditing ? 'users:update' : 'users:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/users')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                  title="Back to User Management"
                >
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? 'Edit User' : 'Add New User'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update user information' : 'Create a new system user'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-8 border border-white/50">
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Company Selection (for non-admin users or when creating new user) */}
              {(!isEditing || currentUser?.role === 'admin') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company {formData.role !== 'admin' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={selectedCompanyId || ''}
                    onChange={(e) => {
                      const companyId = e.target.value ? parseInt(e.target.value) : null
                      setSelectedCompanyId(companyId)
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required={formData.role !== 'admin'}
                    disabled={currentUser?.role !== 'admin' && !isEditing}
                  >
                    <option value="">Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name} ({company.unique_code})
                      </option>
                    ))}
                  </select>
                  {!isEditing && selectedCompanyId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Email will be auto-generated as: username@{companies.find(c => c.id === selectedCompanyId)?.unique_code}
                    </p>
                  )}
                </div>
              )}

              {/* User Code (Email) - Show as read-only info when editing */}
              {isEditing && formData.email && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    User Code
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono">
                    {formData.email}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    User code format: username@companycode (e.g., cs01@COMP002)
                  </p>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                  {!isEditing && (
                    <span className="text-xs text-gray-500 ml-2">(Auto-generated from username + company code)</span>
                  )}
                  {isEditing && (
                    <span className="text-xs text-gray-500 ml-2">(User Code - shown above)</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value })
                      setAutoGenerateEmail(false) // Disable auto-generation if user manually edits
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder={!isEditing ? "Auto-generated: username@companycode" : "user@example.com"}
                    required
                  />
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setAutoGenerateEmail(!autoGenerateEmail)}
                      className="px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title={autoGenerateEmail ? "Disable auto-generation" : "Enable auto-generation"}
                    >
                      {autoGenerateEmail ? '🔒' : '🔓'}
                    </button>
                  )}
                </div>
                {!isEditing && autoGenerateEmail && selectedCompanyId && formData.name.trim() && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Email will be auto-generated when you select a company
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isEditing ? 'New Password (leave blank to keep current)' : 'Password'} 
                  {!isEditing && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder={isEditing ? "Enter new password or leave blank" : "Minimum 6 characters"}
                  minLength={isEditing ? 0 : 6}
                  required={!isEditing}
                />
              </div>

              {/* Confirm Password - Always visible when password is entered or when editing */}
              {(formData.password || isEditing) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password {formData.password && <span className="text-red-500">*</span>}
                    {isEditing && !formData.password && (
                      <span className="text-gray-500 text-xs ml-2">(Required if changing password)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      formData.password && formData.confirmPassword && formData.password.trim() !== formData.confirmPassword.trim()
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder={isEditing ? "Re-enter password to confirm (leave blank if not changing)" : "Re-enter password to confirm"}
                    required={!!formData.password.trim()}
                  />
                  {formData.password && formData.confirmPassword && formData.password.trim() !== formData.confirmPassword.trim() && (
                    <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                  )}
                  {isEditing && !formData.password && (
                    <p className="text-xs text-gray-500 mt-1">Leave both password fields blank to keep the current password</p>
                  )}
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['admin', 'manager', 'staff', 'viewer'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, role })}
                      className={`p-4 border-2 rounded-lg transition-all flex flex-col items-center gap-2 ${
                        formData.role === role
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {getRoleIcon(role)}
                      <span className="text-sm font-semibold capitalize">{role}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formData.role === 'admin' && 'Full access to all features'}
                  {formData.role === 'manager' && 'Can manage sales, purchases, and products'}
                  {formData.role === 'staff' && 'Can create sales and purchases, view reports'}
                  {formData.role === 'viewer' && 'Read-only access to view reports and data'}
                </p>
              </div>

              {/* Custom Permissions */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Custom Permissions
                    </label>
                    <p className="text-xs text-gray-500">
                      Override role-based permissions with custom module access
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setUseCustomPermissions(!useCustomPermissions)
                      if (!useCustomPermissions) {
                        // Initialize with role-based permissions when enabling
                        const effective = await permissionService.getEffectivePermissions(
                          isEditing && id ? id : '',
                          formData.role
                        )
                        setCustomPermissions(effective)
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                      useCustomPermissions
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {useCustomPermissions ? (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Custom Enabled</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Use Role Defaults</span>
                      </>
                    )}
                  </button>
                </div>

                {useCustomPermissions && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-[28rem] overflow-y-auto">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const all: ModulePermission[] = (Object.keys(PERMISSION_MODULES) as PermissionModule[])
                            .filter((module) => module !== 'settings')
                            .map((module) => ({
                              module,
                              actions: [...PERMISSION_MODULES[module].actions],
                            }))
                          setCustomPermissions(all)
                        }}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200"
                      >
                        Grant all
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomPermissions([])}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
                      >
                        Revoke all
                      </button>
                    </div>
                    {(Object.keys(PERMISSION_MODULES) as PermissionModule[])
                      .filter((module) => module !== 'settings')
                      .map((module) => {
                      const moduleInfo = PERMISSION_MODULES[module]
                      const modulePerm = customPermissions.find(p => p.module === module)
                      const selectedActions = modulePerm?.actions || []

                      const toggleAction = (action: PermissionAction) => {
                        const updated = [...customPermissions]
                        const index = updated.findIndex(p => p.module === module)
                        
                        if (index >= 0) {
                          if (selectedActions.includes(action)) {
                            updated[index].actions = updated[index].actions.filter(a => a !== action)
                            if (updated[index].actions.length === 0) {
                              updated.splice(index, 1)
                            }
                          } else {
                            updated[index].actions.push(action)
                          }
                        } else {
                          updated.push({ module, actions: [action] })
                        }
                        
                        setCustomPermissions(updated)
                      }

                      const hasAllActions = moduleInfo.actions.every(a => selectedActions.includes(a))
                      const hasSomeActions = selectedActions.length > 0

                      return (
                        <div key={module} className="border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <input
                                  type="checkbox"
                                  checked={hasAllActions}
                                  ref={(input) => {
                                    if (input) input.indeterminate = hasSomeActions && !hasAllActions
                                  }}
                                  onChange={() => {
                                    if (hasAllActions) {
                                      // Remove all
                                      setCustomPermissions(
                                        customPermissions.filter(p => p.module !== module)
                                      )
                                    } else {
                                      // Add all
                                      const updated = customPermissions.filter(p => p.module !== module)
                                      updated.push({
                                        module,
                                        actions: [...moduleInfo.actions],
                                      })
                                      setCustomPermissions(updated)
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label className="font-semibold text-gray-900">
                                  {moduleInfo.label}
                                </label>
                              </div>
                              <p className="text-xs text-gray-500 ml-6">{moduleInfo.description}</p>
                            </div>
                          </div>
                          <div className="ml-6 flex flex-wrap gap-2">
                            {moduleInfo.actions.map((action) => (
                              <label
                                key={action}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedActions.includes(action)}
                                  onChange={() => toggleAction(action)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 capitalize">
                                  {action}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/users')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default UserForm

