import { SubscriptionPayment, RechargePlan, PaymentGateway, PaymentMethod, PaymentStatus, SubscriptionTier, DurationMonths } from '../types/subscriptionPayment'
import { getAll, getById, put, getByIndex, STORES } from '../database/db'
import { companyService } from './companyService'
import { getCountryPricing, formatPrice } from '../utils/pricing'
import { calculateTierPrice, getTierPricing } from '../utils/tierPricing'

// GST rate (18% for India, adjust for other countries)
const GST_RATE = 0.18

// Gateway fee percentage (2% + GST on gateway fee)
const GATEWAY_FEE_PERCENTAGE = 0.02

/**
 * Calculate gateway fee
 */
function calculateGatewayFee(amount: number): number {
  const gatewayFee = amount * GATEWAY_FEE_PERCENTAGE
  const gstOnGatewayFee = gatewayFee * GST_RATE
  return Math.round((gatewayFee + gstOnGatewayFee) * 100) / 100
}

/**
 * Get recharge plans for a given tier and country.
 * Plans and payment breakdown are always tier-based: Basic, Standard, and Premium each have their own pricing.
 */
export function getRechargePlans(tier: SubscriptionTier, countryCode: string = 'IN'): RechargePlan[] {
  const countryPricing = getCountryPricing(countryCode)
  const discountPct = countryPricing.discount ?? 50

  // Use country base yearly (Basic tier), then apply tier multiplier so pricing is plan-specific
  const discountedYearly = countryPricing.yearlyPrice
  const originalYearly = countryPricing.originalPrice ?? discountedYearly * 2
  const tierDiscountedYearly = calculateTierPrice(discountedYearly, tier)
  const tierOriginalYearly = calculateTierPrice(originalYearly, tier)
  const monthlyOriginal = Math.round(tierOriginalYearly / 12)
  const monthlyDiscounted = Math.round(tierDiscountedYearly / 12)

  const plans: RechargePlan[] = [
    {
      duration_months: 1,
      label: '1 Month',
      base_price: monthlyOriginal,
      final_price: monthlyDiscounted,
      discount_percentage: discountPct,
      savings: monthlyOriginal - monthlyDiscounted,
    },
    {
      duration_months: 3,
      label: '3 Months',
      base_price: monthlyOriginal * 3,
      final_price: monthlyDiscounted * 3,
      discount_percentage: discountPct,
      savings: monthlyOriginal * 3 - monthlyDiscounted * 3,
    },
    {
      duration_months: 6,
      label: '6 Months',
      base_price: monthlyOriginal * 6,
      final_price: monthlyDiscounted * 6,
      discount_percentage: discountPct,
      savings: monthlyOriginal * 6 - monthlyDiscounted * 6,
    },
    {
      duration_months: 12,
      label: '1 Year',
      base_price: tierOriginalYearly,
      final_price: tierDiscountedYearly,
      discount_percentage: discountPct,
      savings: tierOriginalYearly - tierDiscountedYearly,
    },
  ]

  return plans
}

/**
 * Calculate payment breakdown.
 * Platform fee is waived via discount so user pays only base + GST.
 */
export function calculatePaymentBreakdown(
  baseAmount: number
): {
  amount: number
  gst_amount: number
  gateway_fee: number
  platform_fee_discount: number
  total_amount: number
} {
  const gstAmount = Math.round(baseAmount * GST_RATE * 100) / 100
  const amountWithGST = baseAmount + gstAmount
  const gatewayFee = calculateGatewayFee(amountWithGST)
  // Discount = platform fee so user pays only base + GST (platform fee on us)
  const platformFeeDiscount = gatewayFee
  const totalAmount = Math.round((amountWithGST - platformFeeDiscount) * 100) / 100

  return {
    amount: baseAmount,
    gst_amount: gstAmount,
    gateway_fee: gatewayFee,
    platform_fee_discount: platformFeeDiscount,
    total_amount: totalAmount,
  }
}

export const subscriptionPaymentService = {
  /**
   * Get all subscription payments
   */
  getAll: async (companyId?: number): Promise<SubscriptionPayment[]> => {
    const allPayments = await getAll<SubscriptionPayment>(STORES.SUBSCRIPTION_PAYMENTS)
    if (companyId !== undefined) {
      return allPayments.filter(p => p.company_id === companyId).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return allPayments.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  /**
   * Get payment by ID
   */
  getById: async (id: number): Promise<SubscriptionPayment | undefined> => {
    return await getById<SubscriptionPayment>(STORES.SUBSCRIPTION_PAYMENTS, id)
  },

  /**
   * Get payment by gateway order ID
   */
  getByOrderId: async (orderId: string): Promise<SubscriptionPayment | undefined> => {
    const payments = await getAll<SubscriptionPayment>(STORES.SUBSCRIPTION_PAYMENTS)
    return payments.find(p => p.gateway_order_id === orderId)
  },

  /**
   * Create a new payment record
   */
  createPayment: async (
    payment: Omit<SubscriptionPayment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SubscriptionPayment> => {
    const newPayment: SubscriptionPayment = {
      ...payment,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await put(STORES.SUBSCRIPTION_PAYMENTS, newPayment)
    return newPayment
  },

  /**
   * Update payment status
   */
  updatePaymentStatus: async (
    paymentId: number,
    status: PaymentStatus,
    gatewayPaymentId?: string,
    gatewaySignature?: string
  ): Promise<SubscriptionPayment> => {
    const payment = await subscriptionPaymentService.getById(paymentId)
    if (!payment) {
      throw new Error('Payment not found')
    }

    const updatedPayment: SubscriptionPayment = {
      ...payment,
      payment_status: status,
      gateway_payment_id: gatewayPaymentId || payment.gateway_payment_id,
      gateway_signature: gatewaySignature || payment.gateway_signature,
      updated_at: new Date().toISOString(),
    }

    await put(STORES.SUBSCRIPTION_PAYMENTS, updatedPayment)
    return updatedPayment
  },

  /**
   * Process successful payment and update subscription
   */
  processSuccessfulPayment: async (paymentId: number): Promise<void> => {
    const payment = await subscriptionPaymentService.getById(paymentId)
    if (!payment || payment.payment_status !== 'success') {
      throw new Error('Payment not found or not successful')
    }

    const company = payment.company_id
      ? await companyService.getById(payment.company_id)
      : null

    if (!company) {
      throw new Error('Company not found')
    }

    // Calculate new subscription dates
    const startDate = payment.subscription_start_date
      ? new Date(payment.subscription_start_date)
      : new Date()

    // If there's an existing subscription end date and it's in the future, extend from there
    // Otherwise, start from today
    const existingEndDate = company.subscription_end_date
      ? new Date(company.subscription_end_date)
      : null

    const baseDate =
      existingEndDate && existingEndDate > new Date() ? existingEndDate : startDate

    const endDate = new Date(baseDate)
    endDate.setMonth(endDate.getMonth() + payment.duration_months)

    // Update company subscription
    const updatedCompany = {
      ...company,
      subscription_tier: payment.subscription_tier,
      subscription_start_date: startDate.toISOString().split('T')[0],
      subscription_end_date: endDate.toISOString().split('T')[0],
      subscription_status: 'active' as const,
      updated_at: new Date().toISOString(),
    }

    await companyService.update(company.id, updatedCompany)

    // Update payment with subscription dates
    const updatedPayment: SubscriptionPayment = {
      ...payment,
      subscription_start_date: startDate.toISOString().split('T')[0],
      subscription_end_date: endDate.toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }

    await put(STORES.SUBSCRIPTION_PAYMENTS, updatedPayment)
  },

  /**
   * Get payment history for a company
   */
  getPaymentHistory: async (companyId: number): Promise<SubscriptionPayment[]> => {
    return await subscriptionPaymentService.getAll(companyId)
  },
}
