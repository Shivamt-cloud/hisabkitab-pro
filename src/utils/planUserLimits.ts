/**
 * Plan-based user limits configuration
 */

import { SubscriptionTier } from '../types/device'

export interface PlanUserLimits {
  tier: SubscriptionTier
  maxUsers: number | 'unlimited'
}

export const PLAN_USER_LIMITS: Record<SubscriptionTier, PlanUserLimits> = {
  starter: {
    tier: 'starter',
    maxUsers: 1,
  },
  basic: {
    tier: 'basic',
    maxUsers: 3,
  },
  standard: {
    tier: 'standard',
    maxUsers: 10,
  },
  premium: {
    tier: 'premium',
    maxUsers: 'unlimited',
  },
  premium_plus: {
    tier: 'premium_plus',
    maxUsers: 'unlimited',
  },
  premium_plus_plus: {
    tier: 'premium_plus_plus',
    maxUsers: 'unlimited',
  },
}

/**
 * Get maximum users for a subscription tier
 */
export function getMaxUsersForPlan(tier: SubscriptionTier): number | 'unlimited' {
  return PLAN_USER_LIMITS[tier].maxUsers
}

/**
 * Check if user creation is allowed for a company
 */
export function canCreateUser(currentUserCount: number, maxUsers: number | 'unlimited'): boolean {
  if (maxUsers === 'unlimited') return true
  return currentUserCount < maxUsers
}
