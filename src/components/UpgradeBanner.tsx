import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { CONTACT_EMAIL } from '../constants'
import { X, Sparkles, ArrowUpRight } from 'lucide-react'

/**
 * Upgrade Banner Component
 * Shows upgrade advertisements based on user's subscription tier
 * - Basic plan: Show upgrade to Standard and Premium
 * - Standard plan: Show upgrade to Premium
 * - Premium plan: No banner (or success message)
 */
export function UpgradeBanner() {
  const { user } = useAuth()
  const [isDismissed, setIsDismissed] = useState(false)

  // Get user's subscription tier (default to 'basic' if not set)
  const subscriptionTier = (user as any)?.subscription_tier || 'starter'

  // Don't show banner for premium users or if dismissed
  if (subscriptionTier === 'premium' || subscriptionTier === 'premium_plus' || subscriptionTier === 'premium_plus_plus' || isDismissed || !user) {
    return null
  }

  const handleUpgrade = () => {
    const subject = encodeURIComponent('Upgrade Subscription Request')
    const body = encodeURIComponent(
      `Hello,\n\nI would like to upgrade my subscription from ${subscriptionTier.toUpperCase()} plan.\n\nUser: ${user.email}\nName: ${user.name}\n\nPlease let me know the next steps.\n\nThank you!`
    )
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  }

  if (subscriptionTier === 'basic') {
    // Show both Standard and Premium upgrade options
    return (
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white py-3 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                🎉 Upgrade Your Plan: Get More Device Access!
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                Standard Plan: 3 devices + 1 mobile | Premium Plan: Unlimited
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpgrade}
              className="bg-white text-blue-600 font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 text-sm"
            >
              Upgrade Now
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-white/80 hover:text-white p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (subscriptionTier === 'standard') {
    // Show Premium upgrade option
    return (
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                🚀 Upgrade to Premium: Get Unlimited Device Access!
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                Remove device restrictions and access from any device, anywhere
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpgrade}
              className="bg-white text-purple-600 font-semibold px-4 py-1.5 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1 text-sm"
            >
              Upgrade to Premium
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-white/80 hover:text-white p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
