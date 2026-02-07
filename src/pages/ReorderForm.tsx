/**
 * Reorder Form: Place order (saved as Order Placed), download PDF/Excel for supplier, or continue to GST/Simple Purchase.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { purchaseService, supplierService } from '../services/purchaseService'
import { purchaseReorderService } from '../services/purchaseReorderService'
import { productService, Product } from '../services/productService'
import { Home, Package, ShoppingBag, ChevronRight, FileDown, FileSpreadsheet, AlertTriangle } from 'lucide-react'
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
  const [lastSavedReorderId, setLastSavedReorderId] = useState<number | null>(null)
  const appliedLowStockRef = useRef(false)

  const companyId = getCurrentCompanyId()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const cid = getCurrentCompanyId()
      try {
        const [sups, purchs, prods, nextRo] = await Promise.all([
          supplierService.getAll(cid ?? undefined),
          purchaseService.getAll(undefined, cid ?? undefined),
          productService.getAll(true, cid ?? undefined),
          purchaseReorderService.getNextReorderNumber(cid ?? undefined),
        ])
        setSuppliers(sups)
        setPurchases(purchs)
        setProducts(prods)
        setReorderNumber(nextRo)
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
        reorder_rate: last.rate,
      })
    })
    newRows.sort((a, b) => a.product_name.localeCompare(b.product_name))
    setRows(newRows)
  }, [selectedSupplierId, previousPurchaseByProduct, products])

  const updateRow = (index: number, field: 'reorder_qty' | 'reorder_rate', value: number) => {
    setRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
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
        reorder_rate: 0,
      },
    ])
  }

  const unusedProducts = useMemo(() => {
    const usedIds = new Set(rows.map(r => r.product_id))
    return products.filter(p => !usedIds.has(p.id))
  }, [products, rows])

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

  const buildReorderItems = () =>
    rows
      .filter(r => r.reorder_qty > 0)
      .map(r => ({
        product_id: r.product_id,
        product_name: r.product_name,
        unit_price: r.reorder_rate,
        ordered_qty: r.reorder_qty,
        received_qty: 0,
        total: Math.round(r.reorder_qty * r.reorder_rate * 100) / 100,
        gst_rate: reorderType === 'gst' ? 18 : undefined,
      }))

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
      toast.error('Add at least one item and set Reorder Qty > 0')
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
      toast.error('Add at least one item and set Reorder Qty > 0 to export')
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
        undefined,
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
      toast.error('Add at least one item and set Reorder Qty > 0 to export')
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
        undefined,
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
      .filter(r => r.reorder_qty > 0)
      .map(r => ({
        product_id: r.product_id,
        product_name: r.product_name,
        quantity: r.reorder_qty,
        unit_price: r.reorder_rate,
        total: Math.round(r.reorder_qty * r.reorder_rate * 100) / 100,
        gst_rate: 18,
        tax_amount: 0,
        hsn_code: '',
        purchase_type: 'purchase' as const,
      }))
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

  const canContinue = selectedSupplierId && selectedSupplier && rows.some(r => r.reorder_qty > 0)

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
              {(selectedSupplierId || rows.length > 0 || lowStockRows.length > 0) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedSupplierId ? `Products from previous purchases — ${selectedSupplier?.name}` : 'Items to order'}
                    </h2>
                    <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded w-full sm:w-auto">
                      Set <strong>Reorder Qty</strong> and <strong>Rate</strong> for each row, then use Place Order or Download PDF/Excel.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
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
                      <select
                        value=""
                        onChange={e => {
                          const id = e.target.value ? parseInt(e.target.value) : undefined
                          if (id) addProductRow(id)
                          e.target.value = ''
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[180px]"
                      >
                        <option value="">Add product...</option>
                        {unusedProducts.slice(0, 100).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        {unusedProducts.length > 100 && <option disabled>+{unusedProducts.length - 100} more</option>}
                      </select>
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
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Reorder Qty</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Rate (₹)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b border-gray-200">Total</th>
                            <th className="px-3 py-2 w-16 border-b border-gray-200" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
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
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.reorder_qty === 0 ? '' : String(row.reorder_qty)}
                                  onChange={e => {
                                    const v = e.target.value.replace(/[^0-9.]/g, '')
                                    const num = v === '' ? 0 : Math.max(0, parseFloat(v) || 0)
                                    updateRow(index, 'reorder_qty', num)
                                  }}
                                  placeholder="0"
                                  className="w-20 px-2 py-1.5 border border-gray-300 rounded text-right"
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
                                ₹{(row.reorder_qty * row.reorder_rate).toFixed(2)}
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default ReorderForm
