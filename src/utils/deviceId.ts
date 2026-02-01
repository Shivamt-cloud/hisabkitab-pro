// Device ID Utility - Generates and manages unique device identifiers

/**
 * Simple string hash (djb2) for fingerprint - deterministic, no crypto needed
 */
function hashString(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i)
    h = h & 0x7fffffff
  }
  return Math.abs(h).toString(36)
}

/**
 * Build a stable browser/device fingerprint so the same physical device
 * gets the same ID even after clearing localStorage (e.g. same Mac Safari = 1 device)
 */
function getBrowserFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    (navigator as any).languages ? (navigator as any).languages.join(',') : '',
    navigator.platform,
    String(window.screen.width),
    String(window.screen.height),
    String(window.screen.colorDepth),
    String(window.devicePixelRatio ?? 1),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String((navigator as any).hardwareConcurrency ?? 0),
    String((navigator as any).deviceMemory ?? 0),
    String(window.screen.availWidth),
    String(window.screen.availHeight),
  ]
  return hashString(parts.join('|'))
}

/**
 * Generate a unique device ID. Uses localStorage when present; when empty,
 * uses a fingerprint-based ID so the same browser/device gets the same ID
 * across sessions (avoids counting one physical device as multiple devices).
 */
export function generateDeviceId(): string {
  // Prefer existing device ID from localStorage (persists across sessions)
  const existingId = localStorage.getItem('device_id')
  if (existingId) {
    return existingId
  }

  // No stored ID: use fingerprint so same device = same ID (e.g. same Mac Safari
  // after clearing storage still counts as 1 device, not a new one)
  const fingerprint = getBrowserFingerprint()
  const deviceId = `device_fp_${fingerprint}`

  // Store for next time so we don't recompute
  localStorage.setItem('device_id', deviceId)

  // Also store device info
  const deviceInfo = {
    id: deviceId,
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    created: new Date().toISOString(),
  }
  localStorage.setItem('device_info', JSON.stringify(deviceInfo))

  return deviceId
}

/**
 * Get the current device ID (generate if doesn't exist)
 */
export function getDeviceId(): string {
  return generateDeviceId()
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  id: string
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
  platform: string
  created: string
} | null {
  const infoStr = localStorage.getItem('device_info')
  if (!infoStr) {
    // Generate device ID to create info
    generateDeviceId()
    const newInfoStr = localStorage.getItem('device_info')
    return newInfoStr ? JSON.parse(newInfoStr) : null
  }
  return JSON.parse(infoStr)
}

/**
 * Get device type based on user agent and screen size
 */
export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const userAgent = navigator.userAgent.toLowerCase()
  const width = window.screen.width
  const height = window.screen.height
  
  // Check for mobile
  if (/mobile|android|iphone|ipod|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    // Tablets are usually wider
    if (width >= 768 || /tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet'
    }
    return 'mobile'
  }
  
  // Check for tablet
  if (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(userAgent)) {
    return 'tablet'
  }
  
  // Default to desktop
  if (width >= 1024) {
    return 'desktop'
  }
  
  return 'unknown'
}

/**
 * Get device name (user-friendly)
 */
export function getDeviceName(): string {
  const info = getDeviceInfo()
  if (!info) return 'Unknown Device'
  
  const type = getDeviceType()
  const platform = info.platform
  
  // Try to extract device name from user agent
  const userAgent = info.userAgent.toLowerCase()
  
  if (userAgent.includes('chrome')) {
    return `${type === 'mobile' ? 'Mobile' : type === 'tablet' ? 'Tablet' : 'Desktop'} (Chrome)`
  } else if (userAgent.includes('firefox')) {
    return `${type === 'mobile' ? 'Mobile' : type === 'tablet' ? 'Tablet' : 'Desktop'} (Firefox)`
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return `${type === 'mobile' ? 'Mobile' : type === 'tablet' ? 'Tablet' : 'Desktop'} (Safari)`
  } else if (userAgent.includes('edge')) {
    return `${type === 'mobile' ? 'Mobile' : type === 'tablet' ? 'Tablet' : 'Desktop'} (Edge)`
  }
  
  return `${type === 'mobile' ? 'Mobile' : type === 'tablet' ? 'Tablet' : 'Desktop'} Device`
}

/**
 * Clear device ID (for testing/logout all devices)
 */
export function clearDeviceId(): void {
  localStorage.removeItem('device_id')
  localStorage.removeItem('device_info')
}
