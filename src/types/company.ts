import { SubscriptionTier } from './device'

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
  subscription_tier?: SubscriptionTier
  max_users?: number
  subscription_start_date?: string
  subscription_end_date?: string
  subscription_status?: 'active' | 'expired' | 'cancelled'
  created_at: string
  updated_at?: string
  created_by?: number
}

