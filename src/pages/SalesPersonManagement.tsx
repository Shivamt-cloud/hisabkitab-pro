import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  FileText,
  Wallet,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  FileSpreadsheet
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SalesPerson, CategoryCommission, SalesPersonCategoryAssignment } from '../types/salesperson'
import type { SalesPersonCommission } from '../types/salesperson'
import { salaryPaymentService } from '../services/salaryPaymentService'
import { salesCommissionService } from '../services/salespersonService'
import { employeeGoodsPurchaseService } from '../services/employeeGoodsPurchaseService'
import type { SalaryPayment } from '../types/salaryPayment'
import type { EmployeeGoodsPurchase } from '../types/employeeGoodsPurchase'
import { exportToExcel, exportDataToPDF } from '../utils/exportUtils'

type TabType = 'salespersons' | 'categories' | 'commissions' | 'assignments' | 'employeesalary' | 'expenses' | 'dailyreport'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: new Date(2000, i, 1).toLocaleDateString('en-IN', { month: 'long' }),
}))
const getYearOptions = () => {
  const y = new Date().getFullYear()
  return Array.from({ length: 8 }, (_, i) => y - 3 + i)
}

const SalesPersonManagement = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const companyId = getCurrentCompanyId()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Get tab from URL or default to 'salespersons'
  const tabFromUrl = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl && ['salespersons', 'categories', 'commissions', 'assignments', 'employeesalary', 'expenses', 'dailyreport'].includes(tabFromUrl)
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
    if (tab && ['salespersons', 'categories', 'commissions', 'assignments', 'employeesalary', 'expenses', 'dailyreport'].includes(tab)) {
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

  // Employee Salary tab – single state so Net/Due always see consistent data after refresh
  const [employeeSalaryData, setEmployeeSalaryData] = useState<{
    payments: SalaryPayment[]
    goods: EmployeeGoodsPurchase[]
    systemCommissions: SalesPersonCommission[]
    bySalary: Record<number, number>
    byCommission: Record<number, number>
    byGoods: Record<number, number>
    lastPaid: Record<number, string>
  }>({
    payments: [],
    goods: [],
    systemCommissions: [],
    bySalary: {},
    byCommission: {},
    byGoods: {},
    lastPaid: {},
  })
  const salaryPayments = employeeSalaryData.payments
  const goodsPurchases = employeeSalaryData.goods
  const systemCommissions = employeeSalaryData.systemCommissions
  const lastPaidByEmployee = employeeSalaryData.lastPaid
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [addPaymentModalType, setAddPaymentModalType] = useState<'salary' | 'commission'>('salary')
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null)
  const [showGoodsModal, setShowGoodsModal] = useState(false)
  const [editingGoods, setEditingGoods] = useState<EmployeeGoodsPurchase | null>(null)
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null)
  const now = new Date()
  const [addPaymentForm, setAddPaymentForm] = useState({
    sales_person_id: '',
    payment_date: new Date().toISOString().slice(0, 10),
    amount: '',
    for_period_month: String(now.getMonth() + 1).padStart(2, '0'),
    for_period_year: String(now.getFullYear()),
    payment_method: 'cash' as SalaryPayment['payment_method'],
    notes: '',
  })
  const [goodsForm, setGoodsForm] = useState({
    sales_person_id: '',
    period_month: String(now.getMonth() + 1).padStart(2, '0'),
    period_year: String(now.getFullYear()),
    amount: '',
    notes: '',
  })
  const [selectedEmployeeIdForSalary, setSelectedEmployeeIdForSalary] = useState<number | null>(null)
  const [salaryDateRange, setSalaryDateRange] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('all')
  const [salaryCustomFrom, setSalaryCustomFrom] = useState('')
  const [salaryCustomTo, setSalaryCustomTo] = useState('')
  const [employeeNameSearch, setEmployeeNameSearch] = useState('')

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'employeesalary') {
      loadSalaryData()
    }
  }, [activeTab, companyId])

  useEffect(() => {
    if (showAddPaymentModal || showGoodsModal) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [showAddPaymentModal, showGoodsModal])

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

  /** Refetch payments + goods + system commissions and update all Employee Salary state in one shot. */
  const loadSalaryData = async () => {
    const [payments, goods, sysCommissions] = await Promise.all([
      salaryPaymentService.getAll(companyId ?? undefined),
      employeeGoodsPurchaseService.getAll(companyId ?? undefined),
      salesCommissionService.getAll(companyId ?? undefined),
    ])
    const bySalary: Record<number, number> = {}
    const byCommission: Record<number, number> = {}
    const lastPaid: Record<number, string> = {}
    payments.forEach(p => {
      const id = p.sales_person_id
      const type = p.payment_type || 'salary'
      if (type === 'commission') {
        byCommission[id] = (byCommission[id] ?? 0) + (p.amount ?? 0)
      } else {
        bySalary[id] = (bySalary[id] ?? 0) + (p.amount ?? 0)
      }
      if (!lastPaid[id] || (p.payment_date && p.payment_date > lastPaid[id])) {
        lastPaid[id] = p.payment_date || ''
      }
    })
    const byGoods: Record<number, number> = {}
    goods.forEach(g => {
      const id = g.sales_person_id
      byGoods[id] = (byGoods[id] ?? 0) + (g.amount ?? 0)
    })
    setEmployeeSalaryData({
      payments,
      goods,
      systemCommissions: sysCommissions,
      bySalary,
      byCommission,
      byGoods,
      lastPaid,
    })
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

  const handleEditPayment = (p: SalaryPayment) => {
    const raw = (p.for_period || p.payment_date?.slice(0, 7) || '').replace(/^(\d{4})-(\d{1,2})/, (_: string, y: string, m: string) => `${y}-${m.padStart(2, '0')}`)
    const [y, m] = raw ? [raw.slice(0, 4), raw.slice(5, 7)] : [String(new Date().getFullYear()), String(new Date().getMonth() + 1).padStart(2, '0')]
    setEditingPayment(p)
    setAddPaymentModalType((p.payment_type || 'salary') === 'commission' ? 'commission' : 'salary')
    setAddPaymentForm({
      sales_person_id: String(p.sales_person_id),
      payment_date: (p.payment_date || '').slice(0, 10),
      amount: String(p.amount ?? 0),
      for_period_month: m,
      for_period_year: y,
      payment_method: (p.payment_method || 'cash') as SalaryPayment['payment_method'],
      notes: p.notes || '',
    })
    setShowAddPaymentModal(true)
  }

  const handleDeletePayment = async (id: number) => {
    if (!window.confirm('Delete this payment? This cannot be undone.')) return
    try {
      await salaryPaymentService.delete(id)
      await loadSalaryData()
    } catch (err) {
      alert('Failed to delete: ' + (err as Error).message)
    }
  }

  const handleAddSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const personId = parseInt(addPaymentForm.sales_person_id, 10)
    const amount = parseFloat(addPaymentForm.amount)
    if (!personId || isNaN(amount) || amount <= 0) {
      alert('Please select an employee and enter a valid amount.')
      return
    }
    const person = salesPersons.find(p => p.id === personId)
    const forPeriodNorm = `${addPaymentForm.for_period_year}-${addPaymentForm.for_period_month}`
    try {
      if (editingPayment) {
        await salaryPaymentService.update(editingPayment.id, {
          sales_person_id: personId,
          sales_person_name: person?.name,
          payment_type: addPaymentModalType,
          payment_date: addPaymentForm.payment_date,
          amount,
          for_period: forPeriodNorm,
          payment_method: addPaymentForm.payment_method,
          notes: addPaymentForm.notes.trim() || undefined,
        })
      } else {
        await salaryPaymentService.create({
          sales_person_id: personId,
          sales_person_name: person?.name,
          payment_type: addPaymentModalType,
          payment_date: addPaymentForm.payment_date,
          amount,
          for_period: forPeriodNorm,
          payment_method: addPaymentForm.payment_method,
          notes: addPaymentForm.notes.trim() || undefined,
          company_id: companyId ?? undefined,
        })
      }
      await loadSalaryData()
      setShowAddPaymentModal(false)
      setEditingPayment(null)
      const nm = new Date()
      setAddPaymentForm((f) => ({
        ...f,
        sales_person_id: '',
        payment_date: new Date().toISOString().slice(0, 10),
        amount: '',
        for_period_month: String(nm.getMonth() + 1).padStart(2, '0'),
        for_period_year: String(nm.getFullYear()),
        payment_method: 'cash',
        notes: '',
      }))
    } catch (err) {
      alert(editingPayment ? 'Failed to update payment: ' + (err as Error).message : 'Failed to save salary payment: ' + (err as Error).message)
    }
  }

  const getPaymentsForEmployee = (salesPersonId: number) =>
    salaryPayments.filter(p => p.sales_person_id === salesPersonId)

  const getGoodsForEmployee = (salesPersonId: number) =>
    goodsPurchases.filter(g => g.sales_person_id === salesPersonId)

  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  /** Normalize period to YYYY-MM so DB values like "2026-2" match "2026-02" */
  const normalizeMonth = (period: string): string => {
    if (!period || typeof period !== 'string') return ''
    const s = String(period).trim()
    const match = s.match(/^(\d{4})-(\d{1,2})/)
    if (match) {
      const y = match[1]
      const m = match[2].padStart(2, '0')
      return `${y}-${m}`
    }
    if (s.match(/^\d{4}-\d{2}$/)) return s
    return s.slice(0, 7)
  }
  const getPaymentPeriod = (p: SalaryPayment): string => {
    if (p.for_period) return normalizeMonth(String(p.for_period))
    if (!p.payment_date) return ''
    const d = typeof p.payment_date === 'string' ? p.payment_date : new Date(p.payment_date).toISOString()
    return d.slice(0, 7)
  }
  /** Salary amount paid in a given month (YYYY-MM) – salary-type payments only. Comparison uses normalized period. */
  const getSalaryPaidInMonth = (salesPersonId: number, month: string): number => {
    const norm = normalizeMonth(month)
    return salaryPayments
      .filter(p => p.sales_person_id === salesPersonId && (p.payment_type || 'salary') === 'salary' && getPaymentPeriod(p) === norm)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)
  }
  /** Goods amount for a given month (YYYY-MM) – deducted from pay. Comparison uses normalized period. */
  const getGoodsInMonth = (salesPersonId: number, month: string): number => {
    const norm = normalizeMonth(month)
    return goodsPurchases
      .filter(g => g.sales_person_id === salesPersonId && normalizeMonth(String(g.period)) === norm)
      .reduce((sum, g) => sum + (g.amount ?? 0), 0)
  }
  /** Net for selected month = salary_paid_in_that_month + goods_in_that_month (amount settled for the employee that month) */
  const getNetForMonth = (sp: SalesPerson, month: string): number =>
    getSalaryPaidInMonth(sp.id, month) + getGoodsInMonth(sp.id, month)
  /** Due for selected month = current_salary - (salary_paid_in_month + goods_in_month) ≥ 0 */
  const getDueForMonth = (sp: SalesPerson, month: string): number => {
    const salary = sp.current_salary ?? 0
    const salaryPaid = getSalaryPaidInMonth(sp.id, month)
    const goods = getGoodsInMonth(sp.id, month)
    return Math.max(0, salary - salaryPaid - goods)
  }
  /** Status for selected month: paid (full), partial_paid (some), due (none) – based on salary paid vs current_salary */
  const getStatusForMonth = (sp: SalesPerson, month: string): 'paid' | 'partial_paid' | 'due' => {
    const salaryPaid = getSalaryPaidInMonth(sp.id, month)
    const expected = sp.current_salary ?? 0
    if (salaryPaid <= 0) return 'due'
    if (expected <= 0) return 'paid'
    if (salaryPaid >= expected) return 'paid'
    return 'partial_paid'
  }
  /** Whether employee has current_salary set (for due display) */
  const hasSalarySet = (sp: SalesPerson): boolean => sp.current_salary != null && sp.current_salary > 0

  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })()
  /** Net/Due use the time range month: This month → current, Last month → last; All → current month. For Custom we use range totals. */
  const effectiveMonthForDueNet =
    salaryDateRange === 'this_month' || salaryDateRange === 'today' || salaryDateRange === 'this_week'
      ? currentMonth
      : salaryDateRange === 'last_month'
        ? lastMonth
        : salaryDateRange === 'custom'
          ? ''
          : currentMonth
  const isCustomRange = salaryDateRange === 'custom' && !!salaryCustomFrom && !!salaryCustomTo
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7)
  const customRangeStart = salaryCustomFrom ? new Date(salaryCustomFrom).getTime() : 0
  const customRangeEnd = salaryCustomTo ? new Date(salaryCustomTo).getTime() + 86400000 - 1 : 0
  const paymentInRange = (p: SalaryPayment): boolean => {
    if (salaryDateRange === 'all') return true
    const period = getPaymentPeriod(p)
    const dateStr = typeof p.payment_date === 'string' ? p.payment_date : p.payment_date ? new Date(p.payment_date).toISOString().slice(0, 10) : ''
    const payDate = dateStr ? new Date(dateStr).getTime() : 0
    if (salaryDateRange === 'today') return payDate >= todayStart.getTime() && payDate < todayStart.getTime() + 86400000
    if (salaryDateRange === 'this_week') return payDate >= weekStart.getTime()
    if (salaryDateRange === 'this_month') return period === currentMonth
    if (salaryDateRange === 'last_month') return period === lastMonth
    if (salaryDateRange === 'custom' && customRangeStart && customRangeEnd) return payDate >= customRangeStart && payDate <= customRangeEnd
    return true
  }
  const goodsInRange = (g: EmployeeGoodsPurchase): boolean => {
    if (salaryDateRange === 'all') return true
    const period = String(g.period).slice(0, 7)
    if (salaryDateRange === 'today' || salaryDateRange === 'this_week') return period === currentMonth
    if (salaryDateRange === 'this_month') return period === currentMonth
    if (salaryDateRange === 'last_month') return period === lastMonth
    if (salaryDateRange === 'custom' && salaryCustomFrom && salaryCustomTo) {
      const periodStart = salaryCustomFrom.slice(0, 7)
      const periodEnd = salaryCustomTo.slice(0, 7)
      return period >= periodStart && period <= periodEnd
    }
    return true
  }
  /** System commission (from sales) in selected date range – uses sale_date. */
  const systemCommissionInRange = (c: SalesPersonCommission): boolean => {
    if (salaryDateRange === 'all') return true
    const dateStr = (c.sale_date || '').slice(0, 10)
    const saleTime = dateStr ? new Date(dateStr).getTime() : 0
    if (salaryDateRange === 'today') return saleTime >= todayStart.getTime() && saleTime < todayStart.getTime() + 86400000
    if (salaryDateRange === 'this_week') return saleTime >= weekStart.getTime()
    if (salaryDateRange === 'this_month') return dateStr.slice(0, 7) === currentMonth
    if (salaryDateRange === 'last_month') return dateStr.slice(0, 7) === lastMonth
    if (salaryDateRange === 'custom' && customRangeStart && customRangeEnd) return saleTime >= customRangeStart && saleTime <= customRangeEnd
    return true
  }
  const filteredSalaryPayments = salaryDateRange === 'all' ? salaryPayments : salaryPayments.filter(paymentInRange)
  const filteredGoodsPurchases = salaryDateRange === 'all' ? goodsPurchases : goodsPurchases.filter(goodsInRange)
  const filteredSystemCommissions = salaryDateRange === 'all' ? systemCommissions : systemCommissions.filter(systemCommissionInRange)
  const totalSalaryByEmployeeInRange: Record<number, number> = {}
  const totalCommissionByEmployeeInRange: Record<number, number> = {}
  const totalSystemCommissionByEmployeeInRange: Record<number, number> = {}
  const totalGoodsByEmployeeInRange: Record<number, number> = {}
  filteredSalaryPayments.forEach(p => {
    const id = p.sales_person_id
    const type = p.payment_type || 'salary'
    if (type === 'commission') totalCommissionByEmployeeInRange[id] = (totalCommissionByEmployeeInRange[id] ?? 0) + (p.amount ?? 0)
    else totalSalaryByEmployeeInRange[id] = (totalSalaryByEmployeeInRange[id] ?? 0) + (p.amount ?? 0)
  })
  filteredSystemCommissions.forEach(c => {
    const id = c.sales_person_id
    totalSystemCommissionByEmployeeInRange[id] = (totalSystemCommissionByEmployeeInRange[id] ?? 0) + (c.commission_amount ?? 0)
  })
  filteredGoodsPurchases.forEach(g => {
    const id = g.sales_person_id
    totalGoodsByEmployeeInRange[id] = (totalGoodsByEmployeeInRange[id] ?? 0) + (g.amount ?? 0)
  })
  const getPaymentsForEmployeeInRange = (salesPersonId: number) =>
    filteredSalaryPayments.filter(p => p.sales_person_id === salesPersonId)
  const getGoodsForEmployeeInRange = (salesPersonId: number) =>
    filteredGoodsPurchases.filter(g => g.sales_person_id === salesPersonId)
  /** Number of months in custom range (inclusive). Used for Due when range is custom. */
  const getMonthsInCustomRange = (): number => {
    if (!isCustomRange || !salaryCustomFrom || !salaryCustomTo) return 0
    const [sy, sm] = salaryCustomFrom.slice(0, 7).split('-').map(Number)
    const [ey, em] = salaryCustomTo.slice(0, 7).split('-').map(Number)
    return Math.max(0, (ey - sy) * 12 + (em - sm) + 1)
  }
  /** Net for current filter: for custom range = salary in range + goods in range; otherwise = getNetForMonth. */
  const getNetForRange = (sp: SalesPerson): number =>
    isCustomRange
      ? (totalSalaryByEmployeeInRange[sp.id] ?? 0) + (totalGoodsByEmployeeInRange[sp.id] ?? 0)
      : getNetForMonth(sp, effectiveMonthForDueNet)
  /** Due for current filter: for custom range = (current_salary * months) - net; otherwise = getDueForMonth. */
  const getDueForRange = (sp: SalesPerson): number => {
    if (isCustomRange) {
      const months = getMonthsInCustomRange()
      const expected = (sp.current_salary ?? 0) * months
      const net = getNetForRange(sp)
      return Math.max(0, expected - net)
    }
    return getDueForMonth(sp, effectiveMonthForDueNet)
  }
  /** Status for current filter: always from due/net so status matches displayed Due (e.g. Due ₹0 → Paid). */
  const getStatusForRange = (sp: SalesPerson): 'paid' | 'partial_paid' | 'due' => {
    const due = getDueForRange(sp)
    const net = getNetForRange(sp)
    if (due <= 0) return 'paid'
    if (net > 0) return 'partial_paid'
    return 'due'
  }
  /** Human-readable period label for summary and report (which month/range the data is for). */
  const getSalaryDataPeriodLabel = (): string => {
    if (salaryDateRange === 'all') return 'All time'
    if (salaryDateRange === 'today') return `Today, ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    if (salaryDateRange === 'this_week') return `This week (up to ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`
    if (salaryDateRange === 'this_month') {
      const [y, m] = currentMonth.split('-')
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    }
    if (salaryDateRange === 'last_month') {
      const [y, m] = lastMonth.split('-')
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    }
    if (salaryDateRange === 'custom' && salaryCustomFrom && salaryCustomTo) {
      const fromStr = new Date(salaryCustomFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      const toStr = new Date(salaryCustomTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      return `${fromStr} to ${toStr}`
    }
    return salaryDateRange.replace('_', ' ')
  }
  const employeesFilteredByName = employeeNameSearch.trim()
    ? salesPersons.filter(sp =>
        sp.name.toLowerCase().includes(employeeNameSearch.trim().toLowerCase()) ||
        sp.email?.toLowerCase().includes(employeeNameSearch.trim().toLowerCase()) ||
        sp.phone?.includes(employeeNameSearch.trim())
      )
    : salesPersons

  const loadGoodsAndTotals = () => loadSalaryData()

  const handleEditGoods = (g: EmployeeGoodsPurchase) => {
    const raw = (g.period || '').replace(/^(\d{4})-(\d{1,2})/, (_: string, y: string, m: string) => `${y}-${m.padStart(2, '0')}`)
    const [y, m] = raw ? [raw.slice(0, 4), raw.slice(5, 7)] : [String(new Date().getFullYear()), String(new Date().getMonth() + 1).padStart(2, '0')]
    setEditingGoods(g)
    setGoodsForm({
      sales_person_id: String(g.sales_person_id),
      period_month: m,
      period_year: y,
      amount: String(g.amount ?? 0),
      notes: g.notes || '',
    })
    setShowGoodsModal(true)
  }

  const handleDeleteGoods = async (id: number) => {
    if (!window.confirm('Delete this goods purchase record? This cannot be undone.')) return
    try {
      await employeeGoodsPurchaseService.delete(id)
      await loadSalaryData()
    } catch (err) {
      alert('Failed to delete: ' + (err as Error).message)
    }
  }

  const handleAddGoodsPurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    const personId = parseInt(goodsForm.sales_person_id, 10)
    const amount = parseFloat(goodsForm.amount)
    if (!personId || isNaN(amount) || amount < 0) {
      alert('Please select an employee and enter a valid amount.')
      return
    }
    const person = salesPersons.find(p => p.id === personId)
    const periodNorm = `${goodsForm.period_year}-${goodsForm.period_month}`
    try {
      if (editingGoods) {
        await employeeGoodsPurchaseService.update(editingGoods.id, {
          sales_person_id: personId,
          sales_person_name: person?.name,
          period: periodNorm,
          amount,
          notes: goodsForm.notes.trim() || undefined,
        })
      } else {
        await employeeGoodsPurchaseService.create({
          sales_person_id: personId,
          sales_person_name: person?.name,
          period: periodNorm,
          amount,
          notes: goodsForm.notes.trim() || undefined,
          company_id: companyId ?? undefined,
        })
      }
      await loadSalaryData()
      setShowGoodsModal(false)
      setEditingGoods(null)
      const nm = new Date()
      setGoodsForm({ sales_person_id: '', period_month: String(nm.getMonth() + 1).padStart(2, '0'), period_year: String(nm.getFullYear()), amount: '', notes: '' })
    } catch (err) {
      alert(editingGoods ? 'Failed to update: ' + (err as Error).message : 'Failed to save: ' + (err as Error).message)
    }
  }

  const formatCurrency = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`

  /** Build Employee Salary report data for the current filter (shared by CSV, Excel, PDF). */
  const getEmployeeSalaryReportData = () => {
    const filteredForSalary = selectedEmployeeIdForSalary == null
      ? employeesFilteredByName
      : employeesFilteredByName.filter(sp => sp.id === selectedEmployeeIdForSalary)
    const summarySalary = filteredForSalary.reduce((s, sp) => s + (totalSalaryByEmployeeInRange[sp.id] ?? 0), 0)
    const summaryCommissionEarned = filteredForSalary.reduce((s, sp) => s + (totalSystemCommissionByEmployeeInRange[sp.id] ?? 0), 0)
    const summaryCommissionPaid = filteredForSalary.reduce((s, sp) => s + (totalCommissionByEmployeeInRange[sp.id] ?? 0), 0)
    const summaryCommissionDue = filteredForSalary.reduce((s, sp) => s + Math.max(0, (totalSystemCommissionByEmployeeInRange[sp.id] ?? 0) - (totalCommissionByEmployeeInRange[sp.id] ?? 0)), 0)
    const summaryGoods = filteredForSalary.reduce((s, sp) => s + (totalGoodsByEmployeeInRange[sp.id] ?? 0), 0)
    const summaryNet = filteredForSalary.reduce((s, sp) => s + getNetForRange(sp), 0)
    const summaryDue = filteredForSalary.reduce((s, sp) => s + getDueForRange(sp), 0)
    const periodLabel = getSalaryDataPeriodLabel().replace(/,/g, ' ')
    const selectedMonthLabel = isCustomRange ? periodLabel : (() => {
      const [y, m] = effectiveMonthForDueNet.split('-')
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    })()
    const headers = ['Name', 'Joining date', 'Current salary (₹/mo)', 'Total salary paid', 'Commission (earned)', 'Commission (paid)', 'Commission (due)', 'Goods (deduct)', 'Net', 'Due', 'Status', 'Last paid']
    const dataRows: (string | number)[][] = []
    filteredForSalary.forEach((sp) => {
      const totalSalary = totalSalaryByEmployeeInRange[sp.id] ?? 0
      const commissionEarned = totalSystemCommissionByEmployeeInRange[sp.id] ?? 0
      const commissionPaid = totalCommissionByEmployeeInRange[sp.id] ?? 0
      const commissionDue = Math.max(0, commissionEarned - commissionPaid)
      const totalGoods = totalGoodsByEmployeeInRange[sp.id] ?? 0
      const net = getNetForRange(sp)
      const dueThisMonth = getDueForRange(sp)
      const status = getStatusForRange(sp)
      const statusLabel = status === 'paid' ? 'Paid' : status === 'partial_paid' ? 'Partial paid' : 'Due'
      const lastPaid = lastPaidByEmployee[sp.id]
      dataRows.push([
        sp.name ?? '',
        sp.joining_date ? new Date(sp.joining_date).toLocaleDateString('en-IN') : '',
        sp.current_salary ?? '',
        totalSalary,
        commissionEarned,
        commissionPaid,
        commissionDue,
        totalGoods,
        net,
        dueThisMonth,
        statusLabel,
        lastPaid ? new Date(lastPaid).toLocaleDateString('en-IN') : '',
      ])
    })
    const summaryRow: (string | number)[] = ['Summary', '', '', summarySalary, summaryCommissionEarned, summaryCommissionPaid, summaryCommissionDue, summaryGoods, summaryNet, summaryDue, '', '']
    return { headers, dataRows, summaryRow, periodLabel, selectedMonthLabel }
  }

  const getReportFilename = (periodLabel: string) =>
    `employee-salary-report-${periodLabel.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`

  /** Download Employee Salary report as CSV. */
  const handleDownloadEmployeeSalaryReport = () => {
    const { headers, dataRows, summaryRow, periodLabel, selectedMonthLabel } = getEmployeeSalaryReportData()
    const escapeCsv = (v: string | number) => {
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const rows: (string | number)[][] = [
      ['Employee Salary Report'],
      ['Data for (table)', periodLabel],
      ['Due & Net for', selectedMonthLabel],
      [''],
      headers,
      ...dataRows,
      [],
      summaryRow,
    ]
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${getReportFilename(periodLabel)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Download Employee Salary report as Excel (.xlsx). */
  const handleDownloadEmployeeSalaryExcel = () => {
    const { headers, dataRows, summaryRow, periodLabel } = getEmployeeSalaryReportData()
    const data = [...dataRows, [], summaryRow]
    exportToExcel(data, headers, getReportFilename(periodLabel), 'Employee Salary')
  }

  /** Download Employee Salary report as PDF. */
  const handleDownloadEmployeeSalaryPDF = () => {
    const { headers, dataRows, summaryRow, periodLabel, selectedMonthLabel } = getEmployeeSalaryReportData()
    const data = [...dataRows, summaryRow]
    const title = `Employee Salary Report · Data: ${periodLabel} · Due & Net for: ${selectedMonthLabel}`
    exportDataToPDF(data, headers, getReportFilename(periodLabel), title, { orientation: 'landscape' })
  }

  const tabs = [
    { id: 'salespersons' as TabType, label: 'Sales Persons', icon: <User className="w-4 h-4" />, permission: 'users:read' },
    { id: 'categories' as TabType, label: 'Categories & Sub-Categories', icon: <FolderTree className="w-4 h-4" />, permission: 'products:read' },
    { id: 'commissions' as TabType, label: 'Category Commissions', icon: <Percent className="w-4 h-4" />, permission: 'users:read' },
    { id: 'assignments' as TabType, label: 'Category Assignments', icon: <UserCheck className="w-4 h-4" />, permission: 'users:read' },
    { id: 'employeesalary' as TabType, label: 'Employee Salary', icon: <Wallet className="w-4 h-4" />, permission: 'users:read' },
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

              {/* Employee Salary Tab */}
              {activeTab === 'employeesalary' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-xl font-bold text-gray-900">Employee Salary</h2>
                    {hasPermission('users:create') && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { setEditingPayment(null); setAddPaymentModalType('salary'); setShowAddPaymentModal(true) }}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Salary Payment
                        </button>
                        <button
                          onClick={() => { setEditingPayment(null); setAddPaymentModalType('commission'); setShowAddPaymentModal(true) }}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Commission
                        </button>
                        <button
                          onClick={() => { setEditingGoods(null); setShowGoodsModal(true) }}
                          className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Goods Purchase
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Net (for selected month) = Salary paid that month + Goods (deduct). Due = Current salary − (Salary paid + Goods) for that month.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Time range (table totals):</span>
                      <select
                        value={salaryDateRange}
                        onChange={(e) => setSalaryDateRange(e.target.value as typeof salaryDateRange)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="all">All time</option>
                        <option value="today">Today</option>
                        <option value="this_week">This week</option>
                        <option value="this_month">This month</option>
                        <option value="last_month">Last month</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                    {salaryDateRange === 'custom' && (
                      <>
                        <label className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">From</span>
                          <input
                            type="date"
                            value={salaryCustomFrom}
                            onChange={(e) => setSalaryCustomFrom(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </label>
                        <label className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">To</span>
                          <input
                            type="date"
                            value={salaryCustomTo}
                            onChange={(e) => setSalaryCustomTo(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </label>
                      </>
                    )}
                    <label className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Filter by employee:</span>
                      <select
                        value={selectedEmployeeIdForSalary ?? ''}
                        onChange={(e) => setSelectedEmployeeIdForSalary(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-w-[180px]"
                      >
                        <option value="">All employees</option>
                        {employeesFilteredByName.map((sp) => (
                          <option key={sp.id} value={sp.id}>{sp.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={employeeNameSearch}
                        onChange={(e) => setEmployeeNameSearch(e.target.value)}
                        placeholder="Search by name, email, phone..."
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadEmployeeSalaryReport}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium"
                        title="Download as CSV"
                      >
                        <Download className="w-4 h-4" />
                        CSV
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadEmployeeSalaryExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        title="Download as Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadEmployeeSalaryPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                        title="Download as PDF"
                      >
                        <FileText className="w-4 h-4" />
                        PDF
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">Data for:</span>
                    <span className="text-sm font-bold text-gray-900">{getSalaryDataPeriodLabel()}</span>
                  </div>
                  {(() => {
                    const filteredForSalary = selectedEmployeeIdForSalary == null
                      ? employeesFilteredByName
                      : employeesFilteredByName.filter(sp => sp.id === selectedEmployeeIdForSalary)
                    const summarySalary = filteredForSalary.reduce((s, sp) => s + (totalSalaryByEmployeeInRange[sp.id] ?? 0), 0)
                    const summaryCommissionEarned = filteredForSalary.reduce((s, sp) => s + (totalSystemCommissionByEmployeeInRange[sp.id] ?? 0), 0)
                    const summaryCommissionPaid = filteredForSalary.reduce((s, sp) => s + (totalCommissionByEmployeeInRange[sp.id] ?? 0), 0)
                    const summaryCommissionDue = filteredForSalary.reduce((s, sp) => s + Math.max(0, (totalSystemCommissionByEmployeeInRange[sp.id] ?? 0) - (totalCommissionByEmployeeInRange[sp.id] ?? 0)), 0)
                    const summaryGoods = filteredForSalary.reduce((s, sp) => s + (totalGoodsByEmployeeInRange[sp.id] ?? 0), 0)
                    const summaryNet = filteredForSalary.reduce((s, sp) => s + getNetForRange(sp), 0)
                    const summaryDue = filteredForSalary.reduce((s, sp) => s + getDueForRange(sp), 0)
                    const rangeLabel = salaryDateRange !== 'all' ? ` (${salaryDateRange === 'custom' && salaryCustomFrom && salaryCustomTo ? `${salaryCustomFrom} to ${salaryCustomTo}` : salaryDateRange.replace('_', ' ')})` : ''
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <div className="text-xs font-semibold text-blue-700 uppercase">Total salary paid{rangeLabel}</div>
                          <div className="text-lg font-bold text-blue-900">{formatCurrency(summarySalary)}</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                          <div className="text-xs font-semibold text-emerald-700 uppercase">Commission earned (system){rangeLabel}</div>
                          <div className="text-lg font-bold text-emerald-900">{formatCurrency(summaryCommissionEarned)}</div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                          <div className="text-xs font-semibold text-indigo-700 uppercase">Commission (paid){rangeLabel}</div>
                          <div className="text-lg font-bold text-indigo-900">{formatCurrency(summaryCommissionPaid)}</div>
                        </div>
                        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                          <div className="text-xs font-semibold text-violet-700 uppercase">Commission (due){rangeLabel}</div>
                          <div className="text-lg font-bold text-violet-900">{formatCurrency(summaryCommissionDue)}</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <div className="text-xs font-semibold text-amber-700 uppercase">Goods (deduct){rangeLabel}</div>
                          <div className="text-lg font-bold text-amber-900">{formatCurrency(summaryGoods)}</div>
                        </div>
                        <div className="bg-gray-100 border border-gray-300 rounded-xl p-3">
                          <div className="text-xs font-semibold text-gray-700 uppercase">Net</div>
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(summaryNet)}</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                          <div className="text-xs font-semibold text-red-700 uppercase">Due</div>
                          <div className="text-lg font-bold text-red-900">{formatCurrency(summaryDue)}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <div className="text-xs font-semibold text-slate-700 uppercase">Employees</div>
                          <div className="text-lg font-bold text-slate-900">{filteredForSalary.length}</div>
                        </div>
                      </div>
                    )
                  })()}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-8" />
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Joining date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Current salary (₹/mo)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Total salary paid</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Commission (earned)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Commission (paid)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Commission (due)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Goods (deduct)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Net</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Due</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last paid</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(selectedEmployeeIdForSalary == null ? employeesFilteredByName : employeesFilteredByName.filter(sp => sp.id === selectedEmployeeIdForSalary)).map((sp) => {
                          const totalSalary = totalSalaryByEmployeeInRange[sp.id] ?? 0
                          const commissionEarned = totalSystemCommissionByEmployeeInRange[sp.id] ?? 0
                          const commissionPaid = totalCommissionByEmployeeInRange[sp.id] ?? 0
                          const commissionDue = Math.max(0, commissionEarned - commissionPaid)
                          const totalGoods = totalGoodsByEmployeeInRange[sp.id] ?? 0
                          const net = getNetForRange(sp)
                          const dueThisMonth = getDueForRange(sp)
                          const status = getStatusForRange(sp)
                          const lastPaid = lastPaidByEmployee[sp.id]
                          const isExpanded = expandedEmployeeId === sp.id
                          const payments = getPaymentsForEmployeeInRange(sp.id)
                          const goodsList = getGoodsForEmployeeInRange(sp.id)
                          const hasDetails = payments.length > 0 || goodsList.length > 0
                          return (
                            <React.Fragment key={sp.id}>
                              <tr className="hover:bg-blue-50/50">
                                <td className="px-4 py-2">
                                  {hasDetails ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedEmployeeId(isExpanded ? null : sp.id)}
                                      className="p-1 rounded hover:bg-gray-200"
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  ) : (
                                    <span className="w-4 inline-block" />
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold">{sp.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {sp.joining_date ? new Date(sp.joining_date).toLocaleDateString('en-IN') : '—'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {sp.current_salary != null ? formatCurrency(sp.current_salary) : '—'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(totalSalary)}</td>
                                <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatCurrency(commissionEarned)}</td>
                                <td className="px-4 py-3 text-sm font-medium text-indigo-700">{formatCurrency(commissionPaid)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-violet-700">{formatCurrency(commissionDue)}</td>
                                <td className="px-4 py-3 text-sm text-amber-700 font-medium">{formatCurrency(totalGoods)}</td>
                                <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(net)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-red-700">
                                  {dueThisMonth > 0 ? formatCurrency(dueThisMonth) : status === 'paid' ? '—' : hasSalarySet(sp) ? formatCurrency(0) : 'Set salary'}
                                </td>
                                <td className="px-4 py-3">
                                  {(() => {
                                    const label = status === 'paid' ? 'Paid' : status === 'partial_paid' ? 'Partial paid' : 'Due'
                                    const style = status === 'paid' ? 'bg-green-100 text-green-700' : status === 'partial_paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                    return <span className={`px-2 py-0.5 text-xs rounded ${style}`}>{label}</span>
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {lastPaid ? new Date(lastPaid).toLocaleDateString('en-IN') : '—'}
                                </td>
                              </tr>
                              {isExpanded && hasDetails && (
                                <tr>
                                  <td colSpan={12} className="px-4 py-3 bg-gray-50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 uppercase mb-2">Payment history</div>
                                        <ul className="space-y-1">
                                          {payments.length === 0 ? <li className="text-sm text-gray-500">No payments</li> : payments.map((p) => (
                                            <li key={p.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-gray-100 last:border-0">
                                              <span className="flex-1 min-w-0">
                                                <span>{new Date(p.payment_date).toLocaleDateString('en-IN')}</span>
                                                <span className="font-medium ml-2">{formatCurrency(p.amount)}</span>
                                                <span className="text-gray-600 capitalize ml-1">{(p.payment_type || 'salary') === 'commission' ? 'Commission' : 'Salary'}</span>
                                                {p.for_period && <span className="text-gray-500 ml-1">({p.for_period})</span>}
                                              </span>
                                              {hasPermission('users:update') && (
                                                <button type="button" onClick={() => handleEditPayment(p)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                  <Edit className="w-4 h-4" />
                                                </button>
                                              )}
                                              {hasPermission('users:delete') && (
                                                <button type="button" onClick={() => handleDeletePayment(p.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 uppercase mb-2">Goods purchase (deducted)</div>
                                        <ul className="space-y-1">
                                          {goodsList.length === 0 ? <li className="text-sm text-gray-500">None</li> : goodsList.map((g) => (
                                            <li key={g.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-gray-100 last:border-0">
                                              <span className="flex-1 min-w-0">
                                                <span>{g.period}</span>
                                                <span className="font-medium text-amber-700 ml-2">{formatCurrency(g.amount)}</span>
                                                {g.notes && <span className="text-gray-500 truncate max-w-[120px] ml-1">{g.notes}</span>}
                                              </span>
                                              {hasPermission('users:update') && (
                                                <button type="button" onClick={() => handleEditGoods(g)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                  <Edit className="w-4 h-4" />
                                                </button>
                                              )}
                                              {hasPermission('users:delete') && (
                                                <button type="button" onClick={() => handleDeleteGoods(g.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {showAddPaymentModal && createPortal(
                    <div
                      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
                      onClick={(e) => e.target === e.currentTarget && setShowAddPaymentModal(false)}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="add-salary-title"
                    >
                      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 id="add-salary-title" className="text-lg font-bold text-gray-900">
                            {editingPayment
                              ? (addPaymentModalType === 'commission' ? 'Edit Commission' : 'Edit Salary Payment')
                              : (addPaymentModalType === 'commission' ? 'Add Commission' : 'Add Salary Payment')}
                          </h3>
                          <button type="button" onClick={() => { setShowAddPaymentModal(false); setEditingPayment(null) }} className="p-1 hover:bg-gray-100 rounded">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <form onSubmit={handleAddSalaryPayment} className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
                            <select
                              value={addPaymentForm.sales_person_id}
                              onChange={(e) => setAddPaymentForm((f) => ({ ...f, sales_person_id: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              required
                              disabled={!!editingPayment}
                            >
                              <option value="">Select employee</option>
                              {salesPersons.filter(p => p.is_active).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Date</label>
                            <input
                              type="date"
                              value={addPaymentForm.payment_date}
                              onChange={(e) => setAddPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={addPaymentForm.amount}
                              onChange={(e) => setAddPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Month</label>
                              <select
                                value={addPaymentForm.for_period_month}
                                onChange={(e) => setAddPaymentForm((f) => ({ ...f, for_period_month: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                              >
                                {MONTH_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                              <select
                                value={addPaymentForm.for_period_year}
                                onChange={(e) => setAddPaymentForm((f) => ({ ...f, for_period_year: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                              >
                                {getYearOptions().map((y) => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Method</label>
                            <select
                              value={addPaymentForm.payment_method}
                              onChange={(e) => setAddPaymentForm((f) => ({ ...f, payment_method: e.target.value as SalaryPayment['payment_method'] }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="cash">Cash</option>
                              <option value="upi">UPI</option>
                              <option value="card">Card</option>
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                            <input
                              type="text"
                              value={addPaymentForm.notes}
                              onChange={(e) => setAddPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Optional"
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => { setShowAddPaymentModal(false); setEditingPayment(null) }}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              {editingPayment ? 'Update' : (addPaymentModalType === 'commission' ? 'Save Commission' : 'Save Payment')}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>,
                    document.body
                  )}

                  {showGoodsModal && createPortal(
                    <div
                      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
                      onClick={(e) => e.target === e.currentTarget && setShowGoodsModal(false)}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="add-goods-title"
                    >
                      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 id="add-goods-title" className="text-lg font-bold text-gray-900">{editingGoods ? 'Edit Goods Purchase' : 'Add Employee Goods Purchase'}</h3>
                          <button type="button" onClick={() => { setShowGoodsModal(false); setEditingGoods(null) }} className="p-1 hover:bg-gray-100 rounded">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">Amount will be deducted from salary + commission (net pay). You can add multiple months.</p>
                        <form onSubmit={handleAddGoodsPurchase} className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
                            <select
                              value={goodsForm.sales_person_id}
                              onChange={(e) => setGoodsForm((f) => ({ ...f, sales_person_id: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              required
                              disabled={!!editingGoods}
                            >
                              <option value="">Select employee</option>
                              {salesPersons.filter(p => p.is_active).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Month</label>
                              <select
                                value={goodsForm.period_month}
                                onChange={(e) => setGoodsForm((f) => ({ ...f, period_month: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                required
                              >
                                {MONTH_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                              <select
                                value={goodsForm.period_year}
                                onChange={(e) => setGoodsForm((f) => ({ ...f, period_year: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                required
                              >
                                {getYearOptions().map((y) => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₹) to deduct</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={goodsForm.amount}
                              onChange={(e) => setGoodsForm((f) => ({ ...f, amount: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                            <input
                              type="text"
                              value={goodsForm.notes}
                              onChange={(e) => setGoodsForm((f) => ({ ...f, notes: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Optional"
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-2">
                            <button type="button" onClick={() => { setShowGoodsModal(false); setEditingGoods(null) }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">{editingGoods ? 'Update' : 'Save'}</button>
                          </div>
                        </form>
                      </div>
                    </div>,
                    document.body
                  )}
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

