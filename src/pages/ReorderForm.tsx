/**
 * Reorder Form: Place order (saved as Order Placed), download PDF/Excel for supplier, or continue to GST/Simple Purchase.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { purchaseService, supplierService } from '../services/purchaseService'
import { companyService } from '../services/companyService'
import { purchaseReorderService } from '../services/purchaseReorderService'
import { productService, Product } from '../services/productService'
import { Home, Package, ShoppingBag, ChevronRight, FileDown, FileSpreadsheet, AlertTriangle, Search } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { exportReorderToPdf, exportReorderToExcel } from '../utils/exportUtils'
import type { Purchase } from '../types/purchase'
import type { Supplier } from '../types/purchase'
import type { PurchaseItem } from '../types/purchase'

interface ReorderRow {
  product_id: number
  product_name: string
  unit: string
  last_purchase_date: string | null
  last_qty: number | null
  last_rate: number | null
  reorder_qty: number
  reorder_qty_box: number
  reorder_qty_piece: number
  reorder_rate: number
}

/** Low-stock item shape passed from Reorder List (stock) */
interface LowStockItem {
  product_id: number
  product_name: string
  unit: string
  suggested_qty: number
  last_purchase_rate: number | null
  last_purchase_date: string | null
}

const ReorderForm = () => {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { lowStockItems?: LowStockItem[] } }
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('')
  const [rows, setRows] = useState<ReorderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reorderType, setReorderType] = useState<'gst' | 'simple'>('gst')
  const [reorderNumber, setReorderNumber] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [addProductQuery, setAddProductQuery] = useState('')
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [lastSavedReorderId, setLastSavedReorderId] = useState<number | null>(null)
  const appliedLowStockRef = useRef(false)
  const addProductRef = useRef<HTMLDivElement>(null)

  const companyId = getCurrentCompanyId()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const cid = getCurrentCompanyId()
      try {
        const [sups, purchs, prods, nextRo, company] = await Promise.all([
          supplierService.getAll(cid ?? undefined),
          purchaseService.getAll(undefined, cid ?? undefined),
          productService.getAll(true, cid ?? undefined),
          purchaseReorderService.getNextReorderNumber(cid ?? undefined),
          cid ? companyService.getById(cid) : Promise.resolve(null),
        ])
        setSuppliers(sups)
        setPurchases(purchs)
        setProducts(prods)
        setReorderNumber(nextRo)
        setCompanyName(company?.name || company?.unique_code || '')
      } catch (e) {
        console.error('Reorder form load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getCurrentCompanyId])

  // Pre-fill rows when coming from Reorder List (stock) with "Place order" / "Place order for these"
  useEffect(() => {
    const lowStock = location.state?.lowStockItems
    if (!lowStock?.length) return
    const productMap = new Map(products.map(p => [p.id, p]))
    const newRows: ReorderRow[] = lowStock.map((item: LowStockItem) => {
      const product = productMap.get(item.product_id)
      return {
        product_id: item.product_id,
        product_name: product?.name ?? item.product_name,
        unit: product?.unit ?? item.unit ?? 'pcs',
        last_purchase_date: item.last_purchase_date ?? null,
        last_qty: null,
        last_rate: item.last_purchase_rate ?? null,
        reorder_qty: item.suggested_qty,
        reorder_qty_box: 1,
        reorder_qty_piece: item.suggested_qty,
        reorder_rate: item.last_purchase_rate ?? 0,
      }
    })
    setRows(newRows)
    appliedLowStockRef.current = true
    // Clear state after a tick so setRows commits first and supplier effect won't clear rows
    const t = setTimeout(() => {
      navigate('.', { replace: true, state: {} })
    }, 0)
    return () => clearTimeout(t)
  }, [location.state?.lowStockItems, products.length, navigate])

  const selectedSupplier = useMemo(
    () => (selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId) : null),
    [suppliers, selectedSupplierId]
  )

  // Build "last purchase per product from this supplier" when supplier is selected
  const previousPurchaseByProduct = useMemo(() => {
    if (!selectedSupplierId) return new Map<number, { date: string; qty: number; rate: number; product_name?: string; unit?: string }>()
    const byProduct = new Map<number, { date: string; qty: number; rate: number; product_name?: string; unit?: string }>()
    const fromSupplier = purchases.filter(p => (p as any).supplier_id === selectedSupplierId)
    const sorted = [...fromSupplier].sort(
      (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    )
    sorted.forEach(p => {
      p.items.forEach(item => {
        if (!item.product_id) return
        if (byProduct.has(item.product_id)) return
        byProduct.set(item.product_id, {
          date: p.purchase_date,
          qty: item.quantity ?? 0,
          rate: item.unit_price ?? 0,
          product_name: item.product_name,
          unit: undefined,
        })
      })
    })
    return byProduct
  }, [purchases, selectedSupplierId])

  // When supplier changes, build rows from previous purchases (with product names and units from products).
  // Don't clear rows when we just landed with lowStockItems (ref set by pre-fill effect).
  useEffect(() => {
    if (selectedSupplierId) appliedLowStockRef.current = false
    if (!selectedSupplierId || products.length === 0) {
      if (!appliedLowStockRef.current) setRows([])
      return
    }
    const productMap = new Map(products.map(p => [p.id, p]))
    const newRows: ReorderRow[] = []
    previousPurchaseByProduct.forEach((last, product_id) => {
      const product = productMap.get(product_id)
      const name = product?.name || last.product_name || `Product #${product_id}`
      const unit = product?.unit || 'pcs'
      newRows.push({
        product_id,
        product_name: name,
        unit,
        last_purchase_date: last.date,
        last_qty: last.qty,
        last_rate: last.rate,
        reorder_qty: last.qty,
        reorder_qty_box: 1,
        reorder_qty_piece: last.qty,
        reorder_rate: last.rate,
      })
    })
    newRows.sort((a, b) => a.product_name.localeCompare(b.product_name))
    setRows(newRows)
  }, [selectedSupplierId, previousPurchaseByProduct, products])

  const updateRow = (index: number, field: 'reorder_qty' | 'reorder_qty_box' | 'reorder_qty_piece' | 'reorder_rate', value: number) => {
    setRows(prev => {
      const next = [...prev]
      const row = { ...next[index], [field]: value }
      // Ordered Qty: Box × Piece when both > 0; else Box or Piece (whichever is set)
      if (field === 'reorder_qty_box' || field === 'reorder_qty_piece') {
        const box = row.reorder_qty_box
        const piece = row.reorder_qty_piece
        row.reorder_qty = box > 0 && piece > 0 ? Math.round(box * piece * 100) / 100 : (box || piece)
      }
      next[index] = row
      return next
    })
  }

  const addProductRow = (productId?: number) => {
    const usedIds = new Set(rows.map(r => r.product_id))
    const product = productId
      ? products.find(p => p.id === productId && !usedIds.has(p.id))
      : products.find(p => !usedIds.has(p.id))
    if (!product) return
    setRows(prev => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        unit: product.unit || 'pcs',
        last_purchase_date: null,
        last_qty: null,
        last_rate: null,
        reorder_qty: 1,
        reorder_qty_box: 1,
        reorder_qty_piece: 1,
        reorder_rate: 0,
      },
    ])
  }

  const unusedProducts = useMemo(() => {
    const usedIds = new Set(rows.map(r => r.product_id))
    return products
      .filter(p => !usedIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, rows])

  const addProductSuggestions = useMemo(() => {
    if (!addProductQuery.trim()) return unusedProducts.slice(0, 15)
    const q = addProductQuery.trim().toLowerCase()
    return unusedProducts
      .filter(p => (p.name || '').toLowerCase().includes(q))
      .slice(0, 15)
  }, [unusedProducts, addProductQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addProductRef.current && !addProductRef.current.contains(e.target as Node)) {
        setAddProductOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredRowsWithIndex = useMemo(() => {
    if (!itemSearch.trim()) return rows.map((row, i) => ({ row, index: i }))
    const q = itemSearch.trim().toLowerCase()
    return rows
      .map((row, i) => ({ row, index: i }))
      .filter(({ row }) => (row.product_name || '').trim().toLowerCase().includes(q))
  }, [rows, itemSearch])

  // Low-stock list: same logic as Reorder List (stock) for "Add from low stock" in this form
  const lowStockRows = useMemo((): ReorderRow[] => {
    const result: ReorderRow[] = []
    const lastPurchaseByProduct = new Map<number, { qty: number; rate: number; date: string }>()
    const sortedPurchases = [...purchases].sort(
      (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    )
    sortedPurchases.forEach(p => {
      p.items.forEach(item => {
        if (!item.product_id || lastPurchaseByProduct.has(item.product_id)) return
        lastPurchaseByProduct.set(item.product_id, {
          qty: item.quantity ?? 0,
          rate: item.unit_price ?? 0,
          date: p.purchase_date,
        })
      })
    })
    products.forEach(product => {
      const minStock = product.min_stock_level ?? 0
      const current = product.stock_quantity ?? 0
      if (minStock <= 0 || current >= minStock) return
      const last = lastPurchaseByProduct.get(product.id)
      const suggested = Math.max(minStock * 2 - current, last?.qty ?? minStock, minStock)
      result.push({
        product_id: product.id,
        product_name: product.name,
        unit: product.unit || 'pcs',
        last_purchase_date: last?.date ?? null,
        last_qty: last?.qty ?? null,
        last_rate: last?.rate ?? null,
        reorder_qty: suggested,
        reorder_qty_box: 1,
        reorder_qty_piece: suggested,
        reorder_rate: last?.rate ?? 0,
      })
    })
    result.sort((a, b) => a.product_name.localeCompare(b.product_name))
    return result
  }, [products, purchases])

  const addFromLowStockList = () => {
    const existingIds = new Set(rows.map(r => r.product_id))
    const toAdd = lowStockRows.filter(r => !existingIds.has(r.product_id))
    if (toAdd.length === 0) {
      toast.error(lowStockRows.length === 0 ? 'No products below min stock. Set min stock on products first.' : 'All low-stock items are already in the list.')
      return
    }
    setRows(prev => [...prev, ...toAdd])
    toast.success(`Added ${toAdd.length} item(s) from low stock list`)
  }

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const orderDate = new Date().toISOString().slice(0, 10)

  const getOrderedQty = (r: ReorderRow) =>
    r.reorder_qty_box > 0 && r.reorder_qty_piece > 0 ? r.reorder_qty_box * r.reorder_qty_piece : (r.reorder_qty_box || r.reorder_qty_piece)

  const buildReorderItems = () =>
    rows
      .filter(r => getOrderedQty(r) > 0)
      .map(r => {
        const orderedQty = getOrderedQty(r)
        return {
        product_id: r.product_id,
        product_name: r.product_name,
        unit_price: r.reorder_rate,
        ordered_qty: orderedQty,
        ordered_qty_box: r.reorder_qty_box,
        ordered_qty_piece: r.reorder_qty_piece,
        received_qty: 0,
        total: Math.round(orderedQty * r.reorder_rate * 100) / 100,
        gst_rate: reorderType === 'gst' ? 18 : undefined,
      }})

  const placeOrder = async () => {
    if (!companyId) {
      toast.error('Please select a company first (switch company from dashboard)')
      return
    }
    if (!selectedSupplierId || !selectedSupplier) {
      toast.error('Please select a supplier')
      return
    }
    const items = buildReorderItems()
    if (items.length === 0) {
      toast.error('Add at least one item and set Qty (Box) × Qty (Piece) > 0')
      return
    }
    const roNum = reorderNumber?.trim() || `RO-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`
    setSaving(true)
    try {
      const subtotal = items.reduce((s, i) => s + i.total, 0)
      const totalTax = reorderType === 'gst' ? items.reduce((s, i) => s + (i.gst_rate ?? 0) / 100 * i.total, 0) : 0
      const grandTotal = Math.round((subtotal + totalTax) * 100) / 100
      const reorder = await purchaseReorderService.create({
        company_id: companyId,
        type: reorderType,
        supplier_id: selectedSupplierId,
        supplier_name: selectedSupplier.name,
        supplier_gstin: selectedSupplier.gstin,
        reorder_number: roNum,
        order_date: orderDate,
        expected_date: expectedDate || undefined,
        status: 'placed',
        notes: notes || undefined,
        subtotal,
        total_tax: totalTax,
        grand_total: grandTotal,
        items: items.map(it => ({
          ...it,
          product_name: it.product_name,
        })),
      })
      setLastSavedReorderId(reorder.id)
      toast.success('Order placed successfully')
      setReorderNumber(await purchaseReorderService.getNextReorderNumber(companyId))
    } catch (e) {
      console.error(e)
      toast.error('Failed to place order')
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = () => {
    if (!selectedSupplierId || !selectedSupplier) {
      toast.error('Please select a supplier first')
      return
    }
    const items = buildReorderItems()
    if (items.length === 0) {
      toast.error('Add at least one item and set Qty (Box) × Qty (Piece) > 0 to export')
      return
    }
    const roNum = reorderNumber?.trim() || `RO-${Date.now()}`
    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const totalTax = reorderType === 'gst' ? items.reduce((s, i) => s + (i.gst_rate ?? 0) / 100 * i.total, 0) : 0
    try {
      exportReorderToPdf(
        {
          reorder_number: roNum,
          order_date: orderDate,
          expected_date: expectedDate || undefined,
          supplier_name: selectedSupplier?.name,
          supplier_gstin: selectedSupplier?.gstin,
          status: 'Draft',
          notes,
          subtotal,
          total_tax: totalTax,
          grand_total: Math.round((subtotal + totalTax) * 100) / 100,
          items,
        },
        companyName || undefined,
        `Reorder_${roNum}`
      )
      toast.success('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error('PDF download failed')
    }
  }

  const downloadExcel = () => {
    if (!selectedSupplierId || !selectedSupplier) {
      toast.error('Please select a supplier first')
      return
    }
    const items = buildReorderItems()
    if (items.length === 0) {
      toast.error('Add at least one item and set Qty (Box) × Qty (Piece) > 0 to export')
      return
    }
    const roNum = reorderNumber?.trim() || `RO-${Date.now()}`
    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const totalTax = reorderType === 'gst' ? items.reduce((s, i) => s + (i.gst_rate ?? 0) / 100 * i.total, 0) : 0
    try {
      exportReorderToExcel(
        {
          reorder_number: roNum,
          order_date: orderDate,
          expected_date: expectedDate || undefined,
          supplier_name: selectedSupplier?.name,
          supplier_gstin: selectedSupplier?.gstin,
          status: 'Draft',
          notes,
          subtotal,
          total_tax: totalTax,
          grand_total: Math.round((subtotal + totalTax) * 100) / 100,
          items,
        },
        companyName || undefined,
        `Reorder_${roNum}`
      )
      toast.success('Excel downloaded')
    } catch (e) {
      console.error(e)
      toast.error('Excel download failed')
    }
  }

  const continueToGSTPurchase = () => {
    if (!selectedSupplierId || !selectedSupplier || rows.length === 0) return
    const items: PurchaseItem[] = rows
      .filter(r => getOrderedQty(r) > 0)
      .map(r => {
        const qty = getOrderedQty(r)
        return {
        product_id: r.product_id,
        product_name: r.product_name,
        quantity: qty,
        unit_price: r.reorder_rate,
        total: Math.round(qty * r.reorder_rate * 100) / 100,
        gst_rate: 18,
        tax_amount: 0,
        hsn_code: '',
        purchase_type: 'purchase' as const,
      }})
    if (items.length === 0) return
    navigate(reorderType === 'gst' ? '/purchases/new-gst' : '/purchases/new-simple', {
      state: {
        reorderPreload: {
          supplierId: selectedSupplierId,
          supplierName: selectedSupplier.name,
          supplierGstin: selectedSupplier.gstin,
          items,
        },
      },
    })
  }

  const canContinue = selectedSupplierId && selectedSupplier && rows.some(r => getOrderedQty(r) > 0)

  return (
    <ProtectedRoute requiredPermission="purchases:create">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Back to Dashboard"
                >
                  <Home className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-8 h-8 text-indigo-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Place Reorder</h1>
                    <p className="text-sm text-gray-600">Select supplier, add items, place order (no stock update). Download PDF/Excel to send to supplier.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/purchases/reorders')}
                  className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-100 text-sm font-medium"
                >
                  Reorder History
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading suppliers and purchases...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Type, Reorder #, Expected date, Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={reorderType}
                    onChange={e => setReorderType(e.target.value as 'gst' | 'simple')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="gst">GST</option>
                    <option value="simple">Simple</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder #</label>
                  <input
                    type="text"
                    value={reorderNumber}
                    onChange={e => setReorderNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={e => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Order from - your business */}
              {companyName && (
                <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
                  <p className="text-sm text-indigo-800 font-medium">
                    Order from: <span className="font-bold text-indigo-900">{companyName}</span>
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">Suppliers will see this on the reorder PDF/Excel.</p>
                </div>
              )}

              {/* Supplier selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Supplier
                </h2>
                <p className="text-sm text-gray-500 mb-3">Select a supplier to see products and previous purchase details.</p>
                <select
                  value={selectedSupplierId || ''}
                  onChange={e => setSelectedSupplierId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="">Select supplier (Total: {suppliers.length})</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.gstin ? `(${s.gstin})` : ''}
                    </option>
                  ))}
                </select>
                {selectedSupplier && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-sm font-medium text-indigo-900">{selectedSupplier.name}</p>
                    {selectedSupplier.gstin && <p className="text-xs text-indigo-700">GSTIN: {selectedSupplier.gstin}</p>}
                    {selectedSupplier.phone && <p className="text-xs text-indigo-700">Phone: {selectedSupplier.phone}</p>}
                  </div>
                )}
              </div>

              {/* Listed products: from supplier's previous purchases or from low stock list */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedSupplierId ? `Products from ${selectedSupplier?.name}` : 'Items to order'}
                    </h2>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                      <Search className="w-4 h-4 text-gray-500 shrink-0" />
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={e => setItemSearch(e.target.value)}
                        placeholder="Search items by name..."
                        className="w-48 sm:w-56 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        title="Filter items by product name"
                      />
                    </div>
                    <div className="relative" ref={addProductRef}>
                      <input
                        type="text"
                        value={addProductQuery}
                        onChange={e => {
                          setAddProductQuery(e.target.value)
                          setAddProductOpen(true)
                        }}
                        onFocus={() => setAddProductOpen(true)}
                        placeholder={selectedSupplierId ? 'Search to add product...' : 'Select supplier first'}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[220px] bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={!selectedSupplierId}
                        title={selectedSupplierId ? 'Add any product to the order' : 'Select a supplier first'}
                      />
                      {addProductOpen && selectedSupplierId && (addProductQuery.trim() || addProductSuggestions.length > 0) && (
                        <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px]">
                          {addProductSuggestions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No matching products</div>
                          ) : (
                            addProductSuggestions.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  addProductRow(p.id)
                                  setAddProductQuery('')
                                  setAddProductOpen(false)
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                              >
                                {p.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded w-full sm:w-auto">
                    Set <strong>Qty (Box)</strong> and/or <strong>Qty (Piece)</strong> (or both: Box × Piece). Enter <strong>Rate</strong> for each row.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={addFromLowStockList}
                        disabled={lowStockRows.length === 0}
                        className="flex items-center gap-1 px-3 py-2 border border-amber-300 rounded-lg hover:bg-amber-50 text-amber-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title={lowStockRows.length === 0 ? 'Set min stock on products to see low-stock list' : `Add ${lowStockRows.length} low-stock product(s) to this order`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Add from low stock list
                        {lowStockRows.length > 0 && (
                          <span className="bg-amber-200 text-amber-900 rounded-full px-1.5 text-xs">
                            {lowStockRows.length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={placeOrder}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!selectedSupplierId ? 'Select a supplier first' : rows.length === 0 ? 'Add at least one product' : 'Set Reorder Qty > 0 for items to place order'}
                      >
                        {saving ? 'Placing…' : 'Place Order'}
                      </button>
                      <button
                        type="button"
                        onClick={downloadPdf}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
                        title="Select supplier and add items with qty > 0"
                      >
                        <FileDown className="w-4 h-4" />
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={downloadExcel}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
                        title="Select supplier and add items with qty > 0"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Download Excel
                      </button>
                      <button
                        type="button"
                        disabled={!canContinue}
                        onClick={continueToGSTPurchase}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue to {reorderType === 'gst' ? 'GST' : 'Simple'} Purchase
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {rows.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {selectedSupplierId
                        ? 'No previous purchases found from this supplier. Use &quot;Add from low stock list&quot; or &quot;Add product&quot; to add items.'
                        : 'Select a supplier, or use &quot;Add from low stock list&quot; / &quot;Add product&quot; to add items.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Product</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">Last Purchase Date</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Last Qty</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Last Rate (₹)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200" title="Ordered Qty = Qty (Box) × Qty (Piece)">Ordered Qty</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Qty (Box)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Qty (Piece)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Rate (₹)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Total</th>
                            <th className="px-3 py-2 w-16 border-b border-gray-200" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRowsWithIndex.length === 0 && itemSearch.trim() ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                                No items match &quot;{itemSearch.trim()}&quot;
                              </td>
                            </tr>
                          ) : (
                          filteredRowsWithIndex.map(({ row, index }) => (
                            <tr key={`${row.product_id}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {row.product_name}
                                <span className="text-gray-400 text-xs ml-1">({row.unit})</span>
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {row.last_purchase_date
                                  ? new Date(row.last_purchase_date).toLocaleDateString('en-IN')
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {row.last_qty != null ? row.last_qty : '—'}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {row.last_rate != null ? `₹${row.last_rate.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-800 font-medium" title="Ordered Qty = Box × Piece, or Box or Piece when only one is set">
                                {getOrderedQty(row)}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.reorder_qty_box === 0 ? '' : String(row.reorder_qty_box)}
                                  onChange={e => {
                                    const v = e.target.value.replace(/[^0-9.]/g, '')
                                    const num = v === '' ? 0 : Math.max(0, parseFloat(v) || 0)
                                    updateRow(index, 'reorder_qty_box', num)
                                  }}
                                  placeholder="0"
                                  className="w-20 px-2 py-1.5 border border-gray-300 rounded text-right"
                                  title="Ordered Qty in Box"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.reorder_qty_piece === 0 ? '' : String(row.reorder_qty_piece)}
                                  onChange={e => {
                                    const v = e.target.value.replace(/[^0-9.]/g, '')
                                    const num = v === '' ? 0 : Math.max(0, parseFloat(v) || 0)
                                    updateRow(index, 'reorder_qty_piece', num)
                                  }}
                                  placeholder="0"
                                  className="w-20 px-2 py-1.5 border border-gray-300 rounded text-right"
                                  title="Ordered Qty in Piece"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={row.reorder_rate === 0 ? '' : String(row.reorder_rate)}
                                  onChange={e => {
                                    const v = e.target.value.replace(/[^0-9.]/g, '')
                                    const num = v === '' ? 0 : Math.max(0, parseFloat(v) || 0)
                                    updateRow(index, 'reorder_rate', num)
                                  }}
                                  placeholder="0"
                                  className="w-24 px-2 py-1.5 border border-gray-300 rounded text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                ₹{(getOrderedQty(row) * row.reorder_rate).toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeRow(index)}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                  Remove
                                </button>
                              </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
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

export default ReorderForm
