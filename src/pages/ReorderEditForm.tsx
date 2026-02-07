/**
 * Edit existing reorder: add/remove items, change qty and rate. Only for status placed or partial_received.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { purchaseReorderService } from '../services/purchaseReorderService'
import { productService, Product } from '../services/productService'
import { Home, Package, Pencil, FileDown, FileSpreadsheet } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { exportReorderToPdf, exportReorderToExcel } from '../utils/exportUtils'
import type { PurchaseReorder, PurchaseReorderItem } from '../types/purchaseReorder'

interface EditRow {
  product_id: number
  product_name: string
  ordered_qty: number
  unit_price: number
  received_qty: number
  total: number
}

export default function ReorderEditForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const [reorder, setReorder] = useState<PurchaseReorder | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<EditRow[]>([])
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const reorderId = id ? parseInt(id, 10) : NaN

  useEffect(() => {
    const load = async () => {
      if (!reorderId || Number.isNaN(reorderId)) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [data, prods] = await Promise.all([
          purchaseReorderService.getById(reorderId),
          productService.getAll(true, getCurrentCompanyId() ?? undefined),
        ])
        if (!data) {
          toast.error('Reorder not found')
          setLoading(false)
          return
        }
        if (data.status === 'received' || data.status === 'cancelled') {
          toast.error('Cannot edit a received or cancelled reorder')
          setLoading(false)
          return
        }
        setReorder(data)
        setExpectedDate(data.expected_date || '')
        setNotes(data.notes || '')
        setRows(
          (data.items || []).map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name || `Product #${it.product_id}`,
            ordered_qty: it.ordered_qty ?? 0,
            unit_price: it.unit_price ?? 0,
            received_qty: it.received_qty ?? 0,
            total: it.total ?? 0,
          }))
        )
        setProducts(prods)
      } catch (e) {
        console.error(e)
        toast.error('Failed to load reorder')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [reorderId, getCurrentCompanyId])

  const updateRow = (index: number, field: 'ordered_qty' | 'unit_price', value: number) => {
    setRows((prev) => {
      const next = [...prev]
      const row = next[index]
      if (field === 'ordered_qty') {
        row.ordered_qty = Math.max(0, value)
      } else {
        row.unit_price = Math.max(0, value)
      }
      row.total = Math.round(row.ordered_qty * row.unit_price * 100) / 100
      return next
    })
  }

  const addProduct = (productId?: number) => {
    const usedIds = new Set(rows.map((r) => r.product_id))
    const product = productId
      ? products.find((p) => p.id === productId && !usedIds.has(p.id))
      : products.find((p) => !usedIds.has(p.id))
    if (!product) return
    setRows((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        ordered_qty: 1,
        unit_price: 0,
        received_qty: 0,
        total: 0,
      },
    ])
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const unusedProducts = useMemo(() => {
    const usedIds = new Set(rows.map((r) => r.product_id))
    return products.filter((p) => !usedIds.has(p.id))
  }, [products, rows])

  const buildItems = (): PurchaseReorderItem[] =>
    rows
      .filter((r) => r.ordered_qty > 0)
      .map((r) => ({
        product_id: r.product_id,
        product_name: r.product_name,
        unit_price: r.unit_price,
        ordered_qty: r.ordered_qty,
        received_qty: r.received_qty,
        total: Math.round(r.ordered_qty * r.unit_price * 100) / 100,
        gst_rate: reorder?.type === 'gst' ? 18 : undefined,
      }))

  const save = async () => {
    if (!reorder) return
    const items = buildItems()
    if (items.length === 0) {
      toast.error('Add at least one item with ordered qty > 0')
      return
    }
    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const totalTax = reorder.type === 'gst' ? items.reduce((s, i) => s + ((i.gst_rate ?? 0) / 100) * i.total, 0) : 0
    const grandTotal = Math.round((subtotal + totalTax) * 100) / 100
    setSaving(true)
    try {
      await purchaseReorderService.update(reorder.id, {
        items,
        subtotal,
        total_tax: totalTax,
        grand_total: grandTotal,
        expected_date: expectedDate || undefined,
        notes: notes || undefined,
      })
      toast.success('Reorder updated')
      setReorder((prev) => (prev ? { ...prev, items, subtotal, total_tax: totalTax, grand_total: grandTotal, expected_date: expectedDate || undefined, notes: notes || undefined } : null))
    } catch (e) {
      console.error(e)
      toast.error('Failed to update reorder')
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = () => {
    if (!reorder) return
    const items = buildItems()
    if (items.length === 0) {
      toast.error('Add at least one item to export')
      return
    }
    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const totalTax = reorder.type === 'gst' ? items.reduce((s, i) => s + ((i.gst_rate ?? 0) / 100) * i.total, 0) : 0
    try {
      exportReorderToPdf(
        {
          reorder_number: reorder.reorder_number,
          order_date: reorder.order_date,
          expected_date: expectedDate || undefined,
          supplier_name: reorder.supplier_name,
          supplier_gstin: reorder.supplier_gstin,
          status: reorder.status.replace('_', ' '),
          notes,
          subtotal,
          total_tax: totalTax,
          grand_total: Math.round((subtotal + totalTax) * 100) / 100,
          items,
        },
        undefined,
        `Reorder_${reorder.reorder_number}`
      )
      toast.success('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error('PDF download failed')
    }
  }

  const downloadExcel = () => {
    if (!reorder) return
    const items = buildItems()
    if (items.length === 0) {
      toast.error('Add at least one item to export')
      return
    }
    const subtotal = items.reduce((s, i) => s + i.total, 0)
    const totalTax = reorder.type === 'gst' ? items.reduce((s, i) => s + ((i.gst_rate ?? 0) / 100) * i.total, 0) : 0
    try {
      exportReorderToExcel(
        {
          reorder_number: reorder.reorder_number,
          order_date: reorder.order_date,
          expected_date: expectedDate || undefined,
          supplier_name: reorder.supplier_name,
          supplier_gstin: reorder.supplier_gstin,
          status: reorder.status.replace('_', ' '),
          notes,
          subtotal,
          total_tax: totalTax,
          grand_total: Math.round((subtotal + totalTax) * 100) / 100,
          items,
        },
        undefined,
        `Reorder_${reorder.reorder_number}`
      )
      toast.success('Excel downloaded')
    } catch (e) {
      console.error(e)
      toast.error('Excel download failed')
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="purchases:create">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading reorder...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!reorder) {
    return (
      <ProtectedRoute requiredPermission="purchases:create">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-md">
            <p className="text-gray-600 mb-4">Reorder not found or cannot be edited.</p>
            <button type="button" onClick={() => navigate('/purchases/reorders')} className="px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700">
              Back to Reorder History
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const subtotal = rows.reduce((s, r) => s + (r.ordered_qty * r.unit_price), 0)
  const totalTax = reorder.type === 'gst' ? rows.reduce((s, r) => s + (0.18 * r.ordered_qty * r.unit_price), 0) : 0
  const grandTotal = Math.round((subtotal + totalTax) * 100) / 100

  return (
    <ProtectedRoute requiredPermission="purchases:create">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate('/purchases/reorders')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Back to Reorder History">
                  <Home className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <Pencil className="w-8 h-8 text-violet-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Reorder — {reorder.reorder_number}</h1>
                    <p className="text-sm text-gray-600">Add or remove items, change qty and rate. Save to update.</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={downloadPdf} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
                  <FileDown className="w-4 h-4" />
                  PDF
                </button>
                <button type="button" onClick={downloadExcel} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </button>
                <button type="button" disabled={saving} onClick={save} className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder #</label>
                <input type="text" value={reorder.reorder_number} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order date</label>
                <input type="text" value={new Date(reorder.order_date).toLocaleDateString('en-IN')} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected date</label>
                <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Package className="w-5 h-5 text-violet-600" />
                Supplier
              </h2>
              <p className="text-gray-700">{reorder.supplier_name || '—'}</p>
              {reorder.supplier_gstin && <p className="text-sm text-gray-500">GSTIN: {reorder.supplier_gstin}</p>}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Items</h2>
                <select
                  value=""
                  onChange={(e) => {
                    const pid = e.target.value ? parseInt(e.target.value, 10) : undefined
                    if (pid) addProduct(pid)
                    e.target.value = ''
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[180px]"
                >
                  <option value="">Add product...</option>
                  {unusedProducts.slice(0, 100).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {unusedProducts.length > 100 && <option disabled>+{unusedProducts.length - 100} more</option>}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Ordered Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Received Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Rate (₹)</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Total</th>
                      <th className="px-3 py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={`${row.product_id}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{row.product_name}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.ordered_qty === 0 ? '' : String(row.ordered_qty)}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '')
                              updateRow(index, 'ordered_qty', v === '' ? 0 : Math.max(0, parseFloat(v) || 0))
                            }}
                            placeholder="0"
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">{row.received_qty}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.unit_price === 0 ? '' : String(row.unit_price)}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '')
                              updateRow(index, 'unit_price', v === '' ? 0 : Math.max(0, parseFloat(v) || 0))
                            }}
                            placeholder="0"
                            className="w-24 px-2 py-1.5 border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">₹{(row.ordered_qty * row.unit_price).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => removeRow(index)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-4 text-sm">
                <span>Subtotal: ₹{subtotal.toFixed(2)}</span>
                {reorder.type === 'gst' && <span>Tax: ₹{totalTax.toFixed(2)}</span>}
                <span className="font-semibold">Grand Total: ₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
