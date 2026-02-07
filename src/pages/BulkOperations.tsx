import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { productService, categoryService, Product, Category } from '../services/productService'
import { purchaseService, supplierService } from '../services/purchaseService'
import type { Purchase, Supplier } from '../types/purchase'
import { Home, Package, DollarSign, FolderTree, CheckSquare, Square } from 'lucide-react'

type TabId = 'price' | 'category'

type PriceUpdateType = 'increase_pct' | 'decrease_pct' | 'set_fixed' | 'add_amount' | 'subtract_amount'

const BulkOperations = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('price')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  // Filter: which products to show/select
  const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('')
  const [filterProductId, setFilterProductId] = useState<number | ''>('')
  const [filterSupplierId, setFilterSupplierId] = useState<number | ''>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Bulk Price Update
  const [priceUpdateType, setPriceUpdateType] = useState<PriceUpdateType>('increase_pct')
  const [priceUpdateValue, setPriceUpdateValue] = useState('')

  // Bulk Category Change
  const [newCategoryId, setNewCategoryId] = useState<number | ''>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const [allProducts, allCategories, allSuppliers, allPurchases] = await Promise.all([
        productService.getAll(true, companyId),
        categoryService.getAll(),
        supplierService.getAll(companyId),
        purchaseService.getAll(undefined, companyId),
      ])
      setProducts(allProducts.filter(p => p.status === 'active'))
      setCategories(allCategories)
      setSuppliers(allSuppliers)
      setPurchases(allPurchases)
    } catch (err) {
      console.error('Failed to load data', err)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Product IDs that appear in purchases from each supplier
  const productIdsBySupplier = useMemo(() => {
    const map = new Map<number, Set<number>>()
    purchases.forEach(p => {
      const sid = (p as any).supplier_id
      if (sid == null) return
      if (!map.has(sid)) map.set(sid, new Set())
      p.items.forEach(item => map.get(sid)!.add(item.product_id))
    })
    return map
  }, [purchases])

  // When a product is selected, show that product and others in the same category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = !filterCategoryId || p.category_id === filterCategoryId
      let matchProduct = true
      if (filterProductId) {
        const selected = products.find(x => x.id === filterProductId)
        if (selected) {
          // Show selected product + all products in same category
          matchProduct = p.id === filterProductId || p.category_id === selected.category_id
        } else {
          matchProduct = p.id === filterProductId
        }
      }
      const matchSupplier = !filterSupplierId
        ? true
        : (productIdsBySupplier.get(filterSupplierId)?.has(p.id) ?? false)
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchProduct && matchSupplier && matchSearch
    })
  }, [products, filterCategoryId, filterProductId, filterSupplierId, searchQuery, productIdsBySupplier])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const computeNewPrice = (current: number | undefined, type: PriceUpdateType, value: number): number => {
    const curr = current ?? 0
    switch (type) {
      case 'increase_pct':
        return Math.round((curr * (1 + value / 100)) * 100) / 100
      case 'decrease_pct':
        return Math.max(0, Math.round((curr * (1 - value / 100)) * 100) / 100)
      case 'set_fixed':
        return Math.max(0, value)
      case 'add_amount':
        return Math.max(0, Math.round((curr + value) * 100) / 100)
      case 'subtract_amount':
        return Math.max(0, Math.round((curr - value) * 100) / 100)
      default:
        return curr
    }
  }

  const handleBulkPriceUpdate = async () => {
    const val = parseFloat(priceUpdateValue)
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid number')
      return
    }
    if (selectedIds.size === 0) {
      toast.error('Select at least one product')
      return
    }
    if (
      (priceUpdateType === 'increase_pct' || priceUpdateType === 'decrease_pct') &&
      (val < 0 || val > 100)
    ) {
      toast.error('Percentage must be between 0 and 100')
      return
    }

    setApplying(true)
    let updated = 0
    try {
      for (const id of selectedIds) {
        const p = products.find(x => x.id === id)
        if (!p) continue
        const newPrice = computeNewPrice(p.selling_price, priceUpdateType, val)
        await productService.update(id, { selling_price: newPrice })
        updated++
      }
      toast.success(`Updated selling price for ${updated} product(s)`)
      setSelectedIds(new Set())
      setPriceUpdateValue('')
      loadData()
    } catch (err) {
      console.error('Bulk price update failed', err)
      toast.error(`Failed after updating ${updated} product(s)`)
    } finally {
      setApplying(false)
    }
  }

  const handleBulkCategoryChange = async () => {
    if (!newCategoryId) {
      toast.error('Select a new category')
      return
    }
    if (selectedIds.size === 0) {
      toast.error('Select at least one product')
      return
    }

    setApplying(true)
    let updated = 0
    try {
      for (const id of selectedIds) {
        await productService.update(id, { category_id: newCategoryId })
        updated++
      }
      toast.success(`Updated category for ${updated} product(s)`)
      setSelectedIds(new Set())
      setNewCategoryId('')
      loadData()
    } catch (err) {
      console.error('Bulk category change failed', err)
      toast.error(`Failed after updating ${updated} product(s)`)
    } finally {
      setApplying(false)
    }
  }

  const formatCurr = (v?: number) =>
    v != null && v > 0 ? `₹${v.toFixed(2)}` : '—'

  if (!hasPermission('products:update')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-gray-600">You need permission to update products.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/products')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Products"
            >
              <Home className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Bulk price update & bulk category change
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('price')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-colors ${
              activeTab === 'price'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Bulk Price Update
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-colors ${
              activeTab === 'category'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <FolderTree className="w-5 h-5" />
            Bulk Category Change
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Filter products</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={filterCategoryId}
                onChange={e => setFilterCategoryId(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Product</label>
              <select
                value={filterProductId}
                onChange={e => setFilterProductId(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                title="Select a product to show it and others in same category"
              >
                <option value="">All products</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.sku ? ` (${p.sku})` : ''}
                  </option>
                ))}
              </select>
              {filterProductId && (
                <p className="text-xs text-blue-600 mt-0.5">
                  Showing selected product + same category
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Supplier</label>
              <select
                value={filterSupplierId}
                onChange={e => setFilterSupplierId(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                title="Products purchased from this supplier"
              >
                <option value="">All suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {filterSupplierId && (
                <p className="text-xs text-blue-600 mt-0.5">
                  Products from this supplier
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input
                type="text"
                placeholder="Name, SKU, barcode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Showing {filteredProducts.length} product(s). Select products to apply bulk operation.
          </p>
        </div>

        {/* Action panel */}
        {activeTab === 'price' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">Bulk Price Update</p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Update type</label>
                <select
                  value={priceUpdateType}
                  onChange={e => setPriceUpdateType(e.target.value as PriceUpdateType)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="increase_pct">Increase by %</option>
                  <option value="decrease_pct">Decrease by %</option>
                  <option value="set_fixed">Set to (fixed amount)</option>
                  <option value="add_amount">Add amount</option>
                  <option value="subtract_amount">Subtract amount</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {priceUpdateType.includes('pct') ? 'Percentage (0–100)' : 'Amount (₹)'}
                </label>
                <input
                  type="number"
                  step={priceUpdateType.includes('pct') ? '0.1' : '0.01'}
                  min="0"
                  placeholder={priceUpdateType.includes('pct') ? 'e.g. 10' : 'e.g. 50'}
                  value={priceUpdateValue}
                  onChange={e => setPriceUpdateValue(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40"
                />
              </div>
              <button
                onClick={handleBulkPriceUpdate}
                disabled={applying || selectedIds.size === 0 || !priceUpdateValue}
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? 'Updating...' : `Apply to ${selectedIds.size} selected`}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'category' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">Bulk Category Change</p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">New category</label>
                <select
                  value={newCategoryId}
                  onChange={e => setNewCategoryId(e.target.value ? parseInt(e.target.value) : '')}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-w-[180px]"
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleBulkCategoryChange}
                disabled={applying || selectedIds.size === 0 || !newCategoryId}
                className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? 'Updating...' : `Apply to ${selectedIds.size} selected`}
              </button>
            </div>
          </div>
        )}

        {/* Product list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              No products match the filters.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1 hover:bg-gray-200 rounded"
                        title={selectedIds.size === filteredProducts.length ? 'Deselect all' : 'Select all'}
                      >
                        {selectedIds.size === filteredProducts.length ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Selling Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(p => (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 ${selectedIds.has(p.id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelect(p.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {selectedIds.has(p.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        {(p.sku || p.barcode) && (
                          <div className="text-xs text-gray-500">
                            {p.sku && <span>SKU: {p.sku}</span>}
                            {p.sku && p.barcode && ' · '}
                            {p.barcode && <span>Barcode: {p.barcode}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.category_name || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurr(p.selling_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default BulkOperations
