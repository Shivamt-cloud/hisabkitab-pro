import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { saleService } from '../services/saleService'
import { customerService } from '../services/customerService'
import { Sale } from '../types/sale'
import { Customer } from '../types/customer'
import { Home, Search, Wallet, FileText, ChevronDown, X, Check } from 'lucide-react'

function getBalanceDue(sale: Sale): number {
  const pmTotal = (sale.payment_methods || []).reduce((sum, p) => sum + (p.amount || 0), 0)
  return Math.max(0, sale.grand_total - pmTotal - (sale.credit_applied || 0))
}

function parseAlterationNotes(sale: Sale): { purpose: string; sentTo: string } {
  const an = sale.alteration_notes || ''
  const purposeMatch = an.match(/^Purpose:\s*(.+?)(?=\n|$)/m)
  const sentToMatch = an.match(/^Sent to:\s*(.+?)(?=\n|$)/m)
  return {
    purpose: purposeMatch?.[1]?.trim() || 'Alteration',
    sentTo: sentToMatch?.[1]?.trim() || '',
  }
}

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'other'] as const

const BalanceCollection = () => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [receiveAmount, setReceiveAmount] = useState('')
  const [receiveMethod, setReceiveMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash')
  const [submitting, setSubmitting] = useState(false)

  const companyId = getCurrentCompanyId()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [allSales, allCustomers] = await Promise.all([
          saleService.getAllFast(true, companyId),
          customerService.getAllFast(true, companyId),
        ])
        const alterationWithBalance = allSales.filter(s => {
          if (!s.hold_for_alteration) return false
          const due = getBalanceDue(s)
          return due > 0
        })
        setSales(alterationWithBalance)
        setCustomers(allCustomers)
      } catch (e) {
        console.error(e)
        toast.error('Failed to load sales')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [companyId, toast])

  const getCustomer = (sale: Sale): Customer | undefined =>
    sale.customer_id ? customers.find(c => c.id === sale.customer_id) : undefined

  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales
    const q = searchQuery.trim().toLowerCase()
    return sales.filter(s => {
      const inv = (s.invoice_number || '').toLowerCase()
      const name = (s.customer_name || '').toLowerCase()
      const cust = getCustomer(s)
      const phone = (cust?.phone || '').replace(/\D/g, '')
      const qNum = q.replace(/\D/g, '')
      return inv.includes(q) || name.includes(q) || (qNum.length >= 4 && phone.includes(qNum))
    })
  }, [sales, searchQuery, customers])

  const selectedBalanceDue = selectedSale ? getBalanceDue(selectedSale) : 0

  const handleReceivePayment = async () => {
    if (!selectedSale) return
    const amount = parseFloat(receiveAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (amount > selectedBalanceDue) {
      toast.error('Amount cannot exceed balance due')
      return
    }
    setSubmitting(true)
    try {
      const existingMethods = selectedSale.payment_methods || []
      const newEntry = { method: receiveMethod, amount, received_at: new Date().toISOString() }
      const updatedMethods = [...existingMethods, newEntry]
      const totalPaid = updatedMethods.reduce((sum, p) => sum + (p.amount || 0), 0)
      const isFullyPaid = totalPaid >= selectedSale.grand_total - (selectedSale.credit_applied || 0)

      await saleService.update(selectedSale.id, {
        payment_methods: updatedMethods,
        payment_status: isFullyPaid ? 'paid' : 'pending',
        payment_method: updatedMethods.length > 0 ? updatedMethods[0].method : selectedSale.payment_method,
        amount_to_pay: isFullyPaid ? 0 : Math.max(0, selectedSale.grand_total - totalPaid - (selectedSale.credit_applied || 0)),
      })

      toast.success(`₹${amount.toFixed(2)} received${isFullyPaid ? ' – sale fully paid' : ''}`)
      const saleIdForReceipt = selectedSale.id
      setSelectedSale(null)
      setReceiveAmount('')
      setDropdownOpen(false)
      setSearchQuery('')
      const [allSales] = await Promise.all([saleService.getAllFast(true, companyId)])
      const alterationWithBalance = allSales.filter(s => {
        if (!s.hold_for_alteration) return false
        return getBalanceDue(s) > 0
      })
      setSales(alterationWithBalance)
      navigate(`/invoice/${saleIdForReceipt}/payment-receipt`, { state: { print: true } })
    } catch (e) {
      console.error(e)
      toast.error('Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedRoute requiredPermission="sales:update">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/30">
        <header className="bg-white/80 backdrop-blur-lg shadow border-b border-amber-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                  title="Back to Dashboard"
                >
                  <Home className="w-6 h-6 text-amber-700" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-amber-600" />
                    Balance on collection
                  </h1>
                  <p className="text-sm text-gray-600">Receive pending amount when customer picks up after alteration</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-lg border border-amber-200/60 overflow-hidden">
            <div className="p-4 border-b border-amber-100 relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search by invoice number, customer name or phone</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="e.g. INV-2025-001 or customer name or phone"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSelectedSale(null); setDropdownOpen(true); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {dropdownOpen && (
                <>
                  <div className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto" style={{ top: '100%' }}>
                    {loading ? (
                      <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : filteredSales.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        {searchQuery ? 'No matching invoices with pending balance' : 'No alteration sales with pending balance'}
                      </div>
                    ) : (
                      filteredSales.map((sale) => {
                        const due = getBalanceDue(sale)
                        const cust = getCustomer(sale)
                        return (
                          <button
                            key={sale.id}
                            type="button"
                            onClick={() => {
                              setSelectedSale(sale)
                              setReceiveAmount(due.toFixed(2))
                              setDropdownOpen(false)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-gray-100 last:border-0 flex justify-between items-center gap-2"
                          >
                            <span className="font-medium text-gray-900">{sale.invoice_number}</span>
                            <span className="text-sm text-gray-600">{sale.customer_name || 'Walk-in'}</span>
                            <span className="font-semibold text-amber-700">₹{due.toFixed(2)} due</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                  <div className="fixed inset-0 z-[10]" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
                </>
              )}
            </div>

            {selectedSale && (
              <div className="p-4 space-y-4 border-t border-amber-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Invoice: {selectedSale.invoice_number}</h2>
                  <button
                    type="button"
                    onClick={() => setSelectedSale(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer</p>
                    <p className="font-medium text-gray-900">{selectedSale.customer_name || 'Walk-in'}</p>
                    {(() => {
                      const c = getCustomer(selectedSale)
                      if (c?.phone) return <p className="text-sm text-gray-600">{c.phone}</p>
                      return null
                    })()}
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Balance due</p>
                    <p className="text-2xl font-bold text-amber-800">₹{selectedBalanceDue.toFixed(2)}</p>
                  </div>
                </div>

                {(() => {
                  const { purpose, sentTo } = parseAlterationNotes(selectedSale)
                  return (
                    (purpose || sentTo) && (
                      <div className="text-sm text-gray-600">
                        {purpose && <span>Purpose: {purpose}</span>}
                        {sentTo && <span className="ml-2">Sent to: {sentTo}</span>}
                      </div>
                    )
                  )
                })()}

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Products</p>
                  <ul className="space-y-1">
                    {selectedSale.items.filter(i => i.sale_type !== 'return').map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-800">
                        {item.product_name} × {item.quantity} — ₹{(item.total || 0).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Receive payment</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={receiveAmount}
                        onChange={(e) => setReceiveAmount(e.target.value)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
                      <select
                        value={receiveMethod}
                        onChange={(e) => setReceiveMethod(e.target.value as typeof receiveMethod)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      >
                        {PAYMENT_METHODS.map(m => (
                          <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleReceivePayment}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : (
                        <>
                          <Check className="w-4 h-4" />
                          Receive payment
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/invoice/${selectedSale.id}/payment-receipt`)}
                    className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    View / Print payment receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/invoice/${selectedSale.id}`)}
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    View full invoice
                  </button>
                </div>
              </div>
            )}

            {!selectedSale && !loading && sales.length > 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Search and select an invoice above to receive balance
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default BalanceCollection
