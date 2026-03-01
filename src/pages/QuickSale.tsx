/**
 * Quick Sale - Reduced-step flow for fast checkout
 * Scan barcode → auto-add → pay
 * Fewer clicks than the full sale form
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { productService, Product } from '../services/productService'
import { saleService } from '../services/saleService'
import { purchaseService } from '../services/purchaseService'
import { Home, Barcode, Trash2, CreditCard, Printer, RotateCcw, PenSquare } from 'lucide-react'
import { usePlanUpgrade } from '../context/PlanUpgradeContext'
import { LockIcon } from '../components/icons/LockIcon'
import { SaleItem } from '../types/sale'
import { Purchase, PurchaseItem } from '../types/purchase'

const QuickSale = () => {
  const navigate = useNavigate()
  const { user, getCurrentCompanyId, hasPlanFeature } = useAuth()
  const { showPlanUpgrade } = usePlanUpgrade()
  const { toast } = useToast()
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [barcodeToPurchaseItemMap, setBarcodeToPurchaseItemMap] = useState<Map<string, PurchaseItem & { purchase_id?: number }>>(new Map())
  const [articleToPurchaseItemMap, setArticleToPurchaseItemMap] = useState<Map<string, PurchaseItem & { purchase_id?: number }>>(new Map())
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<number | null>(null)
  const [showManualEntryModal, setShowManualEntryModal] = useState(false)
  const [manualEntryForm, setManualEntryForm] = useState({ barcode: '', productName: '', mrp: '', salePrice: '' })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<Array<{ method: 'cash' | 'card' | 'upi' | 'other'; amount: number }>>([{ method: 'cash', amount: 0 }])

  // Load products and purchases, build barcode map
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const companyId = getCurrentCompanyId()
      try {
        const [products, purchs] = await Promise.all([
          productService.getAllFast(false, companyId),
          purchaseService.getAll(undefined, companyId),
        ])
        const activeProducts = products.filter(p => p.status === 'active')
        setAvailableProducts(activeProducts)
        setPurchases(purchs)

        const barcodeMap = new Map<string, PurchaseItem & { purchase_id?: number; purchase_date?: string }>()
        const articleMap = new Map<string, PurchaseItem & { purchase_id?: number; purchase_date?: string }>()
        purchs.forEach(purchase => {
          purchase.items.forEach(item => {
            const barcodeValue = item.barcode
            if (barcodeValue != null && String(barcodeValue).trim()) {
              const barcodeStr = String(barcodeValue).trim()
              const existing = barcodeMap.get(barcodeStr)
              if (!barcodeMap.has(barcodeStr) ||
                  (purchase.purchase_date && existing?.purchase_date &&
                   new Date(purchase.purchase_date) > new Date(existing.purchase_date))) {
                barcodeMap.set(barcodeStr, { ...item, purchase_id: purchase.id, purchase_date: purchase.purchase_date })
              }
            }
            const articleValue = item.article
            if (articleValue != null && String(articleValue).trim()) {
              const articleStr = String(articleValue).trim()
              const articleKey = articleStr.toLowerCase()
              const existing = articleMap.get(articleKey)
              if (!articleMap.has(articleKey) ||
                  (purchase.purchase_date && existing?.purchase_date &&
                   new Date(purchase.purchase_date) > new Date(existing.purchase_date))) {
                articleMap.set(articleKey, { ...item, purchase_id: purchase.id, purchase_date: purchase.purchase_date })
              }
            }
          })
        })
        // Also add product-level barcodes if not in purchases
        activeProducts.forEach(p => {
          if (p.barcode && p.barcode.trim() && !barcodeMap.has(p.barcode.trim())) {
            barcodeMap.set(p.barcode.trim(), {
              product_id: p.id,
              product_name: p.name,
              barcode: p.barcode,
              quantity: 0,
              unit_price: p.purchase_price ?? 0,
              mrp: p.selling_price ?? 0,
              sale_price: p.selling_price ?? 0,
              purchase_id: undefined,
            } as any)
          }
        })
        setBarcodeToPurchaseItemMap(barcodeMap)
        setArticleToPurchaseItemMap(articleMap)
      } catch (e) {
        console.error('QuickSale load error:', e)
        toast.error('Failed to load products')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getCurrentCompanyId, toast])

  useEffect(() => {
    barcodeInputRef.current?.focus()
  }, [saleItems, lastSaleId])

  // Normalize search: strip article/barcode prefix for flexible input
  const normalizeSearch = (q: string) => {
    let s = q.trim()
    const prefixPattern = /^(article|barcode)[_:\s-]+/i
    if (prefixPattern.test(s)) s = s.replace(prefixPattern, '').trim()
    return s
  }

  const addByBarcode = async (query: string) => {
    const raw = query.trim()
    if (!raw) return
    const trimmed = normalizeSearch(raw)

    let product: Product | undefined
    let purchaseItem: (PurchaseItem & { purchase_id?: number; purchase_date?: string }) | undefined

    // 1. Look up by barcode in purchase items (from preloaded map)
    if (barcodeToPurchaseItemMap.has(trimmed)) {
      purchaseItem = barcodeToPurchaseItemMap.get(trimmed)!
      product = availableProducts.find(p => p.id === purchaseItem!.product_id)
    }

    // 2. Fallback: product barcode (from preloaded list)
    if (!product && availableProducts.some(p => p.barcode && String(p.barcode).trim() === trimmed)) {
      product = availableProducts.find(p => p.barcode && String(p.barcode).trim() === trimmed)
    }

    // 3. On-demand lookup: if not in preloaded data, try indexed barcode query (fast for huge catalogs)
    if (!product) {
      try {
        product = await productService.getByBarcode(trimmed, getCurrentCompanyId())
      } catch {
        /* ignore */
      }
    }

    // 4. Fallback: article number (case-insensitive)
    if (!product && articleToPurchaseItemMap.has(trimmed.toLowerCase())) {
      purchaseItem = articleToPurchaseItemMap.get(trimmed.toLowerCase())!
      product = availableProducts.find(p => p.id === purchaseItem!.product_id)
      if (!product) {
        try {
          product = await productService.getById(purchaseItem!.product_id, true)
        } catch {
          /* ignore */
        }
      }
    }

    // 5. Try article prefix/suffix match (e.g. "ART-001" matches "ART-001-X" or "X-ART-001")
    if (!product && trimmed.length >= 2) {
      const articleLower = trimmed.toLowerCase()
      for (const [key, item] of articleToPurchaseItemMap) {
        if (key === articleLower || key.startsWith(articleLower) || articleLower.startsWith(key)) {
          purchaseItem = item
          product = availableProducts.find(p => p.id === purchaseItem!.product_id)
          if (!product) {
            try {
              product = await productService.getById(purchaseItem!.product_id, true)
            } catch {
              /* ignore */
            }
          }
          if (product) break
        }
      }
    }

    if (!product) {
      toast.error(`No product found for "${raw}" – try barcode, article, or Manual Entry`)
      setBarcodeInput('')
      return
    }

    const mrp = purchaseItem?.mrp ?? product.selling_price ?? 0
    const unitPrice = purchaseItem?.sale_price ?? purchaseItem?.mrp ?? product.selling_price ?? 0
    const purchasePrice = purchaseItem?.unit_price ?? product.purchase_price ?? 0
    const barcode = purchaseItem?.barcode ?? product.barcode ?? trimmed

    let purchaseId: number | undefined
    let purchaseItemId: number | undefined
    if (purchaseItem && purchaseItem.purchase_id) {
      purchaseId = purchaseItem.purchase_id
      const purchase = purchases.find(p => p.id === purchaseId)
      const item = purchase?.items.find(pi => {
        if (pi.product_id !== product!.id) return false
        if (pi.barcode && String(pi.barcode).trim() === trimmed) return true
        if (pi.article && String(pi.article).trim().toLowerCase() === trimmed.toLowerCase()) return true
        if (purchaseItem!.id && pi.id === purchaseItem!.id) return true
        return false
      })
      if (item) purchaseItemId = item.id
    } else if (purchaseItem && !purchaseItem.purchase_id && purchases.length > 0) {
      // Product-level barcode - use FIFO
      const available: Array<{ purchase: Purchase; item: PurchaseItem }> = []
      for (const p of purchases) {
        for (const item of p.items) {
          if (item.product_id === product.id) {
            const sold = item.sold_quantity ?? 0
            if ((item.quantity ?? 0) - sold > 0) available.push({ purchase: p, item })
          }
        }
      }
      available.sort((a, b) =>
        new Date(a.purchase.purchase_date).getTime() - new Date(b.purchase.purchase_date).getTime()
      )
      if (available.length > 0) {
        purchaseId = available[0].purchase.id
        purchaseItemId = available[0].item.id
      }
    }

    const uniqueKey = purchaseId && purchaseItemId ? `P${purchaseId}-I${purchaseItemId}` : undefined

    const newItem: SaleItem = {
      product_id: product.id,
      product_name: product.name,
      barcode,
      quantity: 1,
      mrp,
      unit_price: unitPrice,
      purchase_price: purchasePrice,
      discount: 0,
      discount_percentage: 0,
      sale_type: 'sale',
      total: unitPrice,
      purchase_id: purchaseId,
      purchase_item_id: purchaseItemId,
      purchase_item_barcode: purchaseItem?.barcode,
    }

    setSaleItems(prev => {
      const existing = prev.find(
        i => i.product_id === product!.id && (i.purchase_item_id === purchaseItemId || (!i.purchase_item_id && !purchaseItemId))
      )
      if (existing) {
        const qty = existing.quantity + 1
        const total = existing.unit_price * qty
        return prev.map(it =>
          it === existing ? { ...it, quantity: qty, total } : it
        )
      }
      return [...prev, newItem]
    })
    setBarcodeInput('')
  }

  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addByBarcode(barcodeInput)
    }
  }

  const removeItem = (index: number) => {
    setSaleItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateQty = (index: number, delta: number) => {
    setSaleItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item
        const qty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: qty, total: item.unit_price * qty }
      })
    )
  }

  const grandTotal = saleItems.reduce((sum, i) => sum + i.total, 0)

  const openPaymentModal = () => {
    if (saleItems.length === 0) {
      toast.error('Add at least one item')
      return
    }
    setPaymentMethods([{ method: 'cash', amount: grandTotal }])
    setShowPaymentModal(true)
  }

  const handleConfirmPayment = async () => {
    const finalMethods = paymentMethods.filter(p => (p.amount || 0) > 0)
    if (finalMethods.length === 0) {
      toast.error('Add at least one payment method')
      return
    }
    const paymentTotal = finalMethods.reduce((sum, p) => sum + (p.amount || 0), 0)
    if (Math.abs(paymentTotal - grandTotal) > 0.02) {
      toast.error(`Payment total (₹${paymentTotal.toFixed(2)}) must equal ₹${grandTotal.toFixed(2)}`)
      return
    }
    setShowPaymentModal(false)
    setSaving(true)
    try {
      const hasManualProducts = saleItems.some(item => !item.product_id || item.product_id === 0)
      let internalRemarks = ''
      if (hasManualProducts) {
        const manualStamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        internalRemarks = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 MANUAL SALE – SYSTEM RECORD (IMMUTABLE)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nThis transaction includes product(s) entered manually by the user (not from the product list).\nCompleted: ${manualStamp}\nNote: This marker is permanent and cannot be modified or removed.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      }
      const pmList = finalMethods.map(p => ({ method: p.method, amount: p.amount }))
      const sale = {
        customer_id: undefined,
        customer_name: 'Walk-in Customer',
        sales_person_id: undefined,
        sales_person_name: undefined,
        invoice_number: '',
        ...(internalRemarks && { internal_remarks: internalRemarks }),
        items: saleItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          barcode: item.barcode || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          purchase_price: item.purchase_price,
          sale_type: item.sale_type,
          mrp: item.mrp,
          discount: item.discount ?? 0,
          discount_percentage: item.discount_percentage ?? 0,
          total: item.total,
          purchase_id: item.purchase_id,
          purchase_item_id: item.purchase_item_id,
          purchase_item_article: item.purchase_item_article,
          purchase_item_barcode: item.purchase_item_barcode,
        })),
        subtotal: grandTotal,
        tax_amount: 0,
        grand_total: grandTotal,
        payment_status: 'paid' as const,
        payment_method: pmList[0].method,
        payment_methods: pmList,
        sale_date: new Date().toISOString(),
        company_id: getCurrentCompanyId() || undefined,
        created_by: parseInt(user?.id || '1'),
      }
      const created = await saleService.create(sale)
      setLastSaleId(created.id)
      setSaleItems([])
      toast.success('Sale completed!')
    } catch (e) {
      toast.error('Failed to create sale: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleNewSale = () => {
    setLastSaleId(null)
  }

  const handlePrintInvoice = () => {
    if (lastSaleId) navigate(`/invoice/${lastSaleId}?print=1`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <header className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-100"
              title="Back"
            >
              <Home className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Quick Sale</h1>
            <div className="w-9" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Barcode input - primary action */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Barcode className="w-5 h-5 text-emerald-600" />
            Scan barcode or enter article number
          </label>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            placeholder="Scan barcode / enter article, then press Enter"
            className="w-full px-4 py-4 text-lg border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            autoComplete="off"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">Works with barcode or article number. Press Enter after each.</p>
            <button
              type="button"
              onClick={() => hasPlanFeature('sales_manual_product') ? setShowManualEntryModal(true) : showPlanUpgrade('sales_manual_product')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg font-medium ${
                hasPlanFeature('sales_manual_product')
                  ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
              }`}
              title={hasPlanFeature('sales_manual_product') ? 'Add product not in your list' : 'Upgrade to Premium to add manual products'}
            >
              {!hasPlanFeature('sales_manual_product') && <LockIcon className="w-3.5 h-3.5 opacity-70" />}
              <PenSquare className="w-4 h-4" />
              Manual Entry
            </button>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Cart ({saleItems.length} items)</h2>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {saleItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Scan barcode or enter article to add products
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {saleItems.map((item, index) => (
                  <li key={index} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => updateQty(index, -1)}
                          className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(index, 1)}
                          className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">₹{(item.total ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {saleItems.length > 0 && (
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">Total</span>
                <span className="text-xl font-bold text-emerald-700">₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {lastSaleId ? (
          <div className="flex gap-3">
            <button
              onClick={handleNewSale}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
            >
              <RotateCcw className="w-5 h-5" />
              New Sale
            </button>
            <button
              onClick={handlePrintInvoice}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50"
            >
              <Printer className="w-5 h-5" />
              Print Invoice
            </button>
          </div>
        ) : (
          <button
            onClick={openPaymentModal}
            disabled={saleItems.length === 0 || saving}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-xl font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-6 h-6" />
            {saving ? 'Processing...' : `Pay ₹${grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          </button>
        )}

        <p className="text-center text-sm text-gray-500">
          <button onClick={() => navigate('/sales/new')} className="text-emerald-600 hover:underline">
            Open full sale form
          </button>
        </p>
      </main>

      {/* Manual product entry modal (Premium & Premium Plus) */}
      {showManualEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Manual Product Entry</h3>
            <p className="text-sm text-gray-500 mb-4">Add a product not in your list. No inventory tracking.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={manualEntryForm.productName}
                  onChange={e => setManualEntryForm(f => ({ ...f, productName: e.target.value }))}
                  placeholder="Enter product name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (optional)</label>
                <input
                  type="text"
                  value={manualEntryForm.barcode}
                  onChange={e => setManualEntryForm(f => ({ ...f, barcode: e.target.value }))}
                  placeholder="Enter barcode"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MRP *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualEntryForm.mrp}
                  onChange={e => setManualEntryForm(f => ({ ...f, mrp: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualEntryForm.salePrice}
                  onChange={e => setManualEntryForm(f => ({ ...f, salePrice: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowManualEntryModal(false)
                  setManualEntryForm({ barcode: '', productName: '', mrp: '', salePrice: '' })
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = manualEntryForm.productName.trim()
                  const mrp = parseFloat(manualEntryForm.mrp)
                  const salePrice = parseFloat(manualEntryForm.salePrice)
                  if (!name) {
                    toast.error('Product name is required')
                    return
                  }
                  if (isNaN(mrp) || mrp < 0) {
                    toast.error('Please enter valid MRP')
                    return
                  }
                  if (isNaN(salePrice) || salePrice < 0) {
                    toast.error('Please enter valid sale price')
                    return
                  }
                  const unitPrice = salePrice
                  const newItem: SaleItem = {
                    product_id: 0,
                    product_name: name,
                    barcode: manualEntryForm.barcode.trim(),
                    quantity: 1,
                    mrp: mrp,
                    unit_price: unitPrice,
                    discount: 0,
                    discount_percentage: 0,
                    sale_type: 'sale',
                    total: unitPrice,
                    purchase_item_unique_key: `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  }
                  setSaleItems(prev => [...prev, newItem])
                  setShowManualEntryModal(false)
                  setManualEntryForm({ barcode: '', productName: '', mrp: '', salePrice: '' })
                  toast.success('Manual product added')
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment method modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Payment</h3>
            <p className="text-sm text-gray-600 mb-4">Total: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {paymentMethods.map((pm, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={pm.method}
                    onChange={e => {
                      const updated = [...paymentMethods]
                      updated[idx].method = e.target.value as 'cash' | 'card' | 'upi' | 'other'
                      setPaymentMethods(updated)
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pm.amount || ''}
                    onChange={e => {
                      const updated = [...paymentMethods]
                      updated[idx].amount = parseFloat(e.target.value) || 0
                      setPaymentMethods(updated)
                    }}
                    placeholder="Amount"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {paymentMethods.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethods(prev => prev.filter((_, i) => i !== idx))}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const total = paymentMethods.reduce((s, p) => s + (p.amount || 0), 0)
                  const remaining = Math.max(0, grandTotal - total)
                  setPaymentMethods([...paymentMethods, { method: 'cash', amount: remaining }])
                }}
                className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-emerald-500 hover:text-emerald-600 text-sm font-medium"
              >
                + Add payment method
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuickSale
