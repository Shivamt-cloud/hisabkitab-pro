export type PaymentGateway = 'razorpay' | 'stripe' | 'phonepe' | 'manual' | 'upi_direct'
export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'emi' | 'other'
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'refunded' | 'cancelled'
export type SubscriptionTier = 'basic' | 'standard' | 'premium' | 'premium_plus' | 'premium_plus_plus'
export type DurationMonths = 1 | 3 | 6 | 12

export interface SubscriptionPayment {
  id: number
  company_id?: number
  user_id?: number
  subscription_tier: SubscriptionTier
  amount: number // Base amount (before GST)
  gst_amount: number
  gateway_fee: number // Gateway processing fee
  total_amount: number // Final amount (amount + GST + gateway fee)
  currency: string // 'INR', 'USD', etc.
  payment_gateway?: PaymentGateway
  payment_method?: PaymentMethod
  payment_status: PaymentStatus
  gateway_order_id?: string // Razorpay order ID
  gateway_payment_id?: string // Razorpay payment ID
  gateway_signature?: string // For verification
  upi_id?: string // For direct UPI payments
  duration_months: DurationMonths
  subscription_start_date?: string
  subscription_end_date?: string
  auto_renewal_enabled: boolean
  notes?: string
  receipt_url?: string
  created_at: string
  updated_at: string
}

export interface RechargePlan {
  duration_months: DurationMonths
  label: string // "1 Month", "3 Months", etc.
  base_price: number
  discount_percentage?: number
  final_price: number
  savings?: number
}

export interface PaymentGatewayConfig {
  razorpay_key_id?: string
  razorpay_key_secret?: string
  stripe_publishable_key?: string
  stripe_secret_key?: string
}
