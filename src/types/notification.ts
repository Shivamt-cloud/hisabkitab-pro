export type NotificationType = 
  | 'low_stock'
  | 'out_of_stock'
  | 'payment_overdue'
  | 'payment_pending'
  | 'low_stock_threshold'
  | 'purchase_order'
  | 'sale_completed'
  | 'payment_received'
  | 'system_alert'
  | 'reminder'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id: number
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  module: string // e.g., 'stock', 'payments', 'sales'
  entityType?: string // e.g., 'Product', 'Sale', 'Purchase'
  entityId?: string | number
  entityName?: string
  actionUrl?: string // URL to navigate when clicked
  read: boolean
  createdAt: string
  readAt?: string
  userId?: string // If notification is user-specific
}

export interface NotificationPreferences {
  userId: string
  emailNotifications: boolean
  lowStockAlerts: boolean
  paymentAlerts: boolean
  systemAlerts: boolean
  dailySummary: boolean
}

