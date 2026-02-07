/**
 * Reorder list: products below min stock with last purchase qty/rate
 * Smart reorder: sales velocity, lead time + safety stock formula.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { productService, Product } from '../services/productService'
import { purchaseService } from '../services/purchaseService'
import { reportService } from '../services/reportService'
import { Home, Package, Download, AlertTriangle, ShoppingBag, TrendingUp } from 'lucide-react'
import { exportToExcel } from '../utils/exportUtils'
import { useToast } from '../context/ToastContext'
import type { Purchase } from '../types/purchase'

const DEFAULT_LEAD_TIME_WEEKS = 2

export interface ReorderRow {
  product_id: number
  product_name: string
  unit: string
  current_stock: number
  min_stock_level: number
  last_purchase_qty: number | null
  last_purchase_rate: number | null
  last_purchase_date: string | null
  suggested_qty: number
  sales_velocity_per_week?: number
}

const ReorderList = () => {
  const navigate = useNavigate()
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [salesVelocityMap, setSalesVelocityMap] = useState<Map<number, { totalSold: number; velocityPerWeek: number }>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const companyId = getCurrentCompanyId()
      try {
        const [prods, purchs, velocityMap] = await Promise.all([
          productService.getAll(false, companyId ?? undefined),
          purchaseService.getAll(undefined, companyId ?? undefined),
          reportService.getSalesVelocityByProduct(4, companyId ?? undefined),
        ])
        setProducts(prods)
        setPurchases(purchs)
        setSalesVelocityMap(velocityMap)
      } catch (e) {
        console.error('Reorder list load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getCurrentCompanyId])

  const reorderRows = useMemo((): ReorderRow[] => {
    const rows: ReorderRow[] = []
    const productMap = new Map(products.map(p => [p.id, p]))
    // Use same logic as Dashboard/Stock Alerts: min_stock from product OR from purchase items; stock from purchase items sum or product.stock_quantity
    const productMinStockMap = new Map<number, number>()
    const productAvailableStockMap = new Map<number, number>()
    // Article-level: purchase items with article code, aggregated by article (same as Stock Alerts)
    const articleToPurchaseItemMap = new Map<string, { product_id: number; article: string; availableQty: number; minStock: number }>()
    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        if (item.min_stock_level !== undefined && item.min_stock_level > 0 && item.product_id) {
          const current = productMinStockMap.get(item.product_id) || 0
          productMinStockMap.set(item.product_id, Math.max(current, item.min_stock_level))
        }
        if (item.product_id) {
          const soldQty = item.sold_quantity ?? 0
          const availableQty = (item.quantity ?? 0) - soldQty
          const current = productAvailableStockMap.get(item.product_id) || 0
          productAvailableStockMap.set(item.product_id, current + availableQty)
        }
        if (item.article && item.article.trim() && item.product_id) {
          const articleKey = item.article.trim().toLowerCase()
          const soldQty = item.sold_quantity ?? 0
          const availableQty = (item.quantity ?? 0) - soldQty
          const existing = articleToPurchaseItemMap.get(articleKey)
          if (existing) {
            articleToPurchaseItemMap.set(articleKey, {
              product_id: item.product_id,
              article: item.article.trim(),
              availableQty: existing.availableQty + availableQty,
              minStock: Math.max(existing.minStock, item.min_stock_level || 0),
            })
          } else {
            articleToPurchaseItemMap.set(articleKey, {
              product_id: item.product_id,
              article: item.article.trim(),
              availableQty,
              minStock: item.min_stock_level || 0,
            })
          }
        }
      })
    })
    // Last purchase per product: { product_id: { qty, rate, date } }
    const lastPurchaseByProduct = new Map<number, { qty: number; rate: number; date: string }>()
    const sortedPurchases = [...purchases].sort(
      (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    )
    sortedPurchases.forEach(purchase => {
      purchase.items.forEach(item => {
        if (!item.product_id) return
        if (lastPurchaseByProduct.has(item.product_id)) return
        const available = (item.quantity ?? 0) - (item.sold_quantity ?? 0)
        if (available <= 0) return
        lastPurchaseByProduct.set(item.product_id, {
          qty: item.quantity ?? 0,
          rate: item.unit_price ?? 0,
          date: purchase.purchase_date,
        })
      })
    })
    // 1) Product-level: below min stock
    products.forEach(product => {
      const minStock = product.min_stock_level ?? productMinStockMap.get(product.id) ?? 0
      const current = productAvailableStockMap.get(product.id) ?? product.stock_quantity ?? 0
      if (minStock <= 0) return
      if (current >= minStock) return
      const last = lastPurchaseByProduct.get(product.id)
      const velocity = salesVelocityMap.get(product.id)
      const velocityPerWeek = velocity?.velocityPerWeek ?? 0
      const demandDuringLeadTime = velocityPerWeek * DEFAULT_LEAD_TIME_WEEKS
      const suggestedByFormula = Math.ceil(Math.max(0, demandDuringLeadTime + minStock - current))
      // When we have sales velocity, use the smart formula; otherwise fall back to last purchase qty
      const suggested =
        velocityPerWeek > 0
          ? Math.max(suggestedByFormula, minStock)
          : Math.max(minStock * 2 - current, last?.qty ?? minStock, minStock)
      rows.push({
        product_id: product.id,
        product_name: product.name,
        unit: product.unit || 'pcs',
        current_stock: current,
        min_stock_level: minStock,
        last_purchase_qty: last?.qty ?? null,
        last_purchase_rate: last?.rate ?? null,
        last_purchase_date: last?.date ?? null,
        suggested_qty: suggested,
        sales_velocity_per_week: velocityPerWeek > 0 ? Math.round(velocityPerWeek * 10) / 10 : undefined,
      })
    })
    // 2) Article-level: same as Stock Alerts – e.g. "Saroj Saree [Gauri nanadan]" when that article is below min
    const addedProductArticle = new Set<string>()
    articleToPurchaseItemMap.forEach((itemData, articleKey) => {
      if (itemData.minStock <= 0) return
      if (itemData.availableQty > itemData.minStock) return
      const product = productMap.get(itemData.product_id)
      if (!product) return
      const key = `${itemData.product_id}:${articleKey}`
      if (addedProductArticle.has(key)) return
      addedProductArticle.add(key)
      const last = lastPurchaseByProduct.get(itemData.product_id)
      const velocity = salesVelocityMap.get(product.id)
      const velocityPerWeek = velocity?.velocityPerWeek ?? 0
      const demandDuringLeadTime = velocityPerWeek * DEFAULT_LEAD_TIME_WEEKS
      const suggestedByFormula = Math.ceil(Math.max(0, demandDuringLeadTime + itemData.minStock - itemData.availableQty))
      const suggested =
        velocityPerWeek > 0
          ? Math.max(suggestedByFormula, itemData.minStock)
          : Math.max(itemData.minStock * 2 - itemData.availableQty, last?.qty ?? itemData.minStock, itemData.minStock)
      rows.push({
        product_id: product.id,
        product_name: `${product.name} [${itemData.article}]`,
        unit: product.unit || 'pcs',
        current_stock: itemData.availableQty,
        min_stock_level: itemData.minStock,
        last_purchase_qty: last?.qty ?? null,
        last_purchase_rate: last?.rate ?? null,
        last_purchase_date: last?.date ?? null,
        suggested_qty: suggested,
        sales_velocity_per_week: velocityPerWeek > 0 ? Math.round(velocityPerWeek * 10) / 10 : undefined,
      })
    })
    rows.sort((a, b) => a.current_stock - b.current_stock)
    return rows
  }, [products, purchases, salesVelocityMap])

  const headers = [
    'Product',
    'Unit',
    'Current Stock',
    'Min Stock',
    'Sales/Week',
    'Last Purchase Qty',
    'Last Purchase Rate',
    'Last Purchase Date',
    'Suggested Reorder Qty',
  ]
  const tableHeaders = [...headers, 'Action']

  const exportRows = useMemo(
    () =>
      reorderRows.map(r => [
        r.product_name,
        r.unit,
        r.current_stock,
        r.min_stock_level,
        r.sales_velocity_per_week ?? '—',
        r.last_purchase_qty ?? '—',
        r.last_purchase_rate != null ? r.last_purchase_rate.toFixed(2) : '—',
        r.last_purchase_date ? new Date(r.last_purchase_date).toLocaleDateString('en-IN') : '—',
        r.suggested_qty,
      ]),
    [reorderRows]
  )

  const placeOrderForRow = (row: ReorderRow) => {
    navigate('/purchases/reorder', { state: { lowStockItems: [row] } })
  }

  const handleExport = () => {
    exportToExcel(exportRows, headers, `Reorder_List_${new Date().toISOString().slice(0, 10)}`, 'Reorder List')
    toast.success('Reorder list exported to Excel')
  }

  return (
    <ProtectedRoute requiredPermission="products:read">
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
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Reorder List</h1>
                  <p className="text-sm text-gray-600">Sales velocity • Smart suggested qty (lead time + safety stock) • Last purchase qty/rate</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/purchases/reorder', { state: { lowStockItems: reorderRows } })}
                disabled={reorderRows.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm font-medium"
                title="Open Place Reorder form with these items"
              >
                <ShoppingBag className="w-4 h-4" />
                Place order for these
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={reorderRows.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : reorderRows.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No products below min stock</p>
                <p className="text-sm text-gray-500 mt-1">Set min stock level on products to see reorder suggestions.</p>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/stock/alerts')}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    View Stock Alerts
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={() => navigate('/purchases/reorder')}
                    className="flex items-center gap-1 text-violet-600 hover:underline font-medium"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Place Reorder (add items there)
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {reorderRows.length} product{reorderRows.length !== 1 ? 's' : ''} below min stock
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {tableHeaders.map((h) => {
                          const isSalesWeek = h === 'Sales/Week'
                          const isSuggested = h === 'Suggested Reorder Qty'
                          return (
                            <th
                              key={h}
                              className={`px-3 py-2 text-left font-semibold border border-gray-200 whitespace-nowrap ${
                                isSalesWeek
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isSuggested
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'text-gray-700'
                              }`}
                              title={isSalesWeek ? 'Units sold per week (last 4 weeks)' : isSuggested ? 'Lead time × velocity + safety stock − current' : undefined}
                            >
                              {isSalesWeek ? <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-600" />{h}</span> : h}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {reorderRows.map((row, index) => (
                        <tr key={`${row.product_id}-${row.product_name}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 border border-gray-100 font-medium">{row.product_name}</td>
                          <td className="px-3 py-2 border border-gray-100">{row.unit}</td>
                          <td className="px-3 py-2 border border-gray-100">{row.current_stock}</td>
                          <td className="px-3 py-2 border border-gray-100">{row.min_stock_level}</td>
                          <td className="px-3 py-2 border border-gray-100 bg-emerald-50">
                            {row.sales_velocity_per_week != null ? row.sales_velocity_per_week.toFixed(1) : '—'}
                          </td>
                          <td className="px-3 py-2 border border-gray-100">
                            {row.last_purchase_qty != null ? row.last_purchase_qty : '—'}
                          </td>
                          <td className="px-3 py-2 border border-gray-100">
                            {row.last_purchase_rate != null ? `₹${row.last_purchase_rate.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 py-2 border border-gray-100">
                            {row.last_purchase_date
                              ? new Date(row.last_purchase_date).toLocaleDateString('en-IN')
                              : '—'}
                          </td>
                          <td className="px-3 py-2 border border-gray-100 bg-amber-50 font-semibold text-amber-900">{row.suggested_qty}</td>
                          <td className="px-3 py-2 border border-gray-100 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => placeOrderForRow(row)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-xs font-medium"
                              title={`Place order for ${row.product_name}`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Place order
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default ReorderList
