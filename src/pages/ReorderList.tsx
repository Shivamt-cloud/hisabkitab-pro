/**
 * Reorder list: products below min stock with last purchase qty/rate
 * Helps with purchasing decisions.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { productService, Product } from '../services/productService'
import { purchaseService } from '../services/purchaseService'
import { Home, Package, Download, AlertTriangle } from 'lucide-react'
import { exportToExcel } from '../utils/exportUtils'
import { useToast } from '../context/ToastContext'
import type { Purchase } from '../types/purchase'

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
}

const ReorderList = () => {
  const navigate = useNavigate()
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const companyId = getCurrentCompanyId()
      try {
        const [prods, purchs] = await Promise.all([
          productService.getAll(false, companyId ?? undefined),
          purchaseService.getAll(undefined, companyId ?? undefined),
        ])
        setProducts(prods)
        setPurchases(purchs)
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
    const minStockByProduct = new Map<number, number>()
    const stockByProduct = new Map<number, number>()
    products.forEach(p => {
      minStockByProduct.set(p.id, p.min_stock_level ?? 0)
      stockByProduct.set(p.id, p.stock_quantity ?? 0)
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
    products.forEach(product => {
      const minStock = minStockByProduct.get(product.id) ?? 0
      const current = stockByProduct.get(product.id) ?? 0
      if (minStock <= 0) return
      if (current >= minStock) return
      const last = lastPurchaseByProduct.get(product.id)
      const suggested = Math.max(
        minStock * 2 - current,
        last?.qty ?? minStock,
        minStock
      )
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
      })
    })
    rows.sort((a, b) => a.current_stock - b.current_stock)
    return rows
  }, [products, purchases])

  const headers = [
    'Product',
    'Unit',
    'Current Stock',
    'Min Stock',
    'Last Purchase Qty',
    'Last Purchase Rate',
    'Last Purchase Date',
    'Suggested Reorder Qty',
  ]

  const exportRows = useMemo(
    () =>
      reorderRows.map(r => [
        r.product_name,
        r.unit,
        r.current_stock,
        r.min_stock_level,
        r.last_purchase_qty ?? '—',
        r.last_purchase_rate != null ? r.last_purchase_rate.toFixed(2) : '—',
        r.last_purchase_date ? new Date(r.last_purchase_date).toLocaleDateString('en-IN') : '—',
        r.suggested_qty,
      ]),
    [reorderRows]
  )

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
                  <p className="text-sm text-gray-600">Products below min stock with last purchase qty/rate</p>
                </div>
              </div>
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
                <button
                  type="button"
                  onClick={() => navigate('/stock/alerts')}
                  className="mt-4 text-indigo-600 hover:underline font-medium"
                >
                  View Stock Alerts
                </button>
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
                        {headers.map(h => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reorderRows.map(row => (
                        <tr key={row.product_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 border border-gray-100 font-medium">{row.product_name}</td>
                          <td className="px-3 py-2 border border-gray-100">{row.unit}</td>
                          <td className="px-3 py-2 border border-gray-100">{row.current_stock}</td>
                          <td className="px-3 py-2 border border-gray-100">{row.min_stock_level}</td>
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
                          <td className="px-3 py-2 border border-gray-100 font-semibold">{row.suggested_qty}</td>
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
