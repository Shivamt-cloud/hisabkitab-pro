import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserMenu } from '../components/UserMenu'
import { saleService } from '../services/saleService'
import { purchaseService, supplierService } from '../services/purchaseService'
import { productService } from '../services/productService'
import { customerService } from '../services/customerService'
import { notificationService } from '../services/notificationService'
import { settingsService } from '../services/settingsService'
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
  Bell
} from 'lucide-react'

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

const Dashboard = () => {
  const { hasPermission, user } = useAuth()
  const navigate = useNavigate()
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
  })
  const [companyName, setCompanyName] = useState<string>('')

  useEffect(() => {
    calculateReports()
    loadCompanyName()
  }, [timePeriod, customStartDate, customEndDate])

  const loadCompanyName = async () => {
    try {
      const companySettings = await settingsService.getCompany()
      setCompanyName(companySettings.company_name || '')
    } catch (error) {
      console.error('Error loading company name:', error)
    }
  }

  // Update time every second for real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Load notifications and generate alerts
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        await notificationService.generateStockAlerts()
        await notificationService.generatePaymentAlerts()
        const count = await notificationService.getUnreadCount(user?.id)
        setUnreadNotifications(count)
      } catch (error) {
        console.error('Error loading notifications:', error)
      }
    }
    
    loadNotifications()
    // Refresh notifications every 5 minutes
    const interval = setInterval(loadNotifications, 300000)
    return () => clearInterval(interval)
  }, [user?.id])

  const getDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    switch (timePeriod) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        startDate = today.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'thisWeek':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = monthStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        startDate = yearStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
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
    // Get actual data
    const [allSales, allPurchases, allProducts, allCustomers, allSuppliers] = await Promise.all([
      saleService.getAll(true),
      purchaseService.getAll(),
      productService.getAll(false),
      customerService.getAll(),
      supplierService.getAll()
    ])

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

    // Calculate totals for filtered period
    const totalSales = filteredSales.reduce((sum, s) => sum + s.grand_total, 0)
    
    // Calculate profit based on actual sold items with date filter (item-wise profit calculation)
    // Note: calculateProfit is async, so we'll calculate profit from filtered sales directly
    const totalProfit = filteredSales.reduce((sum, sale) => {
      const saleProfit = sale.items.reduce((itemSum, item) => {
        if (item.sale_type === 'sale' && item.purchase_price) {
          return itemSum + ((item.unit_price - item.purchase_price) * item.quantity)
        }
        return itemSum
      }, 0)
      return sum + saleProfit
    }, 0)
    
    const totalProducts = allProducts.length
    const activeProducts = allProducts.filter(p => p.status === 'active').length
    const lowStockProducts = allProducts.filter(p => p.min_stock_level && p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0).length
    const outOfStockProducts = allProducts.filter(p => p.stock_quantity === 0).length

    // Calculate this month's sales
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthSales = allSales.filter(s => {
      const saleDate = new Date(s.sale_date)
      return saleDate >= thisMonthStart && saleDate <= now
    }).reduce((sum, s) => sum + s.grand_total, 0)

    // Calculate today's sales
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todaySales = allSales.filter(s => {
      const saleDate = new Date(s.sale_date)
      return saleDate >= today && saleDate <= now
    }).reduce((sum, s) => sum + s.grand_total, 0)

    // Calculate this week's sales
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const thisWeekSales = allSales.filter(s => {
      const saleDate = new Date(s.sale_date)
      return saleDate >= weekStart && saleDate <= now
    }).reduce((sum, s) => sum + s.grand_total, 0)

    // Calculate trends (current period vs previous period)
    let thisPeriod: number
    let lastPeriod: number

    if (timePeriod === 'thisMonth' || timePeriod === 'all') {
      // This month vs last month
      thisPeriod = filteredSales.reduce((sum, s) => sum + s.grand_total, 0)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      lastPeriod = allSales.filter(s => {
        const saleDate = new Date(s.sale_date)
        return saleDate >= lastMonthStart && saleDate <= lastMonthEnd
      }).reduce((sum, s) => sum + s.grand_total, 0)
    } else {
      // For other periods, compare with same period before
      thisPeriod = totalSales
      lastPeriod = 0 // Simplified for now
    }

    const salesTrend = lastPeriod > 0 ? ((thisPeriod - lastPeriod) / lastPeriod * 100) : 0

    // Update dashboard stats
    setDashboardStats({
      activeProducts,
      thisMonthSales,
      totalCustomers: allCustomers.length,
      totalSuppliers: allSuppliers.length,
      todaySales,
      thisWeekSales,
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
      value: '—',
      change: '—',
      trend: 'neutral',
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
    }
    ]
    setReports(reportsData)
  }

  const allSalesOptions = [
    {
      title: 'New Sale',
      description: 'Create a new sales invoice',
      icon: <ShoppingCart className="w-10 h-10" />,
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-600 to-blue-700',
      link: '/sales/new',
      permission: 'sales:create'
    },
    {
      title: 'New Sale Tab',
      description: 'Open sale form in new tab (for multiple customers)',
      icon: <ShoppingCart className="w-10 h-10" />,
      gradient: 'from-green-500 to-emerald-600',
      hoverGradient: 'from-green-600 to-emerald-700',
      link: '/sales/new',
      permission: 'sales:create',
      openInNewTab: true // Flag to open in new tab
    },
    {
      title: 'Sales History',
      description: 'View all sales (Admin Only)',
      icon: <History className="w-10 h-10" />,
      gradient: 'from-purple-500 to-pink-600',
      hoverGradient: 'from-purple-600 to-pink-700',
      link: '/sales/history',
      permission: 'sales:read',
      adminOnly: true // Only show to admin
    }
  ]

  // Filter sales options based on permissions and admin status
  const salesOptions = useMemo(() => {
    return allSalesOptions.filter(option => {
      // Check permission first
      if (!hasPermission(option.permission)) return false
      // If adminOnly, check if user is admin
      if ((option as any).adminOnly && user?.role !== 'admin') return false
      return true
    })
  }, [hasPermission, user])

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
      permission: 'users:read'
    },
    {
      title: 'GST Purchase',
      description: 'Create purchase with GST details',
      icon: <ShoppingBag className="w-10 h-10" />,
      gradient: 'from-indigo-500 to-purple-600',
      hoverGradient: 'from-indigo-600 to-purple-700',
      link: '/purchases/new-gst',
      permission: 'purchases:create'
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
      permission: 'purchases:read'
    }
  ]

  // Filter purchase options based on permissions
  const purchaseOptions = useMemo(() => {
    return allPurchaseOptions.filter(option => hasPermission(option.permission))
  }, [hasPermission])

  // Filter reports based on permissions
  const visibleReports = useMemo(() => {
    return reports.filter(report => {
      if (report.title === 'Total Sales' || report.title === 'Total Profit') {
        return hasPermission('sales:read')
      }
      if (report.title === 'Total Purchases') {
        return hasPermission('purchases:read')
      }
      if (report.title === 'Low Stock Alert' || report.title === 'Out of Stock' || report.title === 'Total Products') {
        return hasPermission('products:read')
      }
      return hasPermission('reports:read')
    })
  }, [reports, hasPermission])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {companyName ? `${companyName} - HisabKitab-Pro` : 'HisabKitab-Pro'}
              </h1>
              <p className="text-sm text-gray-600 mt-1 font-medium">Inventory Management System</p>
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
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

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
            
            {/* Sales Options */}
            {salesOptions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                  Sales
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {salesOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if ((option as any).openInNewTab) {
                          window.open(option.link, '_blank')
                        } else {
                          navigate(option.link)
                        }
                      }}
                      className={`group relative bg-gradient-to-br ${option.gradient} text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 text-left overflow-hidden`}
                    >
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
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Options */}
            {purchaseOptions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-full"></div>
                  Purchase
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {purchaseOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => navigate(option.link)}
                      className={`group relative bg-gradient-to-br ${option.gradient} text-white rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25 text-left overflow-hidden`}
                    >
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
                  ))}
                </div>
              </div>
            )}

            {/* Stock Management Options */}
            {hasPermission('products:read') && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-600 rounded-full"></div>
                  Stock Management
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
            {salesOptions.length === 0 && purchaseOptions.length === 0 && !hasPermission('products:read') && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium">You don't have permission to access sales or purchase operations.</p>
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
                        max={new Date().toISOString().split('T')[0]}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {visibleReports.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No reports available with your current permissions.</p>
                </div>
              ) : (
                visibleReports.map((report, index) => (
                <div
                  key={index}
                  onClick={report.onClick}
                  className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200/50 hover:border-gray-300 hover:shadow-xl transition-all duration-300 overflow-hidden ${
                    report.onClick ? 'cursor-pointer hover:scale-105' : ''
                  }`}
                >
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
                ))
              )}
            </div>

            {hasPermission('reports:read') && (
              <div className="mt-8 pt-8 border-t border-gray-200/50 space-y-4">
                <button 
                  onClick={() => navigate('/reports/sales')}
                  className="group w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>View Sales Reports</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/reports/commissions')}
                  className="group w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>View Commission Reports</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
            {hasPermission('sales:read') && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                <button 
                  onClick={() => navigate('/payments/outstanding')}
                  className="group w-full bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span>Outstanding Payments</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
            {hasPermission('settings:update') && (
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
            {hasPermission('products:update') && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                <button 
                  onClick={() => navigate('/backup-restore')}
                  className="group w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-teal-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Database className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Backup & Restore</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
            {user?.role === 'admin' && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                <button 
                  onClick={() => navigate('/companies')}
                  className="group w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Building2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Company Management</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
            {hasPermission('users:read') && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                <button 
                  onClick={() => navigate('/users')}
                  className="group w-full bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-teal-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>User Management</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
            {hasPermission('reports:read') && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 space-y-4">
                <button 
                  onClick={() => navigate('/analytics')}
                  className="group w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Analytics Dashboard</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/audit-logs')}
                  className="group w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Audit Logs</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            )}
          </section>

        </div>

        {/* Additional Info Bar - Welcome Section */}
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
    </div>
  )
}

export default Dashboard
