import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { productService } from '../services/productService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { StockAlert } from '../types/stock'
import { AlertTriangle, Package, Home, TrendingDown, ShoppingCart } from 'lucide-react'

const StockAlerts = () => {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [lowStockAlerts, setLowStockAlerts] = useState<StockAlert[]>([])
  const [outOfStockAlerts, setOutOfStockAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'low' | 'out'>('low')

  useEffect(() => {
    loadStockAlerts()
  }, [])

  const loadStockAlerts = async () => {
    setLoading(true)
    try {
      const products = await productService.getAll(false)

      const lowStock: StockAlert[] = []
      const outOfStock: StockAlert[] = []

      products.forEach(product => {
      if (product.min_stock_level !== undefined) {
        if (product.stock_quantity === 0) {
          outOfStock.push({
            product_id: product.id,
            product_name: product.name,
            current_stock: product.stock_quantity,
            min_stock_level: product.min_stock_level,
            category: product.category_name,
            unit: product.unit,
            alert_type: 'out_of_stock',
            suggested_quantity: Math.max(product.min_stock_level * 2, 10) // Suggest 2x min level or minimum 10
          })
        } else if (product.stock_quantity <= product.min_stock_level) {
          lowStock.push({
            product_id: product.id,
            product_name: product.name,
            current_stock: product.stock_quantity,
            min_stock_level: product.min_stock_level,
            category: product.category_name,
            unit: product.unit,
            alert_type: 'low_stock',
            suggested_quantity: Math.max(product.min_stock_level * 2 - product.stock_quantity, product.min_stock_level)
          })
        }
      } else if (product.stock_quantity === 0) {
        // Products without min_stock_level but are out of stock
        outOfStock.push({
          product_id: product.id,
          product_name: product.name,
          current_stock: product.stock_quantity,
          min_stock_level: 0,
          category: product.category_name,
          unit: product.unit,
          alert_type: 'out_of_stock',
          suggested_quantity: 10 // Default suggestion
        })
      }
    })

    // Sort by urgency (lower stock first)
    lowStock.sort((a, b) => {
      const ratioA = a.current_stock / a.min_stock_level
      const ratioB = b.current_stock / b.min_stock_level
      return ratioA - ratioB
    })

    outOfStock.sort((a, b) => a.product_name.localeCompare(b.product_name))

      setLowStockAlerts(lowStock)
      setOutOfStockAlerts(outOfStock)
    } catch (error) {
      console.error('Error loading stock alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdjustStock = (productId: number) => {
    navigate(`/stock/adjust?productId=${productId}`)
  }

  const activeAlerts = activeTab === 'low' ? lowStockAlerts : outOfStockAlerts

  return (
    <ProtectedRoute requiredPermission="products:read">
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
                  <h1 className="text-3xl font-bold text-gray-900">Stock Alerts</h1>
                  <p className="text-sm text-gray-600 mt-1">Monitor low stock and out of stock products</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-xl p-6 border border-white/50 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Low Stock Alerts</p>
                  <p className="text-3xl font-bold">{lowStockAlerts.length}</p>
                  <p className="text-sm opacity-75 mt-1">Products below minimum level</p>
                </div>
                <AlertTriangle className="w-12 h-12 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-xl p-6 border border-white/50 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Out of Stock</p>
                  <p className="text-3xl font-bold">{outOfStockAlerts.length}</p>
                  <p className="text-sm opacity-75 mt-1">Products with zero stock</p>
                </div>
                <Package className="w-12 h-12 opacity-80" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex gap-4 border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('low')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                  activeTab === 'low'
                    ? 'text-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Low Stock ({lowStockAlerts.length})
                {activeTab === 'low' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('out')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                  activeTab === 'out'
                    ? 'text-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Out of Stock ({outOfStockAlerts.length})
                {activeTab === 'out' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></span>
                )}
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading stock alerts...</p>
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No {activeTab === 'low' ? 'Low Stock' : 'Out of Stock'} Alerts
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'low' 
                    ? 'All products are above their minimum stock levels' 
                    : 'All products have stock available'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Min. Level</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Suggested Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activeAlerts.map((alert) => {
                      const stockPercentage = alert.min_stock_level > 0 
                        ? (alert.current_stock / alert.min_stock_level) * 100 
                        : 0
                      
                      return (
                        <tr key={alert.product_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{alert.product_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{alert.category || '—'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${
                                alert.alert_type === 'out_of_stock' ? 'text-red-600' : 'text-orange-600'
                              }`}>
                                {alert.current_stock} {alert.unit}
                              </span>
                              {alert.alert_type === 'low_stock' && (
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-orange-500 h-2 rounded-full"
                                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{alert.min_stock_level} {alert.unit}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-blue-600">
                              {alert.suggested_quantity} {alert.unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {hasPermission('products:update') && (
                              <button
                                onClick={() => handleAdjustStock(alert.product_id)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <TrendingDown className="w-4 h-4" />
                                Adjust Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          {!loading && (lowStockAlerts.length > 0 || outOfStockAlerts.length > 0) && (
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                {hasPermission('products:update') && (
                  <button
                    onClick={() => navigate('/stock/adjust')}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Manual Stock Adjustment
                  </button>
                )}
                <button
                  onClick={() => navigate('/stock/adjustments')}
                  className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  View Adjustment History
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default StockAlerts

