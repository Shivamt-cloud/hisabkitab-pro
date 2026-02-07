/**
 * Reorder History: list purchase reorders (placed / partial_received / received / cancelled), Open and Order Received.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { purchaseReorderService } from '../services/purchaseReorderService'
import { Home, Package, Eye, CheckCircle, X, FileDown, FileSpreadsheet, Pencil } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { exportReorderToPdf, exportReorderToExcel } from '../utils/exportUtils'
import type { PurchaseReorder, PurchaseReorderItem } from '../types/purchaseReorder'

const statusColors: Record<string, string> = {
  placed: 'bg-amber-100 text-amber-800',
  partial_received: 'bg-blue-100 text-blue-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function PurchaseReorders() {
  const navigate = useNavigate()
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const [reorders, setReorders] = useState<PurchaseReorder[]>([])
  const [loading, setLoading] = useState(true)
  const [receiveModal, setReceiveModal] = useState<PurchaseReorder | null>(null)
  const [receiveRows, setReceiveRows] = useState<{ product_id: number; product_name?: string; ordered_qty: number; received_qty: number; unit_price: number }[]>([])
  const [saving, setSaving] = useState(false)

  const companyId = getCurrentCompanyId()

  const load = async () => {
    setLoading(true)
    try {
      const list = await purchaseReorderService.getAll(companyId ?? undefined)
      setReorders(list)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load reorders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [companyId])

  const openReceive = (reorder: PurchaseReorder) => {
    setReceiveModal(reorder)
    setReceiveRows(
      (reorder.items || []).map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        ordered_qty: it.ordered_qty ?? 0,
        received_qty: it.received_qty ?? 0,
        unit_price: it.unit_price ?? 0,
      }))
    )
  }

  const updateReceiveQty = (index: number, value: number) => {
    setReceiveRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], received_qty: Math.max(0, value) }
      return next
    })
  }

  const canEdit = (r: PurchaseReorder) => r.status === 'placed' || r.status === 'partial_received'

  const downloadPdf = (r: PurchaseReorder) => {
    try {
      const items = (r.items || []).map((it) => ({
        product_name: it.product_name,
        ordered_qty: it.ordered_qty ?? 0,
        unit_price: it.unit_price ?? 0,
        total: it.total ?? 0,
        hsn_code: it.hsn_code,
        gst_rate: it.gst_rate,
      }))
      exportReorderToPdf(
        {
          reorder_number: r.reorder_number,
          order_date: r.order_date,
          expected_date: r.expected_date,
          supplier_name: r.supplier_name,
          supplier_gstin: r.supplier_gstin,
          status: r.status.replace('_', ' '),
          notes: r.notes,
          subtotal: r.subtotal,
          total_tax: r.total_tax,
          grand_total: r.grand_total,
          items,
        },
        undefined,
        `Reorder_${r.reorder_number}`
      )
      toast.success('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error('PDF download failed')
    }
  }

  const downloadExcel = (r: PurchaseReorder) => {
    try {
      const items = (r.items || []).map((it) => ({
        product_name: it.product_name,
        ordered_qty: it.ordered_qty ?? 0,
        unit_price: it.unit_price ?? 0,
        total: it.total ?? 0,
        hsn_code: it.hsn_code,
        gst_rate: it.gst_rate,
      }))
      exportReorderToExcel(
        {
          reorder_number: r.reorder_number,
          order_date: r.order_date,
          expected_date: r.expected_date,
          supplier_name: r.supplier_name,
          supplier_gstin: r.supplier_gstin,
          status: r.status.replace('_', ' '),
          notes: r.notes,
          subtotal: r.subtotal,
          total_tax: r.total_tax,
          grand_total: r.grand_total,
          items,
        },
        undefined,
        `Reorder_${r.reorder_number}`
      )
      toast.success('Excel downloaded')
    } catch (e) {
      console.error(e)
      toast.error('Excel download failed')
    }
  }

  const confirmReceive = async () => {
    if (!receiveModal) return
    const hasAny = receiveRows.some((r) => r.received_qty > 0)
    if (!hasAny) {
      toast.error('Enter at least one received qty')
      return
    }
    setSaving(true)
    try {
      const result = await purchaseReorderService.markReceived(
        receiveModal.id,
        receiveRows.map((r) => ({
          product_id: r.product_id,
          received_qty: r.received_qty,
          unit_price: r.unit_price,
          product_name: r.product_name,
        }))
      )
      if (result) {
        toast.success('Order received. Purchase created and stock updated.')
        setReceiveModal(null)
        load()
        if (result.purchase) {
          const path = result.purchase.type === 'gst' ? `/purchases/${result.purchase.id}/edit-gst` : `/purchases/${result.purchase.id}/edit-simple`
          navigate(path)
        }
      } else {
        toast.error('Could not mark as received')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to mark as received')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute requiredPermission="purchases:read">
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
                  <Package className="w-8 h-8 text-violet-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reorder History</h1>
                    <p className="text-sm text-gray-600">Place order first, then mark &quot;Order Received&quot; when goods arrive</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/purchases/reorder')}
                className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700"
              >
                Place New Reorder
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading reorders...</p>
            </div>
          ) : reorders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No reorders yet.</p>
              <button
                type="button"
                onClick={() => navigate('/purchases/reorder')}
                className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700"
              >
                Place New Reorder
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Reorder #</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Supplier</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reorders.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.reorder_number}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(r.order_date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">{r.supplier_name || '—'}</td>
                        <td className="px-4 py-3 capitalize">{r.type}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[r.status] || 'bg-gray-100'}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">₹{r.grand_total.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => downloadPdf(r)}
                              className="flex items-center gap-1 px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs"
                              title="Download PDF"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadExcel(r)}
                              className="flex items-center gap-1 px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs"
                              title="Download Excel"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              Excel
                            </button>
                            {canEdit(r) && (
                              <button
                                type="button"
                                onClick={() => navigate(`/purchases/reorder/${r.id}/edit`)}
                                className="flex items-center gap-1 px-2 py-1.5 border border-violet-300 rounded-lg hover:bg-violet-50 text-violet-700 text-xs"
                                title="Edit reorder (add/remove items)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            )}
                            {r.status !== 'received' && r.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => openReceive(r)}
                                className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Order Received
                              </button>
                            )}
                            {r.linked_purchase_id && (
                              <button
                                type="button"
                                onClick={() => navigate(r.type === 'gst' ? `/purchases/${r.linked_purchase_id}/edit-gst` : `/purchases/${r.linked_purchase_id}/edit-simple`)}
                                className="flex items-center gap-1 px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Purchase
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* Receive modal */}
        {receiveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Order Received — {receiveModal.reorder_number}</h2>
                <button type="button" onClick={() => setReceiveModal(null)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <p className="text-sm text-gray-600 mb-3">Edit received quantity for each line. Then confirm to create purchase and update stock.</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium">Product</th>
                      <th className="text-right py-2 font-medium">Ordered</th>
                      <th className="text-right py-2 font-medium">Received Qty</th>
                      <th className="text-right py-2 font-medium">Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiveRows.map((row, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2">{row.product_name || `Product #${row.product_id}`}</td>
                        <td className="py-2 text-right">{row.ordered_qty}</td>
                        <td className="py-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.received_qty === 0 ? '' : String(row.received_qty)}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, '')
                              updateReceiveQty(index, v === '' ? 0 : Math.max(0, parseFloat(v) || 0))
                            }}
                            placeholder="0"
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="py-2 text-right">{row.unit_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setReceiveModal(null)} className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmReceive}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Confirm & Create Purchase'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
