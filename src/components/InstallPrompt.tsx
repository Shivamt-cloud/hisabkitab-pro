import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { isInstallPromptAvailable, showInstallPrompt, isAppInstalled, setupInstallPrompt } from '../utils/pwa'

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    console.log('[InstallPrompt] Component mounted, checking install status...')
    
    // Check if already installed
    const installed = isAppInstalled()
    setIsInstalled(installed)
    console.log('[InstallPrompt] Is app installed?', installed)

    // Setup install prompt listener
    setupInstallPrompt()
    console.log('[InstallPrompt] Setup install prompt listener')

    // Listen for installable event
    const handleInstallable = () => {
      console.log('[InstallPrompt] Installable event received!')
      if (!isAppInstalled() && !dismissed) {
        console.log('[InstallPrompt] Showing prompt')
        setShowPrompt(true)
      }
    }

    window.addEventListener('pwa-installable', handleInstallable)

    // Check if install prompt is available immediately
    const checkPrompt = () => {
      const available = isInstallPromptAvailable()
      console.log('[InstallPrompt] Is prompt available?', available)
      if (available && !isAppInstalled() && !dismissed) {
        console.log('[InstallPrompt] Prompt available, showing...')
        setShowPrompt(true)
      }
    }

    // Check immediately
    checkPrompt()

    // Also check after delays (browser might need time)
    const timeoutId1 = setTimeout(checkPrompt, 1000)
    const timeoutId2 = setTimeout(checkPrompt, 3000)
    const timeoutId3 = setTimeout(checkPrompt, 5000)

    // Check if user previously dismissed
    const dismissedState = localStorage.getItem('pwa-install-dismissed')
    if (dismissedState === 'true') {
      console.log('[InstallPrompt] User previously dismissed, not showing')
      setDismissed(true)
      setShowPrompt(false)
    } else {
      console.log('[InstallPrompt] Not dismissed, will show when available')
      
      // For testing: Show prompt after 5 seconds even if event hasn't fired
      // This allows testing the UI even if browser hasn't fired the event yet
      const testTimeout = setTimeout(() => {
        if (!isAppInstalled() && !dismissed && !showPrompt) {
          console.log('[InstallPrompt] TEST MODE: Showing prompt after delay (browser event may not have fired yet)')
          // Only show if service worker is registered (PWA is working)
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              if (regs.length > 0) {
                console.log('[InstallPrompt] Service worker registered, showing test prompt')
                setShowPrompt(true)
              } else {
                console.log('[InstallPrompt] Service worker not registered yet, waiting...')
              }
            })
          }
        }
      }, 5000)
      
      return () => {
        window.removeEventListener('pwa-installable', handleInstallable)
        clearTimeout(timeoutId1)
        clearTimeout(timeoutId2)
        clearTimeout(timeoutId3)
        clearTimeout(testTimeout)
      }
    }

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable)
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      clearTimeout(timeoutId3)
    }
  }, [dismissed, showPrompt])

  const handleInstall = async () => {
    console.log('[InstallPrompt] Install button clicked')
    
    // Check if we're on Mac
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    console.log('[InstallPrompt] Is Mac?', isMac)
    
    // Check browser - Safari detection
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent)
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isEdge = /Edg/.test(navigator.userAgent)
    console.log('[InstallPrompt] Browser:', { isSafari, isChrome, isEdge, userAgent: navigator.userAgent })
    
    // Safari doesn't support beforeinstallprompt event, so show instructions immediately
    if (isSafari) {
      console.log('[InstallPrompt] Safari detected - showing manual instructions')
      const useChrome = confirm(
        '📱 Safari on Mac - Limited PWA Support\n\n' +
        'Safari doesn\'t support automatic PWA installation.\n\n' +
        'Options:\n' +
        '1. Use Chrome/Edge for full PWA support (recommended)\n' +
        '2. Add to Dock in Safari (limited features)\n\n' +
        'Click OK to see Chrome/Edge instructions, or Cancel for Safari instructions.'
      )
      
      if (useChrome) {
        alert(
          '🚀 Use Chrome or Edge for Full PWA Support\n\n' +
          'Steps:\n' +
          '1. Download Chrome: https://www.google.com/chrome/\n' +
          '   OR Edge: https://www.microsoft.com/edge\n' +
          '2. Open this app in Chrome/Edge\n' +
          '3. Look for install icon (➕) in address bar\n' +
          '4. Click to install\n\n' +
          'Benefits:\n' +
          '✅ Full PWA features\n' +
          '✅ Offline support\n' +
          '✅ Auto-updates\n' +
          '✅ Standalone window\n' +
          '✅ Appears in Applications folder'
        )
      } else {
        alert(
          '📱 Safari Installation (Limited)\n\n' +
          'To add to Dock:\n' +
          '1. Click "File" menu → "Add to Dock"\n' +
          'OR\n' +
          '2. Drag the URL from address bar to Dock\n\n' +
          'Note: This won\'t give you full PWA features.\n' +
          'For best experience, use Chrome or Edge.'
        )
      }
      return
    }
    
    // For Chrome/Edge, try to show install prompt
    const installed = await showInstallPrompt()
    
    if (installed) {
      console.log('[InstallPrompt] Installation successful')
      setShowPrompt(false)
      setIsInstalled(true)
    } else {
      console.log('[InstallPrompt] Installation cancelled or failed')
      
      // Show Mac-specific instructions for Chrome/Edge
      if (isMac && (isChrome || isEdge)) {
        alert(
          '📱 Install on Mac (Chrome/Edge)\n\n' +
          'If the install dialog didn\'t appear:\n\n' +
          '1. Look for install icon (➕) in the address bar\n' +
          '2. Or go to: Menu (⋮) → "Install HisabKitab-Pro"\n' +
          '3. Or: View → "Install HisabKitab-Pro"\n\n' +
          'The app will appear in your Applications folder!'
        )
      } else if (!isInstallPromptAvailable()) {
        alert(
          'Install prompt not available yet.\n\n' +
          'The browser needs to evaluate the app first.\n\n' +
          'Try:\n' +
          '1. Refresh the page\n' +
          '2. Visit the page a few times\n' +
          '3. Check browser address bar for install icon\n\n' +
          'Or use browser menu: Chrome/Edge → Menu → "Install HisabKitab-Pro"'
        )
      }
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Debug logging
  useEffect(() => {
    console.log('[InstallPrompt] Render state:', {
      isInstalled,
      dismissed,
      showPrompt,
      installAvailable: isInstallPromptAvailable()
    })
  }, [isInstalled, dismissed, showPrompt])

  // Don't show if already installed
  if (isInstalled) {
    console.log('[InstallPrompt] Not showing: app already installed')
    return null
  }
  
  // If dismissed but prompt is available, allow showing again (user might want to install)
  // Only hide if dismissed AND prompt is not available
  if (dismissed && !isInstallPromptAvailable() && !showPrompt) {
    console.log('[InstallPrompt] Not showing: user dismissed and prompt not available')
    return null
  }

  console.log('[InstallPrompt] Rendering install prompt!')

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Install HisabKitab-Pro
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Install this app on your device for a better experience. Works offline and loads faster!
            </p>
            {!isInstallPromptAvailable() && (
              <div className="text-xs text-amber-600 mb-2 space-y-1">
                <p className="italic">
                  💡 Install option not available yet. Try these:
                </p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Look for <strong>➕ icon</strong> in address bar</li>
                  <li>Or: <strong>Menu (⋮) → Install HisabKitab-Pro</strong></li>
                  <li>Wait a few minutes and refresh</li>
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

