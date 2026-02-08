import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthContextType, RolePermissions } from '../types/auth'
import { PermissionModule, PermissionAction } from '../types/permissions'
import { userService } from '../services/userService'
import { auditService } from '../services/auditService'
import { permissionService } from '../services/permissionService'
import { companyService } from '../services/companyService'
import { cloudDeviceService } from '../services/cloudDeviceService'
import { getTierPricing } from '../utils/tierPricing'
import { getDeviceId, getDeviceType, getDeviceName } from '../utils/deviceId'
import { hasPlanFeature as checkPlanFeature, getEffectiveTier } from '../utils/planFeatures'
import type { PlanFeature } from '../utils/planFeatures'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<'basic' | 'standard' | 'premium' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userPermissions, setUserPermissions] = useState<{ useCustomPermissions: boolean; customPermissions: any[] } | null>(null)

  async function loadSubscriptionTier(u: User | null, companyId: number | null) {
    if (!u) {
      setSubscriptionTier(null)
      return
    }
    if (u.role === 'admin') {
      setSubscriptionTier('premium')
      return
    }
    const cid = companyId ?? u.company_id ?? null
    if (!cid) {
      setSubscriptionTier('basic')
      return
    }
    try {
      const company = await companyService.getById(cid)
      const tier = (company?.subscription_tier || 'basic') as 'basic' | 'standard' | 'premium'
      const trialEnd = company?.subscription_end_date || company?.valid_to || null
      const effective = getEffectiveTier(tier, !!company?.is_free_trial, trialEnd)
      setSubscriptionTier(effective)
    } catch {
      setSubscriptionTier('basic')
    }
  }

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('hisabkitab_user')
    const savedCompanyId = localStorage.getItem('hisabkitab_company_id')
    
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        
        // Set company ID if user is not admin
        if (parsedUser.role !== 'admin' && parsedUser.company_id) {
          setCurrentCompanyId(parsedUser.company_id)
        } else if (savedCompanyId) {
          // Admin can switch companies
          setCurrentCompanyId(parseInt(savedCompanyId))
        }
        
        // Load user's custom permissions
        permissionService.getUserPermissions(parsedUser.id)
          .then(perms => {
            if (perms && perms.useCustomPermissions) {
              setUserPermissions({
                useCustomPermissions: true,
                customPermissions: perms.customPermissions || []
              })
            } else {
              setUserPermissions(null)
            }
          })
          .catch(error => {
            console.error('Error loading user permissions:', error)
            setUserPermissions(null)
          })
        const companyIdForTier = parsedUser.role === 'admin' ? (savedCompanyId ? parseInt(savedCompanyId) : null) : parsedUser.company_id
        loadSubscriptionTier(parsedUser, companyIdForTier)
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('hisabkitab_user')
        localStorage.removeItem('hisabkitab_company_id')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // First, check if user exists (before password check)
    let userExists: { password?: string } | undefined
    try {
      userExists = await userService.getByEmail(email)
    } catch (error) {
      console.error('Error checking if user exists:', error)
      setIsLoading(false)
      return { success: false, error: 'Unable to verify user. Please check your connection and try again.' }
    }
    
    // If user doesn't exist, return early with clear message
    if (!userExists) {
      setIsLoading(false)
      // Check if there's a typo by listing some similar emails
      try {
        const allUsers = await userService.getAll()
        const similarEmails = allUsers
          .filter(u => u.email.toLowerCase().includes(email.split('@')[0]?.toLowerCase() || ''))
          .slice(0, 3)
          .map(u => u.email)
        const suggestion = similarEmails.length > 0 
          ? ` Did you mean: ${similarEmails.join(', ')}?`
          : ''
        return { success: false, error: `User not found with email "${email}".${suggestion} Please check your email address.` }
      } catch {
        return { success: false, error: `User not found with email "${email}". Please check your email address.` }
      }
    }
    
    // User exists, now check password
    if (!userExists.password) {
      setIsLoading(false)
      return { success: false, error: 'Password not set for this user. Please contact administrator to set a password.' }
    }
    
    if (userExists.password !== password) {
      setIsLoading(false)
      return { success: false, error: 'Invalid password. Please check your password and try again.' }
    }
    
    // Password is correct, verify login
    const foundUser = await userService.verifyLogin(email, password)
    
    if (!foundUser) {
      // This shouldn't happen if password matched, but handle it anyway
      setIsLoading(false)
      return { success: false, error: 'Login verification failed. Please try again.' }
    }

    if (foundUser) {
      // Check subscription expiry FIRST (before device limit check)
      if (foundUser.role !== 'admin' && foundUser.company_id) {
        try {
          const company = await companyService.getById(foundUser.company_id)
          if (company) {
            // Check if subscription is expired
            const endDate = company.subscription_end_date || company.valid_to
            if (endDate) {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const expiryDate = new Date(endDate)
              expiryDate.setHours(0, 0, 0, 0)
              
              if (expiryDate < today) {
                const daysExpired = Math.ceil((today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24))
                setIsLoading(false)
                return { 
                  success: false, 
                  error: `SUBSCRIPTION_EXPIRED:${daysExpired}:${company.subscription_tier || 'basic'}` 
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking subscription expiry:', error)
          // Continue with login if check fails (fail open)
        }
      }
      
      // Device registration and limit checking (only for non-admin users with company)
      if (foundUser.role !== 'admin' && foundUser.company_id) {
        try {
          // Get company to check subscription tier
          const company = await companyService.getById(foundUser.company_id)
          if (company && company.subscription_tier) {
            // Get device limit for the subscription tier
            const tierPricing = getTierPricing(company.subscription_tier)
            const deviceLimit = tierPricing.deviceLimit
            
            // Get current device ID
            const deviceId = getDeviceId()
            
            // Check if device is already registered
            const isDeviceRegistered = await cloudDeviceService.isDeviceRegistered(foundUser.id, deviceId)
            
            if (!isDeviceRegistered) {
              // Device is not registered, check if we can register it
              if (deviceLimit !== 'unlimited') {
                // Count current active devices for the company
                const currentDeviceCount = await cloudDeviceService.getActiveDeviceCountForCompany(foundUser.company_id)
                
                // Check if device limit is reached
                if (currentDeviceCount >= deviceLimit) {
                  console.error(`Device limit reached for company ${foundUser.company_id}. Current: ${currentDeviceCount}, Limit: ${deviceLimit}`)
                  
                  // Get list of registered devices to show in error message
                  try {
                    const companyDevices = await cloudDeviceService.getCompanyDevices(foundUser.company_id)
                    const deviceList = companyDevices
                      .slice(0, 3) // Show up to 3 devices
                      .map(d => d.device_name || d.device_type || 'Unknown Device')
                      .join(', ')
                    
                    setIsLoading(false)
                    return { 
                      success: false, 
                      error: `Device limit reached. Your plan allows ${tierPricing.deviceDisplayLabel}, but ${currentDeviceCount} device(s) are already registered.${deviceList ? ` Registered devices: ${deviceList}${companyDevices.length > 3 ? '...' : ''}` : ''} Please remove an old device from System Settings or upgrade your plan.` 
                    }
                  } catch (error) {
                    console.error('Error fetching device list:', error)
                    setIsLoading(false)
                    return { 
                      success: false, 
                      error: `Device limit reached. Your plan allows ${tierPricing.deviceDisplayLabel}, but ${currentDeviceCount} device(s) are already registered. Please remove a device from System Settings or upgrade your plan.` 
                    }
                  }
                }
              }
              
              // Register the device
              const deviceType = getDeviceType()
              const deviceName = getDeviceName()
              await cloudDeviceService.registerDevice(foundUser.id, deviceId, {
                device_name: deviceName,
                device_type: deviceType,
                browser_info: navigator.userAgent,
                user_agent: navigator.userAgent,
              })
              console.log(`Device registered for user ${foundUser.id}: ${deviceName}`)
            } else {
              // Device is already registered, update last accessed timestamp
              await cloudDeviceService.updateLastAccessed(foundUser.id, deviceId)
            }
          }
        } catch (error) {
          console.error('Error during device registration:', error)
          // On error, allow login to proceed (fail open for now)
          // In production, you might want to be more strict
        }
      }
      
      setUser(foundUser)
      localStorage.setItem('hisabkitab_user', JSON.stringify(foundUser))
      await loadSubscriptionTier(foundUser, foundUser.role !== 'admin' ? foundUser.company_id ?? null : currentCompanyId)
      
      // Set company ID for non-admin users
      if (foundUser.role !== 'admin' && foundUser.company_id) {
        setCurrentCompanyId(foundUser.company_id)
        localStorage.setItem('hisabkitab_company_id', foundUser.company_id.toString())
      }
      
      // Load user's custom permissions
      try {
        const perms = await permissionService.getUserPermissions(foundUser.id)
        if (perms && perms.useCustomPermissions) {
          setUserPermissions({
            useCustomPermissions: true,
            customPermissions: perms.customPermissions || []
          })
        } else {
          setUserPermissions(null)
        }
      } catch (error) {
        console.error('Error loading user permissions:', error)
        setUserPermissions(null)
      }
      
      // Log login (fire and forget)
      auditService.log(
        foundUser.id,
        foundUser.name,
        email,
        'auth',
        'login',
        'User',
        foundUser.id,
        `User ${foundUser.name} logged in`,
        {
          company_id: foundUser.company_id || (foundUser.role !== 'admin' ? foundUser.company_id : undefined)
        }
      )
      
      setIsLoading(false)
      return { success: true }
    }

    setIsLoading(false)
    return { success: false, error: 'Login failed. Please try again.' }
  }

  const logout = async () => {
    if (user) {
      // Log logout (fire and forget)
      const companyId = user.company_id || (user.role !== 'admin' ? user.company_id : currentCompanyId || undefined)
      auditService.log(
        user.id,
        user.name,
        user.email,
        'auth',
        'logout',
        'User',
        user.id,
        `User ${user.name} logged out`,
        {
          company_id: companyId
        }
      ).catch(err => console.error('Error logging logout:', err))
    }
    setUser(null)
    setCurrentCompanyId(null)
    setUserPermissions(null)
    localStorage.removeItem('hisabkitab_user')
    localStorage.removeItem('hisabkitab_company_id')
  }

  // Switch company (admin only)
  const switchCompany = (companyId: number | null) => {
    if (user?.role === 'admin') {
      setCurrentCompanyId(companyId)
      if (companyId) {
        localStorage.setItem('hisabkitab_company_id', companyId.toString())
      } else {
        localStorage.removeItem('hisabkitab_company_id')
      }
    }
  }

  // Get current company ID (for non-admin, use their assigned company; for admin, use selected company)
  const getCurrentCompanyId = (): number | null => {
    if (user?.role === 'admin') {
      return currentCompanyId
    }
    return user?.company_id || null
  }

  const hasPlanFeature = (feature: PlanFeature): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true
    const tier = subscriptionTier || 'basic'
    return checkPlanFeature(tier, feature, false)
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    
    const [module, action] = permission.split(':') as [PermissionModule, PermissionAction]
    
    // Check custom permissions first if enabled
    if (userPermissions && userPermissions.useCustomPermissions) {
      const modulePerm = userPermissions.customPermissions.find(p => p.module === module)
      if (modulePerm) {
        return modulePerm.actions.includes(action)
      }
      // If module not in custom list, fall back to role (so admin/manager keep role grants like business_overview)
      const rolePerms = RolePermissions[user.role]
      const resourcePerm = rolePerms.find(p => p.resource === module)
      if (resourcePerm) return resourcePerm.actions.includes(action)
      return false
    }
    
    // Otherwise, use role-based permissions
    const rolePerms = RolePermissions[user.role]
    const resourcePerm = rolePerms.find(p => p.resource === module)
    if (!resourcePerm) return false
    return resourcePerm.actions.includes(action)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      hasPermission,
      hasPlanFeature,
      subscriptionTier,
      isLoading,
      currentCompanyId,
      switchCompany,
      getCurrentCompanyId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

const AUTH_NOT_AVAILABLE_ERROR = 'AUTH_NOT_AVAILABLE'

const FALLBACK_AUTH: AuthContextType = {
  user: null,
  isLoading: false,
  login: async () => ({ success: false, error: AUTH_NOT_AVAILABLE_ERROR }),
  logout: () => {},
  hasPermission: () => false,
  hasPlanFeature: () => false,
  subscriptionTier: null,
  currentCompanyId: null,
  switchCompany: () => {},
  getCurrentCompanyId: () => null,
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    if (import.meta.env.DEV) {
      console.warn(
        'useAuth was called outside AuthProvider. Ensure the component is rendered inside <AuthProvider>. Using fallback (unauthenticated).',
        new Error().stack
      )
    }
    return FALLBACK_AUTH
  }
  return context
}

/** Use when checking login error so UI can show a reload prompt instead of a generic message. */
export function isAuthNotAvailableError(error: string | undefined): boolean {
  return error === AUTH_NOT_AVAILABLE_ERROR
}

