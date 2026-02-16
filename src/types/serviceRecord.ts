export type ServiceVehicleType = 'bike' | 'car' | 'ebike' | 'ecar'

/** Service type presets – per vehicle type */
export const BIKE_SERVICE_TYPES = [
  'Oil change',
  'Tyre',
  'Battery',
  'Chain',
  'Brake',
  'General service',
  'Repair',
  'Other',
] as const

export type BikeServiceType = (typeof BIKE_SERVICE_TYPES)[number]

export const CAR_SERVICE_TYPES = [
  'Oil change',
  'AC service',
  'Brake',
  'Tyre',
  'Battery',
  'General service',
  'Repair',
  'Other',
] as const

export const EBIKE_ECAR_SERVICE_TYPES = [
  'Battery check',
  'Motor service',
  'Brake',
  'Tyre',
  'General service',
  'Repair',
  'Other',
] as const

/** Service job status – full workflow from appointment booking to completion */
export const SERVICE_STATUSES = [
  'booked',       // Appointment booked (scheduled for future)
  'draft',
  'pickup_verification',
  'verification_completed',
  'service_started',
  'service_ended',
  'completed',
  'cancelled',
] as const

export type ServiceStatus = (typeof SERVICE_STATUSES)[number]

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  booked: 'Booked (Appointment)',
  draft: 'Draft',
  pickup_verification: 'Pickup / Verification',
  verification_completed: 'Verification completed',
  service_started: 'Service started',
  service_ended: 'Service ended',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** Payment method options for completed services (same as sale) */
export const SERVICE_PAYMENT_METHODS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  cheque: 'Cheque',
  other: 'Other',
}

export interface ServiceRecord {
  id: number
  company_id?: number
  vehicle_type: ServiceVehicleType
  service_date: string
  customer_name: string
  vehicle_number: string
  /** Customer phone for WhatsApp / SMS (Premium Plus: notify customer) */
  customer_phone?: string
  /** Customer email for email receipt (Premium Plus: notify customer) */
  customer_email?: string
  service_type: string
  amount: number
  /** Total value of parts/products sold for this service (from linked sale) */
  parts_total?: number
  /** Optional discount: percentage (0–100) applied to subtotal (service + parts) */
  discount_percentage?: number
  /** Optional discount: flat amount in ₹ */
  discount_amount?: number
  description: string
  next_service_date?: string
  /** Job status in workflow */
  status?: ServiceStatus
  /** Pickup verification notes – e.g. wire broken, tyre condition, brake, battery, scratches, etc. */
  pickup_verification_notes?: string
  /** Assigned user (user id from users table) */
  assigned_to?: string
  /** Assigned technician (id from technicians table) – when set, use this instead of assigned_to for display */
  assigned_technician_id?: number
  /** Technician name – from assigned user/technician or entered manually */
  technician_name?: string
  /** Technician phone */
  technician_phone?: string
  /** Technician notes / other details */
  technician_notes?: string
  /** Payment – available when status is completed */
  payment_status?: 'pending' | 'paid'
  payment_method?: string
  payment_date?: string
  receipt_number?: string
  created_at: string
  updated_at?: string
  created_by?: number
}

export type ServiceRecordCreate = Omit<ServiceRecord, 'id' | 'created_at' | 'updated_at'>

/** Subtotal = service amount + parts total */
export function getServiceSubtotal(r: Pick<ServiceRecord, 'amount' | 'parts_total'>): number {
  return r.amount + (r.parts_total ?? 0)
}

/** Discount value = (subtotal × discount_percentage / 100) + discount_amount */
export function getServiceDiscountValue(r: Pick<ServiceRecord, 'amount' | 'parts_total' | 'discount_percentage' | 'discount_amount'>): number {
  const subtotal = getServiceSubtotal(r)
  const pct = (r.discount_percentage ?? 0) / 100
  return subtotal * pct + (r.discount_amount ?? 0)
}

/** Total = subtotal - discount */
export function getServiceTotal(r: Pick<ServiceRecord, 'amount' | 'parts_total' | 'discount_percentage' | 'discount_amount'>): number {
  return getServiceSubtotal(r) - getServiceDiscountValue(r)
}
