export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer'

export interface User {
  id: string
  name: string
  email: string // For login (e.g., cs01@hisabkitab.com)
  user_code?: string // For identification (e.g., cs01@COMP002)
  role: UserRole
  avatar?: string
  company_id?: number // Company this user belongs to (undefined for admin means all companies)
}

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  hasPermission: (permission: string) => boolean
  isLoading: boolean
  currentCompanyId: number | null
  switchCompany: (companyId: number | null) => void
  getCurrentCompanyId: () => number | null
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
    { resource: 'barcode_label_settings', actions: ['read', 'update'] },
    { resource: 'receipt_printer_settings', actions: ['read', 'update'] },
    { resource: 'business_overview', actions: ['read', 'export'] }, // Admin: employees, expenses, sales, cost, P&L
    { resource: 'expenses', actions: ['create', 'read', 'update', 'delete'] },
  ],
  manager: [
    { resource: 'sales', actions: ['create', 'read', 'update'] },
    { resource: 'purchases', actions: ['create', 'read', 'update'] },
    { resource: 'products', actions: ['create', 'read', 'update'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] }, // Allow managers to fully manage sales persons, commissions, and assignments
    { resource: 'settings', actions: ['read'] }, // Full system settings only for admin; use Custom Permissions for Barcode Label / Receipt Printer
    { resource: 'business_overview', actions: ['read', 'export'] }, // Manager: employees, expenses, sales, cost, P&L
    { resource: 'expenses', actions: ['create', 'read', 'update', 'delete'] }, // Managers can manage expenses
  ],
  staff: [
    { resource: 'sales', actions: ['create', 'read'] },
    { resource: 'purchases', actions: ['create', 'read'] },
    { resource: 'products', actions: ['read', 'update'] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'expenses', actions: ['create', 'read'] }, // Staff can create and read expenses
  ],
  viewer: [
    { resource: 'sales', actions: ['read'] },
    { resource: 'purchases', actions: ['read'] },
    { resource: 'products', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'expenses', actions: ['read'] }, // Viewers can read expenses
  ],
}

