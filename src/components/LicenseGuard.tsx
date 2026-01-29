import { ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, Calendar } from 'lucide-react'
import { checkLicenseValidity, LicenseStatus } from '../utils/licenseValidator'

interface LicenseGuardProps {
  children: ReactNode
}

/**
 * Component that blocks access if license is expired
 * Shows a message and redirects to login if expired
 */
export function LicenseGuard({ children }: LicenseGuardProps) {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const verifyLicense = async () => {
      setIsChecking(true)
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<LicenseStatus>((_, reject) => 
          setTimeout(() => reject(new Error('License check timeout')), 3000)
        )
        
        const status = await Promise.race([
          checkLicenseValidity(),
          timeoutPromise
        ])
        
        setLicenseStatus(status)
        setIsChecking(false)

        // If license is expired and user is not on login page, show blocked screen
        if (status.isExpired && location.pathname !== '/login') {
          // Blocked screen will be shown below
        }
      } catch (error) {
        console.error('Error verifying license:', error)
        // On error, allow access (fail open) and set a default valid status
        setLicenseStatus({
          isValid: true,
          isExpired: false,
          daysRemaining: Infinity,
          validFrom: null,
          validTo: null,
          message: 'License verification unavailable',
        })
        setIsChecking(false)
      }
    }

    // Run immediately; do not block initial UI for artificial delays
    const timeoutId = setTimeout(verifyLicense, 0)
    
    // Re-check license every hour
    const interval = setInterval(verifyLicense, 60 * 60 * 1000)
    return () => {
      clearTimeout(timeoutId)
      clearInterval(interval)
    }
  }, [location.pathname])

  // Non-blocking: while checking, show app but keep a small banner (fail-open).
  if (isChecking) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-[70] bg-slate-900 text-white px-4 py-2 text-sm flex items-center gap-2 shadow-lg">
          <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
          <span>Checking license…</span>
        </div>
        {children}
      </>
    )
  }

  // If license is expired, show blocked screen
  if (licenseStatus && licenseStatus.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">License Expired</h1>
          <p className="text-gray-600 mb-4">{licenseStatus.message}</p>
          
          {licenseStatus.validFrom && licenseStatus.validTo && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold">License Period</span>
              </div>
              <p className="text-gray-600">
                {new Date(licenseStatus.validFrom).toLocaleDateString()} - {new Date(licenseStatus.validTo).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm text-yellow-800">
              <strong>Action Required:</strong> Please contact your administrator to renew your license to continue using the system.
            </p>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('hisabkitab_user')
              window.location.href = '/login'
            }}
            className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // License is valid, show children
  return <>{children}</>
}

