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
import { Home, Barcode, Trash2, CreditCard, Printer, RotateCcw } from 'lucide-react'
import { SaleItem } from '../types/sale'
import { Purchase, PurchaseItem } from '../types/purchase'

const QuickSale = () => {
  const navigate = useNavigate()
  const { user, getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [barcodeToPurchaseItemMap, setBarcodeToPurchaseItemMap] = useState<Map<string, PurchaseItem & { purchase_id?: number }>>(new Map())
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<number | null>(null)

  // Load products and purchases, build barcode map
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const companyId = getCurrentCompanyId()
      try {
        const [products, purchs] = await Promise.all([
          productService.getAll(false, companyId),
          purchaseService.getAll(undefined, companyId),
        ])
        const activeProducts = products.filter(p => p.status === 'active')
        setAvailableProducts(activeProducts)
        setPurchases(purchs)

        const barcodeMap = new Map<string, PurchaseItem & { purchase_id?: number; purchase_date?: string }>()
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

  const addByBarcode = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    let product: Product | undefined
    let purchaseItem: (PurchaseItem & { purchase_id?: number; purchase_date?: string }) | undefined

    // 1. Look up by barcode in purchase items
    if (barcodeToPurchaseItemMap.has(trimmed)) {
      purchaseItem = barcodeToPurchaseItemMap.get(trimmed)!
      product = availableProducts.find(p => p.id === purchaseItem!.product_id)
    }

    // 2. Fallback: product barcode
    if (!product) {
      product = availableProducts.find(p => p.barcode && p.barcode.trim() === trimmed)
    }

    // 3. Fallback: try numeric match on product barcode
    if (!product) {
      product = availableProducts.find(p => p.barcode && String(p.barcode).trim() === trimmed)
    }

    if (!product) {
      toast.error(`No product found for barcode: ${trimmed}`)
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
      const item = purchase?.items.find(pi => pi.barcode === trimmed && pi.product_id === product!.id)
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

  const handlePay = async () => {
    if (saleItems.length === 0) {
      toast.error('Add at least one item')
      return
    }
    setSaving(true)
    try {
      const sale = {
        customer_id: undefined,
        customer_name: 'Walk-in Customer',
        sales_person_id: undefined,
        sales_person_name: undefined,
        invoice_number: '',
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
        payment_method: 'cash',
        payment_methods: [{ method: 'cash' as const, amount: grandTotal }],
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
    if (lastSaleId) navigate(`/invoice/${lastSaleId}`)
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
            Scan or enter barcode
          </label>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            placeholder="Scan barcode, then press Enter"
            className="w-full px-4 py-4 text-lg border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-2">Product is added automatically. Press Enter after each scan.</p>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Cart ({saleItems.length} items)</h2>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {saleItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Scan barcodes to add products
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
                    <p className="font-bold text-gray-900">₹{item.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
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
            onClick={handlePay}
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
    </div>
  )
}

export default QuickSale
