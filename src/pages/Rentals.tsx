import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rentService } from '../services/rentService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Rental, RentalStatus } from '../types/rental'
import { Home, Plus, Calendar, User, Package, Shield, Save, BarChart3 } from 'lucide-react'

const STATUS_LABELS: Record<RentalStatus, string> = {
  booked: 'Booked',
  picked_up: 'Picked up',
  returned: 'Returned',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<RentalStatus, string> = {
  booked: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-amber-100 text-amber-800',
  returned: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

const Rentals = () => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<RentalStatus | 'all'>('all')
  const [draftStatuses, setDraftStatuses] = useState<Record<number, RentalStatus>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    loadRentals()
  }, [statusFilter])

  const handleStatusChange = (rentalId: number, newStatus: RentalStatus) => {
    setDraftStatuses((prev) => ({ ...prev, [rentalId]: newStatus }))
  }

  const handleSaveStatus = async (r: Rental) => {
    const newStatus = draftStatuses[r.id]
    if (newStatus == null || newStatus === r.status) return
    setSavingId(r.id)
    try {
      const updated = await rentService.update(r.id, { status: newStatus })
      setDraftStatuses((prev) => {
        const next = { ...prev }
        delete next[r.id]
        return next
      })
      setRentals((prev) =>
        prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
      )
      toast.success('Status updated')
    } catch (e) {
      console.error(e)
      toast.error('Failed to update status')
    } finally {
      setSavingId(null)
    }
  }

  const loadRentals = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      let list = await rentService.getAllFast(companyId)
      if (statusFilter !== 'all') {
        list = list.filter(r => r.status === statusFilter)
      }
      list.sort(
        (a, b) =>
          new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
      )
      setRentals(list)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load rentals')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  const formatCurrency = (n: number) =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <ProtectedRoute requiredPermission="sales:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
                <span>/</span>
                <span className="text-gray-900 font-medium">Rent / Bookings</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-7 h-7 text-indigo-600" />
                Rent & Bookings
              </h1>
              <p className="text-gray-600 mt-1">
                Manage goods given on rent – pickup, return dates and security deposit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/rentals/report')}
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Report
              </button>
              <button
                onClick={() => navigate('/rentals/new')}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Rent Booking
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(['all', 'booked', 'picked_up', 'returned', 'overdue', 'cancelled'] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {s === 'all' ? 'All' : STATUS_LABELS[s]}
                </button>
              )
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                Loading rentals…
              </div>
            ) : rentals.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No rentals found.</p>
                <button
                  onClick={() => navigate('/rentals/new')}
                  className="mt-3 text-indigo-600 font-medium hover:underline"
                >
                  Create first rent booking
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Rental #
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Booking
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Pickup
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Return
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Rent
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Security
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rentals.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 font-mono text-sm font-medium text-gray-900">
                          {r.rental_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {r.customer_name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(r.booking_date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(r.pickup_date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(r.return_date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(r.total_rent_amount)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right flex items-center justify-end gap-1">
                          <Shield className="w-4 h-4 text-amber-500" />
                          {formatCurrency(r.total_security_deposit)}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={draftStatuses[r.id] ?? r.status}
                            onChange={(e) =>
                              handleStatusChange(r.id, e.target.value as RentalStatus)
                            }
                            className={`text-xs font-medium px-2 py-1.5 rounded-lg border cursor-pointer bg-white ${
                              draftStatuses[r.id] !== undefined && draftStatuses[r.id] !== r.status
                                ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-400'
                                : 'border-gray-200'
                            }`}
                          >
                            {(Object.keys(STATUS_LABELS) as RentalStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {draftStatuses[r.id] !== undefined &&
                              draftStatuses[r.id] !== r.status && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveStatus(r)}
                                  disabled={savingId === r.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {savingId === r.id ? 'Saving…' : 'Save'}
                                </button>
                              )}
                            <button
                              onClick={() => navigate(`/rentals/${r.id}`)}
                              className="text-indigo-600 font-medium hover:underline text-sm"
                              title="View receipt and manage pickup/return"
                            >
                              View receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default Rentals
