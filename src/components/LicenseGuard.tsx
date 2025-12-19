import { ReactNode, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const verifyLicense = async () => {
      setIsChecking(true)
      const status = await checkLicenseValidity()
      setLicenseStatus(status)
      setIsChecking(false)

      // If license is expired and user is not on login page, show blocked screen
      if (status.isExpired && location.pathname !== '/login') {
        // Blocked screen will be shown below
      }
    }

    verifyLicense()
    
    // Re-check license every hour
    const interval = setInterval(verifyLicense, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [location.pathname])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying license...</p>
        </div>
      </div>
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

