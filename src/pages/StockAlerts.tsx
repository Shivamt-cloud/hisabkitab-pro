import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { productService } from '../services/productService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { StockAlert } from '../types/stock'
import { AlertTriangle, Package, Home, TrendingDown, ShoppingCart, ListOrdered } from 'lucide-react'

const StockAlerts = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
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
      const companyId = getCurrentCompanyId()
      const products = await productService.getAll(false, companyId)
      
      // Also load purchases to check if min_stock_level is set on purchase items but not on products
      const { purchaseService } = await import('../services/purchaseService')
      const purchases = await purchaseService.getAll(undefined, companyId)
      
      // Create a map of product_id to max min_stock_level from purchase items
      const productMinStockMap = new Map<number, number>()
      // Also calculate actual available stock from purchase items
      const productAvailableStockMap = new Map<number, number>()
      // Map to track purchase items with articles for article-based alerts
      const articleToPurchaseItemMap = new Map<string, { product_id: number; article: string; availableQty: number; minStock: number; purchaseId: number }>()
      
      purchases.forEach(purchase => {
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
          
          // Track purchase items by article code for article-based alerts
          if (item.article && item.article.trim()) {
            const articleKey = item.article.trim().toLowerCase()
            const existing = articleToPurchaseItemMap.get(articleKey)
            
            // Special logging for "money" article
            if (articleKey.includes('money')) {
              console.log(`[StockAlerts] 🔍 Processing "money" article in purchase ${purchase.id}:`, {
                article: item.article,
                product_id: item.product_id,
                quantity: item.quantity,
                sold_quantity: item.sold_quantity,
                availableQty: availableQty,
                min_stock_level: item.min_stock_level
              })
            }
            
            // For articles, we need to aggregate available stock across all purchase items with the same article
            // But use the max min_stock_level
            if (existing) {
              // Aggregate available stock and use max min_stock_level
              articleToPurchaseItemMap.set(articleKey, {
                product_id: item.product_id,
                article: item.article,
                availableQty: existing.availableQty + availableQty,
                minStock: Math.max(existing.minStock, item.min_stock_level || 0),
                purchaseId: purchase.id
              })
            } else {
              articleToPurchaseItemMap.set(articleKey, {
                product_id: item.product_id,
                article: item.article,
                availableQty: availableQty,
                minStock: item.min_stock_level || 0,
                purchaseId: purchase.id
              })
            }
          }
        })
      })

      const lowStock: StockAlert[] = []
      const outOfStock: StockAlert[] = []

      console.log('[StockAlerts] Loading products for alerts, companyId:', companyId)
      console.log('[StockAlerts] Total products:', products.length)
      console.log('[StockAlerts] Products with min_stock_level from purchases:', productMinStockMap.size)
      console.log('[StockAlerts] Product min stock map:', Array.from(productMinStockMap.entries()))
      console.log('[StockAlerts] Articles with purchase items:', articleToPurchaseItemMap.size)
      console.log('[StockAlerts] Article map entries:', Array.from(articleToPurchaseItemMap.entries()).map(([article, data]) => ({
        article,
        product_id: data.product_id,
        availableQty: data.availableQty,
        minStock: data.minStock
      })))

      // First, check purchase items with articles directly (article-level alerts)
      articleToPurchaseItemMap.forEach((itemData, articleKey) => {
        // Special logging for "money" article
        if (articleKey.toLowerCase().includes('money')) {
          console.log(`[StockAlerts] 🔍 Found "money" article!`, itemData)
        }
        
        if (itemData.minStock > 0) {
          const product = products.find(p => p.id === itemData.product_id)
          if (product) {
            console.log(`[StockAlerts] Checking article "${itemData.article}" (product: ${product.name}, ID: ${product.id})`)
            console.log(`  - Available Qty: ${itemData.availableQty}`)
            console.log(`  - Min Stock: ${itemData.minStock}`)
            console.log(`  - Condition check: ${itemData.availableQty} <= ${itemData.minStock} = ${itemData.availableQty <= itemData.minStock}`)
            
            if (itemData.availableQty === 0) {
              // Out of stock for this article
              const existingAlert = outOfStock.find(a => a.product_id === itemData.product_id && 
                a.product_name.includes(`[${itemData.article}]`))
              if (!existingAlert) {
                outOfStock.push({
                  product_id: itemData.product_id,
                  product_name: `${product.name} [${itemData.article}]`,
                  current_stock: itemData.availableQty,
                  min_stock_level: itemData.minStock,
                  category: product.category_name,
                  unit: product.unit,
                  alert_type: 'out_of_stock',
                  suggested_quantity: Math.max(itemData.minStock * 2, 10)
                })
                console.log(`[StockAlerts] ✅ Added article "${itemData.article}" to out of stock`)
              }
            } else if (itemData.availableQty <= itemData.minStock) {
              // Low stock for this article (including when equal)
              const existingAlert = lowStock.find(a => a.product_id === itemData.product_id && 
                a.product_name.includes(`[${itemData.article}]`))
              if (!existingAlert) {
                lowStock.push({
                  product_id: itemData.product_id,
                  product_name: `${product.name} [${itemData.article}]`,
                  current_stock: itemData.availableQty,
                  min_stock_level: itemData.minStock,
                  category: product.category_name,
                  unit: product.unit,
                  alert_type: 'low_stock',
                  suggested_quantity: Math.max(itemData.minStock * 2 - itemData.availableQty, itemData.minStock)
                })
                console.log(`[StockAlerts] ✅ Added article "${itemData.article}" to low stock (${itemData.availableQty} <= ${itemData.minStock})`)
              } else {
                console.log(`[StockAlerts] ⏭️ Article "${itemData.article}" already in alerts`)
              }
            } else {
              console.log(`[StockAlerts] ⏭️ Article "${itemData.article}" skipped (${itemData.availableQty} > ${itemData.minStock})`)
            }
          } else {
            console.log(`[StockAlerts] ⚠️ Product not found for article "${itemData.article}" (product_id: ${itemData.product_id})`)
          }
        } else {
          if (articleKey.toLowerCase().includes('money')) {
            console.log(`[StockAlerts] ⚠️ "money" article found but min_stock_level is ${itemData.minStock} (not > 0)`)
          }
        }
      })

      products.forEach(product => {
        // Use min_stock_level from product, or from purchase items if not set on product
        let minStockLevel = product.min_stock_level
        if (!minStockLevel || minStockLevel === 0) {
          minStockLevel = productMinStockMap.get(product.id)
        }
        
        // Use actual available stock from purchase items if available, otherwise use product.stock_quantity
        const actualAvailableStock = productAvailableStockMap.get(product.id) ?? product.stock_quantity
        
        console.log(`[StockAlerts] Product: ${product.name} (ID: ${product.id})`)
        console.log(`  - Product stock_quantity: ${product.stock_quantity}`)
        console.log(`  - Available from purchases: ${productAvailableStockMap.get(product.id) ?? 'N/A'}`)
        console.log(`  - Using stock: ${actualAvailableStock}`)
        console.log(`  - Product min_stock_level: ${product.min_stock_level}`)
        console.log(`  - Purchase item min_stock_level: ${productMinStockMap.get(product.id) ?? 'N/A'}`)
        console.log(`  - Using min_stock_level: ${minStockLevel}`)
        
        // Check if product has min_stock_level set (either on product or from purchase items)
        if (minStockLevel !== undefined && minStockLevel > 0) {
          if (actualAvailableStock === 0) {
            // Out of stock
            outOfStock.push({
              product_id: product.id,
              product_name: product.name,
              current_stock: actualAvailableStock,
              min_stock_level: minStockLevel,
              category: product.category_name,
              unit: product.unit,
              alert_type: 'out_of_stock',
              suggested_quantity: Math.max(minStockLevel * 2, 10) // Suggest 2x min level or minimum 10
            })
            console.log(`[StockAlerts] ✅ Added to out of stock: ${product.name}`)
          } else if (actualAvailableStock <= minStockLevel) {
            // Low stock (including when stock equals min_stock_level)
            lowStock.push({
              product_id: product.id,
              product_name: product.name,
              current_stock: actualAvailableStock,
              min_stock_level: minStockLevel,
              category: product.category_name,
              unit: product.unit,
              alert_type: 'low_stock',
              suggested_quantity: Math.max(minStockLevel * 2 - actualAvailableStock, minStockLevel)
            })
            console.log(`[StockAlerts] ✅ Added to low stock: ${product.name} (${actualAvailableStock} <= ${minStockLevel})`)
          } else {
            console.log(`[StockAlerts] ⏭️ Skipped: ${product.name} (${actualAvailableStock} > ${minStockLevel})`)
          }
        } else if (actualAvailableStock === 0) {
          // Products without min_stock_level but are out of stock
          outOfStock.push({
            product_id: product.id,
            product_name: product.name,
            current_stock: actualAvailableStock,
            min_stock_level: 0,
            category: product.category_name,
            unit: product.unit,
            alert_type: 'out_of_stock',
            suggested_quantity: 10 // Default suggestion
          })
        } else {
          console.log(`[StockAlerts] ⏭️ Skipped: ${product.name} (no min_stock_level set)`)
        }
      })
      
      console.log(`[StockAlerts] Low stock alerts: ${lowStock.length}, Out of stock: ${outOfStock.length}`)

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
              <button
                onClick={() => navigate('/stock/reorder')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium"
                title="Reorder list: products below min stock with last purchase qty/rate"
              >
                <ListOrdered className="w-4 h-4" />
                Reorder List
              </button>
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

