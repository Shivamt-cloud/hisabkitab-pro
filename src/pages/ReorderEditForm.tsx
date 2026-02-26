/**
 * Edit existing reorder: add/remove items, change qty and rate. Only for status placed or partial_received.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { purchaseReorderService } from '../services/purchaseReorderService'
import { productService, Product } from '../services/productService'
import { companyService } from '../services/companyService'
import { Home, Package, Pencil, FileDown, FileSpreadsheet, Search } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { exportReorderToPdf, exportReorderToExcel } from '../utils/exportUtils'
import type { PurchaseReorder, PurchaseReorderItem } from '../types/purchaseReorder'

interface EditRow {
  product_id: number
  product_name: string
  ordered_qty: number
  ordered_qty_box: number
  ordered_qty_piece: number
  unit_price: number
  received_qty: number
  received_qty_box: number
  received_qty_piece: number
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
  const [itemSearch, setItemSearch] = useState('')
  const [addProductQuery, setAddProductQuery] = useState('')
  const [addProductOpen, setAddProductOpen] = useState(false)
  const addProductRef = useRef<HTMLDivElement>(null)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addProductRef.current && !addProductRef.current.contains(e.target as Node)) {
        setAddProductOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
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
        const cid = getCurrentCompanyId()
        const [data, prods, company] = await Promise.all([
          purchaseReorderService.getById(reorderId),
          productService.getAll(true, cid ?? undefined),
          cid ? companyService.getById(cid) : Promise.resolve(null),
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
        setCompanyName(company?.name || company?.unique_code || '')
        setExpectedDate(data.expected_date || '')
        setNotes(data.notes || '')
        setRows(
          (data.items || []).map((it) => {
            const box = it.ordered_qty_box ?? 0
            const piece = it.ordered_qty_piece ?? 0
            const qty = it.ordered_qty ?? 0
            const rBox = it.received_qty_box ?? 0
            const rPiece = it.received_qty_piece ?? 0
            const rQty = it.received_qty ?? 0
            return {
            product_id: it.product_id,
            product_name: it.product_name || `Product #${it.product_id}`,
            ordered_qty: box * piece || qty,
            ordered_qty_box: box || (qty > 0 ? 1 : 0),
            ordered_qty_piece: piece || qty,
            unit_price: it.unit_price ?? 0,
            received_qty: rBox * rPiece || rQty,
            received_qty_box: rBox || (rQty > 0 ? 1 : 0),
            received_qty_piece: rPiece || rQty,
            total: it.total ?? 0,
          }})
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

  const getOrderedQty = (r: EditRow) =>
    r.ordered_qty_box > 0 && r.ordered_qty_piece > 0 ? r.ordered_qty_box * r.ordered_qty_piece : (r.ordered_qty_box || r.ordered_qty_piece)

  const updateRow = (index: number, field: 'ordered_qty' | 'ordered_qty_box' | 'ordered_qty_piece' | 'unit_price', value: number) => {
    setRows((prev) => {
      const next = [...prev]
      const row = next[index]
      if (field === 'ordered_qty_box') {
        row.ordered_qty_box = Math.max(0, value)
        row.ordered_qty = row.ordered_qty_box > 0 && row.ordered_qty_piece > 0 ? row.ordered_qty_box * row.ordered_qty_piece : (row.ordered_qty_box || row.ordered_qty_piece)
      } else if (field === 'ordered_qty_piece') {
        row.ordered_qty_piece = Math.max(0, value)
        row.ordered_qty = row.ordered_qty_box > 0 && row.ordered_qty_piece > 0 ? row.ordered_qty_box * row.ordered_qty_piece : (row.ordered_qty_box || row.ordered_qty_piece)
      } else if (field === 'ordered_qty') {
        row.ordered_qty = Math.max(0, value)
      } else {
        row.unit_price = Math.max(0, value)
      }
      row.total = Math.round(getOrderedQty(row) * row.unit_price * 100) / 100
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
        ordered_qty_box: 1,
        ordered_qty_piece: 1,
        unit_price: 0,
        received_qty: 0,
        received_qty_box: 0,
        received_qty_piece: 0,
        total: 0,
      },
    ])
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const unusedProducts = useMemo(() => {
    const usedIds = new Set(rows.map((r) => r.product_id))
    return products
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, rows])

  const addProductSuggestions = useMemo(() => {
    if (!addProductQuery.trim()) return unusedProducts.slice(0, 15)
    const q = addProductQuery.trim().toLowerCase()
    return unusedProducts
      .filter((p) => (p.name || '').toLowerCase().includes(q))
      .slice(0, 15)
  }, [unusedProducts, addProductQuery])

  const filteredRowsWithIndex = useMemo(() => {
    if (!itemSearch.trim()) return rows.map((row, i) => ({ row, index: i }))
    const q = itemSearch.trim().toLowerCase()
    return rows
      .map((row, i) => ({ row, index: i }))
      .filter(({ row }) => (row.product_name || '').trim().toLowerCase().includes(q))
  }, [rows, itemSearch])

  const buildItems = (): PurchaseReorderItem[] =>
    rows
      .filter((r) => getOrderedQty(r) > 0)
      .map((r) => {
        const orderedQty = getOrderedQty(r)
        return ({
        product_id: r.product_id,
        product_name: r.product_name,
        unit_price: r.unit_price,
        ordered_qty: orderedQty,
        ordered_qty_box: r.ordered_qty_box,
        ordered_qty_piece: r.ordered_qty_piece,
        received_qty: r.received_qty_box * r.received_qty_piece || r.received_qty,
        received_qty_box: r.received_qty_box,
        received_qty_piece: r.received_qty_piece,
        total: Math.round(orderedQty * r.unit_price * 100) / 100,
        gst_rate: reorder?.type === 'gst' ? 18 : undefined,
      })})

  const save = async () => {
    if (!reorder) return
    const items = buildItems()
    if (items.length === 0) {
      toast.error('Add at least one item with Qty (Box) and/or Qty (Piece) > 0')
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
        companyName || undefined,
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
        companyName || undefined,
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
              <div className="p-4 border-b border-gray-200 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-900">Items</h2>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <Search className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search items by name..."
                      className="w-48 sm:w-56 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      title="Filter items by product name"
                    />
                  </div>
                  <div className="relative" ref={addProductRef}>
                    <input
                      type="text"
                      value={addProductQuery}
                      onChange={(e) => {
                        setAddProductQuery(e.target.value)
                        setAddProductOpen(true)
                      }}
                      onFocus={() => setAddProductOpen(true)}
                      placeholder={reorder?.supplier_name ? `Search to add product from ${reorder.supplier_name}...` : 'Search to add product...'}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[220px] focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    {addProductOpen && (addProductQuery.trim() || addProductSuggestions.length > 0) && (
                      <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        {addProductSuggestions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">No matching products</div>
                        ) : (
                          addProductSuggestions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                addProduct(p.id)
                                setAddProductQuery('')
                                setAddProductOpen(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 border-b border-gray-100 last:border-0"
                            >
                              {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700" title="Ordered Qty = Qty (Box) × Qty (Piece)">Ordered Qty</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Qty (Box)</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Qty (Piece)</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Received (Box)</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Received (Piece)</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Rate (₹)</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Total</th>
                      <th className="px-3 py-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRowsWithIndex.length === 0 && itemSearch.trim() ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                          No items match &quot;{itemSearch.trim()}&quot;
                        </td>
                      </tr>
                    ) : (
                    filteredRowsWithIndex.map(({ row, index }) => (
                      <tr key={`${row.product_id}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{row.product_name}</td>
                        <td className="px-3 py-2 text-right text-gray-800 font-medium" title="Ordered Qty = Box × Piece, or Box or Piece when only one is set">
                          {getOrderedQty(row)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.ordered_qty_box === 0 ? '' : String(row.ordered_qty_box)}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '')
                              updateRow(index, 'ordered_qty_box', v === '' ? 0 : Math.max(0, parseFloat(v) || 0))
                            }}
                            placeholder="0"
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.ordered_qty_piece === 0 ? '' : String(row.ordered_qty_piece)}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '')
                              updateRow(index, 'ordered_qty_piece', v === '' ? 0 : Math.max(0, parseFloat(v) || 0))
                            }}
                            placeholder="0"
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">{row.received_qty_box ?? 0}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{row.received_qty_piece ?? 0}</td>
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
                        <td className="px-3 py-2 text-right font-medium">₹{(getOrderedQty(row) * row.unit_price).toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => removeRow(index)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                            Remove
                        </button>
                      </td>
                    </tr>
                    ))
                    )}
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
