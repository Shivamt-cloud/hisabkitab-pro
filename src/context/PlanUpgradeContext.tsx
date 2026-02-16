import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { PlanUpgradeModal } from '../components/PlanUpgradeModal'
import type { PlanFeature } from '../utils/planFeatures'

interface PlanUpgradeContextValue {
  showPlanUpgrade: (feature: PlanFeature, featureLabel?: string) => void
}

const PlanUpgradeContext = createContext<PlanUpgradeContextValue | null>(null)

export function PlanUpgradeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [feature, setFeature] = useState<PlanFeature | null>(null)
  const [featureLabel, setFeatureLabel] = useState<string | undefined>(undefined)

  const showPlanUpgrade = useCallback((f: PlanFeature, label?: string) => {
    setFeature(f)
    setFeatureLabel(label)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setFeature(null)
    setFeatureLabel(undefined)
  }, [])

  return (
    <PlanUpgradeContext.Provider value={{ showPlanUpgrade }}>
      {children}
      {open && feature && (
        <PlanUpgradeModal
          feature={feature}
          featureLabel={featureLabel}
          onClose={close}
        />
      )}
    </PlanUpgradeContext.Provider>
  )
}

export function usePlanUpgrade() {
  const ctx = useContext(PlanUpgradeContext)
  if (!ctx) return { showPlanUpgrade: () => {} }
  return ctx
}
