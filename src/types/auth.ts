export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: string) => boolean
  isLoading: boolean
}

export interface Permission {
  resource: string
  actions: string[]
}

export const RolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    { resource: 'sales', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'purchases', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'settings', actions: ['read', 'update'] },
  ],
  manager: [
    { resource: 'sales', actions: ['create', 'read', 'update'] },
    { resource: 'purchases', actions: ['create', 'read', 'update'] },
    { resource: 'products', actions: ['create', 'read', 'update'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'settings', actions: ['read'] },
  ],
  staff: [
    { resource: 'sales', actions: ['create', 'read'] },
    { resource: 'purchases', actions: ['create', 'read'] },
    { resource: 'products', actions: ['read', 'update'] },
    { resource: 'reports', actions: ['read'] },
  ],
  viewer: [
    { resource: 'sales', actions: ['read'] },
    { resource: 'purchases', actions: ['read'] },
    { resource: 'products', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
  ],
}

