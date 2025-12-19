import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserRole, AuthContextType, RolePermissions } from '../types/auth'
import { PermissionModule, PermissionAction } from '../types/permissions'
import { userService } from '../services/userService'
import { permissionService } from '../services/permissionService'
import { auditService } from '../services/auditService'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('hisabkitab_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('hisabkitab_user')
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
      setUser(foundUser)
      localStorage.setItem('hisabkitab_user', JSON.stringify(foundUser))
      
      // Log login (fire and forget)
      auditService.log(
        foundUser.id,
        foundUser.name,
        email,
        'auth',
        'login',
        'User',
        foundUser.id,
        `User ${foundUser.name} logged in`
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
      auditService.log(
        user.id,
        user.name,
        user.email,
        'auth',
        'logout',
        'User',
        user.id,
        `User ${user.name} logged out`
      ).catch(err => console.error('Error logging logout:', err))
    }
    setUser(null)
    localStorage.removeItem('hisabkitab_user')
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    
    // Quick check using role permissions (sync version for UI)
    // For custom permissions, use permissionService.hasPermission directly in components
    const [module, action] = permission.split(':') as [PermissionModule, PermissionAction]
    const rolePerms = RolePermissions[user.role]
    const resourcePerm = rolePerms.find(p => p.resource === module)
    if (!resourcePerm) return false
    return resourcePerm.actions.includes(action)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, isLoading }}>
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

