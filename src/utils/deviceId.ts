// Device ID Utility - Generates and manages unique device identifiers

/**
 * Generate a unique device ID using browser fingerprint + UUID
 * This ID is used to track devices for access restriction
 */
export function generateDeviceId(): string {
  // Try to get existing device ID from localStorage
  const existingId = localStorage.getItem('device_id')
  if (existingId) {
    return existingId
  }

  // Generate a new device ID
  const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  
  // Store in localStorage for persistence
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
