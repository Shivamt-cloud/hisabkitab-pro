import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Shield, ChevronDown, Download } from 'lucide-react'
import { isInstallPromptAvailable, showInstallPrompt, isAppInstalled } from '../utils/pwa'

const MENU_WIDTH = 256
const MENU_GAP = 8

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left: number; openUp: boolean }>({ left: 0, openUp: false })

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    // On mobile prefer opening upward so menu is visible without scrolling; same when not enough space below
    const openUp = isMobile || (spaceBelow < 320 && spaceAbove > spaceBelow)
    const top = rect.bottom + MENU_GAP
    const bottom = window.innerHeight - rect.top + MENU_GAP
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, rect.left))
    setPosition({
      top: openUp ? undefined : top,
      bottom: openUp ? bottom : undefined,
      left,
      openUp,
    })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        setIsOpen(false)
      }
    }
    const handleScroll = () => setIsOpen(false)
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  const [isAppInstalledState, setIsAppInstalledState] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    setIsAppInstalledState(isAppInstalled())
    setCanInstall(isInstallPromptAvailable())
    
    // Check periodically
    const interval = setInterval(() => {
      setIsAppInstalledState(isAppInstalled())
      setCanInstall(isInstallPromptAvailable())
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleInstallApp = async () => {
    if (canInstall) {
      const installed = await showInstallPrompt()
      if (installed) {
        setIsAppInstalledState(true)
        setCanInstall(false)
      }
    } else {
      // Show instructions
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent)
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
      const isEdge = /Edg/.test(navigator.userAgent)
      
      if (isSafari) {
        alert(
          '📱 Safari Installation\n\n' +
          'To add to Dock:\n' +
          '1. Click "File" menu → "Add to Dock"\n' +
          'OR\n' +
          '2. Drag the URL from address bar to Dock\n\n' +
          'For full PWA features, use Chrome or Edge.'
        )
      } else if (isMac && (isChrome || isEdge)) {
        alert(
          '📱 Install on Mac (Chrome/Edge)\n\n' +
          'Option 1: Look for install icon (➕) in the address bar\n' +
          'Option 2: Go to Menu (⋮) → "Install HisabKitab-Pro"\n' +
          'Option 3: View → "Install HisabKitab-Pro"\n\n' +
          'The app will appear in your Applications folder!'
        )
      } else {
        alert(
          '📱 Install App\n\n' +
          'Option 1: Look for install icon (➕) in the address bar\n' +
          'Option 2: Go to Menu (⋮) → "Install HisabKitab-Pro"\n' +
          'Option 3: Wait a few minutes and the install prompt will appear\n\n' +
          'To reset install prompt, open Console (F12) and run:\n' +
          'localStorage.removeItem("pwa-install-dismissed"); location.reload()'
        )
      }
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'manager':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'staff':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getRoleDisplayName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  if (!user) return null

  const hasPosition = position.top !== undefined || position.bottom !== undefined
  const dropdownContent = isOpen && hasPosition && (
    <div
      ref={menuRef}
      className="fixed w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] max-h-[min(320px,calc(100vh-80px))] overflow-x-hidden overflow-y-auto"
      style={{
        left: position.left,
        right: 'auto',
        width: MENU_WIDTH,
        ...(position.openUp ? { bottom: position.bottom } : { top: position.top }),
      }}
    >
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
            <Shield className="w-3 h-3" />
            {getRoleDisplayName(user.role)}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-1">
        {!isAppInstalledState && (
          <button
            onClick={handleInstallApp}
            className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            <span>{canInstall ? 'Install App' : 'Install App (See Instructions)'}</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 hover:bg-white transition-all shadow-md hover:shadow-lg border border-gray-200/50"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left hidden md:block">
          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{getRoleDisplayName(user.role)}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  )
}

