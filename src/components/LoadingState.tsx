/**
 * Quick Win #3 – Consistent loading state (spinner + message)
 */

import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" aria-hidden />
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  )
}
