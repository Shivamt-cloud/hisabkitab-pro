import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { settingsService } from '../services/settingsService'
import { companyService } from '../services/companyService'
import { userService, UserWithPassword } from '../services/userService'
import { permissionService } from '../services/permissionService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { CompanySettings, InvoiceSettings, TaxSettings, GeneralSettings } from '../types/settings'
import { Company } from '../types/company'
import { UserRole } from '../types/auth'
import { PermissionModule, PermissionAction, PERMISSION_MODULES, ModulePermission } from '../types/permissions'
import { Home, Save, Building2, FileText, Percent, Settings, RotateCcw, Download, Upload, Plus, Edit, Trash2, Users, Eye, EyeOff, X, Shield, UserCog, UserCheck, Lock, Unlock } from 'lucide-react'

type SettingsTab = 'companies' | 'users' | 'invoice' | 'tax' | 'general'

const SystemSettings = () => {
  const { user, getCurrentCompanyId, switchCompany } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<SettingsTab>('companies')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Company management states
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(getCurrentCompanyId())
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [companyFormData, setCompanyFormData] = useState<Partial<Company> & { custom_unique_code?: string }>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    gstin: '',
    pan: '',
    website: '',
    valid_from: '',
    valid_to: '',
    is_active: true,
    custom_unique_code: '', // For new companies - allow custom code input
  })
  
  // User management states
  const [allUsers, setAllUsers] = useState<UserWithPassword[]>([])
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithPassword | null>(null)
  interface UserFormData extends Partial<UserWithPassword> {
    confirmPassword?: string
  }
  const [userFormData, setUserFormData] = useState<UserFormData>({
    name: '',
    email: '',
    user_code: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    company_id: undefined,
  })
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)
  const [customPermissions, setCustomPermissions] = useState<ModulePermission[]>([])
  const [autoGenerateEmail, setAutoGenerateEmail] = useState(true)
  const [autoGenerateUserCode, setAutoGenerateUserCode] = useState(true)

  // Settings for currently selected company
  const [selectedCompanyForSettings, setSelectedCompanyForSettings] = useState<number | null>(selectedCompanyId)
  const [invoice, setInvoice] = useState<InvoiceSettings>({
    invoice_prefix: 'INV',
    invoice_number_format: 'INV-{YYYY}-{NNNN}',
    invoice_footer_text: '',
    invoice_terms_and_conditions: '',
    show_tax_breakdown: true,
    show_payment_instructions: false,
    payment_instructions_text: '',
    invoice_template: 'standard',
  })
  const [tax, setTax] = useState<TaxSettings>({
    default_gst_rate: 18,
    default_tax_type: 'exclusive',
    enable_cgst_sgst: false,
    default_cgst_rate: 9,
    default_sgst_rate: 9,
    default_igst_rate: 18,
    tax_exempt_categories: [],
  })
  const [general, setGeneral] = useState<GeneralSettings>({
    currency_symbol: '₹',
    currency_code: 'INR',
    date_format: 'DD-MMM-YYYY',
    time_format: '12h',
    default_unit: 'pcs',
    low_stock_threshold_percentage: 20,
    auto_archive_products_after_sale: true,
    enable_barcode_generation: true,
    default_barcode_format: 'EAN13',
  })

  useEffect(() => {
    loadCompanies()
    loadUsers()
    // Load settings when company is selected
    if (selectedCompanyForSettings) {
      loadCompanySettings(selectedCompanyForSettings)
    }
  }, [])

  // Auto-generate email (username@hisabkitab.com) when name is provided
  useEffect(() => {
    if (autoGenerateEmail && !editingUser && userFormData.name?.trim()) {
      const usernamePart = userFormData.name.trim().toLowerCase().replace(/\s/g, '')
      setUserFormData(prev => ({ ...prev, email: `${usernamePart}@hisabkitab.com` }))
    } else if (!autoGenerateEmail && !editingUser) {
      // Don't clear email if user manually edited it
      if (userFormData.email && !userFormData.email.includes('@')) {
        setUserFormData(prev => ({ ...prev, email: '' }))
      }
    }
  }, [autoGenerateEmail, userFormData.name, editingUser])

  // Auto-generate user_code (username@companycode) when name and company are provided
  useEffect(() => {
    if (autoGenerateUserCode && !editingUser && userFormData.name?.trim() && userFormData.company_id) {
      const usernamePart = userFormData.name.trim().toLowerCase().replace(/\s/g, '')
      const company = companies.find(c => c.id === userFormData.company_id)
      if (company && company.unique_code) {
        setUserFormData(prev => ({ ...prev, user_code: `${usernamePart}@${company.unique_code}` }))
      }
    } else if (!autoGenerateUserCode && !editingUser) {
      // Don't clear user_code if user manually edited it
      if (userFormData.user_code && !userFormData.user_code.includes('@')) {
        setUserFormData(prev => ({ ...prev, user_code: '' }))
      }
    }
  }, [autoGenerateUserCode, userFormData.name, userFormData.company_id, companies, editingUser])

  useEffect(() => {
    // Reload settings when company changes
    if (selectedCompanyForSettings) {
      loadCompanySettings(selectedCompanyForSettings)
    }
  }, [selectedCompanyForSettings])

  const loadCompanySettings = async (companyId: number) => {
    try {
      const [invoiceSettings, taxSettings, generalSettings] = await Promise.all([
        settingsService.getInvoice(companyId),
        settingsService.getTax(companyId),
        settingsService.getGeneral(companyId),
      ])
      setInvoice(invoiceSettings)
      setTax(taxSettings)
      setGeneral(generalSettings)
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  useEffect(() => {
    if (selectedCompanyId) {
      switchCompany(selectedCompanyId)
    }
    loadUsers() // Reload users when company changes
  }, [selectedCompanyId])

  const loadCompanies = async () => {
    try {
      if (user?.role === 'admin') {
        const allCompanies = await companyService.getAll(true)
        setCompanies(allCompanies)
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const loadUsers = async () => {
    try {
      if (user?.role === 'admin') {
        const users = await userService.getAll()
        // Filter users by selected company if a company is selected
        let filteredUsers = users
        if (selectedCompanyId) {
          filteredUsers = users.filter(u => u.company_id === selectedCompanyId)
        }
        setAllUsers(filteredUsers)
      } else {
        // Non-admin users only see themselves (though they shouldn't access this page)
        const currentUser = await userService.getByEmail(user?.email || '')
        if (currentUser) {
          setAllUsers([currentUser])
        }
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleCompanySubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingCompany) {
        await companyService.update(editingCompany.id, companyFormData)
        alert('Company updated successfully!')
      } else {
        const { custom_unique_code, ...companyDataToCreate } = companyFormData
        await companyService.create({ 
          ...companyDataToCreate,
          unique_code: custom_unique_code || undefined
        } as Omit<Company, 'id' | 'created_at' | 'updated_at' | 'unique_code'> & { unique_code?: string })
        alert('Company created successfully!')
      }
      setShowCompanyForm(false)
      setEditingCompany(null)
      setCompanyFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        gstin: '',
        pan: '',
        website: '',
        valid_from: '',
        valid_to: '',
        is_active: true,
        custom_unique_code: '',
      })
      loadCompanies()
    } catch (error: any) {
      alert(error.message || 'Failed to save company')
    } finally {
      setLoading(false)
    }
  }

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company)
    setCompanyFormData(company)
    setShowCompanyForm(true)
  }

  const handleDeleteCompany = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate company "${name}"?`)) {
      try {
        await companyService.delete(id)
        alert('Company deactivated successfully')
        loadCompanies()
      } catch (error) {
        alert('Failed to deactivate company')
      }
    }
  }

  const handleUserSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!userFormData.name?.trim()) {
      alert('Name is required')
      return
    }
    if (!userFormData.email?.trim()) {
      alert('Email is required')
      return
    }
    if (!editingUser && !userFormData.password) {
      alert('Password is required for new users')
      return
    }
    // Trim passwords to avoid whitespace issues
    const trimmedPassword = userFormData.password.trim()
    const trimmedConfirmPassword = (userFormData.confirmPassword || '').trim()
    
    if (trimmedPassword && trimmedPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    
    // Only validate password match if password is provided
    if (trimmedPassword && trimmedPassword !== trimmedConfirmPassword) {
      alert('Passwords do not match')
      return
    }
    
    // If password is provided, confirm password must also be provided
    if (trimmedPassword && !trimmedConfirmPassword) {
      alert('Please confirm your password')
      return
    }
    
    setLoading(true)
    try {
      let userId: string
      
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          name: userFormData.name,
          email: userFormData.email,
          user_code: userFormData.user_code,
          role: userFormData.role,
          company_id: userFormData.company_id,
        }
        if (trimmedPassword) {
          updateData.password = trimmedPassword
        }
        await userService.update(editingUser.id, updateData)
        userId = editingUser.id
        alert('User updated successfully!')
      } else {
        // Create new user
        const userData: any = {
          name: userFormData.name!,
          email: userFormData.email!,
          user_code: userFormData.user_code || undefined,
          password: trimmedPassword,
          role: userFormData.role || 'staff',
        }
        
        // Auto-assign company_id if company is selected (unless user is admin)
        if (userFormData.company_id && userFormData.role !== 'admin') {
          userData.company_id = userFormData.company_id
        } else if (userFormData.role !== 'admin' && !userFormData.company_id) {
          alert('Please select a company for non-admin users.')
          setLoading(false)
          return
        } else if (userFormData.role === 'admin') {
          // Admin can have no company_id (access to all companies)
          userData.company_id = userFormData.company_id
        }
        
        const newUser = await userService.create(userData as Omit<UserWithPassword, 'id'>)
        userId = newUser.id
        alert('User created successfully!')
      }
      
      // Save custom permissions if enabled
      if (useCustomPermissions && userId) {
        await permissionService.saveUserPermissions({
          userId,
          useCustomPermissions: true,
          customPermissions,
        })
      } else if (userId) {
        // Delete custom permissions if not using them (will fall back to role-based)
        await permissionService.deleteUserPermissions(userId)
      }
      
      setShowUserForm(false)
      setEditingUser(null)
      setUserFormData({
        name: '',
        email: '',
        user_code: '',
        password: '',
        confirmPassword: '',
        role: 'staff',
        company_id: selectedCompanyId || undefined,
      })
      setAutoGenerateEmail(true)
      setAutoGenerateUserCode(true)
      setUseCustomPermissions(false)
      setCustomPermissions([])
      loadUsers()
    } catch (error: any) {
      alert(error.message || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (userData: UserWithPassword) => {
    setEditingUser(userData)
    setUserFormData({
      name: userData.name,
      email: userData.email,
      user_code: userData.user_code || '',
      role: userData.role,
      company_id: userData.company_id,
      password: '', // Don't show password
      confirmPassword: '',
    })
    setAutoGenerateEmail(false) // Disable auto-generation when editing
    setAutoGenerateUserCode(false) // Disable auto-generation when editing
    
    // Load custom permissions if they exist
    try {
      const userPerms = await permissionService.getUserPermissions(userData.id)
      if (userPerms) {
        setUseCustomPermissions(userPerms.useCustomPermissions)
        setCustomPermissions(userPerms.customPermissions)
      } else {
        setUseCustomPermissions(false)
        setCustomPermissions([])
      }
    } catch (error) {
      console.error('Error loading user permissions:', error)
      setUseCustomPermissions(false)
      setCustomPermissions([])
    }
    
    setShowUserForm(true)
  }

  const handleDeleteUser = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      try {
        await userService.delete(id)
        alert('User deleted successfully')
        loadUsers()
      } catch (error) {
        alert('Failed to delete user')
      }
    }
  }

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saved])


  const handleSaveInvoice = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCompanyForSettings) {
      alert('Please select a company first')
      return
    }
    setLoading(true)
    try {
      await settingsService.updateInvoice(invoice, user?.id ? parseInt(user.id) : undefined, selectedCompanyForSettings)
      setSaved(true)
    } catch (error) {
      alert('Failed to save invoice settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTax = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCompanyForSettings) {
      alert('Please select a company first')
      return
    }
    setLoading(true)
    try {
      await settingsService.updateTax(tax, user?.id ? parseInt(user.id) : undefined, selectedCompanyForSettings)
      setSaved(true)
    } catch (error) {
      alert('Failed to save tax settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGeneral = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCompanyForSettings) {
      alert('Please select a company first')
      return
    }
    setLoading(true)
    try {
      await settingsService.updateGeneral(general, user?.id ? parseInt(user.id) : undefined, selectedCompanyForSettings)
      setSaved(true)
    } catch (error) {
      alert('Failed to save general settings')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      await settingsService.resetToDefaults(user?.id ? parseInt(user.id) : undefined)
      const [invoiceSettings, taxSettings, generalSettings] = await Promise.all([
        settingsService.getInvoice(selectedCompanyForSettings || undefined),
        settingsService.getTax(selectedCompanyForSettings || undefined),
        settingsService.getGeneral(selectedCompanyForSettings || undefined),
      ])
      setInvoice(invoiceSettings)
      setTax(taxSettings)
      setGeneral(generalSettings)
      setSaved(true)
    }
  }

  const handleExport = async () => {
    const settingsJson = await settingsService.export()
    const blob = new Blob([settingsJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hisabkitab_settings_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const json = event.target?.result as string
            await settingsService.import(json, user?.id ? parseInt(user.id) : undefined)
            const [invoiceSettings, taxSettings, generalSettings] = await Promise.all([
              settingsService.getInvoice(selectedCompanyForSettings || undefined),
              settingsService.getTax(selectedCompanyForSettings || undefined),
              settingsService.getGeneral(selectedCompanyForSettings || undefined),
            ])
            setInvoice(invoiceSettings)
            setTax(taxSettings)
            setGeneral(generalSettings)
            setSaved(true)
            alert('Settings imported successfully!')
          } catch (error) {
            alert('Failed to import settings. Please check the file format.')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
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
                  <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                  <p className="text-sm text-gray-600 mt-1">Configure company information, invoices, taxes, and general settings</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Export Settings"
                >
                  <Download className="w-5 h-5" />
                  Export
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Import Settings"
                >
                  <Upload className="w-5 h-5" />
                  Import
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Reset to Defaults"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {saved && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <Save className="w-5 h-5" />
              Settings saved successfully!
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex gap-4 border-b border-gray-200 mb-6">
              {user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveTab('companies')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                      activeTab === 'companies' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Companies
                    {activeTab === 'companies' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                      activeTab === 'users' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Users
                    {activeTab === 'users' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('invoice')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'invoice' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Invoice Settings
                {activeTab === 'invoice' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('tax')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'tax' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Percent className="w-4 h-4" />
                Tax Settings
                {activeTab === 'tax' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'general' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                General
                {activeTab === 'general' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
            </div>

            {/* Companies Management */}
            {activeTab === 'companies' && user?.role === 'admin' && (
              <div className="space-y-6">
                {/* Company Selector */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Company (to view/manage its settings)
                  </label>
                  <select
                    value={selectedCompanyId || ''}
                    onChange={(e) => setSelectedCompanyId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">All Companies (Admin View)</option>
                    {companies.filter(c => c.is_active).map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.unique_code ? `(${comp.unique_code})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    {selectedCompanyId 
                      ? `Viewing settings for: ${companies.find(c => c.id === selectedCompanyId)?.name}`
                      : 'Viewing all companies (Admin mode)'}
                  </p>
                </div>

                {/* Companies List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">All Companies</h3>
                    <button
                      onClick={() => {
                        setEditingCompany(null)
                        setCompanyFormData({
                          name: '',
                          email: '',
                          phone: '',
                          address: '',
                          city: '',
                          state: '',
                          pincode: '',
                          country: 'India',
                          gstin: '',
                          pan: '',
                          website: '',
                          valid_from: '',
                          valid_to: '',
                          is_active: true,
                        })
                        setShowCompanyForm(true)
                      }}
                      className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Company
                    </button>
                  </div>

                  {showCompanyForm ? (
                    <form onSubmit={handleCompanySubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-900">
                          {editingCompany ? 'Edit Company' : 'New Company'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCompanyForm(false)
                            setEditingCompany(null)
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Company Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={companyFormData.name || ''}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                          />
                        </div>
                        {!editingCompany && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Company Code (Optional)
                              <span className="text-xs text-gray-500 ml-2">Leave empty for auto-generation</span>
                            </label>
                            <input
                              type="text"
                              value={companyFormData.custom_unique_code || ''}
                              onChange={(e) => setCompanyFormData({ 
                                ...companyFormData, 
                                custom_unique_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') 
                              })}
                              placeholder="e.g., ABC, SHOP1 (3-6 characters)"
                              maxLength={6}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              3-6 alphanumeric characters. Auto-generated if left empty.
                            </p>
                          </div>
                        )}
                        {editingCompany && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Company Code
                            </label>
                            <input
                              type="text"
                              value={editingCompany.unique_code || ''}
                              disabled
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-500">Company code cannot be changed after creation</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={companyFormData.email || ''}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                          <input
                            type="tel"
                            value={companyFormData.phone || ''}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, phone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">GSTIN</label>
                          <input
                            type="text"
                            value={companyFormData.gstin || ''}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, gstin: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            maxLength={15}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                          <input
                            type="text"
                            value={companyFormData.city || ''}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                          <input
                            type="text"
                            value={companyFormData.state || ''}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Valid From</label>
                          <input
                            type="date"
                            value={companyFormData.valid_from || ''}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, valid_from: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Valid To</label>
                          <input
                            type="date"
                            value={companyFormData.valid_to || ''}
                            onChange={(e) => setCompanyFormData({ ...companyFormData, valid_to: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            min={companyFormData.valid_from || undefined}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={companyFormData.is_active !== false}
                              onChange={(e) => setCompanyFormData({ ...companyFormData, is_active: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCompanyForm(false)
                            setEditingCompany(null)
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          {loading ? 'Saving...' : editingCompany ? 'Update Company' : 'Create Company'}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companies.map((comp) => (
                      <div
                        key={comp.id}
                        className={`bg-white border-2 rounded-xl p-4 ${
                          selectedCompanyId === comp.id ? 'border-blue-500' : 'border-gray-200'
                        } ${!comp.is_active ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{comp.name}</h4>
                            {comp.unique_code && (
                              <p className="text-xs text-blue-600 font-semibold mt-1">Code: {comp.unique_code}</p>
                            )}
                          </div>
                          {!comp.is_active && (
                            <span className="text-xs text-red-600 font-semibold">Inactive</span>
                          )}
                        </div>
                        {comp.email && <p className="text-sm text-gray-600 mb-1">{comp.email}</p>}
                        {comp.valid_from && comp.valid_to && (
                          <p className="text-xs text-gray-500 mb-3">
                            Valid: {new Date(comp.valid_from).toLocaleDateString()} - {new Date(comp.valid_to).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleEditCompany(comp)}
                            className="flex-1 text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          {comp.is_active ? (
                            <button
                              onClick={() => handleDeleteCompany(comp.id, comp.name)}
                              className="flex-1 text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
                            >
                              <EyeOff className="w-4 h-4" />
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                await companyService.update(comp.id, { is_active: true })
                                loadCompanies()
                              }}
                              className="flex-1 text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Activate
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {companies.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No companies found. Create your first company.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Management */}
            {activeTab === 'users' && user?.role === 'admin' && (
              <div className="space-y-6">
                {/* Company Selector for Users */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filter Users by Company
                  </label>
                  <select
                    value={selectedCompanyId || ''}
                    onChange={(e) => setSelectedCompanyId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="">All Users</option>
                    {companies.filter(c => c.is_active).map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    {selectedCompanyId 
                      ? `Showing users for: ${companies.find(c => c.id === selectedCompanyId)?.name}`
                      : 'Showing all users'}
                  </p>
                </div>

                {/* Users List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Users</h3>
                    <button
                      onClick={() => {
                        setEditingUser(null)
                        setUserFormData({
                          name: '',
                          email: '',
                          user_code: '',
                          password: '',
                          confirmPassword: '',
                          role: 'staff',
                          company_id: selectedCompanyId || undefined,
                        })
                        setAutoGenerateEmail(true)
                        setAutoGenerateUserCode(true)
                        setUseCustomPermissions(false)
                        setCustomPermissions([])
                        setShowUserForm(true)
                      }}
                      className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New User
                    </button>
                  </div>

                  {showUserForm ? (
                    <form onSubmit={handleUserSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-900">
                          {editingUser ? 'Edit User' : 'New User'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserForm(false)
                            setEditingUser(null)
                            setUserFormData({
                              name: '',
                              email: '',
                              user_code: '',
                              password: '',
                              confirmPassword: '',
                              role: 'staff',
                              company_id: selectedCompanyId || undefined,
                            })
                            setAutoGenerateEmail(true)
                            setAutoGenerateUserCode(true)
                            setUseCustomPermissions(false)
                            setCustomPermissions([])
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={userFormData.name || ''}
                            onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                          />
                        </div>
                        {/* User Code - Show as read-only info when editing */}
                        {editingUser && userFormData.user_code && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              User Code
                            </label>
                            <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono">
                              {userFormData.user_code}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              User code format: username@companycode (e.g., cs01@COMP002)
                            </p>
                          </div>
                        )}

                        {/* Email - For login */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email (for login) <span className="text-red-500">*</span>
                            {!editingUser && (
                              <span className="text-xs text-gray-500 ml-2">(Auto-generated: username@hisabkitab.com)</span>
                            )}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={userFormData.email || ''}
                              onChange={(e) => {
                                setUserFormData({ ...userFormData, email: e.target.value })
                                setAutoGenerateEmail(false) // Disable auto-generation if user manually edits
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder={!editingUser ? "Auto-generated: username@hisabkitab.com" : "user@hisabkitab.com"}
                              required
                              disabled={autoGenerateEmail && !editingUser}
                            />
                            {!editingUser && (
                              <button
                                type="button"
                                onClick={() => setAutoGenerateEmail(!autoGenerateEmail)}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                title={autoGenerateEmail ? "Disable auto-generation" : "Enable auto-generation"}
                              >
                                {autoGenerateEmail ? <Lock className="w-4 h-4 text-gray-600" /> : <Unlock className="w-4 h-4 text-gray-600" />}
                              </button>
                            )}
                          </div>
                          {!editingUser && autoGenerateEmail && userFormData.name?.trim() && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Email will be auto-generated as: {userFormData.name.trim().toLowerCase().replace(/\s/g, '')}@hisabkitab.com
                            </p>
                          )}
                        </div>

                        {/* User Code - For identification (only when company is selected) */}
                        {!editingUser && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              User Code <span className="text-red-500">*</span>
                              <span className="text-xs text-gray-500 ml-2">(Auto-generated: username@companycode)</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={userFormData.user_code || ''}
                                onChange={(e) => {
                                  setUserFormData({ ...userFormData, user_code: e.target.value })
                                  setAutoGenerateUserCode(false) // Disable auto-generation if user manually edits
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                                placeholder="Auto-generated: username@COMP002"
                                required
                                disabled={autoGenerateUserCode || !userFormData.company_id}
                              />
                              <button
                                type="button"
                                onClick={() => setAutoGenerateUserCode(!autoGenerateUserCode)}
                                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                title={autoGenerateUserCode ? "Disable auto-generation" : "Enable auto-generation"}
                                disabled={!userFormData.company_id}
                              >
                                {autoGenerateUserCode ? <Lock className="w-4 h-4 text-gray-600" /> : <Unlock className="w-4 h-4 text-gray-600" />}
                              </button>
                            </div>
                            {autoGenerateUserCode && userFormData.company_id && userFormData.name?.trim() && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ User code will be auto-generated as: {userFormData.name.trim().toLowerCase().replace(/\s/g, '')}@{companies.find(c => c.id === userFormData.company_id)?.unique_code}
                              </p>
                            )}
                            {!userFormData.company_id && (
                              <p className="text-xs text-gray-500 mt-1">
                                Select a company to generate user code
                              </p>
                            )}
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {editingUser ? 'New Password (leave blank to keep current)' : 'Password'} 
                            {!editingUser && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="password"
                            value={userFormData.password || ''}
                            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required={!editingUser}
                            placeholder={editingUser ? "Enter new password or leave blank" : "Minimum 6 characters"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Confirm Password {(userFormData.password || editingUser) && <span className="text-red-500">*</span>}
                            {editingUser && !userFormData.password && (
                              <span className="text-gray-500 text-xs ml-2">(Required if changing password)</span>
                            )}
                          </label>
                          <input
                            type="password"
                            value={userFormData.confirmPassword || ''}
                            onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                              userFormData.password && userFormData.confirmPassword && 
                              userFormData.password.trim() !== (userFormData.confirmPassword || '').trim()
                                ? 'border-red-300'
                                : 'border-gray-300'
                            }`}
                            placeholder={editingUser ? "Re-enter password to confirm (leave blank if not changing)" : "Re-enter password to confirm"}
                            required={!!(userFormData.password && userFormData.password.trim())}
                          />
                          {userFormData.password && userFormData.confirmPassword && 
                           userFormData.password.trim() !== (userFormData.confirmPassword || '').trim() && (
                            <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                          )}
                          {editingUser && !userFormData.password && (
                            <p className="text-xs text-gray-500 mt-1">Leave both password fields blank to keep the current password</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Role <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={userFormData.role || 'staff'}
                            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                            required
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Company {userFormData.role !== 'admin' && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={userFormData.company_id || ''}
                            onChange={(e) => {
                              const companyId = e.target.value ? parseInt(e.target.value) : undefined
                              setUserFormData({ ...userFormData, company_id: companyId })
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                            required={userFormData.role !== 'admin'}
                          >
                            <option value="">{userFormData.role === 'admin' ? 'No Company (Admin only)' : 'Select Company'}</option>
                            {companies.filter(c => c.is_active).map(comp => (
                              <option key={comp.id} value={comp.id}>{comp.name} ({comp.unique_code})</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {userFormData.role === 'admin' 
                              ? 'Assign user to a company. Leave empty for admin access to all companies.'
                              : 'Select a company for this user. Email will be auto-generated based on username and company code.'}
                          </p>
                        </div>
                      </div>

                      {/* Custom Permissions Section */}
                      <div className="border-t border-gray-200 pt-6 mt-6">
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
                              const newUseCustom = !useCustomPermissions
                              setUseCustomPermissions(newUseCustom)
                              if (newUseCustom && !editingUser) {
                                // Initialize with role-based permissions when enabling for new user
                                const effective = await permissionService.getEffectivePermissions(
                                  '',
                                  (userFormData.role || 'staff') as UserRole
                                )
                                setCustomPermissions(effective)
                              } else if (newUseCustom && editingUser) {
                                // For existing user, load their current effective permissions
                                const effective = await permissionService.getEffectivePermissions(
                                  editingUser.id,
                                  (userFormData.role || 'staff') as UserRole
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
                          <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                            {(Object.keys(PERMISSION_MODULES) as PermissionModule[]).map((module) => {
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

                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserForm(false)
                            setEditingUser(null)
                            setUserFormData({
                              name: '',
                              email: '',
                              user_code: '',
                              password: '',
                              confirmPassword: '',
                              role: 'staff',
                              company_id: selectedCompanyId || undefined,
                            })
                            setAutoGenerateEmail(true)
                            setAutoGenerateUserCode(true)
                            setUseCustomPermissions(false)
                            setCustomPermissions([])
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email (Login)</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User Code</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allUsers.map((usr) => (
                          <tr key={usr.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{usr.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-900 font-medium">{usr.email}</p>
                              <p className="text-xs text-gray-500 mt-0.5">For login</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-900 font-medium font-mono">{usr.user_code || '-'}</p>
                              <p className="text-xs text-gray-500 mt-0.5">User Code</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                usr.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                usr.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                usr.role === 'staff' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {usr.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {usr.company_id ? (
                                <div>
                                  <p className="text-sm text-gray-900 font-medium">
                                    {companies.find(c => c.id === usr.company_id)?.name || `Company ID: ${usr.company_id}`}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {companies.find(c => c.id === usr.company_id)?.unique_code || ''}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 italic">All Companies (Admin)</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditUser(usr)}
                                  className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {usr.id !== user?.id && (
                                  <button
                                    onClick={() => handleDeleteUser(usr.id, usr.name)}
                                    className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {allUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No users found{selectedCompanyId ? ' for this company' : ''}.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invoice Settings */}
            {activeTab === 'invoice' && (
              <div className="space-y-6">
                {/* Company Selector */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCompanyForSettings || ''}
                    onChange={(e) => {
                      const companyId = e.target.value ? parseInt(e.target.value) : null
                      setSelectedCompanyForSettings(companyId)
                      if (companyId) {
                        loadCompanySettings(companyId)
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    required
                  >
                    <option value="">Select a company</option>
                    {companies.filter(c => c.is_active).map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    {selectedCompanyForSettings 
                      ? `Managing invoice settings for: ${companies.find(c => c.id === selectedCompanyForSettings)?.name}`
                      : 'Please select a company to manage its invoice settings'}
                  </p>
                </div>

                {selectedCompanyForSettings ? (
              <form onSubmit={handleSaveInvoice} className="space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Invoice Prefix <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={invoice.invoice_prefix}
                        onChange={(e) => setInvoice({ ...invoice, invoice_prefix: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Invoice Template
                      </label>
                      <select
                        value={invoice.invoice_template}
                        onChange={(e) => setInvoice({ ...invoice, invoice_template: e.target.value as any })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="standard">Standard</option>
                        <option value="detailed">Detailed</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={invoice.invoice_footer_text || ''}
                      onChange={(e) => setInvoice({ ...invoice, invoice_footer_text: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Thank you for your business!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={invoice.invoice_terms_and_conditions || ''}
                      onChange={(e) => setInvoice({ ...invoice, invoice_terms_and_conditions: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter terms and conditions to be displayed on invoices..."
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="show_tax_breakdown"
                        checked={invoice.show_tax_breakdown}
                        onChange={(e) => setInvoice({ ...invoice, show_tax_breakdown: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="show_tax_breakdown" className="ml-2 text-sm font-medium text-gray-700">
                        Show Tax Breakdown on Invoices
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="show_payment_instructions"
                        checked={invoice.show_payment_instructions}
                        onChange={(e) => setInvoice({ ...invoice, show_payment_instructions: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="show_payment_instructions" className="ml-2 text-sm font-medium text-gray-700">
                        Show Payment Instructions on Invoices
                      </label>
                    </div>
                  </div>

                  {invoice.show_payment_instructions && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Payment Instructions Text
                      </label>
                      <textarea
                        value={invoice.payment_instructions_text || ''}
                        onChange={(e) => setInvoice({ ...invoice, payment_instructions_text: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Enter payment instructions..."
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Invoice Settings'}
                  </button>
                </div>
              </form>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Please select a company to manage invoice settings</p>
                  </div>
                )}
              </div>
            )}

            {/* Tax Settings */}
            {activeTab === 'tax' && (
              <div className="space-y-6">
                {/* Company Selector */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCompanyForSettings || ''}
                    onChange={(e) => {
                      const companyId = e.target.value ? parseInt(e.target.value) : null
                      setSelectedCompanyForSettings(companyId)
                      if (companyId) {
                        loadCompanySettings(companyId)
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    required
                  >
                    <option value="">Select a company</option>
                    {companies.filter(c => c.is_active).map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    {selectedCompanyForSettings 
                      ? `Managing tax settings for: ${companies.find(c => c.id === selectedCompanyForSettings)?.name}`
                      : 'Please select a company to manage its tax settings'}
                  </p>
                </div>

                {selectedCompanyForSettings ? (
              <form onSubmit={handleSaveTax} className="space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Default GST Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={tax.default_gst_rate}
                        onChange={(e) => setTax({ ...tax, default_gst_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Default Tax Type
                      </label>
                      <select
                        value={tax.default_tax_type}
                        onChange={(e) => setTax({ ...tax, default_tax_type: e.target.value as 'inclusive' | 'exclusive' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="exclusive">Exclusive (Tax added on top)</option>
                        <option value="inclusive">Inclusive (Tax included in price)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enable_cgst_sgst"
                      checked={tax.enable_cgst_sgst}
                      onChange={(e) => setTax({ ...tax, enable_cgst_sgst: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="enable_cgst_sgst" className="ml-2 text-sm font-medium text-gray-700">
                      Enable Split GST (CGST + SGST)
                    </label>
                  </div>

                  {tax.enable_cgst_sgst && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Default CGST Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={tax.default_cgst_rate || 0}
                          onChange={(e) => setTax({ ...tax, default_cgst_rate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Default SGST Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={tax.default_sgst_rate || 0}
                          onChange={(e) => setTax({ ...tax, default_sgst_rate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Default IGST Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={tax.default_igst_rate || 0}
                          onChange={(e) => setTax({ ...tax, default_igst_rate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Tax Settings'}
                  </button>
                </div>
              </form>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Please select a company to manage tax settings</p>
                  </div>
                )}
              </div>
            )}

            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Company Selector */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCompanyForSettings || ''}
                    onChange={(e) => {
                      const companyId = e.target.value ? parseInt(e.target.value) : null
                      setSelectedCompanyForSettings(companyId)
                      if (companyId) {
                        loadCompanySettings(companyId)
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    required
                  >
                    <option value="">Select a company</option>
                    {companies.filter(c => c.is_active).map(comp => (
                      <option key={comp.id} value={comp.id}>{comp.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    {selectedCompanyForSettings 
                      ? `Managing general settings for: ${companies.find(c => c.id === selectedCompanyForSettings)?.name}`
                      : 'Please select a company to manage its general settings'}
                  </p>
                </div>

                {selectedCompanyForSettings ? (
              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={general.currency_symbol}
                        onChange={(e) => setGeneral({ ...general, currency_symbol: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        maxLength={5}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Currency Code
                      </label>
                      <input
                        type="text"
                        value={general.currency_code}
                        onChange={(e) => setGeneral({ ...general, currency_code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        maxLength={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select
                        value={general.date_format}
                        onChange={(e) => setGeneral({ ...general, date_format: e.target.value as any })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Time Format
                      </label>
                      <select
                        value={general.time_format}
                        onChange={(e) => setGeneral({ ...general, time_format: e.target.value as '12h' | '24h' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="12h">12 Hour (AM/PM)</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Default Unit
                      </label>
                      <input
                        type="text"
                        value={general.default_unit}
                        onChange={(e) => setGeneral({ ...general, default_unit: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="pcs, kg, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Low Stock Threshold (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={general.low_stock_threshold_percentage}
                        onChange={(e) => setGeneral({ ...general, low_stock_threshold_percentage: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Percentage of min stock level to show warning</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto_archive"
                        checked={general.auto_archive_products_after_sale}
                        onChange={(e) => setGeneral({ ...general, auto_archive_products_after_sale: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="auto_archive" className="ml-2 text-sm font-medium text-gray-700">
                        Auto Archive Products After Sale
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enable_barcode"
                        checked={general.enable_barcode_generation}
                        onChange={(e) => setGeneral({ ...general, enable_barcode_generation: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="enable_barcode" className="ml-2 text-sm font-medium text-gray-700">
                        Enable Barcode Generation
                      </label>
                    </div>

                    {general.enable_barcode_generation && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Default Barcode Format
                        </label>
                        <select
                          value={general.default_barcode_format}
                          onChange={(e) => setGeneral({ ...general, default_barcode_format: e.target.value as any })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="EAN13">EAN-13</option>
                          <option value="CODE128">Code 128</option>
                          <option value="UPCA">UPC-A</option>
                          <option value="CODE39">Code 39</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save General Settings'}
                  </button>
                </div>
              </form>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Please select a company to manage general settings</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
  )
}

export default SystemSettings

