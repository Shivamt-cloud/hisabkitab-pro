/**
 * Quick Win #4 – Toast container (fixed position, auto-dismiss)
 */

import { useToast } from '../context/ToastContext'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const styles = {
  success: 'bg-green-600 text-white border-green-700 shadow-lg shadow-green-900/20',
  error: 'bg-red-600 text-white border-red-700 shadow-lg shadow-red-900/20',
  info: 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-900/20',
}

export function Toast() {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((item) => {
        const Icon = icons[item.type]
        const style = styles[item.type]
        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 ${style}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
            <p className="flex-1 text-sm font-medium">{item.message}</p>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="shrink-0 p-1 rounded hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
