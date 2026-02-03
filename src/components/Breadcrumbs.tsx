/**
 * Quick Win #6 – Breadcrumb navigation (Dashboard > Section > Current)
 */

import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-1 text-sm text-gray-600 ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />}
            {!isLast && item.path ? (
              <Link
                to={item.path}
                className="hover:text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-gray-900' : ''}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
