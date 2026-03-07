import { useRef, useCallback, ReactNode } from 'react'

/** Wraps a wide table with top + bottom horizontal scrollbars (synced) for easier scrolling on Windows */
export function ScrollableTableWrapper({
  children,
  minWidth = '700px',
  maxHeight = '55vh',
  className = '',
}: {
  children: ReactNode
  minWidth?: string
  maxHeight?: string
  className?: string
}) {
  const topRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)

  const handleTopScroll = useCallback(() => {
    if (syncing.current) return
    syncing.current = true
    if (mainRef.current && topRef.current) {
      mainRef.current.scrollLeft = topRef.current.scrollLeft
    }
    requestAnimationFrame(() => {
      syncing.current = false
    })
  }, [])

  const handleMainScroll = useCallback(() => {
    if (syncing.current) return
    syncing.current = true
    if (mainRef.current && topRef.current) {
      topRef.current.scrollLeft = mainRef.current.scrollLeft
    }
    requestAnimationFrame(() => {
      syncing.current = false
    })
  }, [])

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {/* Top scrollbar – mirrors horizontal scroll */}
      <div
        ref={topRef}
        onScroll={handleTopScroll}
        className="overflow-x-auto overflow-y-hidden border border-gray-200 border-b-0 rounded-t-lg bg-gray-50/50"
        style={{ scrollbarGutter: 'stable' }}
        aria-label="Horizontal scroll (top)"
      >
        <div style={{ minWidth }} className="h-1" aria-hidden="true" />
      </div>
      {/* Main content with horizontal + vertical scroll */}
      <div
        ref={mainRef}
        onScroll={handleMainScroll}
        className="overflow-x-auto overflow-y-auto border border-gray-200 rounded-lg"
        style={{ scrollbarGutter: 'stable', maxHeight: maxHeight || undefined }}
      >
        {children}
      </div>
    </div>
  )
}
