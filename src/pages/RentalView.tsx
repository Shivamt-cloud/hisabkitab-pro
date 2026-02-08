import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rentService } from '../services/rentService'
import { companyService } from '../services/companyService'
import { settingsService } from '../services/settingsService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Rental, RentalStatus } from '../types/rental'
import { CUSTOMER_ID_TYPES } from '../types/customer'
import { exportHTMLToPDF } from '../utils/exportUtils'
import {
  Home,
  Package,
  Calendar,
  User,
  Phone,
  Printer,
  Pencil,
  CheckCircle2,
  Truck,
  RotateCcw,
  Clock,
  Shield,
  Share2,
  Wallet,
  Download,
} from 'lucide-react'

interface CompanyInfo {
  name: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  gstin?: string
  website?: string
  logo?: string
}

const STATUS_LABELS: Record<RentalStatus, string> = {
  booked: 'Booked',
  picked_up: 'Picked up',
  returned: 'Returned',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatCurrency = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

/** Days remaining from today to return date (can be negative if overdue). */
function getDaysRemaining(returnDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ret = new Date(returnDate)
  ret.setHours(0, 0, 0, 0)
  return Math.ceil((ret.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

const RentalView = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const [rental, setRental] = useState<Rental | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [showPickupConfirm, setShowPickupConfirm] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  const loadRental = async () => {
    if (!id) return
    setLoading(true)
    try {
      const numId = parseInt(id, 10)
      if (Number.isNaN(numId)) {
        toast.error('Invalid rental ID')
        navigate('/rentals')
        return
      }
      const r = await rentService.getById(numId)
      if (!r) {
        toast.error('Rental not found')
        navigate('/rentals')
        return
      }
      // Company isolation: do not show other company's data
      const currentCompanyId = getCurrentCompanyId()
      if (currentCompanyId != null && r.company_id != null && r.company_id !== currentCompanyId) {
        toast.error('Rental not found')
        navigate('/rentals')
        return
      }
      setRental(r)
      if (r.status === 'picked_up' && r.return_date) {
        setDaysRemaining(getDaysRemaining(r.return_date))
      }
      // Load company for receipt
      let info: CompanyInfo | null = null
      const settings = await settingsService.getAll().catch(() => null)
      const sys = settings?.company
      if (r.company_id) {
        const company = await companyService.getById(r.company_id)
        if (company) {
          const addressParts = [company.address, company.city, company.state, company.pincode].filter(Boolean)
          info = {
            name: company.name || sys?.company_name || 'HisabKitab',
            address: addressParts.length ? addressParts.join(', ') : (company.address || sys?.company_address),
            city: company.city || sys?.company_city,
            state: company.state || sys?.company_state,
            pincode: company.pincode || sys?.company_pincode,
            phone: company.phone || sys?.company_phone,
            email: company.email || sys?.company_email,
            gstin: company.gstin || sys?.company_gstin,
            website: company.website || sys?.company_website,
            logo: settings?.company?.company_logo || (company as any).logo,
          }
        }
      }
      if (!info) {
        info = {
          name: sys?.company_name || 'HisabKitab',
          address: sys?.company_address,
          city: sys?.company_city,
          state: sys?.company_state,
          pincode: sys?.company_pincode,
          phone: sys?.company_phone,
          email: sys?.company_email,
          gstin: sys?.company_gstin,
          website: sys?.company_website,
          logo: settings?.company?.company_logo,
        }
      }
      setCompanyInfo(info)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load rental')
      navigate('/rentals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRental()
  }, [id])

  // Update days remaining every minute when picked_up (so counter “decreases” day-by-day)
  useEffect(() => {
    if (!rental || rental.status !== 'picked_up' || !rental.return_date)
      return
    const interval = setInterval(() => {
      setDaysRemaining(getDaysRemaining(rental.return_date))
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [rental?.id, rental?.status, rental?.return_date])

  const handlePickupDone = async () => {
    if (!rental) return
    setShowPickupConfirm(false)
    setUpdating(true)
    try {
      const updated = await rentService.update(rental.id, { status: 'picked_up' })
      setRental(updated)
      setDaysRemaining(getDaysRemaining(updated.return_date))
      toast.success('Pickup marked as done. Return date countdown started.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  /** Total (Rent after discount + Security); advance paid; balance due at pickup */
  const getPickupPaymentSummary = (r: Rental) => {
    const grandRent = (r.total_rent_amount ?? 0) - (r.discount_amount ?? 0)
    const totalWithSecurity = grandRent + (r.total_security_deposit ?? 0)
    const advancePaid = r.advance_amount ?? (r.payment_methods ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
    const balanceDueAtPickup = Math.max(0, totalWithSecurity - advancePaid)
    return { totalWithSecurity, advancePaid, balanceDueAtPickup }
  }

  const handleReturnCompleted = async () => {
    if (!rental) return
    setUpdating(true)
    try {
      const updated = await rentService.update(rental.id, { status: 'returned' })
      setRental(updated)
      setDaysRemaining(null)
      toast.success('Return completed. Rental closed.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!rental || !receiptRef.current) return
    try {
      const tempId = `rental-receipt-${Date.now()}`
      receiptRef.current.setAttribute('id', tempId)
      await exportHTMLToPDF(tempId, `Rent_Receipt_${rental.rental_number}`, {
        format: 'a4',
        orientation: 'portrait',
        margin: 10,
      })
      receiptRef.current.removeAttribute('id')
      toast.success('Receipt downloaded')
    } catch (e) {
      console.error(e)
      toast.error('Download failed')
    }
  }

  const handleShareWhatsApp = () => {
    if (!rental) return
    const lines = [
      `Rent Receipt – ${rental.rental_number}`,
      `Customer: ${rental.customer_name}${rental.customer_phone ? ` | ${rental.customer_phone}` : ''}`,
      `Booking: ${formatDate(rental.booking_date)} | Pickup: ${formatDate(rental.pickup_date)} | Return: ${formatDate(rental.return_date)}`,
      `Status: ${STATUS_LABELS[rental.status]}`,
      `Total rent: ${formatCurrency(rental.total_rent_amount ?? 0)} | Security: ${formatCurrency(rental.total_security_deposit ?? 0)}`,
    ]
    if (rental.status === 'returned') {
      lines.push('', '✅ Rental completed. All goods returned. Security amount returned to the customer. Thank you!')
    }
    const text = lines.join('\n')
    const encoded = encodeURIComponent(text)
    const url = `https://wa.me/?text=${encoded}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading || !rental) {
    return (
      <ProtectedRoute requiredPermission="sales:read" requiredPlanFeature="sales_rent">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading rental…</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const isBooked = rental.status === 'booked'
  const isPickedUp = rental.status === 'picked_up'
  const isReturned = rental.status === 'returned'
  const isOverdue = isPickedUp && daysRemaining !== null && daysRemaining < 0

  return (
    <ProtectedRoute requiredPermission="sales:read" requiredPlanFeature="sales_rent">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 hover:text-indigo-600"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <span>/</span>
            <button
              onClick={() => navigate('/rentals')}
              className="hover:text-indigo-600"
            >
              Rent & Bookings
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">{rental.rental_number}</span>
          </nav>

          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Rental receipt – {rental.rental_number}
          </h1>

          {/* Receipt card – print-friendly */}
          <div
            ref={receiptRef}
            id="rental-receipt"
            className="bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden print:shadow-none print:border"
          >
            {/* Company name – same as sale receipt (always show, fallback HisabKitab) */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 print:bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {companyInfo?.name || 'HisabKitab'}
              </h2>
              {companyInfo && (companyInfo.address || companyInfo.city || companyInfo.state || companyInfo.pincode) && (
                <p className="text-sm text-gray-600 mt-1">
                  {[companyInfo.address, [companyInfo.city, companyInfo.state, companyInfo.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                </p>
              )}
              {companyInfo && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-600">
                  {companyInfo.phone && <span>Phone: {companyInfo.phone}</span>}
                  {companyInfo.email && <span>Email: {companyInfo.email}</span>}
                  {companyInfo.gstin && <span>GSTIN: {companyInfo.gstin}</span>}
                  {companyInfo.website && <span>Web: {companyInfo.website}</span>}
                </div>
              )}
            </div>

            {/* Receipt header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6 text-white print:bg-indigo-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider">
                    Rent Receipt
                  </p>
                  <h1 className="text-2xl font-bold mt-1 font-mono">
                    {rental.rental_number}
                  </h1>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        isReturned
                          ? 'bg-white/20 text-white'
                          : isPickedUp
                            ? 'bg-amber-400/90 text-amber-900'
                            : 'bg-white/20 text-white'
                      }`}
                    >
                      {STATUS_LABELS[rental.status]}
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm text-indigo-200">
                  <p>Booking: {formatDate(rental.booking_date)}</p>
                  <p>Pickup: {formatDate(rental.pickup_date)}</p>
                  <p>Return by: {formatDate(rental.return_date)}</p>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Customer
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-2 text-gray-900 font-semibold">
                  <User className="w-4 h-4 text-indigo-500" />
                  {rental.customer_name}
                </span>
                {rental.customer_phone && (
                  <span className="flex items-center gap-1 text-gray-600 text-sm">
                    <Phone className="w-3.5 h-3.5" />
                    {rental.customer_phone}
                  </span>
                )}
              </div>
              {(rental.sales_person_name || rental.sales_person_id) && (
                <p className="text-xs text-gray-500 mt-2">
                  Sales person: <span className="font-medium text-gray-700">{rental.sales_person_name || '—'}</span>
                </p>
              )}
              {(rental.customer_id_type || rental.customer_id_number) && (
                <p className="text-xs text-gray-500 mt-2">
                  ID proof:{' '}
                  <span className="font-medium text-gray-700">
                    {rental.customer_id_type
                      ? `${CUSTOMER_ID_TYPES.find((t) => t.value === rental.customer_id_type)?.label ?? rental.customer_id_type}${rental.customer_id_number ? ` – ${rental.customer_id_number}` : ''}`
                      : rental.customer_id_number || '—'}
                  </span>
                </p>
              )}
              {/* Payment: all methods with amounts + status (e.g. Cash ₹2000, UPI ₹200 · paid) */}
              {((rental.payment_methods?.length ?? 0) > 0 || rental.payment_method || rental.payment_status) && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5 flex-wrap">
                  <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium text-gray-700">
                    Payment:{' '}
                    {(rental.payment_methods?.length ?? 0) > 0 ? (
                      <>
                        {(rental.payment_methods ?? []).map((pm, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            <span className="capitalize">{(pm.method || '').toLowerCase()}</span> {formatCurrency(pm.amount ?? 0)}
                          </span>
                        ))}
                        {rental.payment_status && (
                          <> · <span className={rental.payment_status === 'paid' ? 'text-green-700' : rental.payment_status === 'partial' ? 'text-amber-700' : 'text-gray-600'}>{rental.payment_status}</span></>
                        )}
                      </>
                    ) : (
                      <>
                        {(rental.payment_method ?? '—').charAt(0).toUpperCase() + (rental.payment_method ?? '').slice(1)}
                        {rental.payment_status && <> · <span className={rental.payment_status === 'paid' ? 'text-green-700' : rental.payment_status === 'partial' ? 'text-amber-700' : 'text-gray-600'}>{rental.payment_status}</span></>}
                      </>
                    )}
                  </span>
                </p>
              )}
            </div>

            {/* Items table */}
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Goods on rent
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-left">
                      <th className="pb-2 font-semibold">Product</th>
                      <th className="pb-2 text-right w-14">Qty</th>
                      <th className="pb-2 text-right">Rent (₹)</th>
                      <th className="pb-2 text-right w-16">Days</th>
                      <th className="pb-2 text-right">Security</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {(rental.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2.5 font-medium text-gray-900">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 text-right">{item.quantity}</td>
                        <td className="py-2.5 text-right">
                          {item.rent_per_unit_per_day}
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {item.number_of_days}
                        </td>
                        <td className="py-2.5 text-right">
                          {formatCurrency(item.security_deposit)}
                        </td>
                        <td className="py-2.5 text-right font-medium text-gray-900">
                          {formatCurrency(item.total_rent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & Payment */}
            <div className="px-6 py-4 bg-gray-50/80 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal (Rent):</span>
                  <span className="font-medium text-gray-900">{formatCurrency(rental.total_rent_amount ?? 0)}</span>
                </div>
                {(rental.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-blue-700">
                    <span>Discount:</span>
                    <span className="font-medium">-{formatCurrency(rental.discount_amount ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Grand Total (Rent):</span>
                  <span>{formatCurrency((rental.total_rent_amount ?? 0) - (rental.discount_amount ?? 0))}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Shield className="w-4 h-4 text-amber-500" />
                    Security deposit:
                  </span>
                  <span className="font-bold text-amber-700">{formatCurrency(rental.total_security_deposit ?? 0)}</span>
                </div>
                {(() => {
                  const grandRent = (rental.total_rent_amount ?? 0) - (rental.discount_amount ?? 0)
                  const security = rental.total_security_deposit ?? 0
                  const totalWithSecurity = grandRent + security
                  const advancePaid = rental.advance_amount ?? (rental.payment_methods ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
                  const balanceDueAtPickup = Math.max(0, totalWithSecurity - advancePaid)
                  return (
                    <>
                      <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between font-bold text-gray-900">
                        <span>Total (Rent + Security):</span>
                        <span>{formatCurrency(totalWithSecurity)}</span>
                      </div>
                      {(rental.payment_methods?.length ?? 0) > 0 ? (
                        <>
                          <div className="border-t border-gray-200 pt-3 mt-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Advance paid (at booking)</p>
                            {(rental.payment_methods ?? []).map((pm, i) => (
                              <div key={i} className="flex justify-between text-sm py-0.5">
                                <span className="text-gray-600 capitalize">{(pm.method || '').toLowerCase()}</span>
                                <span className="font-medium text-gray-900">{formatCurrency(pm.amount ?? 0)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Advance paid:</span>
                            <span className="font-bold text-indigo-700">{formatCurrency(advancePaid)}</span>
                          </div>
                          <div className={`flex justify-between text-sm font-medium ${balanceDueAtPickup <= 0 ? 'text-green-700' : 'text-amber-700'}`}>
                            <span>Balance due at pickup:</span>
                            <span>{balanceDueAtPickup <= 0 ? '₹0 (Paid)' : formatCurrency(balanceDueAtPickup)}</span>
                          </div>
                        </>
                      ) : advancePaid > 0 ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Advance paid:</span>
                            <span className="font-bold text-indigo-700">{formatCurrency(advancePaid)}</span>
                          </div>
                          <div className={`flex justify-between text-sm font-medium ${balanceDueAtPickup <= 0 ? 'text-green-700' : 'text-amber-700'}`}>
                            <span>Balance due at pickup:</span>
                            <span>{balanceDueAtPickup <= 0 ? '₹0 (Paid)' : formatCurrency(balanceDueAtPickup)}</span>
                          </div>
                        </>
                      ) : (rental.payment_method || rental.payment_status) ? (
                        <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                          <span className="text-gray-600">Payment:</span>
                          <span className="font-medium text-gray-900">
                            {(rental.payment_method ?? '—').charAt(0).toUpperCase() + (rental.payment_method ?? '').slice(1)}
                            {rental.payment_status && ` · ${rental.payment_status}`}
                          </span>
                        </div>
                      ) : null}
                    </>
                  )
                })()}
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <p className="font-semibold flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    Security refund terms
                  </p>
                  <p className="leading-relaxed">
                    Security amount will be returned after goods are returned safely. Products must be in good condition with no damage or misuse. All items must be returned by the return date. Refund is subject to inspection at the time of return. Any loss or damage may be deducted from the security deposit.
                  </p>
                </div>
              </div>
              {rental.notes && (
                <p className="text-xs text-gray-500 border-t border-gray-200 pt-3">
                  Note: {rental.notes}
                </p>
              )}

            {/* Receipt footer – thank you + powered by */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 text-center text-xs text-gray-500 print:bg-white">
              <p className="font-semibold text-gray-700 mb-1">Thank you for your business!</p>
              <p className="mb-2">For any queries, please contact us using the details above.</p>
              <p className="text-gray-400">
                Powered by <a href="https://hisabkitabpro.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">HisabKitab Pro</a> · hisabkitabpro.com
              </p>
            </div>
            </div>
          </div>

          {/* Actions – hide when printing */}
          <div className="mt-6 space-y-4 print:hidden">
            {/* Status actions */}
            {isBooked && (
              <>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Mark when the customer has collected the goods.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPickupConfirm(true)}
                    disabled={updating}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    <Truck className="w-5 h-5" />
                    {updating ? 'Updating…' : 'Product pickup done'}
                  </button>
                </div>

                {/* Pickup confirmation modal – payment reminder or already paid */}
                {showPickupConfirm && rental && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:hidden" onClick={() => setShowPickupConfirm(false)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const { balanceDueAtPickup } = getPickupPaymentSummary(rental)
                        const hasBalanceDue = balanceDueAtPickup > 0
                        return (
                          <>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasBalanceDue ? 'bg-amber-100' : 'bg-green-100'}`}>
                                <Wallet className={`w-6 h-6 ${hasBalanceDue ? 'text-amber-600' : 'text-green-600'}`} />
                              </div>
                              <h3 className="text-lg font-bold text-gray-900">
                                {hasBalanceDue ? 'Payment due at pickup' : 'Payment already done'}
                              </h3>
                            </div>
                            <p className="text-gray-700 text-sm mb-6">
                              {hasBalanceDue ? (
                                <>
                                  Balance due at pickup: <span className="font-bold text-amber-700">{formatCurrency(balanceDueAtPickup)}</span>.
                                  Please collect this amount from the customer before confirming pickup.
                                </>
                              ) : (
                                <>Payment was completed during booking. You can confirm pickup.</>
                              )}
                            </p>
                            <div className="flex gap-3 justify-end">
                              <button
                                type="button"
                                onClick={() => setShowPickupConfirm(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handlePickupDone}
                                disabled={updating}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50"
                              >
                                <Truck className="w-4 h-4" />
                                {updating ? 'Updating…' : 'Confirm pickup'}
                              </button>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}

            {isPickedUp && (
              <>
                {/* Days remaining counter */}
                <div
                  className={`rounded-2xl border-2 p-6 ${
                    isOverdue
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${
                          isOverdue ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {daysRemaining !== null ? (
                          isOverdue ? (
                            Math.abs(daysRemaining)
                          ) : (
                            '–'
                          )
                        ) : (
                          '–'
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {isOverdue ? 'Days overdue' : 'Days left for return'}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          Return by {formatDate(rental.return_date)}
                        </p>
                      </div>
                    </div>
                    <Clock className="w-8 h-8 text-gray-300" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Mark when the customer has returned all goods.
                  </p>
                  <button
                    type="button"
                    onClick={handleReturnCompleted}
                    disabled={updating}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {updating ? 'Updating…' : 'Product return completed'}
                  </button>
                </div>
              </>
            )}

            {isReturned && (
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-6 shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200/20 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative flex flex-wrap items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <CheckCircle2 className="w-9 h-9 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-emerald-900">
                      Rental completed
                    </h3>
                    <p className="text-emerald-800 text-sm mt-1">
                      All goods have been returned. Thank you!
                    </p>
                    <p className="text-emerald-700 text-sm mt-2 font-medium flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber-600" />
                      Security amount returned to the customer.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Print, Download, Share & Edit */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                <Printer className="w-5 h-5" />
                Print receipt
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-indigo-300 rounded-xl text-indigo-700 font-medium hover:bg-indigo-50"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-green-300 rounded-xl text-green-700 font-medium hover:bg-green-50"
              >
                <Share2 className="w-5 h-5" />
                Share via WhatsApp
              </button>
              <button
                type="button"
                onClick={() => navigate(`/rentals/${rental.id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-indigo-300 rounded-xl text-indigo-700 font-medium hover:bg-indigo-50"
              >
                <Pencil className="w-5 h-5" />
                Edit booking
              </button>
              <button
                type="button"
                onClick={() => navigate('/rentals')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
              >
                Back to list
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default RentalView
