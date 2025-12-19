import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { productService, Product } from '../services/productService'
import { stockAdjustmentService } from '../services/stockAdjustmentService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { StockAdjustmentType, StockAdjustmentReason } from '../types/stock'
import { ArrowLeft, Save, Package, Home, AlertTriangle } from 'lucide-react'

const StockAdjustmentForm = () => {
  const { hasPermission, user, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const productIdParam = searchParams.get('productId')

  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number>(productIdParam ? (parseInt(productIdParam) || 0) : 0)
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('increase')
  const [reason, setReason] = useState<StockAdjustmentReason>('manual_adjustment')
  const [quantity, setQuantity] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProducts()
    if (productIdParam) {
      setSelectedProductId(parseInt(productIdParam))
    }
  }, [productIdParam])

  const loadProducts = async () => {
    try {
      const companyId = getCurrentCompanyId()
      const allProducts = await productService.getAll(false, companyId || undefined) // Only active products
      setProducts(allProducts)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const selectedProduct = products.find(p => p.id === selectedProductId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!selectedProductId || selectedProductId === 0) {
      setErrors({ product: 'Please select a product' })
      return
    }

    if (!selectedProduct) {
      setErrors({ product: 'Selected product not found' })
      return
    }

    if (quantity <= 0) {
      setErrors({ quantity: 'Quantity must be greater than 0' })
      return
    }

    // Calculate new stock based on adjustment type
    let newStock = selectedProduct.stock_quantity
    switch (adjustmentType) {
      case 'increase':
      case 'returned':
        newStock = selectedProduct.stock_quantity + quantity
        break
      case 'decrease':
      case 'damaged':
      case 'expired':
        newStock = Math.max(0, selectedProduct.stock_quantity - quantity)
        break
      case 'set':
        newStock = quantity
        break
      case 'other':
        // For 'other', user needs to specify the final quantity
        newStock = quantity
        break
    }

    setLoading(true)

    try {
      await stockAdjustmentService.create({
        product_id: selectedProductId,
        product_name: selectedProduct.name,
        adjustment_type: adjustmentType,
        reason: reason,
        quantity: quantity,
        previous_stock: selectedProduct.stock_quantity,
        new_stock: newStock,
        notes: notes.trim() || undefined,
        company_id: getCurrentCompanyId() || undefined,
        adjusted_by: user?.id ? parseInt(user.id) || 0 : 0,
        adjusted_by_name: user?.email || 'Unknown',
        adjustment_date: new Date().toISOString().split('T')[0],
      })

      alert('Stock adjustment saved successfully!')
      navigate('/stock/adjustments')
    } catch (error: any) {
      alert(error.message || 'Failed to save stock adjustment')
    } finally {
      setLoading(false)
    }
  }

  const getAdjustmentDescription = () => {
    if (!selectedProduct) return ''
    
    const currentStock = selectedProduct.stock_quantity
    let newStock = currentStock
    
    switch (adjustmentType) {
      case 'increase':
      case 'returned':
        newStock = currentStock + quantity
        return `Stock will increase from ${currentStock} to ${newStock} ${selectedProduct.unit}`
      case 'decrease':
      case 'damaged':
      case 'expired':
        newStock = Math.max(0, currentStock - quantity)
        return `Stock will decrease from ${currentStock} to ${newStock} ${selectedProduct.unit}`
      case 'set':
        return `Stock will be set to ${quantity} ${selectedProduct.unit} (currently: ${currentStock} ${selectedProduct.unit})`
      case 'other':
        return `Stock will be set to ${quantity} ${selectedProduct.unit} (currently: ${currentStock} ${selectedProduct.unit})`
      default:
        return ''
    }
  }

  return (
    <ProtectedRoute requiredPermission="products:update">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/stock/adjustments')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                title="Back to Stock Adjustments"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Stock Adjustment</h1>
                <p className="text-sm text-gray-600 mt-1">Adjust product stock manually</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-8 border border-white/50">
            {/* Product Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(parseInt(e.target.value))}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                  errors.product ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={!!productIdParam}
              >
                <option value={0}>Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.stock_quantity !== undefined && `(Stock: ${product.stock_quantity} ${product.unit})`}
                  </option>
                ))}
              </select>
              {errors.product && <p className="text-red-500 text-sm mt-1">{errors.product}</p>}
              {selectedProduct && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
                      <p className="text-sm text-gray-600">
                        Current Stock: <span className="font-semibold">{selectedProduct.stock_quantity} {selectedProduct.unit}</span>
                        {selectedProduct.min_stock_level !== undefined && (
                          <span className="ml-4">
                            Min. Level: <span className="font-semibold">{selectedProduct.min_stock_level} {selectedProduct.unit}</span>
                          </span>
                        )}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              )}
            </div>

            {/* Adjustment Type */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adjustment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as StockAdjustmentType)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="increase">Increase Stock</option>
                <option value="decrease">Decrease Stock</option>
                <option value="set">Set Stock (Override)</option>
                <option value="damaged">Damaged Goods</option>
                <option value="expired">Expired Items</option>
                <option value="returned">Returned Items</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Reason */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="manual_adjustment">Manual Adjustment</option>
                <option value="damaged_goods">Damaged Goods</option>
                <option value="expired_items">Expired Items</option>
                <option value="found_stock">Found Stock</option>
                <option value="theft_loss">Theft/Loss</option>
                <option value="return_to_supplier">Return to Supplier</option>
                <option value="return_from_customer">Return from Customer</option>
                <option value="stock_take">Stock Take (Inventory Count)</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {adjustmentType === 'set' || adjustmentType === 'other' ? 'New Stock Quantity' : 'Quantity'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={adjustmentType === 'set' || adjustmentType === 'other' ? 'Enter final stock quantity' : 'Enter quantity'}
              />
              {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
              {selectedProduct && quantity > 0 && (
                <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  {getAdjustmentDescription()}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Add any additional notes about this adjustment..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => navigate('/stock/adjustments')}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default StockAdjustmentForm

