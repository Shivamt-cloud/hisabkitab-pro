import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { serviceRecordService } from '../services/serviceRecordService'
import { userService } from '../services/userService'
import { technicianService } from '../services/technicianService'
import { productService, type Product } from '../services/productService'
import { saleService } from '../services/saleService'
import type { UserWithPassword } from '../services/userService'
import { Home, Save, User, UserPlus, ChevronRight, CreditCard, Receipt, Package, Trash2, ExternalLink } from 'lucide-react'
import type { ServiceRecord, ServiceVehicleType } from '../types/serviceRecord'
import type { Technician } from '../types/technician'
import type { Sale } from '../types/sale'
import { BIKE_SERVICE_TYPES, CAR_SERVICE_TYPES, EBIKE_ECAR_SERVICE_TYPES, SERVICE_STATUSES, SERVICE_STATUS_LABELS, SERVICE_PAYMENT_METHODS, getServiceSubtotal, getServiceDiscountValue, getServiceTotal } from '../types/serviceRecord'

export interface ServicePartItem {
  product_id: number
  product_name: string
  barcode: string
  quantity: number
  unit_price: number
}

const VALID_VEHICLE_TYPES: ServiceVehicleType[] = ['bike', 'car', 'ebike', 'ecar']

function getServiceTypesForVehicle(vehicleType: ServiceVehicleType): string[] {
  if (vehicleType === 'bike') return [...BIKE_SERVICE_TYPES]
  if (vehicleType === 'car') return [...CAR_SERVICE_TYPES]
  if (vehicleType === 'ebike' || vehicleType === 'ecar') return [...EBIKE_ECAR_SERVICE_TYPES]
  return ['General service', 'Repair', 'Other']
}

export default function ServiceForm() {
  const navigate = useNavigate()
  const { vehicleType: paramVehicleType, id } = useParams<{ vehicleType: string; id?: string }>()
  const { user, getCurrentCompanyId, hasPlanFeature } = useAuth()
  const { toast } = useToast()

  const vehicleType: ServiceVehicleType = (VALID_VEHICLE_TYPES.includes(paramVehicleType as ServiceVehicleType)
    ? paramVehicleType
    : 'bike') as ServiceVehicleType

  const [searchParams] = useSearchParams()
  const isEditing = !!id
  const serviceTypes = getServiceTypesForVehicle(vehicleType)

  const [formData, setFormData] = useState({
    service_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    vehicle_number: '',
    customer_phone: '',
    customer_email: '',
    service_type: '',
    amount: '',
    description: '',
    next_service_date: '',
    status: 'draft' as (typeof SERVICE_STATUSES)[number],
    pickup_verification_notes: '',
    assigned_to: '',
    assigned_technician_id: '' as number | '',
    technician_name: '',
    technician_phone: '',
    technician_notes: '',
    payment_status: 'pending' as 'pending' | 'paid',
    payment_method: '',
    payment_date: '',
    receipt_number: '',
    discount_percentage: '',
    discount_amount: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<UserWithPassword[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const defaultUserAssignedRef = useRef(false)
  const [showAddTechnician, setShowAddTechnician] = useState(false)
  const [addTechForm, setAddTechForm] = useState({ name: '', phone: '', notes: '' })
  const [savingTech, setSavingTech] = useState(false)
  // Parts / products sold during service
  const [products, setProducts] = useState<Product[]>([])
  const [servicePartsItems, setServicePartsItems] = useState<ServicePartItem[]>([])
  const [linkedSales, setLinkedSales] = useState<Sale[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  useEffect(() => {
    if ((vehicleType === 'ebike' || vehicleType === 'ecar') && !hasPlanFeature('services_ebike_ecar')) {
      navigate('/services/bike', { replace: true })
    }
  }, [vehicleType, hasPlanFeature, navigate])

  useEffect(() => {
    const loadUsers = async () => {
      const all = await userService.getAll()
      const companyId = getCurrentCompanyId()
      const list = companyId != null ? all.filter((u) => u.company_id === companyId) : all
      setUsers(list)
    }
    loadUsers()
  }, [getCurrentCompanyId])

  useEffect(() => {
    const loadTechnicians = async () => {
      const companyId = getCurrentCompanyId()
      const list = await technicianService.getAll(companyId ?? undefined)
      setTechnicians(list)
    }
    loadTechnicians()
  }, [getCurrentCompanyId])

  useEffect(() => {
    const loadProducts = async () => {
      const companyId = getCurrentCompanyId()
      const list = await productService.getAll(false, companyId ?? undefined)
      setProducts(list.filter((p) => p.status === 'active'))
    }
    loadProducts()
  }, [getCurrentCompanyId])

  // When editing, load all parts sales linked to this service (can be multiple)
  useEffect(() => {
    if (!isEditing || !id) return
    const serviceIdNum = parseInt(id, 10)
    if (isNaN(serviceIdNum)) return
    const check = async () => {
      const companyId = getCurrentCompanyId()
      const allSales = await saleService.getAll(true, companyId ?? undefined)
      const linked = allSales.filter((s) => (s as { service_id?: number }).service_id === serviceIdNum)
      if (linked.length > 0) {
        setLinkedSales(linked)
        // Backfill parts_total on service if missing (sum of all linked sales)
        const record = await serviceRecordService.getById(serviceIdNum)
        const sumLinked = linked.reduce((s, sale) => s + Number(sale.grand_total || 0), 0)
        if (record && (record.parts_total ?? 0) === 0 && sumLinked > 0) {
          await serviceRecordService.update(serviceIdNum, { parts_total: sumLinked })
        }
      }
    }
    check()
  }, [isEditing, id, getCurrentCompanyId])

  // When opening "New" with ?book=1, set status to booked (appointment)
  const didSetBookAppointmentRef = useRef(false)
  useEffect(() => {
    if (isEditing || didSetBookAppointmentRef.current) return
    if (searchParams.get('book') === '1') {
      didSetBookAppointmentRef.current = true
      setFormData((p) => ({ ...p, status: 'booked' }))
    }
  }, [isEditing, searchParams])

  // Default "Assign to (user)" to logged-in user when adding a new service (once)
  useEffect(() => {
    if (isEditing || !user || users.length === 0 || defaultUserAssignedRef.current) return
    const uid = String(user.id)
    if (users.some((u) => u.id === uid)) {
      defaultUserAssignedRef.current = true
      const u = users.find((x) => x.id === uid)!
      setFormData((p) => ({
        ...p,
        assigned_to: uid,
        assigned_technician_id: '',
        technician_name: u.name,
        technician_phone: p.technician_phone || u.phone || '',
      }))
    }
  }, [isEditing, user, users])

  useEffect(() => {
    if (isEditing && id) {
      const load = async () => {
        const record = await serviceRecordService.getById(parseInt(id))
        if (record && record.vehicle_type === vehicleType) {
          setFormData({
            service_date: record.service_date.split('T')[0],
            customer_name: record.customer_name || '',
            vehicle_number: record.vehicle_number || '',
            customer_phone: record.customer_phone ?? '',
            customer_email: record.customer_email ?? '',
            service_type: record.service_type || '',
            amount: record.amount.toString(),
            description: record.description || '',
            next_service_date: record.next_service_date ? record.next_service_date.split('T')[0] : '',
            status: (record.status && SERVICE_STATUSES.includes(record.status as any)) ? record.status as (typeof SERVICE_STATUSES)[number] : 'draft',
            pickup_verification_notes: record.pickup_verification_notes || '',
            assigned_to: record.assigned_to || '',
            assigned_technician_id: (record.assigned_technician_id ?? '') as number | '',
            technician_name: record.technician_name || '',
            technician_phone: record.technician_phone || '',
            technician_notes: record.technician_notes || '',
            payment_status: (record.payment_status === 'paid' ? 'paid' : 'pending') as 'pending' | 'paid',
            payment_method: record.payment_method || '',
            payment_date: record.payment_date ? record.payment_date.split('T')[0] : '',
            receipt_number: record.receipt_number || '',
            discount_percentage: record.discount_percentage != null ? record.discount_percentage.toString() : '',
            discount_amount: record.discount_amount != null ? record.discount_amount.toString() : '',
          })
        } else {
          toast.error('Service record not found')
          navigate(`/services/${vehicleType}`)
        }
      }
      load()
    }
  }, [isEditing, id, vehicleType, navigate, toast])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.service_date) e.service_date = 'Service date is required'
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount < 0) e.amount = 'Valid amount is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const companyId = getCurrentCompanyId()
      const payload = {
        company_id: companyId ?? undefined,
        vehicle_type: vehicleType,
        service_date: new Date(formData.service_date).toISOString(),
        customer_name: formData.customer_name.trim(),
        vehicle_number: formData.vehicle_number.trim(),
        customer_phone: (formData.customer_phone || '').trim() || undefined,
        customer_email: (formData.customer_email || '').trim() || undefined,
        service_type: formData.service_type.trim() || 'Other',
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        next_service_date: formData.next_service_date
          ? new Date(formData.next_service_date).toISOString()
          : undefined,
        status: formData.status,
        pickup_verification_notes: formData.pickup_verification_notes.trim() || undefined,
        assigned_to: formData.assigned_to.trim() || undefined,
        assigned_technician_id: formData.assigned_technician_id || undefined,
        technician_name: formData.technician_name.trim() || undefined,
        technician_phone: formData.technician_phone.trim() || undefined,
        technician_notes: formData.technician_notes.trim() || undefined,
        payment_status: formData.status === 'completed' ? formData.payment_status : undefined,
        payment_method: formData.status === 'completed' && formData.payment_method ? formData.payment_method : undefined,
        payment_date: formData.status === 'completed' && formData.payment_date ? new Date(formData.payment_date).toISOString() : undefined,
        receipt_number: formData.status === 'completed' && formData.receipt_number.trim() ? formData.receipt_number.trim() : undefined,
        discount_percentage: formData.discount_percentage !== '' ? parseFloat(formData.discount_percentage) : undefined,
        discount_amount: formData.discount_amount !== '' ? parseFloat(formData.discount_amount) : undefined,
        created_by: user?.id ? parseInt(String(user.id), 10) : undefined,
      }

      let savedServiceId: number
      if (isEditing && id) {
        await serviceRecordService.update(parseInt(id), payload)
        savedServiceId = parseInt(id)
        toast.success('Service updated')
      } else {
        const created = await serviceRecordService.create(payload)
        savedServiceId = created.id
        toast.success('Service added')
      }

      // Create parts sale when user added new products (works for first-time or add-more-parts)
      if (servicePartsItems.length > 0 && savedServiceId) {
        try {
          const saleItems = servicePartsItems.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            barcode: item.barcode,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
            sale_type: 'sale' as const,
          }))
          const subtotal = saleItems.reduce((sum, i) => sum + i.total, 0)
          const createdBy = user?.id ? parseInt(String(user.id), 10) : 0
          await saleService.create({
            sale_date: formData.service_date,
            customer_name: formData.customer_name.trim() || undefined,
            invoice_number: '',
            items: saleItems,
            subtotal,
            discount: 0,
            tax_amount: 0,
            grand_total: subtotal,
            payment_status: 'pending',
            payment_method: '',
            company_id: companyId ?? undefined,
            created_by: createdBy,
            service_id: savedServiceId,
          })
          const record = await serviceRecordService.getById(savedServiceId)
          const existingPartsTotal = record?.parts_total ?? 0
          await serviceRecordService.update(savedServiceId, { parts_total: existingPartsTotal + subtotal })
          toast.success(linkedSales.length > 0 ? 'Additional parts sale recorded' : 'Service and parts sale recorded')
        } catch (err: any) {
          toast.error(err?.message || 'Service saved but parts sale failed. You can add a sale from Sales.')
        }
      }

      navigate(`/services/${vehicleType}`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save service')
    } finally {
      setLoading(false)
    }
  }

  const label = vehicleType === 'ebike' ? 'E-bike' : vehicleType === 'ecar' ? 'E-car' : vehicleType

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <button type="button" onClick={() => navigate('/')} className="hover:text-blue-600 font-medium">
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button type="button" onClick={() => navigate('/services/bike')} className="hover:text-blue-600 font-medium">
              Services
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button type="button" onClick={() => navigate(`/services/${vehicleType}`)} className="hover:text-blue-600 font-medium">
              {label}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-semibold">{isEditing ? 'Edit' : 'Add'} service</span>
          </nav>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(`/services/${vehicleType}`)}
              className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200 bg-white"
              title="Back"
            >
              <Home className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit' : formData.status === 'booked' ? 'Book appointment' : 'Add'} {label} Service
              </h1>
              <p className="text-sm text-gray-600">
                {formData.status === 'booked' && !isEditing
                  ? `Schedule a ${label.toLowerCase()} service for a future date`
                  : `Service record for ${label.toLowerCase()}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.status === 'booked' ? 'Appointment date *' : 'Service date *'}
                </label>
                <input
                  type="date"
                  value={formData.service_date}
                  onChange={(e) => setFormData((p) => ({ ...p, service_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.service_date && <p className="text-red-600 text-xs mt-1">{errors.service_date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next service date</label>
                <input
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => setFormData((p) => ({ ...p, next_service_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer name</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData((p) => ({ ...p, customer_name: e.target.value }))}
                placeholder="Customer or owner name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle number</label>
              <input
                type="text"
                value={formData.vehicle_number}
                onChange={(e) => setFormData((p) => ({ ...p, vehicle_number: e.target.value }))}
                placeholder="Registration / identification"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer phone</label>
                <input
                  type="tel"
                  value={formData.customer_phone ?? ''}
                  onChange={(e) => setFormData((p) => ({ ...p, customer_phone: e.target.value }))}
                  placeholder="For WhatsApp / SMS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer email</label>
                <input
                  type="email"
                  value={formData.customer_email ?? ''}
                  onChange={(e) => setFormData((p) => ({ ...p, customer_email: e.target.value }))}
                  placeholder="For email receipt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service type</label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData((p) => ({ ...p, service_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select type</option>
                {serviceTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as (typeof SERVICE_STATUSES)[number] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SERVICE_STATUSES.map((s) => (
                  <option key={s} value={s}>{SERVICE_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup verification notes</label>
              <textarea
                value={formData.pickup_verification_notes}
                onChange={(e) => setFormData((p) => ({ ...p, pickup_verification_notes: e.target.value }))}
                placeholder="e.g. Wire broken, tyre condition, brake pad, battery, scratches, dents, meter reading, any damage or issue noted at pickup"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Record condition and issues when vehicle is received (verification)</p>
            </div>

            {/* Technician assignment & details */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Technician
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to (user)</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => {
                      const uid = e.target.value
                      const u = users.find((x) => x.id === uid)
                      setFormData((p) => ({
                        ...p,
                        assigned_to: uid,
                        assigned_technician_id: '',
                        technician_name: u ? u.name : p.technician_name,
                        technician_phone: u ? (u.phone || p.technician_phone) : p.technician_phone,
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No assignment</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} {u.role ? `(${u.role})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Or assign to technician</label>
                    <select
                      value={formData.assigned_technician_id === '' ? '' : formData.assigned_technician_id}
                      onChange={(e) => {
                        const val = e.target.value
                        const techId = val === '' ? '' : Number(val)
                        const tech = technicians.find((t) => t.id === techId)
                        setFormData((p) => ({
                          ...p,
                          assigned_technician_id: techId,
                          assigned_to: '',
                          technician_name: tech ? tech.name : p.technician_name,
                          technician_phone: tech ? (tech.phone || p.technician_phone) : p.technician_phone,
                          technician_notes: tech ? (tech.notes || p.technician_notes) : p.technician_notes,
                        }))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No technician</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}{t.phone ? ` (${t.phone})` : ''}</option>
                      ))}
                      {technicians.length === 0 && (
                        <option disabled>Add one with &quot;Add technician&quot; below</option>
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddTechnician(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
                    title="Add new technician"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add technician
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technician name</label>
                  <input
                    type="text"
                    value={formData.technician_name}
                    onChange={(e) => setFormData((p) => ({ ...p, technician_name: e.target.value }))}
                    placeholder="Name (or from assignment above)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technician phone</label>
                  <input
                    type="text"
                    value={formData.technician_phone}
                    onChange={(e) => setFormData((p) => ({ ...p, technician_phone: e.target.value }))}
                    placeholder="Phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technician notes</label>
                  <textarea
                    value={formData.technician_notes}
                    onChange={(e) => setFormData((p) => ({ ...p, technician_notes: e.target.value }))}
                    placeholder="Any other technician details"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service / labour amount (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.amount && <p className="text-red-600 text-xs mt-1">{errors.amount}</p>}
              <p className="text-xs text-gray-500 mt-1">Labour / repair charges only. Parts total is added below.</p>
            </div>

            {/* Parts / products sold during service */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Parts / products sold during service
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Add parts or items replaced/sold for this job. A sale will be recorded and stock will be updated.
              </p>
              {linkedSales.length > 0 && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 overflow-hidden mb-4">
                  <div className="p-2.5 border-b border-emerald-200/50">
                    <span className="text-sm font-medium text-emerald-800">Recorded parts sales</span>
                  </div>
                  {linkedSales.map((sale) => (
                    <div key={sale.id} className="p-3 border-b border-emerald-200/50 last:border-b-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-emerald-800">
                          <strong>{sale.invoice_number}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/sales`)}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 rounded-lg"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View in Sales
                        </button>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 border-b border-emerald-200/50">
                            <th className="pb-1 pr-2">Item</th>
                            <th className="pb-1 pr-2 text-right">Qty</th>
                            <th className="pb-1 pr-2 text-right">Unit price</th>
                            <th className="pb-1 pr-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(sale.items || []).map((item, idx) => (
                            <tr key={idx} className="border-b border-emerald-100/50">
                              <td className="py-1 pr-2 text-gray-800">{item.product_name}</td>
                              <td className="py-1 pr-2 text-right text-gray-700">{item.quantity}</td>
                              <td className="py-1 pr-2 text-right text-gray-700">₹{Number(item.unit_price).toFixed(2)}</td>
                              <td className="py-1 pr-2 text-right font-medium text-gray-800">₹{Number(item.total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-sm font-semibold text-emerald-800 mt-1.5 pt-1.5 border-t border-emerald-200/50">
                        Sale total: ₹{Number(sale.grand_total).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <div className="px-3 py-2 bg-emerald-100/50 border-t border-emerald-200/50">
                    <p className="text-sm font-semibold text-emerald-800">
                      Recorded parts total: ₹{linkedSales.reduce((s, sale) => s + Number(sale.grand_total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
              {/* Always show add-more-parts: new parts or first-time parts */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">
                  {linkedSales.length > 0 ? 'Add more parts' : 'Add product'}
                </p>
                <div className="space-y-2 mb-3">
                  {servicePartsItems.map((item, index) => (
                    <div
                      key={`${item.product_id}-${index}`}
                      className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{item.product_name}</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => {
                          const q = parseFloat(e.target.value) || 0
                          setServicePartsItems((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, quantity: q } : p))
                          )
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => {
                          const u = parseFloat(e.target.value) || 0
                          setServicePartsItems((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, unit_price: u } : p))
                          )
                        }}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Price"
                      />
                      <span className="w-20 text-sm text-right font-medium text-gray-700">
                        ₹{(item.quantity * item.unit_price).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setServicePartsItems((prev) => prev.filter((_, i) => i !== index))}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {linkedSales.length > 0 ? 'Search and add another product' : 'Search product'}
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setShowProductDropdown(true)
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                    placeholder="Search product by name, SKU or barcode..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {showProductDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {products
                        .filter(
                          (p) =>
                            !productSearch.trim() ||
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                            (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
                            (p.barcode && String(p.barcode).toLowerCase().includes(productSearch.toLowerCase()))
                        )
                        .slice(0, 15)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between items-center"
                            onClick={() => {
                              setServicePartsItems((prev) => [
                                ...prev,
                                {
                                  product_id: p.id,
                                  product_name: p.name,
                                  barcode: p.barcode || '',
                                  quantity: 1,
                                  unit_price: p.selling_price ?? 0,
                                },
                              ])
                              setProductSearch('')
                              setShowProductDropdown(false)
                            }}
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="text-gray-500 text-xs ml-2">
                              ₹{p.selling_price ?? 0} · Stock: {p.stock_quantity}
                            </span>
                          </button>
                        ))}
                      {productSearch.trim() && products.filter(
                        (p) =>
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
                          (p.barcode && String(p.barcode).toLowerCase().includes(productSearch.toLowerCase()))
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No product found</div>
                      )}
                    </div>
                  )}
                </div>
                {(servicePartsItems.length > 0 || linkedSales.length > 0) && (
                  <>
                    {servicePartsItems.length > 0 && (
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        New parts total: ₹{servicePartsItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0).toFixed(2)}
                      </p>
                    )}
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      {(() => {
                        const recordedPartsTotal = linkedSales.reduce((s, sale) => s + Number(sale.grand_total || 0), 0)
                        const newPartsSum = servicePartsItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
                        const partsTotal = recordedPartsTotal + newPartsSum
                        const r = { amount: Number(formData.amount || 0), parts_total: partsTotal, discount_percentage: Number(formData.discount_percentage) || 0, discount_amount: Number(formData.discount_amount) || 0 }
                        const subtotal = getServiceSubtotal(r)
                        const discountVal = getServiceDiscountValue(r)
                        const total = getServiceTotal(r)
                        return (
                          <p className="text-sm font-bold text-gray-900">
                            Subtotal: ₹{subtotal.toFixed(2)}
                            {discountVal > 0 && <> − Discount: ₹{discountVal.toFixed(2)}</>}
                            {' '}= <span className="text-blue-800">Total: ₹{total.toFixed(2)}</span>
                          </p>
                        )
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Discount (optional) – applied to subtotal (service + parts) before save */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Additional discount</h3>
              <p className="text-xs text-gray-500 mb-3">Optional. Applied to service amount + parts before save. Leave blank for no discount.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData((p) => ({ ...p, discount_percentage: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData((p) => ({ ...p, discount_amount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {((formData.discount_percentage !== '' && Number(formData.discount_percentage) > 0) || (formData.discount_amount !== '' && Number(formData.discount_amount) > 0)) && (
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  {(() => {
                    const recordedParts = linkedSales.reduce((s, sale) => s + Number(sale.grand_total || 0), 0)
                    const newParts = servicePartsItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
                    const partsVal = recordedParts + newParts
                    const r = { amount: Number(formData.amount || 0), parts_total: partsVal, discount_percentage: Number(formData.discount_percentage) || 0, discount_amount: Number(formData.discount_amount) || 0 }
                    const subtotal = getServiceSubtotal(r)
                    const discountVal = getServiceDiscountValue(r)
                    const total = getServiceTotal(r)
                    return (
                      <p className="text-sm font-bold text-gray-900">
                        Subtotal: ₹{subtotal.toFixed(2)} − Discount: ₹{discountVal.toFixed(2)} = <span className="text-amber-800">Total: ₹{total.toFixed(2)}</span>
                      </p>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Payment – shown when status is completed */}
            {formData.status === 'completed' && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment & receipt
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData((p) => ({ ...p, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select method</option>
                      {Object.entries(SERVICE_PAYMENT_METHODS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.payment_status === 'paid'}
                        onChange={(e) => {
                          setFormData((p) => ({
                            ...p,
                            payment_status: e.target.checked ? 'paid' : 'pending',
                            payment_date: e.target.checked ? new Date().toISOString().split('T')[0] : '',
                          }))
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Mark as paid</span>
                    </label>
                    {formData.payment_status === 'paid' && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment date</label>
                        <input
                          type="date"
                          value={formData.payment_date}
                          onChange={(e) => setFormData((p) => ({ ...p, payment_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt number</label>
                    <input
                      type="text"
                      value={formData.receipt_number}
                      onChange={(e) => setFormData((p) => ({ ...p, receipt_number: e.target.value }))}
                      placeholder="Optional receipt / invoice number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {isEditing && id && (
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/services/${vehicleType}/${id}/receipt`)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        <Receipt className="w-4 h-4" />
                        Give receipt / Print
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description / notes</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/services/${vehicleType}`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </main>

      {/* Add Technician modal */}
      {showAddTechnician && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add technician</h3>
              <p className="text-sm text-gray-500 mt-0.5">Register a new technician for assignment</p>
            </div>
            <form
              onSubmit={async (e) => {
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
                  setFormData((p) => ({
                    ...p,
                    assigned_technician_id: created.id,
                    assigned_to: '',
                    technician_name: created.name,
                    technician_phone: created.phone || p.technician_phone,
                    technician_notes: created.notes || p.technician_notes,
                  }))
                  setAddTechForm({ name: '', phone: '', notes: '' })
                  setShowAddTechnician(false)
                  toast.success('Technician added')
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to add technician')
                } finally {
                  setSavingTech(false)
                }
              }}
              className="p-4 space-y-3"
            >
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
                  onClick={() => {
                    setShowAddTechnician(false)
                    setAddTechForm({ name: '', phone: '', notes: '' })
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTech}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
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
