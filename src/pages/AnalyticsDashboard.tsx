import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { analyticsService } from '../services/analyticsService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Home, TrendingUp, Package, Users, DollarSign } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const AnalyticsDashboard = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [salesTrends, setSalesTrends] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [categorySales, setCategorySales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [trendDays, setTrendDays] = useState(30)

  useEffect(() => {
    loadAnalytics()
  }, [trendDays])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const [trends, products, revenue, customers, categories] = await Promise.all([
        analyticsService.getSalesTrends(trendDays),
        analyticsService.getTopProducts(10),
        analyticsService.getRevenueByPeriod('monthly', 12),
        analyticsService.getTopCustomers(10),
        analyticsService.getCategorySales()
      ])
      setSalesTrends(trends)
      setTopProducts(products)
      setRevenueByMonth(revenue)
      setTopCustomers(customers)
      setCategorySales(categories)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <ProtectedRoute requiredPermission="reports:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                  <p className="text-sm text-gray-600 mt-1">Visual insights into your business performance</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Sales Trends Chart */}
              <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                      Sales Trends
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Revenue and profit trends over time</p>
                  </div>
                  <select
                    value={trendDays}
                    onChange={(e) => setTrendDays(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Sales"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Products */}
                <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Package className="w-6 h-6 text-purple-600" />
                    Top Products
                  </h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={topProducts.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                      <YAxis 
                        dataKey="productName" 
                        type="category" 
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                      <Bar dataKey="profit" fill="#10b981" name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Sales */}
                <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Package className="w-6 h-6 text-orange-600" />
                    Sales by Category
                  </h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={categorySales.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ categoryName, percent }) => 
                          `${categoryName}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {categorySales.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Revenue */}
              <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  Monthly Revenue & Profit
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    <Bar dataKey="profit" fill="#10b981" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Customers */}
              <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                  Top Customers
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Orders</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topCustomers.map((customer, index) => (
                        <tr key={customer.customerId || index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.customerName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{customer.totalOrders}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(customer.totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(customer.averageOrderValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default AnalyticsDashboard

