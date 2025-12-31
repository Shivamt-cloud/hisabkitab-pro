import { useState, useEffect } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { onUpdateAvailable, forceUpdate, checkForUpdates } from '../utils/pwa'

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates()

    // Listen for update availability
    const cleanup = onUpdateAvailable(() => {
      setUpdateAvailable(true)
    })

    // Also check periodically (every 24 hours)
    const interval = setInterval(() => {
      checkForUpdates()
    }, 24 * 60 * 60 * 1000) // 24 hours

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [])

  const handleUpdate = () => {
    setIsUpdating(true)
    // Small delay to show loading state
    setTimeout(() => {
      forceUpdate()
    }, 500)
  }

  const handleDismiss = () => {
    setUpdateAvailable(false)
    // Store dismissal in localStorage (expires after 1 hour)
    localStorage.setItem('pwa-update-dismissed', Date.now().toString())
  }

  // Check if update was recently dismissed
  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa-update-dismissed')
    if (dismissedTime) {
      const dismissed = parseInt(dismissedTime, 10)
      const oneHour = 60 * 60 * 1000
      if (Date.now() - dismissed < oneHour) {
        setUpdateAvailable(false)
      } else {
        localStorage.removeItem('pwa-update-dismissed')
      }
    }
  }, [])

  if (!updateAvailable) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <div>
              <p className="font-semibold text-sm">New version available!</p>
              <p className="text-xs text-blue-100">
                A new version of the app is available. Update now to get the latest features and improvements.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-4 py-1.5 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Now'
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-white hover:bg-blue-700 rounded-lg transition-colors"
              title="Dismiss (1 hour)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

