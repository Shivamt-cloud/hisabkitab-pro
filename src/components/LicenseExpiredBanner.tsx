import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { checkLicenseValidity, LicenseStatus } from '../utils/licenseValidator'

export function LicenseExpiredBanner() {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkLicense = async () => {
      const status = await checkLicenseValidity()
      setLicenseStatus(status)
      setIsVisible(!status.isValid && status.isExpired)
    }
    checkLicense()
    
    // Check license status every hour
    const interval = setInterval(checkLicense, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible || !licenseStatus) return null

  return (
    <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-3 flex-1">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">License Expired</p>
          <p className="text-sm text-red-100">{licenseStatus.message}</p>
          <p className="text-xs text-red-200 mt-1">
            Valid Period: {licenseStatus.validFrom && new Date(licenseStatus.validFrom).toLocaleDateString()} - {licenseStatus.validTo && new Date(licenseStatus.validTo).toLocaleDateString()}
          </p>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="p-1 hover:bg-red-700 rounded transition-colors"
        title="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}





