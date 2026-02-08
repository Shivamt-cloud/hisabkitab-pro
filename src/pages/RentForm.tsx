import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rentService } from '../services/rentService'
import { customerService } from '../services/customerService'
import { productService, Product } from '../services/productService'
import { salesPersonService } from '../services/salespersonService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import CustomerModal from '../components/CustomerModal'
import { Rental, RentalItem } from '../types/rental'
import { Customer, CUSTOMER_ID_TYPES } from '../types/customer'
import { Home, Plus, Trash2, Save, UserPlus, Search } from 'lucide-react'

const RentForm = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getCurrentCompanyId, user } = useAuth()
  const { toast } = useToast()
  const isEditing = !!id

  const [rentalNumber, setRentalNumber] = useState('')
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [pickupDate, setPickupDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customers, setCustomers] = useState<
    Array<{
      id: number
      name: string
      phone?: string
      address?: string
      id_type?: string
      id_number?: string
    }>
  >([])
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<
    Array<{
      product_id: number
      product_name: string
      quantity: number
      rent_per_unit_per_day: number
      security_deposit: number
      number_of_days: number
      total_rent: number
    }>
  >([])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Rental['status']>('booked')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [salesPersonId, setSalesPersonId] = useState<number | ''>('')
  const [salesPersons, setSalesPersons] = useState<Array<{ id: number; name: string }>>([])
  const [customerIdType, setCustomerIdType] = useState('')
  const [customerIdNumber, setCustomerIdNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'pending'>('pending')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [paymentMethods, setPaymentMethods] = useState<Array<{ method: string; amount: number }>>([{ method: 'cash', amount: 0 }])
  const [internalRemarks, setInternalRemarks] = useState('')

  const companyId = getCurrentCompanyId() ?? undefined

  const RENT_PAYMENT_METHOD_OPTIONS = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' },
  ]

  // Filter customers by name or phone for search (phone: digits only for flexible matching)
  const filteredCustomers = (() => {
    if (!customerSearchQuery.trim()) return customers
    const q = customerSearchQuery.trim().toLowerCase()
    const qDigits = customerSearchQuery.trim().replace(/\D/g, '')
    return customers.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(q)
      const phoneNorm = (c.phone || '').replace(/\D/g, '')
      const phoneMatch = qDigits.length > 0 && phoneNorm.includes(qDigits)
      return nameMatch || phoneMatch
    })
  })()

  const defaultNumberOfDays = (() => {
    const p = new Date(pickupDate).getTime()
    const r = new Date(returnDate).getTime()
    if (r < p) return 0
    return Math.ceil((r - p) / (24 * 60 * 60 * 1000)) || 0
  })()

  const loadCustomers = async () => {
    const cid = getCurrentCompanyId()
    const custList = await customerService.getAllFast(false, cid ?? undefined)
    setCustomers(
      custList.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        id_type: c.id_type,
        id_number: c.id_number,
      }))
    )
  }

  const loadProducts = async () => {
    const cid = getCurrentCompanyId()
    const prodList = await productService.getAll(true, cid ?? undefined)
    setProducts(prodList.filter((p) => p.status === 'active'))
  }

  const loadSalesPersons = async () => {
    const list = await salesPersonService.getAll(false)
    setSalesPersons(list.map((p) => ({ id: p.id, name: p.name })))
  }

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadCustomers(), loadProducts(), loadSalesPersons()])
    }
    load()
  }, [companyId])

  useEffect(() => {
    if (isEditing && id) {
      rentService
        .getById(parseInt(id, 10))
        .then((r) => {
          if (!r) {
            toast.error('Rental not found')
            navigate('/rentals')
            return
          }
          // Company isolation: do not allow editing other company's rental
          const currentCompanyId = getCurrentCompanyId()
          if (currentCompanyId != null && r.company_id != null && r.company_id !== currentCompanyId) {
            toast.error('Rental not found')
            navigate('/rentals')
            return
          }
          setRentalNumber(r.rental_number)
          setBookingDate(r.booking_date)
          setPickupDate(r.pickup_date)
          setReturnDate(r.return_date)
          setCustomerId(r.customer_id ?? '')
          setCustomerName(r.customer_name)
          setCustomerPhone(r.customer_phone ?? '')
          setItems(
            r.items.map((i) => ({
              product_id: i.product_id,
              product_name: i.product_name,
              quantity: i.quantity,
              rent_per_unit_per_day: i.rent_per_unit_per_day,
              security_deposit: i.security_deposit,
              number_of_days: i.number_of_days,
              total_rent: i.total_rent,
            }))
          )
          setNotes(r.notes ?? '')
          setStatus(r.status)
          setSalesPersonId(r.sales_person_id ?? '')
          setCustomerIdType(r.customer_id_type ?? '')
          setCustomerIdNumber(r.customer_id_number ?? '')
          setPaymentMethod(r.payment_method ?? 'cash')
          setPaymentStatus(r.payment_status ?? 'pending')
          setDiscountType((r.discount_type as 'percentage' | 'fixed') ?? 'percentage')
          setDiscountValue(r.discount_value ?? 0)
          setPaymentMethods(
            r.payment_methods?.length
              ? r.payment_methods.map((p) => ({ method: p.method || 'cash', amount: p.amount || 0 }))
              : [{ method: r.payment_method || 'cash', amount: 0 }]
          )
          setInternalRemarks(r.internal_remarks ?? '')
        })
        .catch(() => {
          toast.error('Failed to load rental')
          navigate('/rentals')
        })
        .finally(() => setLoading(false))
    } else {
      rentService.getNextRentalNumber(companyId).then(setRentalNumber)
      setLoading(false)
    }
  }, [isEditing, id, navigate, toast])

  // When pickup/return dates change, auto-fill "No. of days (for reference)" for all rows with the default days. User can still change any row manually.
  useEffect(() => {
    if (defaultNumberOfDays <= 0) return
    setItems((prev) =>
      prev.map((row) => ({
        ...row,
        number_of_days: defaultNumberOfDays,
      }))
    )
  }, [defaultNumberOfDays])

  const totalRentAmount = items.reduce((s, i) => s + i.total_rent, 0)
  const totalSecurityDeposit = items.reduce((s, i) => s + i.security_deposit, 0)

  const getSubtotal = () => totalRentAmount
  const getDiscountAmount = () => {
    if (!discountValue || discountValue <= 0) return 0
    if (discountType === 'percentage') return Math.min(totalRentAmount, (totalRentAmount * discountValue) / 100)
    return Math.min(totalRentAmount, discountValue)
  }
  const getGrandTotal = () => Math.max(0, getSubtotal() - getDiscountAmount())
  /** Total to pay = Rent (after discount) + Security. Customer may pay advance now and balance at pickup. */
  const getTotalWithSecurity = () => getGrandTotal() + totalSecurityDeposit
  const getTotalPaid = () => paymentMethods.reduce((s, p) => s + (p.amount || 0), 0)
  /** Advance paid at booking (same as getTotalPaid). Balance due at pickup. */
  const getAdvancePaid = () => getTotalPaid()
  const getBalanceDueAtPickup = () => Math.max(0, getTotalWithSecurity() - getAdvancePaid())
  const getAmountDue = () => Math.max(0, getGrandTotal() - getTotalPaid())

  const addRow = () => {
    if (products.length === 0) {
      toast.error('No products available')
      return
    }
    const p = products[0]
    const days = defaultNumberOfDays || 1
    setItems((prev) => [
      ...prev,
      {
        product_id: p.id,
        product_name: p.name,
        quantity: 1,
        rent_per_unit_per_day: 0,
        security_deposit: 0,
        number_of_days: days,
        total_rent: 0,
      },
    ])
  }

  const updateRow = (
    index: number,
    field: keyof RentalItem,
    value: number | string
  ) => {
    setItems((prev) => {
      const next = [...prev]
      const row = { ...next[index], [field]: value }
      if (field === 'product_id') {
        const product = products.find((p) => p.id === value)
        if (product) {
          row.product_name = product.name
        }
      }
      // Total rent = quantity × rent (fixed rate). Days is for reference only, not used in total.
      if (field === 'quantity' || field === 'rent_per_unit_per_day') {
        row.total_rent = row.quantity * row.rent_per_unit_per_day
      }
      next[index] = row
      return next
    })
  }

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name')
      return false
    }
    if (new Date(returnDate) < new Date(pickupDate)) {
      toast.error('Return date must be on or after pickup date')
      return false
    }
    if (items.length === 0) {
      toast.error('Add at least one item')
      return false
    }
    const invalid = items.some(
      (i) =>
        i.quantity <= 0 ||
        i.rent_per_unit_per_day < 0 ||
        i.security_deposit < 0
    )
    if (invalid) {
      toast.error('Check item quantities, rent and amounts')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !user) return
    setSaving(true)
    try {
      const rentalItems: RentalItem[] = items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        rent_per_unit_per_day: i.rent_per_unit_per_day,
        security_deposit: i.security_deposit,
        number_of_days: i.number_of_days,
        total_rent: i.total_rent,
      }))
      const selectedSalesPerson = salesPersonId
        ? salesPersons.find((sp) => sp.id === salesPersonId)
        : null
      if (isEditing && id) {
        const discountAmt = getDiscountAmount()
        await rentService.update(parseInt(id, 10), {
          booking_date: bookingDate,
          pickup_date: pickupDate,
          return_date: returnDate,
          customer_id: customerId || undefined,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || undefined,
          sales_person_id: salesPersonId || undefined,
          sales_person_name: selectedSalesPerson?.name,
          customer_id_type: customerIdType.trim() || undefined,
          customer_id_number: customerIdNumber.trim() || undefined,
          items: rentalItems,
          total_rent_amount: totalRentAmount,
          total_security_deposit: totalSecurityDeposit,
          status,
          discount_type: discountValue > 0 ? discountType : undefined,
          discount_value: discountValue > 0 ? discountValue : undefined,
          discount_amount: discountAmt > 0 ? discountAmt : undefined,
          payment_method: paymentMethods[0]?.method || paymentMethod,
          payment_status: getBalanceDueAtPickup() <= 0 ? 'paid' : getAdvancePaid() > 0 ? 'partial' : 'pending',
          payment_methods: paymentMethods.filter((p) => (p.amount || 0) > 0).map((p) => ({ method: p.method, amount: p.amount })),
          advance_amount: getAdvancePaid() > 0 ? getAdvancePaid() : undefined,
          internal_remarks: internalRemarks.trim() || undefined,
          notes: notes.trim() || undefined,
        })
        toast.success('Rental updated')
        navigate(`/rentals/${id}`)
        return
      } else {
        const discountAmt = getDiscountAmount()
        const created = await rentService.create({
          rental_number: rentalNumber,
          booking_date: bookingDate,
          pickup_date: pickupDate,
          return_date: returnDate,
          customer_id: customerId || undefined,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || undefined,
          sales_person_id: salesPersonId || undefined,
          sales_person_name: selectedSalesPerson?.name,
          customer_id_type: customerIdType.trim() || undefined,
          customer_id_number: customerIdNumber.trim() || undefined,
          items: rentalItems,
          total_rent_amount: totalRentAmount,
          total_security_deposit: totalSecurityDeposit,
          status: 'booked',
          discount_type: discountValue > 0 ? discountType : undefined,
          discount_value: discountValue > 0 ? discountValue : undefined,
          discount_amount: discountAmt > 0 ? discountAmt : undefined,
          payment_method: paymentMethods[0]?.method || paymentMethod,
          payment_status: getBalanceDueAtPickup() <= 0 ? 'paid' : getAdvancePaid() > 0 ? 'partial' : 'pending',
          payment_methods: paymentMethods.filter((p) => (p.amount || 0) > 0).map((p) => ({ method: p.method, amount: p.amount })),
          advance_amount: getAdvancePaid() > 0 ? getAdvancePaid() : undefined,
          internal_remarks: internalRemarks.trim() || undefined,
          notes: notes.trim() || undefined,
          company_id: companyId,
          created_by: Number(user.id),
        })
        toast.success('Rent booking created')
        navigate(`/rentals/${created.id}`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="sales:create">
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Loading…</p>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="sales:create">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 hover:text-blue-600"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <span>/</span>
            <button
              onClick={() => navigate('/rentals')}
              className="hover:text-blue-600"
            >
              Rent & Bookings
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {isEditing ? 'Edit' : 'New'} Booking
            </span>
          </nav>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {isEditing ? 'Edit Rent Booking' : 'New Rent Booking'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Booking details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rental number
                  </label>
                  <input
                    type="text"
                    value={rentalNumber}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking date
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup date
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return date
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default days (from dates)
                  </label>
                  <p className="text-gray-900 font-medium">{defaultNumberOfDays} days</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Customer
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="inline-flex items-center gap-1.5 text-indigo-600 font-medium text-sm hover:underline"
                >
                  <UserPlus className="w-4 h-4" />
                  Add customer
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 relative overflow-visible">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer
                  </label>
                  <div className="relative space-y-1 overflow-visible">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value)
                          setCustomerDropdownOpen(true)
                        }}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        onBlur={() =>
                          setTimeout(() => setCustomerDropdownOpen(false), 200)
                        }
                        placeholder="Search by name or phone..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        autoComplete="off"
                      />
                    </div>
                    {customerDropdownOpen && (customerSearchQuery.trim() || customers.length > 0) && (
                      <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto min-w-0">
                        {customers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            Loading customers…
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            No customer found. Use &quot;Add customer&quot; to create one.
                          </div>
                        ) : (
                          <>
                            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b bg-gray-50 rounded-t-lg">
                              {customerSearchQuery.trim()
                                ? `${filteredCustomers.length} result${filteredCustomers.length !== 1 ? 's' : ''} — click to select`
                                : 'Type to search or select below'}
                            </div>
                            {filteredCustomers.slice(0, 20).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setCustomerId(c.id)
                                  setCustomerName(c.name)
                                  setCustomerPhone(c.phone ?? '')
                                  setCustomerSearchQuery('')
                                  setCustomerIdType(c.id_type ?? '')
                                  setCustomerIdNumber(c.id_number ?? '')
                                  setCustomerDropdownOpen(false)
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 text-sm"
                              >
                                <span className="font-medium text-gray-900">{c.name}</span>
                                {c.phone && (
                                  <span className="text-gray-500 ml-2">{c.phone}</span>
                                )}
                              </button>
                            ))}
                            {filteredCustomers.length > 20 && (
                              <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50">
                                +{filteredCustomers.length - 20} more — narrow your search
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {customerId && !customerSearchQuery && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: <span className="font-medium text-gray-700">{customerName}</span>
                        {customerPhone && ` • ${customerPhone}`}
                      </p>
                    )}
                  </div>
                </div>
                {customerId && !customerSearchQuery && (() => {
                  const selected = customers.find((c) => c.id === customerId)
                  const hasAddress = selected?.address?.trim()
                  const hasId = selected?.id_type || selected?.id_number
                  if (!hasAddress && !hasId) return null
                  return (
                    <div className="sm:col-span-2 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
                      {hasId && (
                        <p className="text-gray-700">
                          <span className="font-medium text-gray-600">ID submitted (customer): </span>
                          {selected!.id_type
                            ? `${CUSTOMER_ID_TYPES.find((t) => t.value === selected!.id_type)?.label ?? selected!.id_type}${selected!.id_number ? ` – ${selected!.id_number}` : ''}`
                            : selected!.id_number || '—'}
                        </p>
                      )}
                      {hasAddress && (
                        <p className={`text-gray-700 ${hasId ? 'mt-1' : ''}`}>
                          <span className="font-medium text-gray-600">Address: </span>
                          {selected!.address}
                        </p>
                      )}
                    </div>
                  )
                })()}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Sales person <span className="text-gray-500 font-normal">(for reference)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => window.open('/sales-persons/new', '_blank')}
                      className="inline-flex items-center gap-1 text-indigo-600 font-medium text-sm hover:underline"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add sales person
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSalesPersons().then(() => toast.success('Sales person list refreshed'))}
                      className="text-gray-500 text-sm hover:text-gray-700"
                    >
                      Refresh list
                    </button>
                  </div>
                  <select
                    value={salesPersonId || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setSalesPersonId(val ? parseInt(val, 10) : '')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select sales person (optional)</option>
                    {salesPersons.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID proof for this booking
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={customerIdType}
                      onChange={(e) => setCustomerIdType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {CUSTOMER_ID_TYPES.map((opt) => (
                        <option key={opt.value || 'none'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={customerIdNumber}
                      onChange={(e) => setCustomerIdNumber(e.target.value)}
                      placeholder={customerIdType ? `Enter ${CUSTOMER_ID_TYPES.find((t) => t.value === customerIdType)?.label ?? 'ID'} number` : 'Select ID type or enter number'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    If the customer already has ID on file (shown above), it is mapped here. You can edit or add manually for this booking.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Goods on rent
                </h2>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1 text-indigo-600 font-medium text-sm hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Add item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600">
                        Product
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-20">
                        Qty
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-24">
                        Rent (₹)
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-24" title="Rental period – for reference only">
                        No. of days (for reference)
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-28">
                        Security (₹)
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 w-24">
                        Total rent
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2">
                          <select
                            value={row.product_id}
                            onChange={(e) =>
                              updateRow(
                                idx,
                                'product_id',
                                parseInt(e.target.value, 10)
                              )
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(
                                idx,
                                'quantity',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={row.rent_per_unit_per_day ?? ''}
                            onChange={(e) =>
                              updateRow(
                                idx,
                                'rent_per_unit_per_day',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={0}
                            value={row.number_of_days ?? ''}
                            onChange={(e) =>
                              updateRow(
                                idx,
                                'number_of_days',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            placeholder="e.g. 3"
                            title="Rental period – for reference only, not used in total"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={row.security_deposit ?? ''}
                            onChange={(e) =>
                              updateRow(
                                idx,
                                'security_deposit',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="py-2 px-2 text-right text-sm font-medium text-gray-900">
                          ₹{row.total_rent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 px-2">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end gap-6 text-sm">
                <span className="text-gray-600">
                  Total rent:{' '}
                  <strong className="text-gray-900">
                    ₹{totalRentAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </strong>
                </span>
                <span className="text-gray-600">
                  Total security:{' '}
                  <strong className="text-amber-700">
                    ₹{totalSecurityDeposit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </strong>
                </span>
              </div>
            </div>

            {isEditing && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as Rental['status'])
                  }
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="booked">Booked</option>
                  <option value="picked_up">Picked up</option>
                  <option value="returned">Returned</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {/* Additional Discount */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Discount</h2>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => {
                      setDiscountType(e.target.value as 'percentage' | 'fixed')
                      setDiscountValue(0)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount {discountType === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0
                      if (discountType === 'percentage') setDiscountValue(Math.max(0, Math.min(100, v)))
                      else setDiscountValue(Math.max(0, Math.min(totalRentAmount, v)))
                    }}
                    min={0}
                    max={discountType === 'percentage' ? 100 : totalRentAmount}
                    step={0.01}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0"
                  />
                </div>
                {discountValue > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountValue(0)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
              {discountValue > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-semibold text-blue-700">Discount Amount: </span>
                  <span className="font-bold text-blue-600">-₹{getDiscountAmount().toFixed(2)}</span>
                  {discountType === 'percentage' && (
                    <span className="text-xs text-blue-600 ml-2">
                      ({discountValue}% of ₹{getSubtotal().toFixed(2)})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              <div className="space-y-4">
                {paymentMethods.map((payment, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method {index + 1}</label>
                      <select
                        value={payment.method}
                        onChange={(e) => {
                          const up = [...paymentMethods]
                          up[index] = { ...up[index], method: e.target.value }
                          setPaymentMethods(up)
                          if (up.length === 1) setPaymentMethod(e.target.value)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {RENT_PAYMENT_METHOD_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={payment.amount || ''}
                        onChange={(e) => {
                          const up = [...paymentMethods]
                          up[index] = { ...up[index], amount: parseFloat(e.target.value) || 0 }
                          setPaymentMethods(up)
                        }}
                        min={0}
                        step={0.01}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="0.00"
                      />
                    </div>
                    {paymentMethods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethods(paymentMethods.filter((_, i) => i !== index))}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const remaining = Math.max(0, getTotalWithSecurity() - getTotalPaid())
                    setPaymentMethods([...paymentMethods, { method: 'cash', amount: remaining }])
                  }}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 text-sm font-medium"
                >
                  + Add Payment Method
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const totalWithSec = getTotalWithSecurity()
                      const otherTotal = paymentMethods.slice(0, -1).reduce((s, p) => s + p.amount, 0)
                      const remaining = Math.max(0, totalWithSec - otherTotal)
                      const up = [...paymentMethods]
                      if (up.length) up[up.length - 1] = { ...up[up.length - 1], amount: remaining }
                      setPaymentMethods(up)
                    }}
                    className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                  >
                    Auto-fill Remaining Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const balanceDue = getBalanceDueAtPickup()
                      const rounded = Math.ceil(balanceDue)
                      const up = [...paymentMethods]
                      const currentAdvance = getTotalPaid()
                      const addToLast = rounded - balanceDue
                      if (up.length) up[up.length - 1] = { ...up[up.length - 1], amount: (up[up.length - 1].amount || 0) + addToLast }
                      else up.push({ method: 'cash', amount: Math.max(0, addToLast) })
                      setPaymentMethods(up)
                    }}
                    className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium"
                  >
                    Round Up
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Subtotal (Rent):</span>
                  <span className="font-bold">₹{getSubtotal().toFixed(2)}</span>
                </div>
                {getDiscountAmount() > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span className="font-medium">Discount:</span>
                    <span className="font-bold">-₹{getDiscountAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Grand Total (Rent):</span>
                  <span className="font-bold">₹{getGrandTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-amber-700">Security deposit:</span>
                  <span className="font-bold text-amber-700">₹{totalSecurityDeposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Total (Rent + Security):</span>
                  <span>₹{getTotalWithSecurity().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-indigo-700">
                  <span className="font-medium">Advance paid (now):</span>
                  <span className="font-bold">₹{getAdvancePaid().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-gray-900">
                  <span>Balance due at pickup:</span>
                  <span className={getBalanceDueAtPickup() > 0 ? 'text-amber-700' : 'text-green-700'}>₹{getBalanceDueAtPickup().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 text-white">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal (Rent):</span>
                  <span className="font-bold">₹{getSubtotal().toFixed(2)}</span>
                </div>
                {getDiscountAmount() > 0 && (
                  <div className="flex justify-between text-indigo-200">
                    <span>Discount:</span>
                    <span className="font-bold">-₹{getDiscountAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Grand Total (Rent):</span>
                  <span className="font-bold">₹{getGrandTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-indigo-200">
                  <span>Security deposit:</span>
                  <span>₹{totalSecurityDeposit.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/30 pt-3 flex justify-between text-xl font-bold">
                  <span>Total (Rent + Security):</span>
                  <span>₹{getTotalWithSecurity().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Advance paid (now):</span>
                  <span className="font-bold">₹{getAdvancePaid().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Balance due at pickup:</span>
                  <span className="font-bold">₹{getBalanceDueAtPickup().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Internal Remarks */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Internal Remarks <span className="text-xs text-gray-500 font-normal">(Not visible to customers)</span>
              </label>
              <textarea
                value={internalRemarks}
                onChange={(e) => setInternalRemarks(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Internal notes for this booking (only in reports, not on receipt)..."
              />
              <p className="text-xs text-gray-500 mt-2">
                These remarks are for internal use only and will not appear on the rental receipt.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Optional notes"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2.5 px-5 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? (isEditing ? 'Saving…' : 'Completing…') : isEditing ? 'Save' : 'Complete Booking'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/rentals')}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>

          <CustomerModal
            isOpen={showCustomerModal}
            onClose={() => setShowCustomerModal(false)}
            onCustomerAdded={async (customer: Customer) => {
              await loadCustomers()
              setCustomerId(customer.id)
              setCustomerName(customer.name)
              setCustomerPhone(customer.phone ?? '')
              setCustomerSearchQuery('')
              setCustomerIdType(customer.id_type ?? '')
              setCustomerIdNumber(customer.id_number ?? '')
              setShowCustomerModal(false)
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default RentForm
