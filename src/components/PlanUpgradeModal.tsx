import { Sparkles, X } from 'lucide-react'
import { LockIcon } from './icons/LockIcon'
import {
  PLAN_FEATURE_LABELS,
  PLAN_TIER_LABELS,
  PLAN_FEATURE_MAP,
  getRequiredPlanTierForFeature,
  type PlanFeature,
} from '../utils/planFeatures'

interface PlanUpgradeModalProps {
  feature: PlanFeature
  featureLabel?: string
  onClose: () => void
  onUpgrade?: () => void
}

export function PlanUpgradeModal({
  feature,
  featureLabel,
  onClose,
  onUpgrade,
}: PlanUpgradeModalProps) {
  const requiredTier = getRequiredPlanTierForFeature(feature)
  const isAdminOnly = PLAN_FEATURE_MAP[feature] === 'admin'
  const label = featureLabel ?? PLAN_FEATURE_LABELS[feature] ?? 'This feature'
  const planName = requiredTier ? PLAN_TIER_LABELS[requiredTier] : 'a higher'
  const subtitle = isAdminOnly ? 'Available for administrators' : `Available on ${planName} plan`
  const message = isAdminOnly
    ? `This feature is available for administrators. Contact your admin to get access to ${label}.`
    : `You're doing great! Upgrade to the ${planName} plan to use ${label}. We'd love to help you get more out of HisabKitab.`

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="plan-upgrade-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
            <LockIcon className="w-7 h-7" />
          </div>
          <h2 id="plan-upgrade-title" className="text-xl font-bold mb-1">Unlock {label}</h2>
          <p className="text-white/90 text-sm">{subtitle}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">
              {message}
            </p>
          </div>
          <p className="text-center text-sm text-gray-500">
            {isAdminOnly ? 'Contact your admin to get access.' : 'Contact your admin or upgrade your subscription to get started.'}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={() => {
                onUpgrade?.()
                onClose()
              }}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-colors shadow-md"
            >
              Got it, I’ll upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
