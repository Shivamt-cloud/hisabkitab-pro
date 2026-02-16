import { AlertTriangle } from 'lucide-react'
import type { MaintenanceSettings } from '../types/settings'

interface MaintenanceBannerProps {
  maintenance: MaintenanceSettings
}

export function MaintenanceBanner({ maintenance }: MaintenanceBannerProps) {
  if (!maintenance.enabled || maintenance.show_as !== 'banner' || !maintenance.message.trim()) {
    return null
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center gap-3 text-sm font-medium shadow-sm">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <span className="flex-1">{maintenance.message}</span>
      {maintenance.end_time_ist?.trim() && (
        <span className="shrink-0 text-amber-900 font-semibold">
          (IST: {maintenance.end_time_ist})
        </span>
      )}
    </div>
  )
}
