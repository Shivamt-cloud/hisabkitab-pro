/**
 * Quick Win #3 – Consistent empty state (icon, title, description, optional action)
 */

import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 ${className}`}
      role="status"
    >
      <Icon className="w-16 h-16 text-gray-400 mb-4" aria-hidden />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2 px-6 rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
