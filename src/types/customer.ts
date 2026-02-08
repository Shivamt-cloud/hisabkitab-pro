/** ID proof types for customer (e.g. Aadhaar, PAN, Passport). */
export const CUSTOMER_ID_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Select ID type' },
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'other', label: 'Other' },
]

export interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
  gstin?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  contact_person?: string
  /** Type of ID submitted (Aadhaar, PAN, Passport, etc.) */
  id_type?: string
  /** ID number/details for the selected id_type */
  id_number?: string
  is_active: boolean
  credit_limit?: number
  outstanding_amount?: number
  credit_balance?: number // Positive balance from returns/exchanges (credit available to use)
  price_segment_id?: number // For price lists (Retail, Wholesale, VIP, etc.)
  company_id?: number
  created_at: string
  updated_at?: string
}

export interface CustomerSummary {
  id: number
  name: string
  total_sales: number
  total_purchases: number
  outstanding_amount: number
  last_sale_date?: string
  sale_count: number
}

