/**
 * Quick Win #2 – Global keyboard shortcuts
 * New Sale: Alt+S / ⌘⇧S (Mac). New Purchase: Alt+P / ⌘⇧P (Mac). Save: Ctrl/⌘+S. Print: Ctrl/⌘+P on Invoice.
 */

import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function KeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, hasPermission } = useAuth()

  // Electron: when menu triggers Save/Print/New Sale/New Purchase, main sends IPC; we handle in renderer
  useEffect(() => {
    const api = (window as Window & {
      electronAPI?: {
        subscribeAppSave?: (cb: () => void) => void
        subscribeAppPrint?: (cb: () => void) => void
        subscribeNavigateTo?: (cb: (path: string) => void) => void
      }
    }).electronAPI
    if (api?.subscribeAppSave) api.subscribeAppSave(() => window.dispatchEvent(new CustomEvent('app-save')))
    if (api?.subscribeAppPrint) api.subscribeAppPrint(() => window.dispatchEvent(new CustomEvent('app-print')))
    if (api?.subscribeNavigateTo) api.subscribeNavigateTo((path: string) => navigate(path))
  }, [navigate])

  useEffect(() => {
    if (!user) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Use e.code (physical key) so Alt/Option+S and Alt/Option+P work on Mac (e.key becomes ß, π etc.)
      // Cmd+Shift+Q / Ctrl+Shift+Q → Quick Sale (scan → add → pay)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyQ') {
        e.preventDefault()
        if (hasPermission('sales:create')) navigate('/sales/quick')
        return
      }
      // Cmd+Shift+S / Ctrl+Shift+S → New Sale (Mac-friendly combined key)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault()
        if (hasPermission('sales:create')) navigate('/sales/new')
        return
      }
      // Cmd+Shift+P / Ctrl+Shift+P → New Purchase (Mac-friendly combined key)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault()
        if (hasPermission('purchases:create')) navigate('/purchases/new-gst')
        return
      }
      // Alt+S / Option+S → New Sale (legacy)
      if (e.altKey && e.code === 'KeyS') {
        e.preventDefault()
        if (hasPermission('sales:create')) navigate('/sales/new')
        return
      }
      // Alt+P / Option+P → New Purchase (legacy)
      if (e.altKey && e.code === 'KeyP') {
        e.preventDefault()
        if (hasPermission('purchases:create')) navigate('/purchases/new-gst')
        return
      }
      // Ctrl+S / Cmd+S → Save (dispatch for form pages to handle)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyS') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('app-save'))
        return
      }
      // Ctrl+P / Cmd+P on invoice view → Print
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyP') {
        if (location.pathname.startsWith('/invoice/')) {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('app-print'))
        }
        return
      }
      // Alt+H / Option+H → Home / Dashboard
      if (e.altKey && e.code === 'KeyH') {
        e.preventDefault()
        navigate('/')
        return
      }
    }

    // Use capture phase so we run before browser/Electron default (critical for Mac Cmd+S/Cmd+P)
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [user, hasPermission, navigate, location.pathname])

  return null
}
