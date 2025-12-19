export interface Company {
  id: number
  unique_code: string // Unique company identifier (e.g., COMP001, ABC, SHOP1)
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
  gstin?: string
  pan?: string
  website?: string
  logo?: string
  valid_from?: string
  valid_to?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  created_by?: number
}

