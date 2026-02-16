import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { settingsService } from '../services/settingsService'
import type { MaintenanceSettings } from '../types/settings'
import { MaintenancePage } from './MaintenancePage'

/** Paths that are always allowed even when full maintenance page is on (so admin can turn it off) */
const ALLOWED_PATHS_WHEN_MAINTENANCE_PAGE = ['/login', '/settings', '/user-manual']

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PATHS_WHEN_MAINTENANCE_PAGE.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

interface MaintenanceGuardProps {
  children: React.ReactNode
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const [maintenance, setMaintenance] = useState<MaintenanceSettings | null>(null)
  const [loaded, setLoaded] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    const defaultMaintenance = {
      enabled: false,
      show_as: 'banner' as const,
      message: '',
      end_time_ist: '',
    }
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setMaintenance(defaultMaintenance)
        setLoaded(true)
      }
    }, 3000)
    settingsService
      .getMaintenance()
      .then((m) => {
        if (!cancelled) {
          clearTimeout(timeout)
          setMaintenance(m)
          setLoaded(true)
        }
      })
      .catch((err) => {
        console.warn('[MaintenanceGuard] getMaintenance failed:', err)
        if (!cancelled) {
          clearTimeout(timeout)
          setMaintenance(defaultMaintenance)
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [])

  const pathAllowed = isAllowedPath(location.pathname)

  // On allowed paths (login, settings, user-manual) always show app so admin can open Settings
  if (pathAllowed) {
    return <>{children}</>
  }

  // On other paths, wait for maintenance to load so we don't show dashboard then switch to maintenance page
  if (!loaded || maintenance == null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    )
  }

  const showFullPage = maintenance.enabled && maintenance.show_as === 'page'

  if (showFullPage) {
    return <MaintenancePage maintenance={maintenance} />
  }

  return <>{children}</>
}
