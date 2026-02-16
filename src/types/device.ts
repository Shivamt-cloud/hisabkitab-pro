// Device-related types

export interface Device {
  id: number
  user_id: string
  device_id: string
  device_name?: string
  device_type?: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser_info?: string
  user_agent?: string
  last_accessed: string
  created_at: string
  is_active: boolean
}

export type SubscriptionTier = 'basic' | 'standard' | 'premium' | 'premium_plus' | 'premium_plus_plus'

export interface SubscriptionInfo {
  tier: SubscriptionTier
  max_devices: number
  subscription_start_date?: string
  subscription_end_date?: string
  subscription_status: 'active' | 'expired' | 'cancelled'
}

export interface DeviceLimitCheck {
  atLimit: boolean
  currentCount: number
  maxDevices: number
  canRegister: boolean
}
