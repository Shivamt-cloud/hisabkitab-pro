import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { productService, categoryService, Product, Category } from '../services/productService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle,
  Filter,
  X,
  Home,
  Layers
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Products = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Only load active products (sold/archived are hidden from non-admins)
      const includeArchived = hasPermission('products:delete') // Admin can see all
      const companyId = getCurrentCompanyId()
      // Pass companyId directly - services will handle null by returning empty array for data isolation
      // undefined means admin hasn't selected a company (show all), null means user has no company (show nothing)
      const [allProducts, allCategories] = await Promise.all([
        productService.getAll(includeArchived, companyId),
        categoryService.getAll()
      ])
      setProducts(allProducts)
      setCategories(allCategories)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      if (hasPermission('products:delete')) {
        try {
          await productService.delete(id)
          loadData()
        } catch (error) {
          console.error('Error deleting product:', error)
          alert('Failed to delete product')
        }
      } else {
        alert('You do not have permission to delete products')
      }
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = !selectedCategory || product.category_id === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity <= 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' }
    }
    if (product.min_stock_level && product.stock_quantity <= product.min_stock_level) {
      return { label: 'Low Stock', color: 'bg-orange-100 text-orange-700 border-orange-200' }
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-700 border-green-200' }
  }

  return (
    <ProtectedRoute requiredPermission="products:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
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
                  <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage your product inventory</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasPermission('products:update') && (
                  <button
                    onClick={() => navigate('/products/bulk-operations')}
                    className="bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-5 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2"
                  >
                    <Layers className="w-5 h-5" />
                    Bulk Operations
                  </button>
                )}
                {hasPermission('products:create') && (
                  <button
                    onClick={() => navigate('/products/new')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Product
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">
                  {products.length === 0
                    ? "Get started by adding your first product"
                    : "Try adjusting your search or filter criteria"}
                </p>
                {hasPermission('products:create') && products.length === 0 && (
                  <button
                    onClick={() => navigate('/products/new')}
                    className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Product
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU/Barcode</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product)
                      return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded-lg border border-gray-300 mr-3 flex-shrink-0"
                                  onError={(e) => {
                                    // Fallback to initial if image fails to load
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                    if (target.nextElementSibling) {
                                      (target.nextElementSibling as HTMLElement).style.display = 'flex'
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 flex-shrink-0 ${product.image_url ? 'hidden' : ''}`}
                              >
                                {product.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{product.name}</div>
                                {product.description && (
                                  <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {product.sku && <div>SKU: {product.sku}</div>}
                              {product.barcode && <div className="text-gray-500">Barcode: {product.barcode}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">
                              {product.category_name || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-semibold text-gray-900">
                                {product.selling_price ? `₹${product.selling_price.toFixed(2)}` : 'Not set'}
                              </div>
                              {product.purchase_price && product.purchase_price > 0 && (
                                <div className="text-gray-500 text-xs">Cost: ₹{product.purchase_price.toFixed(2)}</div>
                              )}
                              <div className="text-xs text-gray-400 italic">Set during purchase entry</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {product.stock_quantity} {product.unit}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                              {product.min_stock_level && product.stock_quantity <= product.min_stock_level && product.stock_quantity > 0 && (
                                <AlertTriangle className="w-3 h-3 mr-1" />
                              )}
                              {stockStatus.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {hasPermission('products:update') && (
                                <button
                                  onClick={() => navigate(`/products/${product.id}/edit`)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {hasPermission('products:delete') && (
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            {filteredProducts.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Showing {filteredProducts.length} of {products.length} products</span>
                  <span>
                    Low Stock: {products.filter(p => p.min_stock_level && p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level).length} | 
                    Out of Stock: {products.filter(p => p.stock_quantity <= 0).length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default Products

