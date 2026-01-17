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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [currentCompanyId, setCurrentCompanyId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userPermissions, setUserPermissions] = useState<{ useCustomPermissions: boolean; customPermissions: any[] } | null>(null)

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
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('hisabkitab_user')
        localStorage.removeItem('hisabkitab_company_id')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Verify login using user service
    const foundUser = await userService.verifyLogin(email, password)

    if (foundUser) {
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
                  setIsLoading(false)
                  // Block login - device limit exceeded
                  return false
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
      return true
    }

    setIsLoading(false)
    return false
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

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    
    const [module, action] = permission.split(':') as [PermissionModule, PermissionAction]
    
    // Check custom permissions first if enabled
    if (userPermissions && userPermissions.useCustomPermissions) {
      const modulePerm = userPermissions.customPermissions.find(p => p.module === module)
      if (modulePerm) {
        return modulePerm.actions.includes(action)
      }
      // If module not found in custom permissions, deny access
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
      isLoading,
      currentCompanyId,
      switchCompany,
      getCurrentCompanyId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

