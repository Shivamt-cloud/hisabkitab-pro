import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { priceSegmentService, productSegmentPriceService } from '../services/priceListService'
import { productService, categoryService, Product, Category } from '../services/productService'
import { purchaseService, supplierService } from '../services/purchaseService'
import type { Purchase, PurchaseItem, Supplier } from '../types/purchase'
import type { PriceSegment } from '../types/priceList'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Home, Plus, Edit2, Trash2, Tag, DollarSign, Search, Save } from 'lucide-react'

const PriceLists = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [segments, setSegments] = useState<PriceSegment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null)
  const [segmentPricesMap, setSegmentPricesMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Segment form (add/edit)
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null)
  const [segmentForm, setSegmentForm] = useState({ name: '', description: '', is_default: false })
  const [showSegmentForm, setShowSegmentForm] = useState(false)

  // Product filters
  const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('')
  const [filterProductId, setFilterProductId] = useState<number | ''>('')
  const [filterSupplierId, setFilterSupplierId] = useState<number | ''>('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedSegmentId) {
      loadSegmentPrices(selectedSegmentId)
    } else {
      setSegmentPricesMap(new Map())
    }
  }, [selectedSegmentId])

  useEffect(() => {
    setPendingEdits(new Map())
  }, [selectedSegmentId, filterSupplierId])

  const loadData = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const [segs, prods, cats, supps, purchs] = await Promise.all([
        priceSegmentService.getAll(companyId),
        productService.getAll(false, companyId),
        categoryService.getAll(),
        supplierService.getAll(companyId),
        purchaseService.getAll(undefined, companyId),
      ])
      setSegments(segs)
      setProducts(prods.filter(p => p.status === 'active'))
      setCategories(cats)
      setSuppliers(supps)
      setPurchases(purchs)
      if (segs.length > 0 && !selectedSegmentId) {
        setSelectedSegmentId(segs[0].id)
      }
    } catch (err) {
      console.error('Failed to load price lists', err)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadSegmentPrices = async (segmentId: number) => {
    try {
      const companyId = getCurrentCompanyId()
      const all = await productSegmentPriceService.getAll(companyId)
      const map = new Map<string, number>()
      all
        .filter(p => p.segment_id === segmentId)
        .forEach(p => map.set(productSegmentPriceService.priceKey(p.product_id, p.segment_id, p.article), p.price))
      setSegmentPricesMap(map)
    } catch (err) {
      console.error('Failed to load segment prices', err)
    }
  }

  // Product IDs that appear in purchases from each supplier
  const productIdsBySupplier = useMemo(() => {
    const map = new Map<number, Set<number>>()
    purchases.forEach(p => {
      const sid = (p as { supplier_id?: number }).supplier_id
      if (sid == null) return
      if (!map.has(sid)) map.set(sid, new Set())
      p.items.forEach(item => map.get(sid)!.add(item.product_id))
    })
    return map
  }, [purchases])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = !filterCategoryId || p.category_id === filterCategoryId
      let matchProduct = true
      if (filterProductId) {
        const selected = products.find(x => x.id === filterProductId)
        if (selected) {
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

  // When supplier is selected: item-wise rows (each purchase item from that supplier)
  // When supplier not selected: product-wise rows (current behavior)
  type DisplayRow = 
    | { type: 'product'; product: Product }
    | { type: 'item'; product: Product; item: PurchaseItem; purchase: Purchase; rowKey: string }

  const displayRows = useMemo((): DisplayRow[] => {
    if (filterSupplierId) {
      const rows: DisplayRow[] = []
      const purchasesFromSupplier = purchases.filter(
        p => (p as { supplier_id?: number }).supplier_id === filterSupplierId
      )
      for (const purchase of purchasesFromSupplier) {
        purchase.items.forEach((item, idx) => {
          const product = products.find(pr => pr.id === item.product_id)
          if (!product || product.status !== 'active') return
          const matchCategory = !filterCategoryId || product.category_id === filterCategoryId
          let matchProduct = true
          if (filterProductId) {
            const selected = products.find(x => x.id === filterProductId)
            if (selected) {
              matchProduct = product.id === filterProductId || product.category_id === selected.category_id
            } else {
              matchProduct = product.id === filterProductId
            }
          }
          const matchSearch =
            !searchQuery ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.article && String(item.article).toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.barcode && String(item.barcode).toLowerCase().includes(searchQuery.toLowerCase()))
          if (matchCategory && matchProduct && matchSearch) {
            rows.push({
              type: 'item',
              product,
              item,
              purchase,
              rowKey: `p${purchase.id}-i${idx}-${item.product_id}-${item.article || item.id || ''}`,
            })
          }
        })
      }
      return rows
    }
    return filteredProducts.map(p => ({ type: 'product' as const, product: p }))
  }, [filterSupplierId, purchases, products, filterCategoryId, filterProductId, searchQuery, filteredProducts])

  const getPriceKey = (productId: number, article?: string | null) =>
    productSegmentPriceService.priceKey(productId, selectedSegmentId ?? 0, article)

  const getPriceForRow = (row: DisplayRow): number | undefined => {
    const productId = row.product.id
    if (row.type === 'product') {
      return segmentPricesMap.get(getPriceKey(productId))
    }
    const article = row.item.article?.toString().trim() || undefined
    const itemKey = getPriceKey(productId, article)
    const productKey = getPriceKey(productId)
    return segmentPricesMap.get(itemKey) ?? segmentPricesMap.get(productKey)
  }

  const [pendingEdits, setPendingEdits] = useState<Map<string, string>>(new Map())
  const pendingCount = pendingEdits.size

  const getDisplayPriceForRow = (row: DisplayRow, rowKey: string): string => {
    if (pendingEdits.has(rowKey)) return pendingEdits.get(rowKey)!
    const price = getPriceForRow(row)
    return price != null ? String(price) : ''
  }

  const handlePriceChange = (rowKey: string, value: string) => {
    if (value === '') {
      setPendingEdits(prev => {
        const next = new Map(prev)
        next.delete(rowKey)
        return next
      })
    } else {
      setPendingEdits(prev => new Map(prev).set(rowKey, value))
    }
  }

  const handleSaveAllPrices = async () => {
    if (!selectedSegmentId || pendingCount === 0) return
    const invalid: string[] = []
    const toSave: { rowKey: string; productId: number; article?: string; price: number }[] = []
    pendingEdits.forEach((val, rowKey) => {
      const price = parseFloat(val)
      if (isNaN(price) || price < 0) invalid.push(rowKey)
      else {
        const row = displayRows.find(
          r => (r.type === 'item' ? r.rowKey : `prod-${r.product.id}`) === rowKey
        )
        if (row) {
          toSave.push({
            rowKey,
            productId: row.product.id,
            article: row.type === 'item' ? row.item.article?.toString().trim() : undefined,
            price,
          })
        }
      }
    })
    if (invalid.length > 0) {
      toast.error('Please enter valid prices for all changes')
      return
    }
    if (!window.confirm(`Save ${toSave.length} price change(s)?`)) return
    setSaving(true)
    try {
      const companyId = getCurrentCompanyId()
      for (const { productId, article, price } of toSave) {
        await productSegmentPriceService.setPrice(
          productId,
          selectedSegmentId,
          price,
          companyId ?? undefined,
          article
        )
      }
      setPendingEdits(new Map())
      await loadSegmentPrices(selectedSegmentId)
      toast.success(`Successfully saved ${toSave.length} price(s)`)
    } catch (err) {
      toast.error('Failed to save prices')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardEdits = () => {
    if (pendingCount > 0 && window.confirm('Discard all unsaved changes?')) {
      setPendingEdits(new Map())
    }
  }

  const handleSaveSegment = async () => {
    if (!segmentForm.name.trim()) {
      toast.error('Segment name is required')
      return
    }
    setSaving(true)
    try {
      const companyId = getCurrentCompanyId()
      if (editingSegmentId) {
        await priceSegmentService.update(editingSegmentId, {
          name: segmentForm.name.trim(),
          description: segmentForm.description.trim() || undefined,
          is_default: segmentForm.is_default,
        })
        toast.success('Segment updated')
      } else {
        const maxOrder = Math.max(0, ...segments.map(s => s.sort_order))
        await priceSegmentService.create({
          name: segmentForm.name.trim(),
          description: segmentForm.description.trim() || undefined,
          is_default: segmentForm.is_default,
          sort_order: maxOrder + 1,
          company_id: companyId ?? undefined,
        })
        toast.success('Segment created')
      }
      setSegmentForm({ name: '', description: '', is_default: false })
      setEditingSegmentId(null)
      setShowSegmentForm(false)
      loadData()
    } catch (err) {
      toast.error(editingSegmentId ? 'Failed to update segment' : 'Failed to create segment')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSegment = (seg: PriceSegment) => {
    setSegmentForm({
      name: seg.name,
      description: seg.description || '',
      is_default: seg.is_default,
    })
    setEditingSegmentId(seg.id)
    setShowSegmentForm(true)
  }

  const handleDeleteSegment = async (id: number) => {
    const seg = segments.find(s => s.id === id)
    if (!seg) return
    if (seg.is_default) {
      toast.error('Cannot delete the default segment')
      return
    }
    if (!window.confirm(`Delete segment "${seg.name}"? Customers using it will fall back to default pricing.`)) return
    try {
      await priceSegmentService.delete(id)
      toast.success('Segment deleted')
      if (selectedSegmentId === id) setSelectedSegmentId(null)
      loadData()
    } catch {
      toast.error('Failed to delete segment')
    }
  }

  const selectedSegment = segments.find(s => s.id === selectedSegmentId)

  return (
    <ProtectedRoute requiredPermission="products:read">
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
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                    <Tag className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Price Lists</h1>
                    <p className="text-sm text-gray-600">Manage pricing by customer segment (wholesale, VIP, etc.)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Segments sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Segments</h2>
                    {hasPermission('products:update') && (
                      <button
                        onClick={() => {
                          setEditingSegmentId(null)
                          setSegmentForm({ name: '', description: '', is_default: false })
                          setShowSegmentForm(true)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Add segment"
                      >
                        <Plus className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                    {segments.map(seg => (
                      <div
                        key={seg.id}
                        className={`flex items-center justify-between gap-2 px-4 py-3 cursor-pointer transition-colors ${
                          selectedSegmentId === seg.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSegmentId(seg.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <span className="font-medium text-gray-900 truncate block">{seg.name}</span>
                          {seg.is_default && (
                            <span className="text-xs text-emerald-600 font-medium">Default</span>
                          )}
                        </button>
                        {hasPermission('products:update') && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditSegment(seg) }}
                              className="p-1.5 hover:bg-gray-200 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                            {!seg.is_default && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteSegment(seg.id) }}
                                className="p-1.5 hover:bg-red-100 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {showSegmentForm && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-4 space-y-4">
                    <h3 className="font-semibold text-gray-900">
                      {editingSegmentId ? 'Edit Segment' : 'Add Segment'}
                    </h3>
                    <input
                      type="text"
                      value={segmentForm.name}
                      onChange={(e) => setSegmentForm({ ...segmentForm, name: e.target.value })}
                      placeholder="Segment name (e.g. Wholesale)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={segmentForm.description}
                      onChange={(e) => setSegmentForm({ ...segmentForm, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={segmentForm.is_default}
                        onChange={(e) => setSegmentForm({ ...segmentForm, is_default: e.target.checked })}
                      />
                      <span className="text-sm text-gray-700">Default (Retail) pricing</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveSegment}
                        disabled={saving}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setShowSegmentForm(false)
                          setEditingSegmentId(null)
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Product prices grid */}
              <div className="lg:col-span-3">
                {selectedSegment ? (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-900 mb-1">
                        Prices for {selectedSegment.name}
                      </h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Set custom prices per product. Leave blank to use default (product) selling price.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="relative sm:col-span-2 lg:col-span-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <select
                          value={filterCategoryId}
                          onChange={(e) => setFilterCategoryId(e.target.value ? Number(e.target.value) : '')}
                          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All categories</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <select
                          value={filterProductId}
                          onChange={(e) => setFilterProductId(e.target.value ? Number(e.target.value) : '')}
                          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                          title="Select product to show it and others in same category"
                        >
                          <option value="">All products</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}{p.sku ? ` (${p.sku})` : ''}
                            </option>
                          ))}
                        </select>
                        <select
                          value={filterSupplierId}
                          onChange={(e) => setFilterSupplierId(e.target.value ? Number(e.target.value) : '')}
                          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                          title="Products purchased from this supplier"
                        >
                          <option value="">All suppliers</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {filterProductId && 'Showing selected product + same category. '}
                        {filterSupplierId && 'Item-wise: all purchase items from selected supplier. '}
                        Showing {displayRows.length} {filterSupplierId ? 'item(s)' : 'product(s)'}
                      </p>
                      {pendingCount > 0 && (
                        <div className="flex items-center gap-3 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <span className="text-sm font-medium text-amber-800">
                            {pendingCount} unsaved change(s)
                          </span>
                          <button
                            type="button"
                            onClick={handleSaveAllPrices}
                            disabled={saving}
                            className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save All'}
                          </button>
                          <button
                            type="button"
                            onClick={handleDiscardEdits}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Discard
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
                            {filterSupplierId && (
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Article / Barcode</th>
                            )}
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Purchase Price</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Purchase (incl. GST)</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Current Sale Price</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">
                              {selectedSegment.name} Price
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Profit/Loss (₹)</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Profit/Loss (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {displayRows.map(row => {
                            const product = row.product
                            const category = categories.find(c => c.id === product.category_id)
                            const rowKey = row.type === 'item' ? row.rowKey : `prod-${product.id}`
                            const defaultPrice = row.type === 'item'
                              ? (row.item.sale_price ?? row.item.mrp ?? product.selling_price ?? 0)
                              : (product.selling_price ?? 0)
                            const savedSegPrice = getPriceForRow(row)
                            const pendingVal = pendingEdits.get(rowKey)
                            const currentSalePrice = pendingVal !== undefined
                              ? (parseFloat(pendingVal) || defaultPrice)
                              : (savedSegPrice != null ? savedSegPrice : defaultPrice)
                            const purchasePrice = row.type === 'item'
                              ? row.item.unit_price
                              : (product.purchase_price ?? 0)
                            const gstRate = row.type === 'item'
                              ? (row.item.gst_rate ?? product.gst_rate ?? 0)
                              : (product.gst_rate ?? 0)
                            const purchasePriceWithGst = purchasePrice * (1 + gstRate / 100)
                            const profitLossAmount = currentSalePrice - purchasePrice
                            const profitLossPct = purchasePrice > 0
                              ? ((currentSalePrice - purchasePrice) / purchasePrice) * 100
                              : 0
                            const isProfit = profitLossAmount >= 0
                            const inputValue = getDisplayPriceForRow(row, rowKey)
                            return (
                              <tr key={rowKey} className="hover:bg-gray-50/50">
                                <td className="py-3 px-4">
                                  <span className="font-medium text-gray-900">{product.name}</span>
                                  {product.sku && (
                                    <span className="block text-xs text-gray-500">SKU: {product.sku}</span>
                                  )}
                                </td>
                                {filterSupplierId && (
                                  <td className="py-3 px-4 text-gray-600">
                                    {row.type === 'item' ? (
                                      <>
                                        {row.item.article && <span className="block">{row.item.article}</span>}
                                        {row.item.barcode && <span className="block text-xs text-gray-500">{row.item.barcode}</span>}
                                        {!row.item.article && !row.item.barcode && '—'}
                                      </>
                                    ) : '—'}
                                  </td>
                                )}
                                <td className="py-3 px-4 text-gray-600">
                                  {category?.name || '—'}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-600">
                                  ₹{purchasePrice.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-600">
                                  ₹{purchasePriceWithGst.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-600 font-medium">
                                  ₹{currentSalePrice.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={inputValue}
                                    onChange={(e) => handlePriceChange(rowKey, e.target.value)}
                                    placeholder={defaultPrice.toFixed(2)}
                                    className="w-24 text-right px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                                <td className={`py-3 px-4 text-right font-medium ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {isProfit ? '+' : ''}₹{profitLossAmount.toFixed(2)}
                                </td>
                                <td className={`py-3 px-4 text-right font-medium ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {purchasePrice > 0 ? `${isProfit ? '+' : ''}${profitLossPct.toFixed(1)}%` : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {displayRows.length === 0 && (
                        <div className="py-12 text-center text-gray-500">
                          No products match your filters.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-12 text-center text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Select a segment to set product prices.</p>
                    {segments.length === 0 && (
                      <p className="mt-2 text-sm">Add a segment first to get started.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default PriceLists
