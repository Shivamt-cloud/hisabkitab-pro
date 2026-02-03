/**
 * Quick Win #4 – Toast notifications (success / error / info)
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  createdAt: number
}

type ToastContextValue = {
  toasts: ToastItem[]
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    const t = timeoutsRef.current.get(id)
    if (t) clearTimeout(t)
    timeoutsRef.current.delete(id)
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const item: ToastItem = { id, message, type, createdAt: Date.now() }
      setToasts((prev) => [...prev.slice(-4), item])

      const t = setTimeout(() => removeToast(id), TOAST_DURATION_MS)
      timeoutsRef.current.set(id, t)
    },
    [removeToast]
  )

  const toast = useMemo(
    () => ({
      success: (message: string) => addToast(message, 'success'),
      error: (message: string) => addToast(message, 'error'),
      info: (message: string) => addToast(message, 'info'),
    }),
    [addToast]
  )

  const value: ToastContextValue = useMemo(
    () => ({ toasts, toast, removeToast }),
    [toasts, toast, removeToast]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
