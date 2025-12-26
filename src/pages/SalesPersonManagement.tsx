import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { salesPersonService } from '../services/salespersonService'
import { categoryCommissionService } from '../services/salespersonService'
import { salesPersonCategoryAssignmentService } from '../services/salespersonService'
import { categoryService, Category } from '../services/productService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User,
  FolderTree,
  Percent,
  UserCheck,
  Home,
  TrendingUp,
  DollarSign,
  Building2,
  Receipt,
  FileText
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SalesPerson, CategoryCommission, SalesPersonCategoryAssignment } from '../types/salesperson'

type TabType = 'salespersons' | 'categories' | 'commissions' | 'assignments' | 'expenses' | 'dailyreport'

const SalesPersonManagement = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Get tab from URL or default to 'salespersons'
  const tabFromUrl = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl && ['salespersons', 'categories', 'commissions', 'assignments'].includes(tabFromUrl)
      ? tabFromUrl
      : 'salespersons'
  )

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab !== tabFromUrl) {
      setSearchParams({ tab: activeTab })
    }
  }, [activeTab, tabFromUrl, setSearchParams])

  // Update active tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType | null
    if (tab && ['salespersons', 'categories', 'commissions', 'assignments', 'expenses', 'dailyreport'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Sales Persons
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [salesPersonSearch, setSalesPersonSearch] = useState('')

  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [mainCategories, setMainCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Category[]>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [selectedMainCategory, setSelectedMainCategory] = useState<number | null>(null)

  // Commissions
  const [commissions, setCommissions] = useState<CategoryCommission[]>([])
  const [commissionSearch, setCommissionSearch] = useState('')

  // Assignments
  const [assignments, setAssignments] = useState<SalesPersonCategoryAssignment[]>([])
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [selectedAssignmentCategory, setSelectedAssignmentCategory] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [activeTab])

  useEffect(() => {
    const loadSubCategories = async () => {
      if (selectedMainCategory) {
        const subcats = await categoryService.getSubcategories(selectedMainCategory)
        setSubCategories(subcats)
      } else {
        const allCategories = await categoryService.getAll()
        setSubCategories(allCategories.filter(c => c.is_subcategory))
      }
    }
    loadSubCategories()
  }, [selectedMainCategory])

  useEffect(() => {
    const loadCategoryAssignments = async () => {
      if (selectedAssignmentCategory) {
        const categoryAssignments = await salesPersonCategoryAssignmentService.getByCategory(selectedAssignmentCategory)
        setAssignments(categoryAssignments)
      } else {
        await loadAssignments()
      }
    }
    loadCategoryAssignments()
  }, [selectedAssignmentCategory])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [allSalesPersons, allCategories, mainCats, allCommissions, allAssignments] = await Promise.all([
        salesPersonService.getAll(true),
        categoryService.getAll(),
        categoryService.getMainCategories(),
        categoryCommissionService.getAll(true),
        salesPersonCategoryAssignmentService.getAll(true)
      ])
      setSalesPersons(allSalesPersons)
      setCategories(allCategories)
      setMainCategories(mainCats)
      setSubCategories(allCategories.filter(c => c.is_subcategory))
      setCommissions(allCommissions)
      setAssignments(allAssignments)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    try {
      const allAssignments = await salesPersonCategoryAssignmentService.getAll(true)
      setAssignments(allAssignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  // Sales Persons
  const filteredSalesPersons = salesPersons.filter(sp => 
    !salesPersonSearch || 
    sp.name.toLowerCase().includes(salesPersonSearch.toLowerCase()) ||
    sp.email?.toLowerCase().includes(salesPersonSearch.toLowerCase()) ||
    sp.phone?.includes(salesPersonSearch)
  )

  // Categories
  const filteredSubCategories = subCategories.filter(cat =>
    !categorySearch ||
    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    cat.parent_name?.toLowerCase().includes(categorySearch.toLowerCase())
  )

  // Commissions
  const filteredCommissions = commissions.filter(comm =>
    !commissionSearch ||
    comm.category_name?.toLowerCase().includes(commissionSearch.toLowerCase())
  )

  // Assignments
  const filteredAssignments = assignments.filter(ass =>
    !assignmentSearch ||
    ass.sales_person_name?.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
    ass.category_name?.toLowerCase().includes(assignmentSearch.toLowerCase())
  )

  const handleDeleteSalesPerson = (id: number) => {
    if (window.confirm('Are you sure you want to delete this sales person?')) {
      salesPersonService.delete(id)
      loadAllData()
    }
  }

  const handleDeleteCategory = (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      categoryService.delete(id)
      loadAllData()
    }
  }

  const handleDeleteCommission = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this commission configuration?')) {
      try {
        await categoryCommissionService.delete(id)
        await loadAllData()
      } catch (error) {
        console.error('Error deleting commission:', error)
        alert('Failed to delete commission')
      }
    }
  }

  const handleDeleteAssignment = async (id: number) => {
    if (window.confirm('Are you sure you want to remove this assignment?')) {
      try {
        await salesPersonCategoryAssignmentService.delete(id)
        await loadAssignments()
      } catch (error) {
        console.error('Error deleting assignment:', error)
        alert('Failed to delete assignment')
      }
    }
  }

  const tabs = [
    { id: 'salespersons' as TabType, label: 'Sales Persons', icon: <User className="w-4 h-4" />, permission: 'users:read' },
    { id: 'categories' as TabType, label: 'Categories & Sub-Categories', icon: <FolderTree className="w-4 h-4" />, permission: 'products:read' },
    { id: 'commissions' as TabType, label: 'Category Commissions', icon: <Percent className="w-4 h-4" />, permission: 'users:read' },
    { id: 'assignments' as TabType, label: 'Category Assignments', icon: <UserCheck className="w-4 h-4" />, permission: 'users:read' },
    { id: 'expenses' as TabType, label: 'Daily Expenses', icon: <Receipt className="w-4 h-4" />, permission: 'expenses:read' },
    { id: 'dailyreport' as TabType, label: 'Daily Report', icon: <FileText className="w-4 h-4" />, permission: 'expenses:read' },
  ]

  const visibleTabs = tabs.filter(tab => hasPermission(tab.permission))

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
                  <h1 className="text-3xl font-bold text-gray-900">Sales & Category Management</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage sales persons, categories, commissions, and assignments</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb Navigation */}
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <button
              onClick={() => navigate('/')}
              className="hover:text-blue-600 transition-colors"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Sales & Category Management</span>
            {activeTab && (
              <>
                <span>/</span>
                <span className="text-gray-900 font-semibold">
                  {tabs.find(t => t.id === activeTab)?.label || ''}
                </span>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl mb-8 border border-white/50 overflow-hidden">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSearchParams({ tab: tab.id })
                  }}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-b-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Sales Persons Tab */}
              {activeTab === 'salespersons' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Sales Persons</h2>
                    {hasPermission('users:create') && (
                      <button
                        onClick={() => navigate('/sales-persons/new?returnTo=management&tab=salespersons')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Sales Person
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={salesPersonSearch}
                      onChange={(e) => setSalesPersonSearch(e.target.value)}
                      placeholder="Search sales persons..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contact</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Default Commission</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSalesPersons.map((sp) => (
                          <tr key={sp.id} className="hover:bg-blue-50">
                            <td className="px-4 py-3 text-sm font-semibold">{sp.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{sp.phone || sp.email || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{sp.commission_rate ? `${sp.commission_rate}%` : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded ${sp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {sp.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                {hasPermission('users:update') && (
                                  <button onClick={() => navigate(`/sales-persons/${sp.id}/edit?returnTo=management&tab=salespersons`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                                {hasPermission('users:delete') && (
                                  <button onClick={() => handleDeleteSalesPerson(sp.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
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
                </div>
              )}

              {/* Categories Tab */}
              {activeTab === 'categories' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Categories & Sub-Categories</h2>
                    <div className="flex gap-2">
                      {hasPermission('products:create') && (
                        <>
                          <button
                            onClick={() => navigate('/categories/new?returnTo=management&tab=categories')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Main Category
                          </button>
                          <button
                            onClick={() => navigate('/sub-categories/new?returnTo=management&tab=categories')}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Sub-Category
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main Categories */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Main Categories</h3>
                      <div className="space-y-2">
                        {mainCategories.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium">{cat.name}</span>
                            </div>
                            <div className="flex gap-1">
                              {hasPermission('products:update') && (
                                <button onClick={() => navigate(`/categories/${cat.id}/edit?returnTo=management&tab=categories`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Sub-Categories */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Sub-Categories</h3>
                        <select
                          value={selectedMainCategory || ''}
                          onChange={(e) => setSelectedMainCategory(e.target.value ? parseInt(e.target.value) : null)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">All Categories</option>
                          {mainCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative mb-3">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Search sub-categories..."
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredSubCategories.map(subcat => (
                          <div key={subcat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <div className="flex items-center gap-2">
                              <FolderTree className="w-4 h-4 text-green-600" />
                              <div>
                                <span className="text-sm font-medium">{subcat.name}</span>
                                {subcat.parent_name && (
                                  <span className="text-xs text-gray-500 ml-2">({subcat.parent_name})</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {hasPermission('products:update') && (
                                <button onClick={() => navigate(`/sub-categories/${subcat.id}/edit?returnTo=management&tab=categories`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {hasPermission('products:delete') && (
                                <button onClick={() => handleDeleteCategory(subcat.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commissions Tab */}
              {activeTab === 'commissions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Category Commissions</h2>
                    {hasPermission('users:create') && (
                      <button
                        onClick={() => navigate('/category-commissions/new?returnTo=management&tab=commissions')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Commission
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={commissionSearch}
                      onChange={(e) => setCommissionSearch(e.target.value)}
                      placeholder="Search commissions by category..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Value</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCommissions.map((comm) => (
                          <tr key={comm.id} className="hover:bg-blue-50">
                            <td className="px-4 py-3 text-sm font-semibold">{comm.category_name || 'Unknown'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded ${comm.commission_type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                {comm.commission_type === 'percentage' ? 'Percentage' : 'Per Piece'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {comm.commission_type === 'percentage' ? `${comm.commission_value}%` : `₹${comm.commission_value}`}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded ${comm.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {comm.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                {hasPermission('users:update') && (
                                  <button onClick={() => navigate(`/category-commissions/${comm.id}/edit?returnTo=management&tab=commissions`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                                {hasPermission('users:delete') && (
                                  <button onClick={() => handleDeleteCommission(comm.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
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
                </div>
              )}

              {/* Assignments Tab */}
              {activeTab === 'assignments' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Sales Person Category Assignments</h2>
                    {hasPermission('users:create') && (
                      <button
                        onClick={() => navigate('/sales-person-category-assignments/new?returnTo=management&tab=assignments')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Assignment
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={assignmentSearch}
                        onChange={(e) => setAssignmentSearch(e.target.value)}
                        placeholder="Search assignments..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <select
                      value={selectedAssignmentCategory || ''}
                      onChange={(e) => setSelectedAssignmentCategory(e.target.value ? parseInt(e.target.value) : null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">All Sub-Categories</option>
                      {subCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name} ({cat.parent_name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales Person</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sub-Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Parent Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAssignments.map((ass) => (
                          <tr key={ass.id} className="hover:bg-blue-50">
                            <td className="px-4 py-3 text-sm font-semibold">{ass.sales_person_name || 'Unknown'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{ass.category_name || 'Unknown'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{ass.parent_category_name || '—'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                                Active
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                {hasPermission('users:update') && (
                                  <button onClick={() => navigate(`/sales-person-category-assignments/${ass.id}/edit?returnTo=management&tab=assignments`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                                {hasPermission('users:delete') && (
                                  <button onClick={() => handleDeleteAssignment(ass.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
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
                </div>
              )}

              {/* Expenses Tab */}
              {activeTab === 'expenses' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Daily Expenses</h2>
                    {hasPermission('expenses:create') && (
                      <button
                        onClick={() => navigate('/expenses/new')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Expense
                      </button>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Click "Add Expense" to record daily expenses like sales person payments, purchases, transport, office expenses, etc.
                    </p>
                  </div>
                  <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Manage expenses from the Expenses page</p>
                    <button
                      onClick={() => navigate('/expenses')}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Go to Expenses
                    </button>
                  </div>
                </div>
              )}

              {/* Daily Report Tab */}
              {activeTab === 'dailyreport' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Daily Report</h2>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <strong>Daily Report</strong> shows comprehensive business summary including sales, purchases, expenses, sales person performance, and profit/loss calculations.
                    </p>
                  </div>
                  <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">View detailed daily report with all metrics</p>
                    <button
                      onClick={() => navigate('/daily-report')}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View Daily Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SalesPersonManagement

