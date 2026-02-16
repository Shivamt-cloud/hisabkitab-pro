import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlanUpgrade } from '../context/PlanUpgradeContext'
import { useToast } from '../context/ToastContext'
import { serviceRecordService } from '../services/serviceRecordService'
import { userService } from '../services/userService'
import { technicianService } from '../services/technicianService'
import { companyService } from '../services/companyService'
import { getServiceNotifyMessage, getUpcomingServiceReminderMessage, getDaysUntilNextService } from '../utils/serviceNotifyMessage'
import type { UserWithPassword } from '../services/userService'
import type { Technician } from '../types/technician'
import { Home, Bike, Car, Zap, BatteryCharging, Plus, Search, Edit, Trash2, Calendar, DollarSign, User, UserPlus, ChevronRight, Save, CreditCard, Receipt, FileText, MessageCircle, Mail, CalendarClock } from 'lucide-react'
import { LockIcon } from '../components/icons/LockIcon'
import type { ServiceRecord, ServiceVehicleType } from '../types/serviceRecord'
import { SERVICE_STATUS_LABELS, SERVICE_PAYMENT_METHODS, getServiceTotal } from '../types/serviceRecord'
import type { ServiceStatus } from '../types/serviceRecord'

const VEHICLE_CONFIG: Record<ServiceVehicleType, { label: string; icon: React.ReactNode }> = {
  bike: { label: 'Bike', icon: <Bike className="w-8 h-8" /> },
  car: { label: 'Car', icon: <Car className="w-8 h-8" /> },
  ebike: { label: 'E-bike', icon: <Zap className="w-8 h-8" /> },
  ecar: { label: 'E-car', icon: <BatteryCharging className="w-8 h-8" /> },
}

const VALID_VEHICLE_TYPES: ServiceVehicleType[] = ['bike', 'car', 'ebike', 'ecar']

const Services = () => {
  const navigate = useNavigate()
  const { vehicleType: paramType } = useParams<{ vehicleType: string }>()
  const { hasPermission, hasPlanFeature, getCurrentCompanyId } = useAuth()
  const { showPlanUpgrade } = usePlanUpgrade()
  const { toast } = useToast()

  const location = useLocation()
  const vehicleType: ServiceVehicleType = (VALID_VEHICLE_TYPES.includes(paramType as ServiceVehicleType)
    ? paramType
    : 'bike') as ServiceVehicleType

  const canAccessEbikeEcar = hasPlanFeature('services_ebike_ecar')
  const canNotifyCustomer = hasPlanFeature('services_customer_notify')

  const formatPhoneForWhatsApp = (phone: string): string | null => {
    const digits = (phone || '').replace(/\D/g, '')
    if (digits.length === 10) return '91' + digits
    if (digits.length === 12 && digits.startsWith('91')) return digits
    return digits.length >= 10 ? '91' + digits.slice(-10) : null
  }

  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserWithPassword[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('all')
  const [upcomingOnly, setUpcomingOnly] = useState(Boolean((location?.state as { upcomingOnly?: boolean } | null)?.upcomingOnly))
  const [companyName, setCompanyName] = useState<string>('HisabKitab Pro')

  useEffect(() => {
    if (!paramType || !VALID_VEHICLE_TYPES.includes(paramType as ServiceVehicleType)) {
      navigate('/services/bike', { replace: true })
      return
    }
    if ((paramType === 'ebike' || paramType === 'ecar') && !canAccessEbikeEcar) {
      navigate('/services/bike', { replace: true })
    }
  }, [paramType, canAccessEbikeEcar, navigate])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const list = await serviceRecordService.getAll(companyId, vehicleType)
      setRecords(list)
    } catch (e) {
      console.error('Failed to load services:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if ((vehicleType === 'ebike' || vehicleType === 'ecar') && !canAccessEbikeEcar) return
    loadRecords()
  }, [vehicleType, canAccessEbikeEcar])

  useEffect(() => {
    const load = async () => {
      const companyId = getCurrentCompanyId()
      const [allUsers, techList, company] = await Promise.all([
        userService.getAll(),
        technicianService.getAll(companyId ?? undefined),
        companyId != null ? companyService.getById(companyId) : Promise.resolve(null),
      ])
      const userList = companyId != null ? allUsers.filter((u) => u.company_id === companyId) : allUsers
      setUsers(userList)
      setTechnicians(techList)
      if (company?.name) setCompanyName(company.name)
    }
    load()
  }, [getCurrentCompanyId])

  const filteredRecords = useMemo(() => {
    let list = records
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
          (r.vehicle_number && r.vehicle_number.toLowerCase().includes(q)) ||
          (r.service_type && r.service_type.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q))
      )
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      list = list.filter((r) => new Date(r.service_date).getTime() >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000
      list = list.filter((r) => new Date(r.service_date).getTime() <= to)
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => (r.status || 'draft') === statusFilter)
    }
    if (upcomingOnly) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const in30 = new Date(today)
      in30.setDate(in30.getDate() + 30)
      list = list.filter((r) => {
        if (!r.next_service_date) return false
        const d = new Date(r.next_service_date)
        d.setHours(0, 0, 0, 0)
        return d >= today && d <= in30
      })
    }
    return list
  }, [records, searchQuery, dateFrom, dateTo, statusFilter, upcomingOnly])

  const totalAmount = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + r.amount, 0),
    [filteredRecords]
  )

  const handleDelete = async (id: number) => {
    if (!hasPermission('services:delete')) return
    if (!window.confirm('Delete this service record?')) return
    try {
      await serviceRecordService.delete(id)
      loadRecords()
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  type PendingTechnician = {
    assigned_to?: string
    assigned_technician_id?: number
    technician_name?: string
    technician_phone?: string
    technician_notes?: string
  }
  const [pendingStatus, setPendingStatus] = useState<Record<number, ServiceStatus>>({})
  const [pendingTechnician, setPendingTechnician] = useState<Record<number, PendingTechnician>>({})
  const [saving, setSaving] = useState(false)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [showAddTechnician, setShowAddTechnician] = useState(false)
  const [addTechForm, setAddTechForm] = useState({ name: '', phone: '', notes: '' })
  const [savingTech, setSavingTech] = useState(false)
  const [paymentModalRecordId, setPaymentModalRecordId] = useState<number | null>(null)
  const [paymentModalForm, setPaymentModalForm] = useState({
    payment_method: '',
    payment_status: 'pending' as 'pending' | 'paid',
    payment_date: new Date().toISOString().split('T')[0],
    receipt_number: '',
  })
  const [savingPayment, setSavingPayment] = useState(false)

  const getAssignmentValue = (r: ServiceRecord, pending?: PendingTechnician | null): string => {
    if (pending) {
      if (pending.assigned_to) return `user-${pending.assigned_to}`
      if (pending.assigned_technician_id != null) return `tech-${pending.assigned_technician_id}`
      return ''
    }
    if (r.assigned_to) return `user-${r.assigned_to}`
    if (r.assigned_technician_id != null) return `tech-${r.assigned_technician_id}`
    return ''
  }

  const getDisplayStatus = (r: ServiceRecord): ServiceStatus => {
    if (pendingStatus[r.id] !== undefined) return pendingStatus[r.id]
    return (r.status || 'draft') as ServiceStatus
  }

  const handleTechnicianChange = (id: number, value: string) => {
    if (!hasPermission('services:update')) return
    if (value === '') {
      setPendingTechnician((prev) => ({ ...prev, [id]: { assigned_to: undefined, assigned_technician_id: undefined, technician_name: undefined, technician_phone: undefined, technician_notes: undefined } }))
    } else if (value.startsWith('user-')) {
      const uid = value.slice(5)
      const u = users.find((x) => x.id === uid)
      setPendingTechnician((prev) => ({ ...prev, [id]: { assigned_to: uid, assigned_technician_id: undefined, technician_name: u?.name, technician_phone: undefined, technician_notes: undefined } }))
    } else if (value.startsWith('tech-')) {
      const techId = parseInt(value.slice(5), 10)
      const t = technicians.find((x) => x.id === techId)
      setPendingTechnician((prev) => ({ ...prev, [id]: { assigned_to: undefined, assigned_technician_id: techId, technician_name: t?.name, technician_phone: t?.phone, technician_notes: t?.notes } }))
    }
  }

  const handleStatusChange = (id: number, newStatus: ServiceStatus) => {
    if (!hasPermission('services:update')) return
    setPendingStatus((prev) => ({ ...prev, [id]: newStatus }))
  }

  const hasPendingChanges = Object.keys(pendingStatus).length > 0 || Object.keys(pendingTechnician).length > 0

  const hasRowPendingChanges = (id: number) =>
    pendingStatus[id] !== undefined || pendingTechnician[id] !== undefined

  const handleSaveRow = async (id: number) => {
    if (!hasPermission('services:update')) return
    const rec = records.find((r) => r.id === id)
    if (!rec) return
    const hasStatus = pendingStatus[id] !== undefined
    const hasTech = pendingTechnician[id] !== undefined
    if (!hasStatus && !hasTech) return
    setSavingRowId(id)
    try {
      const statusPayload = hasStatus ? { status: pendingStatus[id] } : {}
      const techPayload = hasTech
        ? {
            assigned_to: pendingTechnician[id].assigned_to,
            assigned_technician_id: pendingTechnician[id].assigned_technician_id,
            technician_name: pendingTechnician[id].technician_name,
            technician_phone: pendingTechnician[id].technician_phone,
            technician_notes: pendingTechnician[id].technician_notes,
          }
        : {}
      await serviceRecordService.update(id, { ...statusPayload, ...techPayload })
      setPendingStatus((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setPendingTechnician((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r
          return {
            ...r,
            ...(hasStatus && { status: pendingStatus[id] }),
            ...(hasTech && {
              assigned_to: pendingTechnician[id].assigned_to,
              assigned_technician_id: pendingTechnician[id].assigned_technician_id,
              technician_name: pendingTechnician[id].technician_name,
              technician_phone: pendingTechnician[id].technician_phone,
              technician_notes: pendingTechnician[id].technician_notes,
            }),
          }
        })
      )
      toast.success('Saved')
    } catch (e) {
      console.error('Save row failed:', e)
      toast.error('Failed to save')
    } finally {
      setSavingRowId(null)
    }
  }

  const openPaymentModal = (rec: ServiceRecord) => {
    setPaymentModalRecordId(rec.id)
    setPaymentModalForm({
      payment_method: rec.payment_method || '',
      payment_status: (rec.payment_status === 'paid' ? 'paid' : 'pending') as 'pending' | 'paid',
      payment_date: rec.payment_date ? rec.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
      receipt_number: rec.receipt_number || '',
    })
  }

  const handleSavePayment = async () => {
    if (paymentModalRecordId == null || !hasPermission('services:update')) return
    setSavingPayment(true)
    try {
      await serviceRecordService.update(paymentModalRecordId, {
        payment_method: paymentModalForm.payment_method || undefined,
        payment_status: paymentModalForm.payment_status,
        payment_date: paymentModalForm.payment_status === 'paid' ? new Date(paymentModalForm.payment_date).toISOString() : undefined,
        receipt_number: paymentModalForm.receipt_number.trim() || undefined,
      })
      setRecords((prev) =>
        prev.map((r) =>
          r.id === paymentModalRecordId
            ? {
                ...r,
                payment_method: paymentModalForm.payment_method || undefined,
                payment_status: paymentModalForm.payment_status,
                payment_date: paymentModalForm.payment_status === 'paid' ? new Date(paymentModalForm.payment_date).toISOString() : undefined,
                receipt_number: paymentModalForm.receipt_number.trim() || undefined,
              }
            : r
        )
      )
      setPaymentModalRecordId(null)
      toast.success('Payment saved')
    } catch (e) {
      console.error('Save payment failed:', e)
      toast.error('Failed to save payment')
    } finally {
      setSavingPayment(false)
    }
  }

  const handleAddTechnician = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = addTechForm.name.trim()
    if (!name) {
      toast.error('Technician name is required')
      return
    }
    setSavingTech(true)
    try {
      const companyId = getCurrentCompanyId()
      const created = await technicianService.create({
        company_id: companyId ?? undefined,
        name,
        phone: addTechForm.phone.trim() || undefined,
        notes: addTechForm.notes.trim() || undefined,
      })
      setTechnicians((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setAddTechForm({ name: '', phone: '', notes: '' })
      setShowAddTechnician(false)
      toast.success('Technician added – you can now assign in the dropdown')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add technician')
    } finally {
      setSavingTech(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!hasPermission('services:update') || !hasPendingChanges) return
    setSaving(true)
    try {
      const ids = new Set<number>([...Object.keys(pendingStatus).map(Number), ...Object.keys(pendingTechnician).map(Number)])
      await Promise.all(
        [...ids].map(async (id) => {
          const rec = records.find((r) => r.id === id)
          if (!rec) return
          const statusPayload = pendingStatus[id] !== undefined ? { status: pendingStatus[id] } : {}
          const techPayload = pendingTechnician[id]
            ? {
                assigned_to: pendingTechnician[id].assigned_to,
                assigned_technician_id: pendingTechnician[id].assigned_technician_id,
                technician_name: pendingTechnician[id].technician_name,
                technician_phone: pendingTechnician[id].technician_phone,
                technician_notes: pendingTechnician[id].technician_notes,
              }
            : {}
          await serviceRecordService.update(id, { ...statusPayload, ...techPayload })
        })
      )
      setPendingStatus({})
      setPendingTechnician({})
      await loadRecords()
      toast.success('Status and technician changes saved')
    } catch (e) {
      console.error('Save failed:', e)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if ((vehicleType === 'ebike' || vehicleType === 'ecar') && !canAccessEbikeEcar) {
    return null
  }

  const config = VEHICLE_CONFIG[vehicleType]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <button type="button" onClick={() => navigate('/')} className="hover:text-blue-600 font-medium">
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button type="button" onClick={() => navigate('/services/bike')} className="hover:text-blue-600 font-medium">
              Services
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-semibold">{config.label}</span>
          </nav>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200 bg-white"
                title="Back to Dashboard"
              >
                <Home className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{config.label} Services</h1>
                <p className="text-sm text-gray-600 mt-1">Manage {config.label.toLowerCase()} service records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasPendingChanges && hasPermission('services:update') && (
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium disabled:opacity-60"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/services/${vehicleType}/report`)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium text-gray-700"
              >
                <FileText className="w-5 h-5" />
                Report
              </button>
              {hasPermission('services:create') && (
                <>
                  <button
                    onClick={() => navigate(`/services/${vehicleType}/new?book=1`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium"
                    title="Book an appointment for a future date"
                  >
                    <CalendarClock className="w-5 h-5" />
                    Book appointment
                  </button>
                  <button
                    onClick={() => navigate(`/services/${vehicleType}/new`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Add service
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total (filtered)</p>
              <p className="text-3xl font-bold">₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              <p className="text-blue-100 text-sm mt-1">{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer, vehicle number, service type..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All statuses</option>
                {(Object.entries(SERVICE_STATUS_LABELS) as [ServiceStatus, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setUpcomingOnly((v) => !v)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-medium transition-colors ${
                  upcomingOnly
                    ? 'bg-amber-100 border-amber-400 text-amber-800'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Show services with next service date in next 30 days"
              >
                <Calendar className="w-4 h-4" />
                Upcoming (30 days)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
                className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
                className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Service records</span>
            {hasPermission('services:update') && (
              <button
                type="button"
                onClick={() => setShowAddTechnician(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Add technician
              </button>
            )}
          </div>
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vehicle no.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Service type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Technician</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Parts sale</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Next service</th>
                    {(hasPermission('services:update') || hasPermission('services:delete') || hasPermission('services:read')) ? (
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={(hasPermission('services:update') || hasPermission('services:delete') || hasPermission('services:read')) ? 11 : 10} className="px-4 py-12 text-center text-gray-500">
                        No service records. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(r.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{r.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{r.vehicle_number || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {r.service_type || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {hasPermission('services:update') ? (
                            <select
                              value={getDisplayStatus(r)}
                              onChange={(e) => handleStatusChange(r.id, e.target.value as ServiceStatus)}
                              className={`text-xs font-medium rounded-lg border py-1.5 px-2 pr-6 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent ${pendingStatus[r.id] !== undefined ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-gray-300 bg-slate-50 text-slate-800 hover:bg-slate-100'}`}
                            >
                              {(Object.entries(SERVICE_STATUS_LABELS) as [ServiceStatus, string][]).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-800">
                              {SERVICE_STATUS_LABELS[getDisplayStatus(r)]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasPermission('services:update') ? (
                            <select
                              value={getAssignmentValue(r, pendingTechnician[r.id])}
                              onChange={(e) => handleTechnicianChange(r.id, e.target.value)}
                              className={`text-sm rounded-lg border py-1.5 px-2 pr-8 max-w-[180px] cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent ${pendingTechnician[r.id] ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-gray-300 bg-slate-50 text-slate-800 hover:bg-slate-100'}`}
                              title={[r.technician_name, r.technician_phone, r.technician_notes].filter(Boolean).join(' • ') || 'Assign technician'}
                            >
                              <option value="">— No assignment</option>
                              <option disabled>— Assign to user —</option>
                              {users.map((u) => (
                                <option key={u.id} value={`user-${u.id}`}>{u.name}</option>
                              ))}
                              <option disabled>— Assign to technician —</option>
                              {technicians.map((t) => (
                                <option key={t.id} value={`tech-${t.id}`}>{t.name}{t.phone ? ` (${t.phone})` : ''}</option>
                              ))}
                              {technicians.length === 0 && (
                                <option disabled>No technicians yet – add below</option>
                              )}
                            </select>
                          ) : (
                            <span className="text-sm text-gray-900" title={[r.technician_name, r.technician_phone, r.technician_notes].filter(Boolean).join(' • ') || undefined}>
                              {(pendingTechnician[r.id]?.technician_name ?? r.technician_name) ? (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-gray-400" />
                                  {pendingTechnician[r.id]?.technician_name ?? r.technician_name}
                                  {(pendingTechnician[r.id]?.technician_phone ?? r.technician_phone) && <span className="text-gray-500 text-xs">({pendingTechnician[r.id]?.technician_phone ?? r.technician_phone})</span>}
                                </span>
                              ) : (
                                '—'
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ₹{r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {(r.parts_total ?? 0) > 0 ? (
                            <>₹{(r.parts_total ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ₹{getServiceTotal(r).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {r.next_service_date
                            ? new Date(r.next_service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        {(hasPermission('services:update') || hasPermission('services:delete') || hasPermission('services:read')) && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {r.customer_phone && formatPhoneForWhatsApp(r.customer_phone) && (
                                canNotifyCustomer ? (
                                  <a
                                    href={`https://wa.me/${formatPhoneForWhatsApp(r.customer_phone)}?text=${encodeURIComponent(getServiceNotifyMessage(r, companyName))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                    title="WhatsApp customer – status & full details"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => showPlanUpgrade('services_customer_notify')}
                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                                    title="Upgrade to Premium Plus to notify customer"
                                  >
                                    <LockIcon className="w-4 h-4" />
                                  </button>
                                )
                              )}
                              {(r.customer_email || '').trim() && (
                                canNotifyCustomer ? (
                                  <a
                                    href={`mailto:${encodeURIComponent(r.customer_email!.trim())}?subject=${encodeURIComponent(`${(r.status && SERVICE_STATUS_LABELS[r.status as keyof typeof SERVICE_STATUS_LABELS]) || r.status || 'Update'} #${r.receipt_number || r.id} - ${companyName}`)}&body=${encodeURIComponent(getServiceNotifyMessage(r, companyName).replace(/\*/g, ''))}`}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                    title="Email customer – status & full details"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => showPlanUpgrade('services_customer_notify')}
                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                                    title="Upgrade to Premium Plus to notify customer"
                                  >
                                    <LockIcon className="w-4 h-4" />
                                  </button>
                                )
                              )}
                              {getDaysUntilNextService(r.next_service_date) !== null && (r.customer_phone || r.customer_email) && (
                                canNotifyCustomer ? (
                                  <>
                                    {r.customer_phone && formatPhoneForWhatsApp(r.customer_phone) && (
                                      <a
                                        href={`https://wa.me/${formatPhoneForWhatsApp(r.customer_phone)}?text=${encodeURIComponent(getUpcomingServiceReminderMessage(r, companyName))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                                        title={`Remind: ${getDaysUntilNextService(r.next_service_date) === 0 ? 'Due today' : `${getDaysUntilNextService(r.next_service_date)} days to next service`}`}
                                      >
                                        <CalendarClock className="w-4 h-4" />
                                      </a>
                                    )}
                                    {(r.customer_email || '').trim() && (
                                      <a
                                        href={`mailto:${encodeURIComponent(r.customer_email!.trim())}?subject=${encodeURIComponent(`Reminder: Next service in ${getDaysUntilNextService(r.next_service_date) === 0 ? 'today' : `${getDaysUntilNextService(r.next_service_date)} days`} - ${companyName}`)}&body=${encodeURIComponent(getUpcomingServiceReminderMessage(r, companyName).replace(/\*/g, ''))}`}
                                        className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg"
                                        title={`Remind: ${getDaysUntilNextService(r.next_service_date) === 0 ? 'Due today' : `${getDaysUntilNextService(r.next_service_date)} days to next service`}`}
                                      >
                                        <Mail className="w-4 h-4" />
                                      </a>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => showPlanUpgrade('services_customer_notify')}
                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                                    title="Upgrade to Premium Plus to remind customer about upcoming service"
                                  >
                                    <LockIcon className="w-4 h-4" />
                                  </button>
                                )
                              )}
                              {hasPermission('services:update') && hasRowPendingChanges(r.id) && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveRow(r.id)}
                                  disabled={savingRowId === r.id}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg disabled:opacity-60"
                                  title="Save status & technician for this row"
                                >
                                  <Save className="w-4 h-4" />
                                  {savingRowId === r.id ? 'Saving...' : 'Save'}
                                </button>
                              )}
                              {(getDisplayStatus(r) === 'completed') && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(r)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Payment & receipt"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}
                              {hasPermission('services:update') && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/services/${vehicleType}/${r.id}/edit`)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {hasPermission('services:delete') && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(r.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick switch templates */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(canAccessEbikeEcar ? VALID_VEHICLE_TYPES : (['bike', 'car'] as const)).map((type) => (
            <button
              key={type}
              onClick={() => navigate(`/services/${type}`)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                type === vehicleType ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {VEHICLE_CONFIG[type].label}
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
          <h3 className="font-semibold mb-2">Services module</h3>
          <p className="text-blue-100 text-sm">
            Four templates: Bike, Car, E-bike, E-car. Premium and above: all four. Reports and export coming later.
          </p>
        </div>
      </main>

      {/* Payment & receipt modal (for completed services) */}
      {paymentModalRecordId != null && (() => {
        const rec = records.find((r) => r.id === paymentModalRecordId)
        if (!rec) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Payment & receipt</h3>
                <p className="text-sm text-gray-500 mt-0.5">{rec.customer_name} · Total ₹{getServiceTotal(rec).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                  <select
                    value={paymentModalForm.payment_method}
                    onChange={(e) => setPaymentModalForm((p) => ({ ...p, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select method</option>
                    {Object.entries(SERVICE_PAYMENT_METHODS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentModalForm.payment_status === 'paid'}
                    onChange={(e) =>
                      setPaymentModalForm((p) => ({
                        ...p,
                        payment_status: e.target.checked ? 'paid' : 'pending',
                        payment_date: e.target.checked ? new Date().toISOString().split('T')[0] : p.payment_date,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as paid</span>
                </label>
                {paymentModalForm.payment_status === 'paid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment date</label>
                    <input
                      type="date"
                      value={paymentModalForm.payment_date}
                      onChange={(e) => setPaymentModalForm((p) => ({ ...p, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt number</label>
                  <input
                    type="text"
                    value={paymentModalForm.receipt_number}
                    onChange={(e) => setPaymentModalForm((p) => ({ ...p, receipt_number: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSavePayment}
                    disabled={savingPayment}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {savingPayment ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const id = paymentModalRecordId
                      await handleSavePayment()
                      if (id != null) navigate(`/services/${vehicleType}/${id}/receipt`)
                    }}
                    disabled={savingPayment}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                  >
                    <Receipt className="w-4 h-4" />
                    Give receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentModalRecordId(null)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Add technician modal */}
      {showAddTechnician && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add technician</h3>
              <p className="text-sm text-gray-500 mt-0.5">New technicians will appear in the Assign to technician dropdown</p>
            </div>
            <form onSubmit={handleAddTechnician} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={addTechForm.name}
                  onChange={(e) => setAddTechForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Technician name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={addTechForm.phone}
                  onChange={(e) => setAddTechForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={addTechForm.notes}
                  onChange={(e) => setAddTechForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddTechnician(false); setAddTechForm({ name: '', phone: '', notes: '' }) }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingTech} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {savingTech ? 'Adding...' : 'Add technician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Services
