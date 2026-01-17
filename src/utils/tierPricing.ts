/**
 * Tier pricing calculation based on base pricing
 * Multiplies base price by tier multiplier
 */

export type SubscriptionTier = 'basic' | 'standard' | 'premium'

export interface TierPricing {
  tier: SubscriptionTier
  name: string
  deviceLimit: number | 'unlimited'
  multiplier: number // Multiplier for base price
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  basic: {
    tier: 'basic',
    name: 'Basic Plan',
    deviceLimit: 1,
    multiplier: 1.0, // Base price
  },
  standard: {
    tier: 'standard',
    name: 'Standard Plan',
    deviceLimit: 3,
    multiplier: 1.33, // ~33% more than basic
  },
  premium: {
    tier: 'premium',
    name: 'Premium Plan',
    deviceLimit: 'unlimited',
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
