import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlanUpgrade } from '../context/PlanUpgradeContext'
import { UserMenu } from '../components/UserMenu'
import { saleService } from '../services/saleService'
import { purchaseService, supplierService } from '../services/purchaseService'
import { productService } from '../services/productService'
import { customerService } from '../services/customerService'
import { notificationService } from '../services/notificationService'
import { settingsService } from '../services/settingsService'
import { companyService } from '../services/companyService'
import { supplierPaymentService } from '../services/supplierPaymentService'
import { paymentService } from '../services/paymentService'
import { expenseService } from '../services/expenseService'
import { serviceRecordService } from '../services/serviceRecordService'
import { getTierPricing } from '../utils/tierPricing'
import type { SubscriptionTier } from '../types/device'
import { CONTACT_EMAIL, CONTACT_WEBSITE_URL, CONTACT_WEBSITE_DISPLAY, CONTACT_WHATSAPP_NUMBER, CONTACT_WHATSAPP_URL } from '../constants'
import type { Expense } from '../types/expense'
import { 
  ShoppingCart, 
  History, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileText,
  ShoppingBag,
  Building2,
  UserCheck,
  User,
  DollarSign,
  Settings,
  Database,
  Users,
  Bell,
  Clock,
  Receipt,
  CreditCard,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Barcode,
  BarChart3,
  ReceiptText,
  Wallet,
  ExternalLink,
  Wrench,
  Heart,
  Calculator,
  Wifi,
  Gift,
  BookOpen,
  Search,
  ListOrdered,
  ClipboardList,
  Tag,
  X,
  Globe,
  MessageCircle,
  Mail,
  Phone,
  Bike,
  Car,
  Zap,
  BatteryCharging,
  CalendarClock,
  Download,
} from 'lucide-react'
import { onPwaUpdateAvailable, applyPwaUpdate } from '../utils/pwa'
import { MaintenanceBanner } from '../components/MaintenanceBanner'
import type { MaintenanceSettings } from '../types/settings'
import { LockIcon } from '../components/icons/LockIcon'
import SubscriptionRechargeModal from '../components/SubscriptionRechargeModal'

interface ReportSummary {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  bgGradient: string
  textColor: string
  onClick?: () => void // Optional click handler
}

type TimePeriod = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'

// Footer apps: 12+ FreeToolHub tools (direct links) + BlessedBump + FreeToolHub main. Add new tools here.
const FOOTER_APPS: Array<{ name: string; url: string; color: string; icon: 'calculator' | 'trending' | 'dollar' | 'wifi' | 'heart' | 'wrench' | 'filetext' }> = [
  // FreeToolHub – professional & finance
  { name: 'Loan Calculator', url: 'https://freetoolhub.in/tools/loan-calculator', color: 'from-emerald-500 to-teal-600', icon: 'calculator' },
  { name: 'Investment Calculator', url: 'https://freetoolhub.in/tools/investment-calculator', color: 'from-green-500 to-emerald-600', icon: 'trending' },
  { name: 'Currency Converter', url: 'https://freetoolhub.in/tools/currency-converter', color: 'from-amber-500 to-orange-600', icon: 'dollar' },
  { name: 'Tax Calculator', url: 'https://freetoolhub.in/tools/tax-calculator', color: 'from-lime-500 to-green-600', icon: 'dollar' },
  { name: 'Mortgage Calculator', url: 'https://freetoolhub.in/tools/mortgage-calculator', color: 'from-teal-500 to-cyan-600', icon: 'calculator' },
  { name: 'Budget Planner', url: 'https://freetoolhub.in/tools/budget-planner', color: 'from-sky-500 to-blue-600', icon: 'dollar' },
  { name: 'Salary Calculator', url: 'https://freetoolhub.in/tools/salary-calculator', color: 'from-violet-500 to-purple-600', icon: 'dollar' },
  { name: 'Retirement Planner', url: 'https://freetoolhub.in/tools/retirement-calculator', color: 'from-fuchsia-500 to-pink-600', icon: 'trending' },
  // FreeToolHub – PDF, dev, utilities
  { name: 'PDF Merger', url: 'https://freetoolhub.in/tools/pdf-merger', color: 'from-red-500 to-rose-600', icon: 'filetext' },
  { name: 'JSON Formatter', url: 'https://freetoolhub.in/tools/json-formatter', color: 'from-slate-600 to-gray-700', icon: 'wrench' },
  { name: 'Smart Calculator', url: 'https://freetoolhub.in/tools/calculator', color: 'from-indigo-500 to-blue-600', icon: 'calculator' },
  { name: 'Internet Speed Test', url: 'https://freetoolhub.in/tools/internet-speed-test', color: 'from-cyan-500 to-blue-600', icon: 'wifi' },
  { name: 'Grade Calculator', url: 'https://freetoolhub.in/tools/grade-calculator', color: 'from-amber-600 to-orange-600', icon: 'calculator' },
  { name: 'Age Calculator', url: 'https://freetoolhub.in/tools/age-calculator', color: 'from-rose-500 to-red-600', icon: 'calculator' },
  // BlessedBump + FreeToolHub main
  { name: 'BlessedBump', url: 'https://blessedbump.in/calculator', color: 'from-pink-500 to-rose-600', icon: 'heart' },
  { name: 'FreeToolHub', url: 'https://freetoolhub.in', color: 'from-blue-500 to-indigo-600', icon: 'wrench' },
]
const FOOTER_ROTATION_INTERVAL_MS = 5000 // Switch to next set of apps every 5 seconds
const FOOTER_APPS_VISIBLE = 4 // How many app cards to show at a time (rest rotate in)

const Dashboard = () => {
  const { hasPermission, hasPlanFeature, user, getCurrentCompanyId, currentCompanyId } = useAuth()
  const { showPlanUpgrade } = usePlanUpgrade()
  const navigate = useNavigate()
  const [footerRotationIndex, setFooterRotationIndex] = useState(0)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [dashboardStats, setDashboardStats] = useState({
    activeProducts: 0,
    thisMonthSales: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    todaySales: 0,
    thisWeekSales: 0,
    reorderListCount: 0,
  })
  const [companyName, setCompanyName] = useState<string>('')
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    tier?: string
    startDate?: string
    endDate?: string
    status?: 'active' | 'expired' | 'cancelled'
  } | null>(null)
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false)
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [generalSettings, setGeneralSettings] = useState<{ sales_target_daily?: number; sales_target_monthly?: number }>({})
  const [topProducts, setTopProducts] = useState<Array<{ name: string; value: number }>>([])
  const [topCustomers, setTopCustomers] = useState<Array<{ name: string; value: number }>>([])
  const [outstandingStats, setOutstandingStats] = useState<{
    customerOutstanding: number
    supplierOutstanding: number
    customerCount: number
    supplierCount: number
  } | null>(null)
  const [cashFlow, setCashFlow] = useState<{
    byPayment: { cash: number; upi: number; card: number; other: number; credit: number }
    totalSales: number
    totalExpenses: number
    netCash: number
  } | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [fullDataLoading, setFullDataLoading] = useState(true)
  const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false)
  const [showSetGoalModal, setShowSetGoalModal] = useState(false)
  const [setGoalForm, setSetGoalForm] = useState({ daily: '' as string | number, monthly: '' as string | number })
  const [setGoalSaving, setSetGoalSaving] = useState(false)
  const [upcomingServicesCount, setUpcomingServicesCount] = useState(0)
  const [upcomingServicesCount30, setUpcomingServicesCount30] = useState(0)
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = useState(false)
  const [maintenanceBanner, setMaintenanceBanner] = useState<MaintenanceSettings | null>(null)

  const loadCompanyName = async () => {
    try {
      // Wait for user to be loaded
      if (!user) {
        console.log('[Dashboard] User not loaded yet, skipping company name load')
        return
      }
      
      // Get company ID: for non-admin, use user's company_id; for admin, use currentCompanyId
      let companyIdToUse = user.role === 'admin' ? currentCompanyId : (user.company_id || null)
      
      // If user doesn't have company_id but is not admin, try to find company by email pattern
      if (!companyIdToUse && user.role !== 'admin' && user.email) {
        console.log('[Dashboard] User has no company_id, attempting to find company by email pattern')
        const allCompanies = await companyService.getAll(true)
        // Try to match company by email pattern (e.g., cs01@hisabkitab.com -> CS01 company)
        const emailPrefix = user.email.split('@')[0].toLowerCase()
        const matchingCompany = allCompanies.find(c => {
          const companyNameLower = c.name.toLowerCase()
          const companyCodeLower = c.unique_code?.toLowerCase()
          return companyNameLower === emailPrefix || companyCodeLower?.includes(emailPrefix) || emailPrefix.includes(companyNameLower)
        })
        if (matchingCompany) {
          console.log('[Dashboard] Found matching company by email pattern:', matchingCompany.name, 'ID:', matchingCompany.id)
          companyIdToUse = matchingCompany.id
          // Optionally update the user's company_id (but don't do this automatically without user confirmation)
        }
      }
      
      console.log('[Dashboard] Loading company name for companyId:', companyIdToUse, 'user:', user.email, 'user.company_id:', user.company_id, 'currentCompanyId:', currentCompanyId)
      
      // For admin user (hisabkitabpro@hisabkitab.com), always set unlimited subscription
      if (user.role === 'admin' && user.email === 'hisabkitabpro@hisabkitab.com') {
        setSubscriptionInfo({
          tier: 'premium',
          startDate: undefined,
          endDate: undefined,
          status: 'active',
        })
      }
      
      if (companyIdToUse) {
        const company = await companyService.getById(companyIdToUse)
        console.log('[Dashboard] Loaded company:', company)
        console.log('[Dashboard] Company details - id:', company?.id, 'name:', company?.name, 'unique_code:', company?.unique_code)
        if (company) {
          // Use company.name (e.g., "CS01"), not unique_code (e.g., "COMP002")
          const nameToDisplay = company.name || company.unique_code || ''
          console.log('[Dashboard] Setting company name to:', nameToDisplay, '(from company.name field)')
          setCompanyName(nameToDisplay)
          
          // Load subscription info
          // For admin users, always set unlimited subscription
          if (user.role === 'admin' && user.email === 'hisabkitabpro@hisabkitab.com') {
            setSubscriptionInfo({
              tier: 'premium',
              startDate: undefined,
              endDate: undefined,
              status: 'active',
            })
          } else if (company.subscription_tier || company.subscription_start_date || company.subscription_end_date || company.valid_to) {
            setSubscriptionInfo({
              tier: company.subscription_tier,
              startDate: company.subscription_start_date || company.valid_from,
              endDate: company.subscription_end_date || company.valid_to,
              status: company.subscription_status || (company.valid_to && new Date(company.valid_to) >= new Date() ? 'active' : 'expired'),
            })
          } else {
            setSubscriptionInfo(null)
          }
        } else {
          console.log('[Dashboard] Company not found for ID:', companyIdToUse)
          setCompanyName('')
          setSubscriptionInfo(null)
        }
      } else {
        // For admin users, show unlimited subscription
        if (user.role === 'admin') {
          setSubscriptionInfo({
            tier: 'premium',
            startDate: undefined,
            endDate: undefined,
            status: 'active',
          })
        } else {
          console.log('[Dashboard] No companyId available, user role:', user.role)
          console.log('[Dashboard] User needs to be assigned to a company. Please update the user in User Management.')
          setCompanyName('')
          setSubscriptionInfo(null)
        }
      }
    } catch (error) {
      console.error('[Dashboard] Error loading company name:', error)
      setCompanyName('')
      setSubscriptionInfo(null)
    }
  }

  // Re-run when user/company changes so sales targets load from correct company (persist after refresh)
  useEffect(() => {
    calculateReports()
  }, [timePeriod, customStartDate, customEndDate, user?.id, user?.company_id, currentCompanyId])

  useEffect(() => {
    if (user) {
      loadCompanyName()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompanyId, user?.company_id, user]) // Reload when company or user changes

  // Update time every second for real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Rotate footer apps every N seconds so all tools get advertised
  useEffect(() => {
    const timer = setInterval(() => {
      setFooterRotationIndex((i) => (i + 1) % FOOTER_APPS.length)
    }, FOOTER_ROTATION_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  // Show "New update available" when PWA service worker finds a new version (production only)
  useEffect(() => {
    const unsubscribe = onPwaUpdateAvailable(() => setPwaUpdateAvailable(true))
    return unsubscribe
  }, [])

  // Load maintenance/alert for banner (shown just above shortcuts on Dashboard)
  useEffect(() => {
    settingsService.getMaintenance().then((m) => {
      if (m.enabled && m.show_as === 'banner') setMaintenanceBanner(m)
      else setMaintenanceBanner(null)
    })
  }, [])

  // Load notifications and generate alerts (scoped to current company)
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const companyId = getCurrentCompanyId?.() ?? null
        if (companyId != null) {
          await notificationService.generateStockAlerts(companyId)
          await notificationService.generatePaymentAlerts(companyId)
        }
        const count = await notificationService.getUnreadCount(user?.id, getCurrentCompanyId?.() ?? null)
        setUnreadNotifications(count)
      } catch (error) {
        console.error('Error loading notifications:', error)
      }
    }

    loadNotifications()
    // Refresh notifications every 5 minutes
    const interval = setInterval(loadNotifications, 300000)
    return () => clearInterval(interval)
  }, [user?.id, currentCompanyId])

  // Load upcoming services count (next 7 days & 30 days) for Premium Plus widget
  useEffect(() => {
    if (!hasPermission('services:read')) return
    const companyId = getCurrentCompanyId?.() ?? null
    if (companyId == null) return

    const vehicleTypes: Array<'bike' | 'car' | 'ebike' | 'ecar'> = ['bike', 'car']
    if (hasPlanFeature('services_ebike_ecar')) vehicleTypes.push('ebike', 'ecar')

    let cancelled = false
    const run = async () => {
      try {
        const all = await Promise.all(vehicleTypes.map((vt) => serviceRecordService.getAll(companyId, vt)))
        const flat = all.flat()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end7 = new Date(today)
        end7.setDate(end7.getDate() + 7)
        const end30 = new Date(today)
        end30.setDate(end30.getDate() + 30)

        let count7 = 0
        let count30 = 0
        flat.forEach((r) => {
          const next = r.next_service_date ? new Date(r.next_service_date) : null
          if (!next) return
          next.setHours(0, 0, 0, 0)
          if (next >= today && next <= end30) {
            count30++
            if (next <= end7) count7++
          }
        })
        if (!cancelled) {
          setUpcomingServicesCount(count7)
          setUpcomingServicesCount30(count30)
        }
      } catch (e) {
        console.error('Failed to load upcoming services count:', e)
      }
    }
    run()
    return () => { cancelled = true }
  }, [hasPermission, hasPlanFeature, getCurrentCompanyId, currentCompanyId])

  /** Format a Date as YYYY-MM-DD in local time (so "Today" is correct in user's timezone) */
  const toLocalDateString = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const getDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    switch (timePeriod) {
      case 'today': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        startDate = toLocalDateString(today)
        endDate = toLocalDateString(today)
        break
      }
      case 'thisWeek': {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = toLocalDateString(weekStart)
        endDate = toLocalDateString(now)
        break
      }
      case 'thisMonth': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = toLocalDateString(monthStart)
        endDate = toLocalDateString(now)
        break
      }
      case 'thisYear': {
        const yearStart = new Date(now.getFullYear(), 0, 1)
        startDate = toLocalDateString(yearStart)
        endDate = toLocalDateString(now)
        break
      }
      case 'custom':
        startDate = customStartDate || undefined
        endDate = customEndDate || undefined
        break
      default: // 'all'
        startDate = undefined
        endDate = undefined
    }

    return { startDate, endDate }
  }

  const calculateReports = async () => {
    const companyId = getCurrentCompanyId()
    const effectiveCompanyId = companyId ?? user?.company_id ?? undefined

    setSummaryLoading(true)
    setFullDataLoading(true)

    // Phase 1: Fast path – load sales and purchases first so report summary always loads
    const [allSales, allPurchases] = await Promise.all([
      saleService.getAllFast(true, companyId),
      purchaseService.getAllFast(undefined, companyId),
    ])
    // Load expenses separately – failure must not block report summary
    let allExpenses: Expense[] = []
    try {
      allExpenses = await expenseService.getAll(companyId)
    } catch (e) {
      console.warn('[Dashboard] Expense load failed, cash flow will show 0 expenses:', e)
    }
    const paymentStatsRes = paymentService.getStatsFromSalesPurchases(allSales, allPurchases)

    setOutstandingStats({
      customerOutstanding: paymentStatsRes.customerOutstanding,
      supplierOutstanding: paymentStatsRes.supplierOutstanding,
      customerCount: paymentStatsRes.customerCount,
      supplierCount: paymentStatsRes.supplierCount,
    })
    setSummaryLoading(false)

    // Get date range based on selected time period
    const { startDate, endDate } = getDateRange()

    // Filter sales by date range
    const filteredSales = allSales.filter(sale => {
      if (!startDate && !endDate) return true
      const saleDate = new Date(sale.sale_date).getTime()
      if (startDate && saleDate < new Date(startDate).getTime()) return false
      if (endDate) {
        const endDateTime = new Date(endDate).getTime() + 86400000 // Add 24 hours to include entire end date
        if (saleDate > endDateTime) return false
      }
      return true
    })

    // Filter purchases by date range
    const filteredPurchases = allPurchases.filter(purchase => {
      if (!startDate && !endDate) return true
      const purchaseDate = new Date(purchase.purchase_date).getTime()
      if (startDate && purchaseDate < new Date(startDate).getTime()) return false
      if (endDate) {
        const endDateTime = new Date(endDate).getTime() + 86400000 // Add 24 hours to include entire end date
        if (purchaseDate > endDateTime) return false
      }
      return true
    })

    // Calculate totals for filtered period
    const totalSales = filteredSales.reduce((sum, s) => sum + s.grand_total, 0)

    // Top 5 products by value in period (from sale items)
    const productValueMap = new Map<number, { name: string; value: number }>()
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type !== 'sale') return
        const value = item.total ?? (item.quantity * item.unit_price)
        const existing = productValueMap.get(item.product_id)
        const name = item.product_name || `Product #${item.product_id}`
        if (existing) {
          existing.value += value
        } else {
          productValueMap.set(item.product_id, { name, value })
        }
      })
    })
    const topProductsList = Array.from(productValueMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    setTopProducts(topProductsList)

    // Top 5 customers by value in period
    const customerValueMap = new Map<number | string, { name: string; value: number }>()
    filteredSales.forEach(sale => {
      const key = sale.customer_id ?? sale.customer_name ?? 'Walk-in'
      const name = sale.customer_name || 'Walk-in'
      const existing = customerValueMap.get(key)
      if (existing) {
        existing.value += sale.grand_total
      } else {
        customerValueMap.set(key, { name, value: sale.grand_total })
      }
    })
    const topCustomersList = Array.from(customerValueMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    setTopCustomers(topCustomersList)
    
    // Calculate total purchases (handle both GST and simple purchases)
    const totalPurchases = filteredPurchases.reduce((sum, purchase) => {
      if (purchase.type === 'gst') {
        return sum + ((purchase as any).grand_total || 0)
      } else {
        return sum + ((purchase as any).total_amount || 0)
      }
    }, 0)

    // Filter expenses by date range (exclude opening/closing balance entries)
    const filteredExpenses = allExpenses.filter(exp => {
      if (exp.expense_type === 'opening' || exp.expense_type === 'closing') return false
      if (!startDate && !endDate) return true
      const expDate = new Date(exp.expense_date).getTime()
      if (startDate && expDate < new Date(startDate).getTime()) return false
      if (endDate) {
        const endDateTime = new Date(endDate).getTime() + 86400000
        if (expDate > endDateTime) return false
      }
      return true
    })
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const netCash = totalSales - totalPurchases - totalExpenses

    // Aggregate sales by payment method (Cash, UPI, Card, Other, Credit)
    const byPayment = { cash: 0, upi: 0, card: 0, other: 0, credit: 0 }
    const norm = (m: string) => m.toLowerCase().trim()
    filteredSales.forEach(sale => {
      if (sale.payment_methods && sale.payment_methods.length > 0) {
        sale.payment_methods.forEach(pm => {
          const method = norm(pm.method)
          if (method === 'cash') byPayment.cash += pm.amount
          else if (method === 'upi') byPayment.upi += pm.amount
          else if (method.includes('card')) byPayment.card += pm.amount
          else if (method === 'credit') byPayment.credit += pm.amount
          else byPayment.other += pm.amount
        })
      } else {
        const method = norm(sale.payment_method || 'cash')
        if (method === 'cash') byPayment.cash += sale.grand_total
        else if (method === 'upi') byPayment.upi += sale.grand_total
        else if (method.includes('card')) byPayment.card += sale.grand_total
        else if (method === 'credit') byPayment.credit += sale.grand_total
        else byPayment.other += sale.grand_total
      }
    })
    setCashFlow({ byPayment, totalSales, totalExpenses, netCash })

    const totalProfit = filteredSales.reduce((sum, sale) => {
      const saleProfit = sale.items.reduce((itemSum, item) => {
        if (item.sale_type === 'sale' && item.purchase_price) {
          return itemSum + ((item.unit_price - item.purchase_price) * item.quantity)
        }
        return itemSum
      }, 0)
      return sum + saleProfit
    }, 0)

    // Sales/purchase trends for period comparison
    const now = new Date()
    let thisPeriod: number
    let lastPeriod: number
    let thisPeriodPurchases: number
    let lastPeriodPurchases: number
    if (timePeriod === 'thisMonth' || timePeriod === 'all') {
      thisPeriod = totalSales
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      lastPeriod = allSales.filter(s => {
        const saleDate = new Date(s.sale_date)
        return saleDate >= lastMonthStart && saleDate <= lastMonthEnd
      }).reduce((sum, s) => sum + s.grand_total, 0)
      thisPeriodPurchases = totalPurchases
      lastPeriodPurchases = allPurchases.filter(p => {
        const purchaseDate = new Date(p.purchase_date)
        return purchaseDate >= lastMonthStart && purchaseDate <= lastMonthEnd
      }).reduce((sum, purchase) => {
        if (purchase.type === 'gst') return sum + ((purchase as any).grand_total || 0)
        return sum + ((purchase as any).total_amount || 0)
      }, 0)
    } else {
      thisPeriod = totalSales
      lastPeriod = 0
      thisPeriodPurchases = totalPurchases
      lastPeriodPurchases = 0
    }
    const salesTrend = lastPeriod > 0 ? ((thisPeriod - lastPeriod) / lastPeriod * 100) : 0
    const purchasesTrend = lastPeriodPurchases > 0 ? ((thisPeriodPurchases - lastPeriodPurchases) / lastPeriodPurchases * 100) : 0

    // Phase 1 complete – show critical summary first
    const phase1Reports: ReportSummary[] = [
      { title: 'Total Sales', value: `₹${totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, change: salesTrend >= 0 ? `+${salesTrend.toFixed(1)}%` : `${salesTrend.toFixed(1)}%`, trend: salesTrend >= 0 ? 'up' : (salesTrend < 0 ? 'down' : 'neutral'), icon: <TrendingUp className="w-8 h-8" />, bgGradient: 'from-green-500 to-emerald-600', textColor: 'text-green-700' },
      { title: 'Total Purchases', value: `₹${totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, change: purchasesTrend !== 0 ? (purchasesTrend >= 0 ? `+${purchasesTrend.toFixed(1)}%` : `${purchasesTrend.toFixed(1)}%`) : '—', trend: purchasesTrend >= 0 ? 'up' : (purchasesTrend < 0 ? 'down' : 'neutral'), icon: <ShoppingBag className="w-8 h-8" />, bgGradient: 'from-blue-500 to-cyan-600', textColor: 'text-blue-700' },
      { title: 'Total Profit', value: `₹${totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, change: totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}% margin` : '—', trend: totalProfit >= 0 ? 'up' : 'down', icon: <TrendingUp className="w-8 h-8" />, bgGradient: 'from-purple-500 to-pink-600', textColor: 'text-purple-700' },
      { title: 'Total Products', value: '…', change: '—', trend: 'neutral', icon: <Package className="w-8 h-8" />, bgGradient: 'from-orange-500 to-red-600', textColor: 'text-orange-700' },
      { title: 'Low Stock Alert', value: '…', change: '—', trend: 'neutral', icon: <AlertTriangle className="w-8 h-8" />, bgGradient: 'from-yellow-500 to-orange-600', textColor: 'text-yellow-700', onClick: () => navigate('/stock/alerts') },
      { title: 'Out of Stock', value: '…', change: '—', trend: 'neutral', icon: <AlertTriangle className="w-8 h-8" />, bgGradient: 'from-red-500 to-pink-600', textColor: 'text-red-700', onClick: () => navigate('/stock/alerts') },
      { title: 'Upcoming Checks', value: '…', change: '—', trend: 'neutral', icon: <CreditCard className="w-8 h-8" />, bgGradient: 'from-indigo-500 to-purple-600', textColor: 'text-indigo-700', onClick: () => navigate('/checks/upcoming') },
    ]
    setReports(phase1Reports)

    // Phase 2: Secondary data – products, customers, suppliers, checks, settings
    const [allProducts, allCustomers, allSuppliers, upcomingChecks, generalSettingsRes] = await Promise.all([
      productService.getAll(false, companyId),
      customerService.getAll(false, companyId),
      supplierService.getAll(companyId),
      supplierPaymentService.getUpcomingChecks(companyId, 30),
      settingsService.getGeneral(effectiveCompanyId),
    ])
    setGeneralSettings({ sales_target_daily: generalSettingsRes.sales_target_daily, sales_target_monthly: generalSettingsRes.sales_target_monthly })
    setFullDataLoading(false)

    // Create a map of product_id to max min_stock_level from purchase items
    const productMinStockMap = new Map<number, number>()
    // Calculate actual available stock from purchase items
    const productAvailableStockMap = new Map<number, number>()
    // Track articles for article-based alerts
    const articleToPurchaseItemMap = new Map<string, { product_id: number; article: string; availableQty: number; minStock: number }>()
    
    allPurchases.forEach(purchase => {
      purchase.items.forEach(item => {
        if (item.min_stock_level !== undefined && item.min_stock_level > 0) {
          const current = productMinStockMap.get(item.product_id) || 0
          productMinStockMap.set(item.product_id, Math.max(current, item.min_stock_level))
        }
        
        // Calculate available stock from purchase items (quantity - sold_quantity)
        const soldQty = item.sold_quantity || 0
        const availableQty = item.quantity - soldQty
        const currentAvailable = productAvailableStockMap.get(item.product_id) || 0
        productAvailableStockMap.set(item.product_id, currentAvailable + availableQty)
        
        // Track articles for article-based alerts
        if (item.article && item.article.trim()) {
          const articleKey = item.article.trim().toLowerCase()
          const existing = articleToPurchaseItemMap.get(articleKey)
          if (existing) {
            articleToPurchaseItemMap.set(articleKey, {
              product_id: item.product_id,
              article: item.article,
              availableQty: existing.availableQty + availableQty,
              minStock: Math.max(existing.minStock, item.min_stock_level || 0)
            })
          } else {
            articleToPurchaseItemMap.set(articleKey, {
              product_id: item.product_id,
              article: item.article,
              availableQty: availableQty,
              minStock: item.min_stock_level || 0
            })
          }
        }
      })
    })
    
    const totalProducts = allProducts.length
    const activeProducts = allProducts.filter(p => p.status === 'active').length
    
    // Count low stock products (using actual available stock from purchase items)
    let lowStockCount = 0
    const lowStockProductsList: Array<{ name: string; stock: number; min: number }> = []
    
    allProducts.forEach(p => {
      const minStockLevel = p.min_stock_level || productMinStockMap.get(p.id)
      const actualAvailableStock = productAvailableStockMap.get(p.id) ?? p.stock_quantity
      
      if (minStockLevel !== undefined && minStockLevel > 0 && actualAvailableStock <= minStockLevel && actualAvailableStock > 0) {
        lowStockCount++
        lowStockProductsList.push({ name: p.name, stock: actualAvailableStock, min: minStockLevel })
      }
    })
    
    // Also count article-based alerts
    articleToPurchaseItemMap.forEach((itemData) => {
      if (itemData.minStock > 0 && itemData.availableQty <= itemData.minStock && itemData.availableQty > 0) {
        const product = allProducts.find(p => p.id === itemData.product_id)
        if (product) {
          // Check if we already counted this product
          const alreadyCounted = lowStockProductsList.some(p => p.name === product.name)
          if (!alreadyCounted) {
            lowStockCount++
            lowStockProductsList.push({ 
              name: `${product.name} [${itemData.article}]`, 
              stock: itemData.availableQty, 
              min: itemData.minStock 
            })
          }
        }
      }
    })
    
    const lowStockProducts = lowStockCount
    const outOfStockProducts = allProducts.filter(p => {
      const actualAvailableStock = productAvailableStockMap.get(p.id) ?? p.stock_quantity
      return actualAvailableStock === 0
    }).length

    const upcomingChecksTotal = upcomingChecks.reduce((sum, check) => sum + check.amount, 0)

    // Reorder List count: same logic as Reorder List page (product-level + article-level below min)
    const reorderListProductCount = allProducts.filter(p => {
      const minStockLevel = p.min_stock_level ?? productMinStockMap.get(p.id)
      const actualAvailableStock = productAvailableStockMap.get(p.id) ?? p.stock_quantity
      return (minStockLevel !== undefined && minStockLevel > 0) && (actualAvailableStock < minStockLevel)
    }).length
    let reorderListArticleCount = 0
    articleToPurchaseItemMap.forEach((itemData) => {
      if (itemData.minStock > 0 && itemData.availableQty <= itemData.minStock) {
        const product = allProducts.find(p => p.id === itemData.product_id)
        if (product) reorderListArticleCount++
      }
    })
    const reorderListCount = reorderListProductCount + reorderListArticleCount
    
    console.log('[Dashboard] Stock alerts calculation:', {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      lowStockProductsList,
      productsWithMinStock: allProducts
        .filter(p => {
          const minStockLevel = p.min_stock_level || productMinStockMap.get(p.id)
          return minStockLevel !== undefined && minStockLevel > 0
        })
        .map(p => {
          const minStockLevel = p.min_stock_level || productMinStockMap.get(p.id)
          const actualAvailableStock = productAvailableStockMap.get(p.id) ?? p.stock_quantity
          return {
            name: p.name,
            stock: actualAvailableStock,
            productStock: p.stock_quantity,
            min: minStockLevel,
            shouldAlert: actualAvailableStock <= (minStockLevel || 0) && actualAvailableStock > 0
          }
        })
    })

    const nowDate = new Date()
    const thisMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
    const thisMonthSales = allSales.filter(s => {
      const saleDate = new Date(s.sale_date)
      return saleDate >= thisMonthStart && saleDate <= nowDate
    }).reduce((sum, s) => sum + s.grand_total, 0)
    const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
    const todaySales = allSales.filter(s => {
      const saleDate = new Date(s.sale_date)
      return saleDate >= today && saleDate <= nowDate
    }).reduce((sum, s) => sum + s.grand_total, 0)
    const weekStart = new Date(nowDate)
    weekStart.setDate(nowDate.getDate() - nowDate.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const thisWeekSales = allSales.filter(s => {
      const saleDate = new Date(s.sale_date)
      return saleDate >= weekStart && saleDate <= nowDate
    }).reduce((sum, s) => sum + s.grand_total, 0)

    // Update dashboard stats
    setDashboardStats({
      activeProducts,
      thisMonthSales,
      totalCustomers: allCustomers.length,
      totalSuppliers: allSuppliers.length,
      todaySales,
      thisWeekSales,
      reorderListCount,
    })

    const reportsData: ReportSummary[] = [
    {
      title: 'Total Sales',
      value: `₹${totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      change: salesTrend >= 0 ? `+${salesTrend.toFixed(1)}%` : `${salesTrend.toFixed(1)}%`,
      trend: salesTrend >= 0 ? 'up' : (salesTrend < 0 ? 'down' : 'neutral'),
      icon: <TrendingUp className="w-8 h-8" />,
      bgGradient: 'from-green-500 to-emerald-600',
      textColor: 'text-green-700'
    },
    {
      title: 'Total Purchases',
      value: `₹${totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      change: purchasesTrend !== 0 ? (purchasesTrend >= 0 ? `+${purchasesTrend.toFixed(1)}%` : `${purchasesTrend.toFixed(1)}%`) : '—',
      trend: purchasesTrend >= 0 ? 'up' : (purchasesTrend < 0 ? 'down' : 'neutral'),
      icon: <ShoppingBag className="w-8 h-8" />,
      bgGradient: 'from-blue-500 to-cyan-600',
      textColor: 'text-blue-700'
    },
    {
      title: 'Total Profit',
      value: `₹${totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      change: totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}% margin` : '—',
      trend: totalProfit >= 0 ? 'up' : 'down',
      icon: <TrendingUp className="w-8 h-8" />,
      bgGradient: 'from-purple-500 to-pink-600',
      textColor: 'text-purple-700'
    },
    {
      title: 'Total Products',
      value: totalProducts.toString(),
      change: '—',
      trend: 'neutral',
      icon: <Package className="w-8 h-8" />,
      bgGradient: 'from-orange-500 to-red-600',
      textColor: 'text-orange-700'
    },
    {
      title: 'Low Stock Alert',
      value: lowStockProducts.toString(),
      change: '—',
      trend: lowStockProducts > 0 ? 'up' : 'neutral',
      icon: <AlertTriangle className="w-8 h-8" />,
      bgGradient: 'from-yellow-500 to-orange-600',
      textColor: 'text-yellow-700',
      onClick: () => navigate('/stock/alerts')
    },
    {
      title: 'Out of Stock',
      value: outOfStockProducts.toString(),
      change: '—',
      trend: outOfStockProducts > 0 ? 'up' : 'neutral',
      icon: <AlertTriangle className="w-8 h-8" />,
      bgGradient: 'from-red-500 to-pink-600',
      textColor: 'text-red-700',
      onClick: () => navigate('/stock/alerts')
    },
    {
      title: 'Upcoming Checks',
      value: upcomingChecks.length.toString(),
      change: `₹${upcomingChecksTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      trend: upcomingChecks.length > 0 ? 'up' : 'neutral',
      icon: <CreditCard className="w-8 h-8" />,
      bgGradient: 'from-indigo-500 to-purple-600',
      textColor: 'text-indigo-700',
      onClick: () => navigate('/checks/upcoming')
    }
    ]
    setReports(reportsData)

    // Background sync: keep IndexedDB and payment records in sync for other pages (non-blocking)
    void (async () => {
      try {
        const [sales, purchases] = await Promise.all([
          saleService.getAll(true, companyId),
          purchaseService.getAll(undefined, companyId),
        ])
        await paymentService.initializeFromSalesAndPurchases(companyId, { sales, purchases })
      } catch (e) {
        console.warn('[Dashboard] Background sync failed:', e)
      }
    })()
  }

  const allSalesOptions = [
    { title: 'Quick Sale', description: 'Scan barcode → auto-add → pay (fast checkout)', icon: <ShoppingCart className="w-10 h-10" />, gradient: 'from-emerald-500 to-teal-600', hoverGradient: 'from-emerald-600 to-teal-700', link: '/sales/quick', permission: 'sales:create', planFeature: 'sales_quick_sale' as const },
    { title: 'New Sale', description: 'Create a new sales invoice (full form)', icon: <ShoppingCart className="w-10 h-10" />, gradient: 'from-blue-500 to-blue-600', hoverGradient: 'from-blue-600 to-blue-700', link: '/sales/new', permission: 'sales:create', planFeature: 'sales_new_sale' as const },
    { title: 'New Sale Tab', description: 'Open sale form in new tab (for multiple customers)', icon: <ShoppingCart className="w-10 h-10" />, gradient: 'from-green-500 to-emerald-600', hoverGradient: 'from-green-600 to-emerald-700', link: '/sales/new', permission: 'sales:create', openInNewTab: true, planFeature: 'sales_new_sale_tab' as const },
    { title: 'Rent / Bookings', description: 'Goods on rent – pickup & return dates, security deposit', icon: <Calendar className="w-10 h-10" />, gradient: 'from-indigo-500 to-purple-600', hoverGradient: 'from-indigo-600 to-purple-700', link: '/rentals', permission: 'sales:read', planFeature: 'sales_rent' as const },
  ]

  const salesOptions = useMemo(() => {
    return allSalesOptions.filter(option => {
      if (!hasPermission(option.permission)) return false
      if (!hasPlanFeature(option.planFeature)) return false
      if ((option as any).adminOnly && user?.role !== 'admin') return false
      return true
    })
  }, [hasPermission, hasPlanFeature, user])

  const allPurchaseOptions = [
    {
      title: 'Customers',
      description: 'Manage customer database',
      icon: <User className="w-10 h-10" />,
      gradient: 'from-blue-500 to-indigo-600',
      hoverGradient: 'from-blue-600 to-indigo-700',
      link: '/customers',
      permission: 'sales:read'
    },
    {
      title: 'Suppliers',
      description: 'Manage supplier contacts',
      icon: <Building2 className="w-10 h-10" />,
      gradient: 'from-teal-500 to-cyan-600',
      hoverGradient: 'from-teal-600 to-cyan-700',
      link: '/suppliers',
      permission: 'purchases:read'
    },
    {
      title: 'Sales & Category Management',
      description: 'Manage sales persons, categories, commissions & assignments',
      icon: <UserCheck className="w-10 h-10" />,
      gradient: 'from-indigo-500 to-purple-600',
      hoverGradient: 'from-indigo-600 to-purple-700',
      link: '/sales-category-management',
      permission: 'users:read',
      permissionAlt: 'sales_persons:read',
      planFeature: 'purchase_sales_category_mgmt' as const
    },
    {
      title: 'GST Purchase',
      description: 'Create purchase with GST details',
      icon: <ShoppingBag className="w-10 h-10" />,
      gradient: 'from-indigo-500 to-purple-600',
      hoverGradient: 'from-indigo-600 to-purple-700',
      link: '/purchases/new-gst',
      permission: 'purchases:create',
      planFeature: 'purchase_gst' as const
    },
    {
      title: 'Simple Purchase',
      description: 'Create purchase without GST',
      icon: <ShoppingBag className="w-10 h-10" />,
      gradient: 'from-green-500 to-emerald-600',
      hoverGradient: 'from-green-600 to-emerald-700',
      link: '/purchases/new-simple',
      permission: 'purchases:create'
    },
    {
      title: 'Purchase History',
      description: 'View all purchase records',
      icon: <History className="w-10 h-10" />,
      gradient: 'from-violet-500 to-purple-600',
      hoverGradient: 'from-violet-600 to-purple-700',
      link: '/purchases/history',
      permission: 'purchases:read',
      planFeature: 'purchase_history' as const
    },
    {
      title: 'Upcoming Checks',
      description: 'View and manage upcoming supplier checks',
      icon: <CreditCard className="w-10 h-10" />,
      gradient: 'from-indigo-500 to-purple-600',
      hoverGradient: 'from-indigo-600 to-purple-700',
      link: '/checks/upcoming',
      permission: 'purchases:read',
      planFeature: 'purchase_upcoming_checks' as const
    }
  ]

  // Purchase: show plan-gated options to all (with lock when locked); show non-plan-gated only when permission
  const purchaseOptionsToShow = useMemo(() => {
    return allPurchaseOptions.filter(option => {
      const hasPerm = (option as any).permissionAlt
        ? (hasPermission(option.permission) || hasPermission((option as any).permissionAlt))
        : hasPermission(option.permission)
      if ((option as any).planFeature) return true
      return hasPerm
    })
  }, [hasPermission])

  const allExpenseOptions = [
    { title: 'Daily Expenses', description: 'Manage and track daily business expenses', icon: <Receipt className="w-10 h-10" />, gradient: 'from-red-500 to-pink-600', hoverGradient: 'from-red-600 to-pink-700', link: '/expenses', permission: 'expenses:read', planFeature: 'expense_daily_expenses' as const },
    { title: 'Daily Report', description: 'View comprehensive daily business summary', icon: <FileText className="w-10 h-10" />, gradient: 'from-green-500 to-emerald-600', hoverGradient: 'from-green-600 to-emerald-700', link: '/daily-report', permission: 'expenses:read', planFeature: 'expense_daily_report' as const },
  ]

  const expenseOptions = useMemo(() => {
    return allExpenseOptions.filter(option => hasPermission(option.permission) && hasPlanFeature(option.planFeature))
  }, [hasPermission, hasPlanFeature])

  const reportTitleToPlanFeature: Record<string, string> = {
    'Total Sales': 'report_total_sales',
    'Total Purchases': 'report_total_purchases',
    'Total Profit': 'report_total_profit',
    'Total Products': 'report_total_products',
    'Low Stock Alert': 'report_low_stock',
    'Out of Stock': 'report_out_of_stock',
    'Upcoming Checks': 'report_upcoming_checks',
  }
  const reportCardAccess = useMemo(() => {
    const map: Record<string, boolean> = {}
    reports.forEach(report => {
      const permCheck = report.title === 'Total Sales' || report.title === 'Total Profit'
        ? hasPermission('sales:read')
        : report.title === 'Total Purchases'
          ? hasPermission('purchases:read')
          : (report.title === 'Low Stock Alert' || report.title === 'Out of Stock' || report.title === 'Total Products')
            ? hasPermission('products:read')
            : hasPermission('reports:read')
      const planFeature = reportTitleToPlanFeature[report.title]
      const planCheck = planFeature ? hasPlanFeature(planFeature as any) : true
      map[report.title] = !!(permCheck && planCheck)
    })
    return map
  }, [reports, hasPermission, hasPlanFeature])

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4" />
      case 'down':
        return <ArrowDownRight className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  // Calculate days remaining for subscription
  const subscriptionDaysRemaining = useMemo(() => {
    if (!subscriptionInfo?.endDate) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(subscriptionInfo.endDate)
    endDate.setHours(0, 0, 0, 0)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }, [subscriptionInfo?.endDate, currentTime])

  // Client-side auto-renew prompt:
  // When expiring very soon (<= 3 days) or expired, open recharge modal once per day.
  useEffect(() => {
    try {
      if (!subscriptionInfo?.endDate) return
      if (showRechargeModal) return
      if (subscriptionDaysRemaining === null) return
      if (subscriptionDaysRemaining > 3) return

      const companyId = getCurrentCompanyId?.() || user?.company_id || 'unknown'
      const key = `hisabkitab:autoRenewPrompt:${companyId}`
      const today = new Date().toISOString().slice(0, 10)
      const last = localStorage.getItem(key)
      if (last === today) return

      localStorage.setItem(key, today)
      setShowSubscriptionDetails(true)
      setShowRechargeModal(true)
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionInfo?.endDate, subscriptionDaysRemaining])

  // Check if subscription is expiring soon (within 30 days)
  const isSubscriptionExpiringSoon = subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 30 && subscriptionDaysRemaining > 0

  const handleSaveSetGoal = async () => {
    const companyId = getCurrentCompanyId()
    const effectiveCompanyId = companyId ?? user?.company_id ?? undefined
    const dailyVal = setGoalForm.daily === '' ? undefined : Math.max(0, Number(setGoalForm.daily))
    const monthlyVal = setGoalForm.monthly === '' ? undefined : Math.max(0, Number(setGoalForm.monthly))
    setSetGoalSaving(true)
    try {
      await settingsService.updateGeneral(
        {
          sales_target_daily: dailyVal,
          sales_target_monthly: monthlyVal,
        },
        user?.id ? Number(user.id) : undefined,
        effectiveCompanyId
      )
      setGeneralSettings({ sales_target_daily: dailyVal, sales_target_monthly: monthlyVal })
      setShowSetGoalModal(false)
    } catch (e) {
      console.error('Failed to save sales target:', e)
    } finally {
      setSetGoalSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Contact us - single line at top */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-2.5 border-b border-gray-200/60 text-sm">
            <span className="text-gray-500 font-semibold uppercase tracking-wider">Contact us</span>
            <a href={CONTACT_WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
              <Globe className="w-3.5 h-3.5" />
              {CONTACT_WEBSITE_DISPLAY}
            </a>
            <span className="text-gray-300">|</span>
            <a href={CONTACT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 font-medium">
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp: {CONTACT_WHATSAPP_NUMBER}
            </a>
            <span className="text-gray-300">|</span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
              <Mail className="w-3.5 h-3.5" />
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {companyName && companyName.trim() ? `${companyName} - HisabKitab-Pro` : 'HisabKitab-Pro'}
              </h1>
              <p className="text-sm text-gray-600 mt-1 font-medium">Complete Inventory Management System</p>
              <p className="text-xs text-gray-500 mt-0.5">Streamline Your Business Operations</p>
            </div>
            <div className="flex items-center gap-4">
              {hasPermission('products:read') && (
                <button
                  onClick={() => navigate('/products')}
                  className="hidden md:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <Package className="w-5 h-5" />
                  Products
                </button>
              )}
              <div className="text-right bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl px-6 py-3 border border-blue-100 hidden md:block">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {currentTime.toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-sm font-semibold text-gray-600 mt-1">
                  {currentTime.toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-6 h-6 text-gray-600" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
              <Link
                to="/user-manual"
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 font-medium"
                title="User Manual (Help)"
              >
                <BookOpen className="w-5 h-5 text-gray-600" />
                <span className="hidden sm:inline">User Manual</span>
              </Link>
              <div className="flex flex-col items-end gap-2">
                <UserMenu />
                {subscriptionInfo && (
                  <div className="w-full max-w-xs">
                    <button
                      onClick={() => setShowSubscriptionDetails(!showSubscriptionDetails)}
                      className="w-full flex items-center justify-between bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg px-4 py-2 hover:from-blue-700 hover:to-indigo-800 transition-all shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-semibold">
                          {subscriptionInfo.tier ? (subscriptionInfo.tier === 'premium_plus' ? 'Premium Plus Plan' : subscriptionInfo.tier === 'premium_plus_plus' ? 'Premium Plus Plus Plan' : subscriptionInfo.tier === 'premium' ? 'Premium Plan' : subscriptionInfo.tier === 'standard' ? 'Standard Plan' : subscriptionInfo.tier === 'starter' ? 'Starter Plan' : 'Basic Plan') : 'Subscription'}
                        </span>
                      </div>
                      {showSubscriptionDetails ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {showSubscriptionDetails && (
                      <div className="mt-2 bg-white rounded-lg shadow-xl p-4 border border-gray-200">
                        <div className="space-y-3">
                          {/* Recharge Button */}
                          <button
                            onClick={() => setShowRechargeModal(true)}
                            className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                              subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 30
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800'
                            }`}
                          >
                            <CreditCard className="w-4 h-4" />
                            {subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 0
                              ? 'Activate Subscription'
                              : subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 30
                                ? 'Renew Now'
                                : 'Recharge'}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/subscription/payments')}
                            className="w-full px-4 py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-800 hover:bg-gray-50"
                          >
                            <ReceiptText className="w-4 h-4" />
                            Payment History
                          </button>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Plan</p>
                            <p className="text-gray-900 font-semibold">
                              {subscriptionInfo.tier
                                ? (() => {
                                    const tierInfo = getTierPricing(subscriptionInfo.tier as SubscriptionTier)
                                    const icon = subscriptionInfo.tier === 'premium_plus' || subscriptionInfo.tier === 'premium_plus_plus' ? '🚗' : subscriptionInfo.tier === 'premium' ? '♾️' : subscriptionInfo.tier === 'standard' ? '📱📱📱' : subscriptionInfo.tier === 'starter' ? '📱' : '📱'
                                    return `${icon} ${tierInfo.name} - ${tierInfo.deviceDisplayLabel}`
                                  })()
                                : 'N/A'}
                            </p>
                          </div>
                          {subscriptionInfo.status && (
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Status</p>
                              <p className={`font-semibold capitalize ${
                                subscriptionInfo.status === 'active' ? 'text-green-600' : 
                                subscriptionInfo.status === 'expired' ? 'text-red-600' : 
                                'text-gray-900'
                              }`}>
                                {subscriptionInfo.status}
                              </p>
                            </div>
                          )}
                          {subscriptionInfo.startDate && (
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Start Date</p>
                              <p className="text-gray-900 text-sm">
                                {new Date(subscriptionInfo.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          )}
                          {subscriptionInfo.endDate && (
                            <div>
                              <p className="text-gray-500 text-xs mb-1">End Date</p>
                              <p className="text-gray-900 text-sm font-semibold">
                                {new Date(subscriptionInfo.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          )}
                          {subscriptionInfo.endDate && subscriptionDaysRemaining !== null && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                              <p className="text-gray-500 text-xs mb-2 font-semibold">Days Remaining</p>
                              <p className={`font-bold text-xl ${
                                subscriptionDaysRemaining <= 7 ? 'text-red-600' :
                                subscriptionDaysRemaining <= 30 ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {subscriptionDaysRemaining > 0 ? (
                                  <span>{subscriptionDaysRemaining} day{subscriptionDaysRemaining !== 1 ? 's' : ''} remaining</span>
                                ) : subscriptionDaysRemaining === 0 ? (
                                  <span className="text-red-600">⚠️ Expires Today</span>
                                ) : (
                                  <span className="text-red-600">❌ Expired {Math.abs(subscriptionDaysRemaining)} day{Math.abs(subscriptionDaysRemaining) !== 1 ? 's' : ''} ago</span>
                                )}
                              </p>
                              {subscriptionDaysRemaining > 0 && subscriptionDaysRemaining <= 30 && (
                                <p className="text-orange-600 text-xs mt-1 font-medium">
                                  ⚠️ Renew soon to avoid service interruption
                                </p>
                              )}
                            </div>
                          )}
                          {(subscriptionInfo.tier === 'premium' || subscriptionInfo.tier === 'premium_plus' || subscriptionInfo.tier === 'premium_plus_plus') && !subscriptionInfo.endDate && (
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Access</p>
                              <p className="text-gray-900 font-semibold text-green-600">
                                {subscriptionInfo.tier === 'premium_plus' ? 'Unlimited + Services (Bike, Car, E-bike, E-car)' : subscriptionInfo.tier === 'premium_plus_plus' ? 'Unlimited + All Services' : 'Unlimited'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* New version available – show below plan so existing users can update */}
              {pwaUpdateAvailable && (
                <div className="mt-2 w-full max-w-xs rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                  <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                    <Download className="w-4 h-4 shrink-0" />
                    New update available
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Install the latest version to get new features and fixes.
                  </p>
                  <button
                    type="button"
                    onClick={() => applyPwaUpdate()}
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    Install now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Maintenance / alert banner – just above search & shortcuts */}
      {maintenanceBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
          <MaintenanceBanner maintenance={maintenanceBanner} />
        </div>
      )}

      {/* Global search + keyboard shortcuts – Quick Win #1 & #2 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 space-y-1">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('global-search-open'))}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors rounded-lg px-2 py-1 hover:bg-indigo-50"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span>Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl+K</kbd> (or <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">⌘K</kbd> on Mac) to search products, customers, sales, purchases</span>
        </button>
        <p className="text-xs text-gray-500 pl-6">
          Shortcuts: <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">⌘⇧Q</kbd> Quick Sale · <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">⌘⇧S</kbd> New Sale · <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">⌘⇧P</kbd> New Purchase · <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">⌘S</kbd> / <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">Ctrl+S</kbd> Save · <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">⌘P</kbd> / <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">Ctrl+P</kbd> Print (on invoice)
        </p>
      </div>

      {/* Subscription Expiry Alert */}
      {isSubscriptionExpiringSoon && subscriptionInfo?.endDate && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-4 border border-orange-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-white flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">Subscription Expiring Soon!</h3>
                <p className="text-white/90 text-sm mt-1">
                  Your subscription will expire in <span className="font-bold">{subscriptionDaysRemaining} day{subscriptionDaysRemaining !== 1 ? 's' : ''}</span> on {new Date(subscriptionInfo.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  Please renew your subscription to continue using all features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Sales & Purchase Options Section (Combined) */}
          <section className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/50">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                Sales & Purchase Options
              </h2>
              <p className="text-gray-600 text-lg">Quick access to sales and purchase operations</p>
            </div>

            {/* Sales target – show always; lock when plan doesn't include */}
            {hasPermission('sales:read') && (
              hasPlanFeature('dashboard_sales_target') ? (
              <div className="mb-8 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Sales target
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSetGoalForm({
                        daily: generalSettings.sales_target_daily ?? '',
                        monthly: generalSettings.sales_target_monthly ?? '',
                      })
                      setShowSetGoalModal(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Set goal
                  </button>
                </div>
                {generalSettings.sales_target_daily != null && generalSettings.sales_target_daily > 0 || generalSettings.sales_target_monthly != null && generalSettings.sales_target_monthly > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {generalSettings.sales_target_daily != null && generalSettings.sales_target_daily > 0 && (
                      <div className="flex-1 min-w-[140px]">
                        <p className="text-xs text-gray-600 mb-0.5">Daily</p>
                        <p className="text-base font-bold text-gray-900">
                          ₹{dashboardStats.todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ₹{generalSettings.sales_target_daily.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                        <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                            style={{ width: `${Math.min(100, (dashboardStats.todaySales / generalSettings.sales_target_daily) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {generalSettings.sales_target_monthly != null && generalSettings.sales_target_monthly > 0 && (
                      <div className="flex-1 min-w-[140px]">
                        <p className="text-xs text-gray-600 mb-0.5">Monthly</p>
                        <p className="text-base font-bold text-gray-900">
                          ₹{dashboardStats.thisMonthSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })} of ₹{generalSettings.sales_target_monthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                        <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                            style={{ width: `${Math.min(100, (dashboardStats.thisMonthSales / generalSettings.sales_target_monthly) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    No targets set. Use “Set goal” to add daily or monthly targets.
                  </p>
                )}
              </div>
              ) : (
                <button
                  type="button"
                  onClick={() => showPlanUpgrade('dashboard_sales_target')}
                  className="mb-8 w-full p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:border-emerald-300 hover:shadow-md transition-all text-left flex items-center justify-between gap-2"
                >
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Sales target
                  </h3>
                  <LockIcon className="w-5 h-5 text-emerald-600" />
                </button>
              )
            )}

            {/* Sales Options */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                Sales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {allSalesOptions.map((option, index) => {
                  const canAccess = hasPermission(option.permission) && hasPlanFeature(option.planFeature) && (!(option as any).adminOnly || user?.role === 'admin')
                  const handleClick = canAccess
                    ? () => {
                        if ((option as any).openInNewTab) {
                          window.open(option.link, '_blank')
                        } else {
                          navigate(option.link)
                        }
                      }
                    : () => showPlanUpgrade(option.planFeature)
                  return (
                    <button
                      key={index}
                      onClick={handleClick}
                      className={`group relative bg-gradient-to-br ${option.gradient} text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 text-left overflow-hidden`}
                    >
                      {!canAccess && (
                        <div className="absolute top-3 right-3 z-20 rounded-full bg-white/90 p-1.5 shadow-md" title="Upgrade to unlock">
                          <LockIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                      <div className={`absolute inset-0 bg-gradient-to-br ${option.hoverGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                      <div className="relative z-10">
                        <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          {option.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-2">{option.title}</h3>
                        <p className="text-white/90 text-sm leading-relaxed">{option.description}</p>
                      </div>
                      <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <div className="w-20 h-20 bg-white rounded-full blur-2xl"></div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Purchase Options - show all (plan-gated with lock when locked) */}
            {purchaseOptionsToShow.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full"></div>
                  Purchase
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {purchaseOptionsToShow.map((option, index) => {
                    const hasPerm = (option as any).permissionAlt
                      ? (hasPermission(option.permission) || hasPermission((option as any).permissionAlt))
                      : hasPermission(option.permission)
                    const planFeature = (option as any).planFeature
                    const canAccess = hasPerm && (planFeature ? hasPlanFeature(planFeature) : true)
                    const handleClick = canAccess
                      ? () => navigate(option.link)
                      : () => planFeature && showPlanUpgrade(planFeature)
                    return (
                      <button
                        key={index}
                        onClick={handleClick}
                        className={`group relative bg-gradient-to-br ${option.gradient} text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25 text-left overflow-hidden`}
                      >
                        {!canAccess && planFeature && (
                          <div className="absolute top-3 right-3 z-20 rounded-full bg-white/90 p-1.5 shadow-md" title="Upgrade to unlock">
                            <LockIcon className="w-4 h-4 text-cyan-600" />
                          </div>
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-br ${option.hoverGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        <div className="relative z-10">
                          <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            {option.icon}
                          </div>
                          <h3 className="text-xl font-bold mb-2">{option.title}</h3>
                          <p className="text-white/90 text-sm leading-relaxed">{option.description}</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                          <div className="w-20 h-20 bg-white rounded-full blur-2xl"></div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Expense Options - Daily Expenses & Reports */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-pink-600 rounded-full"></div>
                Daily Expenses & Reports
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {allExpenseOptions.map((option, index) => {
                  const canAccess = hasPermission(option.permission) && hasPlanFeature(option.planFeature)
                  const handleClick = canAccess ? () => navigate(option.link) : () => showPlanUpgrade(option.planFeature)
                  return (
                    <button
                      key={index}
                      onClick={handleClick}
                      className={`group relative bg-gradient-to-br ${option.gradient} text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25 text-left overflow-hidden`}
                    >
                      {!canAccess && (
                        <div className="absolute top-3 right-3 z-20 rounded-full bg-white/90 p-1.5 shadow-md" title="Upgrade to unlock">
                          <LockIcon className="w-4 h-4 text-pink-600" />
                        </div>
                      )}
                      <div className={`absolute inset-0 bg-gradient-to-br ${option.hoverGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                      <div className="relative z-10">
                        <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          {option.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-2">{option.title}</h3>
                        <p className="text-white/90 text-sm leading-relaxed">{option.description}</p>
                      </div>
                      <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <div className="w-20 h-20 bg-white rounded-full blur-2xl"></div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Services – shown to all with services:read; Basic/Standard see all 4 cards locked, click = upgrade prompt */}
            {hasPermission('services:read') && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
                  Services
                </h3>
                {/* Book appointment – horizontal bar above service cards */}
                <div className="relative mb-5">
                  <button
                    type="button"
                    onClick={() => setBookAppointmentOpen((prev) => !prev)}
                    className="group w-full flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl px-6 py-4 transform transition-all duration-300 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
                        <CalendarClock className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Book appointment</h3>
                        <p className="text-white/90 text-sm">Schedule service – select vehicle type (Bike, Car, E-bike, E-car)</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-white/90 transition-transform ${bookAppointmentOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {bookAppointmentOpen && (
                    <>
                      <div className="fixed inset-0 z-20" aria-hidden onClick={() => setBookAppointmentOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white rounded-xl shadow-xl border border-gray-200 py-2 overflow-hidden">
                        <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">Select vehicle type</p>
                        {[
                          { id: 'bike' as const, label: 'Bike', icon: <Bike className="w-4 h-4" />, planFeature: 'services_bike_car_ebike' as const },
                          { id: 'car' as const, label: 'Car', icon: <Car className="w-4 h-4" />, planFeature: 'services_bike_car_ebike' as const },
                          { id: 'ebike' as const, label: 'E-bike', icon: <Zap className="w-4 h-4" />, planFeature: 'services_ebike_ecar' as const },
                          { id: 'ecar' as const, label: 'E-car', icon: <BatteryCharging className="w-4 h-4" />, planFeature: 'services_ebike_ecar' as const },
                        ].map((opt) => {
                          const canAccess = hasPlanFeature(opt.planFeature)
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (canAccess) {
                                  navigate(`/services/${opt.id}/new?book=1`)
                                  setBookAppointmentOpen(false)
                                } else {
                                  showPlanUpgrade(opt.planFeature)
                                  setBookAppointmentOpen(false)
                                }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${canAccess ? 'text-gray-800 hover:bg-emerald-50 hover:text-emerald-700' : 'text-gray-400 cursor-not-allowed'}`}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                              {!canAccess && <LockIcon className="w-3.5 h-3.5 ml-auto text-amber-500" />}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { id: 'bike' as const, label: 'Bike Services', desc: 'Manage bike service records', icon: <Bike className="w-10 h-10" />, gradient: 'from-blue-500 to-indigo-600', hover: 'from-indigo-600 to-blue-700', path: '/services/bike', planFeature: 'services_bike_car_ebike' as const },
                    { id: 'car' as const, label: 'Car Services', desc: 'Manage car service records', icon: <Car className="w-10 h-10" />, gradient: 'from-slate-600 to-slate-700', hover: 'from-slate-700 to-slate-800', path: '/services/car', planFeature: 'services_bike_car_ebike' as const },
                    { id: 'ebike' as const, label: 'E-bike Services', desc: 'Manage e-bike service records', icon: <Zap className="w-10 h-10" />, gradient: 'from-emerald-500 to-teal-600', hover: 'from-teal-600 to-emerald-700', path: '/services/ebike', planFeature: 'services_ebike_ecar' as const },
                    { id: 'ecar' as const, label: 'E-car Services', desc: 'Manage e-car service records', icon: <BatteryCharging className="w-10 h-10" />, gradient: 'from-violet-500 to-purple-600', hover: 'from-purple-600 to-violet-700', path: '/services/ecar', planFeature: 'services_ebike_ecar' as const },
                  ].map((card) => {
                    const canAccess = hasPlanFeature(card.planFeature)
                    const handleClick = canAccess ? () => navigate(card.path) : () => showPlanUpgrade(card.planFeature)
                    const lockTitle = 'Upgrade to Premium or above to access all Services (Bike, Car, E-bike, E-car)'
                    return (
                      <button
                        key={card.id}
                        onClick={handleClick}
                        className={`group relative bg-gradient-to-br ${card.gradient} text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl text-left overflow-hidden`}
                      >
                        {!canAccess && (
                          <div className="absolute top-3 right-3 z-20 rounded-full bg-white/90 p-1.5 shadow-md" title={lockTitle}>
                            <LockIcon className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.hover} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        <div className="relative z-10">
                          <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            {card.icon}
                          </div>
                          <h3 className="text-xl font-bold mb-2">{card.label}</h3>
                          <p className="text-white/90 text-sm leading-relaxed">{card.desc}</p>
                        </div>
                        <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                          <div className="w-20 h-20 bg-white rounded-full blur-2xl"></div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {/* Upcoming services widget – visible to all with services; Premium Plus gets counts + link */}
                {hasPermission('services:read') && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => hasPlanFeature('services_upcoming_widget') ? navigate('/services/bike', { state: { upcomingOnly: true } }) : showPlanUpgrade('services_upcoming_widget')}
                      className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors text-left relative"
                    >
                      {!hasPlanFeature('services_upcoming_widget') && (
                        <div className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-1.5 shadow-md" title="Upgrade to Premium Plus">
                          <LockIcon className="w-4 h-4 text-amber-600" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100">
                          <Calendar className="w-6 h-6 text-amber-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Upcoming services</p>
                          <p className="text-sm text-gray-600">
                            {hasPlanFeature('services_upcoming_widget') ? 'Next 7 days & 30 days – tap to view list' : 'Premium Plus'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {hasPlanFeature('services_upcoming_widget') ? (
                          <>
                            <div className="text-right">
                              <p className="text-xs font-medium text-amber-600">7 days</p>
                              <p className="text-xl font-bold text-amber-700">{upcomingServicesCount}</p>
                            </div>
                            <div className="w-px h-10 bg-amber-200" />
                            <div className="text-right">
                              <p className="text-xs font-medium text-amber-600">30 days</p>
                              <p className="text-xl font-bold text-amber-700">{upcomingServicesCount30}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-amber-600" />
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-amber-600">Upgrade to unlock</span>
                            <ChevronRight className="w-5 h-5 text-amber-600" />
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Stock Management Options */}
            {hasPermission('products:read') && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-600 rounded-full"></div>
                  Stock Management
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <button
                    onClick={() => navigate('/stock/alerts')}
                    className="group relative bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/25 text-left overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                        <AlertTriangle className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Stock Alerts</h3>
                      <p className="text-white/90 text-sm leading-relaxed">View low stock and out of stock products</p>
                    </div>
                    <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                      <div className="w-20 h-20 bg-white rounded-full blur-2xl"></div>
                    </div>
                  </button>
                  <button
                    onClick={() => hasPlanFeature('purchase_reorder') ? navigate('/stock/reorder') : showPlanUpgrade('purchase_reorder')}
                    className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/25 text-left overflow-hidden"
                  >
                    {!hasPlanFeature('purchase_reorder') && (
                      <div className="absolute top-3 right-3 z-20 rounded-full bg-white/90 p-1.5 shadow-md" title="Upgrade to unlock">
                        <LockIcon className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                      <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 flex items-center gap-2">
                        <ListOrdered className="w-10 h-10" />
                        {dashboardStats.reorderListCount > 0 && hasPlanFeature('purchase_reorder') && (
                          <span className="bg-white/90 text-emerald-700 text-sm font-bold rounded-full min-w-[1.5rem] h-6 px-2 flex items-center justify-center">
                            {dashboardStats.reorderListCount}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">Reorder List</h3>
                      <p className="text-white/90 text-sm leading-relaxed">Products below min stock with last purchase qty/rate</p>
                    </div>
                    <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                      <div className="w-20 h-20 bg-white rounded-full blur-2xl"></div>
                    </div>
                  </button>
                  {hasPermission('purchases:create') && (
                    <button
                      onClick={() => hasPlanFeature('purchase_reorder') ? navigate('/purchases/reorder') : showPlanUpgrade('purchase_reorder')}
                      className="group relative bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-violet-500/25 text-left overflow-hidden"
                    >
                      {!hasPlanFeature('purchase_reorder') && (
                        <div className="absolute top-3 right-3 z-20 rounded-full bg-white/90 p-1.5 shadow-md" title="Upgrade to unlock">
                          <LockIcon className="w-4 h-4 text-violet-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <ClipboardList className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Reorder Form</h3>
                        <p className="text-white/90 text-sm leading-relaxed">Select supplier, see previous purchase, then create GST purchase</p>
                      </div>
                      <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <div className="w-20 h-20 bg-white rounded-full blur-2xl"></div>
                      </div>
                    </button>
                  )}
                  {hasPermission('products:update') && (
                    <button
                      onClick={() => navigate('/stock/adjust')}
                      className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 text-left overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <Package className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Adjust Stock</h3>
                        <p className="text-white/90 text-sm leading-relaxed">Manually adjust product stock levels</p>
                      </div>
                      <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-30 transition-opacity">
                        <div className="w-20 h-20 bg-white rounded-full blur-2xl"></div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* No permissions message */}
            {salesOptions.length === 0 && purchaseOptionsToShow.length === 0 && expenseOptions.length === 0 && !hasPermission('products:read') && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium">You don't have permission to access sales, purchase, or expense operations.</p>
              </div>
            )}
          </section>

          {/* Reports Summary Section */}
          <section className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/50">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
                    Reports Summary
                  </h2>
                  <p className="text-gray-600 text-lg">Overview of your business metrics</p>
                </div>
              </div>

              {/* Time Period Filter */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">Time Period:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTimePeriod('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timePeriod === 'all'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setTimePeriod('today')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timePeriod === 'today'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setTimePeriod('thisWeek')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timePeriod === 'thisWeek'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => setTimePeriod('thisMonth')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timePeriod === 'thisMonth'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => setTimePeriod('thisYear')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timePeriod === 'thisYear'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      This Year
                    </button>
                    <button
                      onClick={() => setTimePeriod('custom')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timePeriod === 'custom'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>
                </div>

                {/* Custom Date Range Inputs */}
                {timePeriod === 'custom' && (
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">From:</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">To:</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        max={toLocalDateString(new Date())}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cash Flow Overview – show always; lock when plan doesn't include */}
            {hasPermission('sales:read') && (
              hasPlanFeature('dashboard_cash_flow') ? (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  Cash flow overview
                </h3>
                {summaryLoading ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-14 mb-2"></div>
                          <div className="h-7 bg-gray-100 rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="h-7 bg-gray-100 rounded w-24"></div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                        <div className="h-7 bg-gray-100 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ) : cashFlow && cashFlow.byPayment ? (
                  <div className="space-y-4">
                    {/* Top row: Sales by payment method + Total Sale */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
                      <div className="p-3 min-w-[7rem] bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                        <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-0.5">Cash</p>
                        <p className="text-sm font-bold text-emerald-900 break-all">₹{(cashFlow.byPayment.cash ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="p-3 min-w-[7rem] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-0.5">UPI</p>
                        <p className="text-sm font-bold text-blue-900">₹{(cashFlow.byPayment.upi ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="p-3 min-w-[7rem] bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                        <p className="text-xs font-medium text-violet-700 uppercase tracking-wide mb-0.5">Card</p>
                        <p className="text-sm font-bold text-violet-900 break-all">₹{(cashFlow.byPayment.card ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="p-3 min-w-[7rem] bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border border-slate-200">
                        <p className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-0.5">Other</p>
                        <p className="text-sm font-bold text-slate-900">₹{(cashFlow.byPayment.other ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="p-3 min-w-[7rem] bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                        <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-0.5">Credit</p>
                        <p className="text-sm font-bold text-amber-900 break-all">₹{(cashFlow.byPayment.credit ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="p-3 min-w-[7rem] bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
                        <p className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-0.5">Total Sale</p>
                        <p className="text-sm font-bold text-teal-900">₹{(cashFlow.totalSales ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    {/* Bottom row: Expenses & Net Cash */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gradient-to-br from-rose-50 to-red-50 rounded-xl border border-rose-200">
                        <p className="text-xs font-medium text-rose-700 uppercase tracking-wide mb-0.5">Total Expenses</p>
                        <p className="text-sm font-bold text-rose-900 break-all">₹{(cashFlow.totalExpenses ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className={`p-3 rounded-xl border ${
                        (cashFlow.netCash ?? 0) >= 0
                          ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200'
                          : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                      }`}>
                        <p className="text-xs font-medium uppercase tracking-wide mb-0.5 text-gray-700">Net Cash</p>
                        <p className={`text-sm font-bold ${(cashFlow.netCash ?? 0) >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}>
                          ₹{Math.abs(cashFlow.netCash ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          {(cashFlow.netCash ?? 0) < 0 && <span className="text-xs font-medium ml-1">(outflow)</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => showPlanUpgrade('dashboard_cash_flow')}
                className="mb-8 w-full p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex items-center justify-between gap-2"
              >
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  Cash flow overview
                </h3>
                <LockIcon className="w-5 h-5 text-indigo-600" />
              </button>
            )
            )}

            {/* Top 5 products & Top 5 customers */}
            {hasPermission('sales:read') && (
              summaryLoading ? (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-4 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-4 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasPlanFeature('dashboard_top_5_products') && topProducts.length > 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Top 5 products (period)
                    </h3>
                    <ul className="space-y-2">
                      {topProducts.map((p, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700 truncate pr-2">{p.name}</span>
                          <span className="font-semibold text-gray-900 shrink-0">₹{p.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => showPlanUpgrade('dashboard_top_5_products')}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all text-left flex items-center justify-between gap-2"
                  >
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Top 5 products (period)
                    </h3>
                    <LockIcon className="w-5 h-5 text-gray-500" />
                  </button>
                )}
                {hasPlanFeature('dashboard_top_5_customers') && topCustomers.length > 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Top 5 customers (period)
                    </h3>
                    <ul className="space-y-2">
                      {topCustomers.map((c, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700 truncate pr-2">{c.name}</span>
                          <span className="font-semibold text-gray-900 shrink-0">₹{c.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => showPlanUpgrade('dashboard_top_5_customers')}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all text-left flex items-center justify-between gap-2"
                  >
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Top 5 customers (period)
                    </h3>
                    <LockIcon className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
            )
            )}

            {/* Outstanding summary – show always; lock when plan doesn't include */}
            {hasPermission('sales:read') && (
              hasPlanFeature('dashboard_outstanding_summary') ? (
              summaryLoading ? (
              <div className="w-full mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 animate-pulse">
                <div className="h-4 bg-amber-200 rounded w-1/3 mb-3"></div>
                <div className="flex gap-6">
                  <div className="flex-1"><div className="h-6 bg-amber-100 rounded w-24"></div><div className="h-8 bg-amber-100 rounded w-20 mt-1"></div></div>
                  <div className="flex-1"><div className="h-6 bg-amber-100 rounded w-24"></div><div className="h-8 bg-amber-100 rounded w-20 mt-1"></div></div>
                </div>
              </div>
            ) : outstandingStats !== null && (
              <button
                type="button"
                onClick={() => navigate('/payments/outstanding')}
                className="w-full mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all text-left"
              >
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Outstanding summary
                </h3>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-gray-600">Receivables (from customers)</p>
                    <p className="text-xl font-bold text-green-700">₹{outstandingStats.customerOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-500">{outstandingStats.customerCount} invoice(s)</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Payables (to suppliers)</p>
                    <p className="text-xl font-bold text-red-700">₹{outstandingStats.supplierOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-500">{outstandingStats.supplierCount} invoice(s)</p>
                  </div>
                </div>
                <p className="text-sm text-amber-700 font-medium mt-2 flex items-center gap-1">
                  View lists <ArrowUpRight className="w-4 h-4" />
                </p>
              </button>
            )) : (
              <button
                type="button"
                onClick={() => showPlanUpgrade('dashboard_outstanding_summary')}
                className="w-full mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all text-left flex items-center justify-between gap-2"
              >
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Outstanding summary
                </h3>
                <LockIcon className="w-5 h-5 text-amber-600" />
              </button>
            )
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {summaryLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-6 border border-gray-200 animate-pulse bg-gradient-to-br from-white to-gray-50">
                    <div className="h-10 w-10 bg-gray-200 rounded-xl mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))
              ) : (
                reports.map((report, index) => {
                  const planFeature = reportTitleToPlanFeature[report.title] as keyof typeof reportTitleToPlanFeature | undefined
                  const canAccess = reportCardAccess[report.title]
                  const isLocked = !canAccess && planFeature
                  const handleClick = canAccess && report.onClick
                    ? report.onClick
                    : isLocked
                      ? () => showPlanUpgrade(planFeature as any)
                      : undefined
                  return (
                <div
                  key={index}
                  onClick={handleClick}
                  className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200/50 hover:border-gray-300 hover:shadow-xl transition-all duration-300 overflow-hidden ${
                    (canAccess && report.onClick) || isLocked ? 'cursor-pointer hover:scale-105' : ''
                  }`}
                >
                  {isLocked && (
                    <div className="absolute top-3 right-3 z-20 rounded-full bg-white/90 p-1.5 shadow-md" title="Upgrade to unlock">
                      <LockIcon className="w-4 h-4 text-amber-600" />
                    </div>
                  )}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300" style={{background: `linear-gradient(135deg, var(--tw-gradient-stops))`}}></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${report.bgGradient} text-white shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                        {report.icon}
                      </div>
                      <span
                        className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${
                          report.trend === 'up'
                            ? 'bg-green-100 text-green-700'
                            : report.trend === 'down'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {getTrendIcon(report.trend)}
                        {report.change}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                      {report.title}
                    </h3>
                    <p className="text-3xl font-extrabold text-gray-900">
                      {report.value}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                  )
                })
              )}
            </div>

            {hasPermission('reports:read') && (
              <div className="mt-8 pt-8 border-t border-gray-200/50 space-y-4">
                <button
                  onClick={() => hasPlanFeature('report_daily_activity') ? navigate('/reports/daily-activity') : showPlanUpgrade('report_daily_activity')}
                  className="group relative w-full bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_daily_activity') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <Clock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Daily Activity Report</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button
                  onClick={() => hasPlanFeature('report_sales') ? navigate('/reports/sales') : showPlanUpgrade('report_sales')}
                  className="group relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_sales') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <TrendingUp className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>View Sales Reports</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button
                  onClick={() => hasPlanFeature('report_purchases') ? navigate('/reports/purchases') : showPlanUpgrade('report_purchases')}
                  className="group relative w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_purchases') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <ShoppingBag className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>View Purchase Reports</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                {hasPermission('sales:read') && (
                  <button
                    onClick={() => hasPlanFeature('sales_rent') ? navigate('/rentals/report') : showPlanUpgrade('sales_rent')}
                    className="group relative w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-violet-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    {!hasPlanFeature('sales_rent') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                    <Calendar className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span>Rent &amp; Bookings Report</span>
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                )}
                <button
                  onClick={() => hasPlanFeature('report_profit_analysis') ? navigate('/reports/profit-analysis') : showPlanUpgrade('report_profit_analysis')}
                  className="group relative w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_profit_analysis') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <BarChart3 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Profit Analysis</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button
                  onClick={() => hasPlanFeature('report_expenses') ? navigate('/reports/expenses') : showPlanUpgrade('report_expenses')}
                  className="group relative w-full bg-gradient-to-r from-rose-600 via-pink-600 to-orange-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-rose-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_expenses') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <DollarSign className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Expense Reports</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button
                  onClick={() => hasPlanFeature('report_comparative') ? navigate('/reports/comparative') : showPlanUpgrade('report_comparative')}
                  className="group relative w-full bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_comparative') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <BarChart3 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Comparative Reports (Month vs Month, Year vs Year)</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                {hasPermission('sales:read') && (
                  <button
                    onClick={() => hasPlanFeature('report_customer_insights') ? navigate('/customers/insights') : showPlanUpgrade('report_customer_insights')}
                    className="group relative w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    {!hasPlanFeature('report_customer_insights') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                    <Users className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span>Customer Insights</span>
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                )}
                <button
                  onClick={() => hasPlanFeature('report_commission') ? navigate('/reports/commissions') : showPlanUpgrade('report_commission')}
                  className="group relative w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_commission') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <TrendingUp className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>View Commission Reports</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button
                  onClick={() => hasPlanFeature('report_ca') ? navigate('/reports/ca') : showPlanUpgrade('report_ca')}
                  className="group relative w-full bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-slate-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_ca') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <FileText className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>CA Reports (GSTR-1, GSTR-2, GSTR-3B)</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
            {hasPermission('sales:read') && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                <button
                  onClick={() => hasPlanFeature('report_outstanding') ? navigate('/payments/outstanding') : showPlanUpgrade('report_outstanding')}
                  className="group relative w-full bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!hasPlanFeature('report_outstanding') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <DollarSign className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Outstanding Payments</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
            {hasPermission('settings:update') && user?.role === 'admin' && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                <button 
                  onClick={() => navigate('/settings')}
                  className="group w-full bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-gray-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  <span>System Settings</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
            <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
              <button 
                onClick={() => (hasPermission('products:update') && hasPlanFeature('settings_backup_restore')) ? navigate('/backup-restore') : showPlanUpgrade('settings_backup_restore')}
                className="group relative w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-teal-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                {!(hasPermission('products:update') && hasPlanFeature('settings_backup_restore')) && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                <Database className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Backup & Restore</span>
                <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                {hasPermission('reports:read') && (
                  <>
                    <button 
                      onClick={() => hasPlanFeature('dashboard_analytics') ? navigate('/analytics') : showPlanUpgrade('dashboard_analytics')}
                      className="group relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      {!hasPlanFeature('dashboard_analytics') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                      <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Analytics Dashboard</span>
                      <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => hasPlanFeature('audit_logs') ? navigate('/audit-logs') : showPlanUpgrade('audit_logs')}
                      className="group relative w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      {!hasPlanFeature('audit_logs') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                      <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Audit Logs</span>
                      <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => ((hasPermission('barcode_label_settings:read') || hasPermission('barcode_label_settings:update')) && hasPlanFeature('settings_barcode_label')) ? navigate('/settings/barcode-label') : showPlanUpgrade('settings_barcode_label')}
                  className="group relative w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!((hasPermission('barcode_label_settings:read') || hasPermission('barcode_label_settings:update')) && hasPlanFeature('settings_barcode_label')) && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <Barcode className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Barcode Label Settings</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button 
                  onClick={() => ((hasPermission('receipt_printer_settings:read') || hasPermission('receipt_printer_settings:update')) && hasPlanFeature('settings_receipt_printer')) ? navigate('/settings/receipt-printer') : showPlanUpgrade('settings_receipt_printer')}
                  className="group relative w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!((hasPermission('receipt_printer_settings:read') || hasPermission('receipt_printer_settings:update')) && hasPlanFeature('settings_receipt_printer')) && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <Receipt className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Receipt Printer Settings</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                {hasPermission('products:read') && (
                  <button 
                    onClick={() => hasPlanFeature('settings_price_lists') ? navigate('/settings/price-lists') : showPlanUpgrade('settings_price_lists')}
                    className="group relative w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    {!hasPlanFeature('settings_price_lists') && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                    <Tag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Price Lists</span>
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                )}
                <button 
                  onClick={() => (hasPermission('settings:update') && hasPlanFeature('settings_automated_exports')) ? navigate('/settings/automated-exports') : showPlanUpgrade('settings_automated_exports')}
                  className="group relative w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-violet-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {!(hasPermission('settings:update') && hasPlanFeature('settings_automated_exports')) && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Automated Exports</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button
                  onClick={() => (hasPermission('business_overview:read') && hasPlanFeature('report_business_overview')) ? navigate('/business-overview') : showPlanUpgrade('report_business_overview')}
                  className="group relative w-full overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-bold py-5 px-6 rounded-2xl hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3 border-2 border-amber-400/30"
                >
                  {!(hasPermission('business_overview:read') && hasPlanFeature('report_business_overview')) && <LockIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-90" />}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
                  <BarChart3 className="w-6 h-6 relative z-10 group-hover:rotate-6 transition-transform" />
                  <span className="relative z-10">Business Overview</span>
                  <ArrowUpRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  <p className="absolute bottom-2 left-6 right-6 text-center text-xs font-medium text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                    Employees, salary, expenses, sales, cost & P&L at a glance
                  </p>
                </button>
              </div>
          </section>

        </div>

        {/* Free tools for users – mention what we provide */}
        <div className="mt-8 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200/60 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Free tools for you</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            We offer free tools for our users—formatters, calculators, speed tests, and more. Click any card below to open a tool in a new tab.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 transition-opacity duration-500">
          {Array.from({ length: FOOTER_APPS_VISIBLE }, (_, i) => {
            const app = FOOTER_APPS[(footerRotationIndex + i) % FOOTER_APPS.length]
            return { app, i }
          }).map(({ app, i }) => (
            <a
              key={i}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-r ${app.color} text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-center min-h-[100px] justify-center`}
            >
              {app.icon === 'calculator' && <Calculator className="w-8 h-8 flex-shrink-0 opacity-95" />}
              {app.icon === 'trending' && <TrendingUp className="w-8 h-8 flex-shrink-0 opacity-95" />}
              {app.icon === 'dollar' && <DollarSign className="w-8 h-8 flex-shrink-0 opacity-95" />}
              {app.icon === 'wifi' && <Wifi className="w-8 h-8 flex-shrink-0 opacity-95" />}
              {app.icon === 'heart' && <Heart className="w-8 h-8 flex-shrink-0 opacity-95" />}
              {app.icon === 'wrench' && <Wrench className="w-8 h-8 flex-shrink-0 opacity-95" />}
              {app.icon === 'filetext' && <FileText className="w-8 h-8 flex-shrink-0 opacity-95" />}
              <span className="text-sm leading-tight">{app.name}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
            </a>
          ))}
          </div>
        </div>

        {/* Contact Us */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-4 px-4 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-blue-600" />
            Contact us
          </span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 transition-colors">
            <Mail className="w-4 h-4" />
            {CONTACT_EMAIL}
          </a>
          <a href={CONTACT_WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 transition-colors">
            <Globe className="w-4 h-4" />
            {CONTACT_WEBSITE_DISPLAY}
          </a>
          <a href={CONTACT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 transition-colors">
            <Phone className="w-4 h-4" />
            WhatsApp: {CONTACT_WHATSAPP_NUMBER}
          </a>
        </div>

        {/* Additional Info Bar - Welcome Section (footer) */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex-1">
              <p className="text-sm opacity-90 font-medium">Welcome back{user?.name ? `, ${user.name}` : ''}!</p>
              <p className="text-xl font-bold mt-1">Manage your inventory efficiently</p>
              <p className="text-sm opacity-75 mt-1">{currentTime.toLocaleString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 hover:bg-white/30 transition-colors cursor-default">
                <p className="text-xs opacity-90 font-medium">Active Products</p>
                <p className="text-2xl font-bold mt-1">{dashboardStats.activeProducts}</p>
                <p className="text-xs opacity-75 mt-1">In stock</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 hover:bg-white/30 transition-colors cursor-default">
                <p className="text-xs opacity-90 font-medium">This Month Sales</p>
                <p className="text-2xl font-bold mt-1">
                  ₹{dashboardStats.thisMonthSales >= 100000 
                    ? `${(dashboardStats.thisMonthSales / 100000).toFixed(1)}L`
                    : dashboardStats.thisMonthSales >= 1000
                    ? `${(dashboardStats.thisMonthSales / 1000).toFixed(1)}K`
                    : dashboardStats.thisMonthSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs opacity-75 mt-1">Revenue</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 hover:bg-white/30 transition-colors cursor-default">
                <p className="text-xs opacity-90 font-medium">Today's Sales</p>
                <p className="text-2xl font-bold mt-1">
                  ₹{dashboardStats.todaySales >= 1000
                    ? `${(dashboardStats.todaySales / 1000).toFixed(1)}K`
                    : dashboardStats.todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs opacity-75 mt-1">Today</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 hover:bg-white/30 transition-colors cursor-pointer" onClick={() => hasPermission('sales:read') && navigate('/customers')}>
                <p className="text-xs opacity-90 font-medium">Customers</p>
                <p className="text-2xl font-bold mt-1">{dashboardStats.totalCustomers}</p>
                <p className="text-xs opacity-75 mt-1">Total</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 hover:bg-white/30 transition-colors cursor-pointer" onClick={() => hasPermission('purchases:read') && navigate('/suppliers')}>
                <p className="text-xs opacity-90 font-medium">Suppliers</p>
                <p className="text-2xl font-bold mt-1">{dashboardStats.totalSuppliers}</p>
                <p className="text-xs opacity-75 mt-1">Total</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Set goal modal – manager can set daily/monthly targets without admin */}
      {showSetGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !setGoalSaving && setShowSetGoalModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Set sales target
              </h3>
              <button type="button" onClick={() => !setGoalSaving && setShowSetGoalModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Set optional daily or monthly targets. Leave blank to clear.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily sales target (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={setGoalForm.daily}
                  onChange={e => setSetGoalForm(f => ({ ...f, daily: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly sales target (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={setGoalForm.monthly}
                  onChange={e => setSetGoalForm(f => ({ ...f, monthly: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveSetGoal}
                disabled={setGoalSaving}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {setGoalSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => !setGoalSaving && setShowSetGoalModal(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Recharge Modal */}
      {subscriptionInfo && (
        <SubscriptionRechargeModal
          isOpen={showRechargeModal}
          onClose={() => setShowRechargeModal(false)}
          onSuccess={() => {
            setShowRechargeModal(false)
            // Reload subscription info by reloading company name
            loadCompanyName()
          }}
          currentTier={(subscriptionInfo.tier as SubscriptionTier) || 'starter'}
          currentEndDate={subscriptionInfo.endDate}
        />
      )}
    </div>
  )
}

export default Dashboard