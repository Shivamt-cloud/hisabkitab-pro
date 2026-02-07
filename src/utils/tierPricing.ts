/**
 * Tier pricing calculation based on base pricing
 * Multiplies base price by tier multiplier
 */

export type SubscriptionTier = 'basic' | 'standard' | 'premium'

export interface TierPricing {
  tier: SubscriptionTier
  name: string
  deviceLimit: number | 'unlimited'
  /** Display text for UI: e.g. "1 device + 1 mobile", "3 devices + 1 mobile", "Unlimited" */
  deviceDisplayLabel: string
  multiplier: number // Multiplier for base price
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  basic: {
    tier: 'basic',
    name: 'Basic Plan',
    deviceLimit: 2, // 1 device + 1 mobile
    deviceDisplayLabel: '1 device + 1 mobile',
    multiplier: 1.0, // Base price
  },
  standard: {
    tier: 'standard',
    name: 'Standard Plan',
    deviceLimit: 4, // 3 devices + 1 mobile
    deviceDisplayLabel: '3 devices + 1 mobile',
    multiplier: 1.33, // ~33% more than basic
  },
  premium: {
    tier: 'premium',
    name: 'Premium Plan',
    deviceLimit: 'unlimited',
    deviceDisplayLabel: 'Unlimited',
    multiplier: 2.0, // 100% more than basic
  },
}

/**
 * Calculate tier pricing based on base price
 */
export function calculateTierPrice(basePrice: number, tier: SubscriptionTier): number {
  return Math.round(basePrice * TIER_PRICING[tier].multiplier)
}

/**
 * Get tier pricing info
 */
export function getTierPricing(tier: SubscriptionTier): TierPricing {
  return TIER_PRICING[tier]
}

/**
 * Get display monthly price (basic plan: 500 → 499 for psychological pricing)
 */
export function getDisplayMonthlyPrice(tierPrice: number, tier: SubscriptionTier): number {
  const calculated = Math.round(tierPrice / 12)
  if (tier === 'basic' && calculated === 500) return 499
  return calculated
}
