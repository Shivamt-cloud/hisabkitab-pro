/**
 * Tier pricing calculation based on base pricing
 * Multiplies base price by tier multiplier
 */

export type SubscriptionTier = 'starter' | 'basic' | 'standard' | 'premium' | 'premium_plus' | 'premium_plus_plus'

export interface TierPricing {
  tier: SubscriptionTier
  name: string
  deviceLimit: number | 'unlimited'
  /** Display text for UI: e.g. "1 device + 1 mobile", "3 devices + 1 mobile", "Unlimited" */
  deviceDisplayLabel: string
  multiplier: number // Multiplier for base price
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  starter: {
    tier: 'starter',
    name: 'Starter Plan',
    deviceLimit: 1,
    deviceDisplayLabel: '1 device',
    multiplier: 0.6, // Entry: Combo yearly 3588 vs Basic 5988
  },
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
  premium_plus: {
    tier: 'premium_plus',
    name: 'Premium Plus Plan',
    deviceLimit: 'unlimited',
    deviceDisplayLabel: 'Unlimited + Services',
    multiplier: 2.5, // Includes bike, car, e-bike, e-car services
  },
  premium_plus_plus: {
    tier: 'premium_plus_plus',
    name: 'Premium Plus Plus Plan',
    deviceLimit: 'unlimited',
    deviceDisplayLabel: 'Unlimited + All Services',
    multiplier: 3.0, // Top tier – all services
  },
}

/**
 * Calculate tier pricing based on base price
 */
export function calculateTierPrice(basePrice: number, tier: SubscriptionTier): number {
  return Math.round(basePrice * TIER_PRICING[tier].multiplier)
}

/**
 * Get tier pricing info. Returns Basic plan when tier is null/undefined or invalid.
 */
export function getTierPricing(tier: SubscriptionTier | null | undefined): TierPricing {
  if (tier && tier in TIER_PRICING) {
    return TIER_PRICING[tier as SubscriptionTier]
  }
  return TIER_PRICING.basic
}

/**
 * Get display monthly price (basic plan: 500 → 499 for psychological pricing)
 */
export function getDisplayMonthlyPrice(tierPrice: number, tier: SubscriptionTier): number {
  const calculated = Math.round(tierPrice / 12)
  if (tier === 'starter' && calculated === 300) return 299
  if (tier === 'basic' && calculated === 500) return 499
  return calculated
}
