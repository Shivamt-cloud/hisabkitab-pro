/**
 * Rental / Rent booking – goods given to customer on rent with pickup/return dates and security deposit.
 */

export type RentalStatus = 'booked' | 'picked_up' | 'returned' | 'overdue' | 'cancelled'

export interface RentalItem {
  product_id: number
  product_name: string
  quantity: number
  rent_per_unit_per_day: number
  security_deposit: number
  number_of_days: number
  total_rent: number
}

export interface Rental {
  id: number
  rental_number: string
  booking_date: string
  pickup_date: string
  return_date: string
  customer_id?: number
  customer_name: string
  customer_phone?: string
  /** ID proof captured for this booking (e.g. Aadhaar, PAN) */
  customer_id_type?: string
  customer_id_number?: string
  /** Sales person for future reference */
  sales_person_id?: number
  sales_person_name?: string
  items: RentalItem[]
  /** Subtotal (sum of item rent totals) before discount */
  total_rent_amount: number
  total_security_deposit: number
  status: RentalStatus
  /** Additional discount: type (percentage or fixed) */
  discount_type?: 'percentage' | 'fixed'
  /** Discount value: % (0–100) or fixed ₹ */
  discount_value?: number
  /** Computed discount amount in ₹ (stored for receipt) */
  discount_amount?: number
  /** Legacy: single payment method */
  payment_method?: string
  payment_status?: 'paid' | 'partial' | 'pending'
  /** Multiple payment methods (same as sale) – for advance payment at booking */
  payment_methods?: Array<{ method: string; amount: number }>
  /** Amount paid at booking (advance). Balance = (rent + security) - advance, to be paid at pickup */
  advance_amount?: number
  notes?: string
  /** Internal remarks (not shown on customer receipt) */
  internal_remarks?: string
  company_id?: number
  created_by: number
  created_at: string
  updated_at?: string
}
