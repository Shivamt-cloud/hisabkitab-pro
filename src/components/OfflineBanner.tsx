import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Shows a small banner when the user is offline: "You're offline – data will sync when connected."
 * Sets expectation and reduces "did it save?" anxiety.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      className="sticky top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2 text-sm font-medium shadow-md"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You're offline – data will sync when connected.</span>
    </div>
  )
}
