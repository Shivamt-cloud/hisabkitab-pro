import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MaintenanceSettings } from '../types/settings'

interface MaintenancePageProps {
  maintenance: MaintenanceSettings
}

export function MaintenancePage({ maintenance }: MaintenancePageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-amber-50 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-amber-200 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Scheduled Maintenance</h1>
        <p className="text-gray-700 whitespace-pre-wrap mb-4">{maintenance.message || 'The site is currently under maintenance.'}</p>
        {maintenance.end_time_ist?.trim() && (
          <p className="text-sm font-semibold text-amber-800 mb-6">
            Expected back by: {maintenance.end_time_ist}
          </p>
        )}
        <p className="text-xs text-gray-500">
          We apologise for the inconvenience. Please try again later.
        </p>
        <p className="text-xs text-gray-500 mt-4">
          Admin: open Settings to turn off or edit this message. After saving, refresh the page to see updates.
        </p>
        <Link
          to="/settings"
          className="inline-block mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800 underline"
        >
          Open Settings →
        </Link>
      </div>
    </div>
  )
}
