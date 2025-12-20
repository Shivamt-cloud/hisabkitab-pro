export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'view'
  | 'print'

export type AuditModule =
  | 'sales'
  | 'purchases'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'users'
  | 'settings'
  | 'stock'
  | 'reports'
  | 'backup'
  | 'auth'

export interface AuditLog {
  id: number
  timestamp: string
  userId: string
  userName: string
  userEmail: string
  module: AuditModule
  action: AuditAction
  entityType: string // e.g., 'Product', 'Sale', 'Purchase'
  entityId: string | number
  entityName?: string // Human-readable name for the entity
  description: string // What was done
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any> // Additional context
  company_id?: number // Company this audit log belongs to
}

export type AuditLogFilter = {
  userId?: string
  module?: AuditModule
  action?: AuditAction
  entityType?: string
  startDate?: string
  endDate?: string
  searchQuery?: string
}

