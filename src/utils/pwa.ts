// PWA Utility Functions

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

/**
 * Listen for the beforeinstallprompt event
 * This event is fired when the browser thinks the app is installable
 */
export function setupInstallPrompt() {
  console.log('[PWA] Setting up install prompt listener')
  
  // Check if already installed
  if (isAppInstalled()) {
    console.log('[PWA] App is already installed, skipping prompt setup')
    return
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    console.log('[PWA] beforeinstallprompt event fired!')
    // Prevent the mini-infobar from appearing
    e.preventDefault()
    // Store the event so we can trigger it later
    deferredPrompt = e as BeforeInstallPromptEvent
    console.log('[PWA] Deferred prompt stored, dispatching custom event')
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('pwa-installable'))
  })

  // Also check if prompt is already available (might have fired before listener was set up)
  // This can happen if the event fired before React mounted
  setTimeout(() => {
    if (deferredPrompt && !isAppInstalled()) {
      console.log('[PWA] Prompt already available, dispatching event')
      window.dispatchEvent(new CustomEvent('pwa-installable'))
    }
  }, 500)
}

/**
 * Check if the app is already installed
 */
export function isAppInstalled(): boolean {
  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  // Check for iOS
  if ((window.navigator as any).standalone === true) {
    return true
  }
  return false
}

/**
 * Check if install prompt is available
 */
export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null && !isAppInstalled()
}

/**
 * Show the install prompt
 * Returns true if prompt was shown, false otherwise
 */
export async function showInstallPrompt(): Promise<boolean> {
  console.log('[PWA] showInstallPrompt called, deferredPrompt:', !!deferredPrompt)
  
  if (!deferredPrompt) {
    console.log('[PWA] No deferred prompt available')
    return false
  }

  try {
    console.log('[PWA] Calling deferredPrompt.prompt()')
    // Show the install prompt
    await deferredPrompt.prompt()
    console.log('[PWA] Prompt shown, waiting for user choice...')
    
    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice
    console.log('[PWA] User choice:', outcome)
    
    // Clear the deferred prompt
    deferredPrompt = null
    
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt')
      return true
    } else {
      console.log('[PWA] User dismissed the install prompt')
      return false
    }
  } catch (error) {
    console.error('[PWA] Error showing install prompt:', error)
    console.error('[PWA] Error details:', error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false
  }
  // Skip in dev – no service worker, avoids dev-sw.js errors
  if (import.meta.env?.DEV) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      return false
    }

    await registration.update()
    return true
  } catch (error) {
    console.warn('[PWA] Update check failed:', error)
    return false
  }
}

/** Called from main.tsx with the updateSW function from vite-plugin-pwa (when registerType is 'prompt') */
let pwaUpdateHandler: ((reload?: boolean) => void) | null = null
export function setPwaUpdateHandler(fn: (reload?: boolean) => void) {
  pwaUpdateHandler = fn
}

/**
 * Apply the pending PWA update (skip waiting + reload).
 * Safe to call when user clicks "Install now" / "Update now".
 */
export function applyPwaUpdate(): void {
  if (pwaUpdateHandler) {
    pwaUpdateHandler(true)
  } else {
    forceUpdate()
  }
}

/**
 * Listen for "new version available" (fired when SW finds an update and we use prompt mode).
 * Use this to show "New update available – Install now" in the UI.
 */
export function onPwaUpdateAvailable(callback: () => void): () => void {
  const handler = () => callback()
  window.addEventListener('pwa-update-available', handler)
  return () => window.removeEventListener('pwa-update-available', handler)
}

/**
 * Register update listener (legacy: direct SW updatefound).
 * Prefer onPwaUpdateAvailable when using virtual:pwa-register with prompt.
 */
export function onUpdateAvailable(callback: () => void) {
  if (!isServiceWorkerSupported()) {
    return () => {}
  }

  const handleUpdate = () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      callback()
    })
  }

  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', handleUpdate)
  })

  return () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.removeEventListener('controllerchange', callback as EventListener)
    }
  }
}

/**
 * Force update by reloading the page
 */
export function forceUpdate() {
  window.location.reload()
}

/**
 * Check if app is running offline
 */
export function isOffline(): boolean {
  return !navigator.onLine
}

/**
 * Listen for online/offline status changes
 */
export function onOnlineStatusChange(callback: (isOnline: boolean) => void) {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

