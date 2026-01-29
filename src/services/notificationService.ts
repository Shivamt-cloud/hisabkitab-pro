import { Notification, NotificationType, NotificationPriority } from '../types/notification'
import { productService } from './productService'
import { paymentService } from './paymentService'
import { getAll, put, deleteById, STORES } from '../database/db'

const MAX_NOTIFICATIONS = 1000

export const notificationService = {
  // Create a new notification (companyId required for multi-tenant isolation)
  create: async (
    type: NotificationType,
    priority: NotificationPriority,
    title: string,
    message: string,
    options?: {
      module?: string
      entityType?: string
      entityId?: string | number
      entityName?: string
      actionUrl?: string
      userId?: string
      companyId?: number
    }
  ): Promise<Notification> => {
    const companyId = options?.companyId
    const notifications = companyId != null
      ? (await getAll<Notification>(STORES.NOTIFICATIONS)).filter(n => n.company_id === companyId)
      : await getAll<Notification>(STORES.NOTIFICATIONS)

    const newNotification: Notification = {
      id: Date.now(),
      type,
      priority,
      title,
      message,
      module: options?.module || 'system',
      entityType: options?.entityType,
      entityId: options?.entityId,
      entityName: options?.entityName,
      actionUrl: options?.actionUrl,
      userId: options?.userId,
      company_id: companyId,
      read: false,
      createdAt: new Date().toISOString(),
    }

    // Keep only the most recent notifications for this company
    const allNotifications = [newNotification, ...notifications]
    if (allNotifications.length > MAX_NOTIFICATIONS) {
      const toDelete = allNotifications.slice(MAX_NOTIFICATIONS)
      for (const notif of toDelete) {
        try {
          await deleteById(STORES.NOTIFICATIONS, notif.id)
        } catch (error) {
          // Ignore deletion errors
        }
      }
    }

    await put(STORES.NOTIFICATIONS, newNotification)
    return newNotification
  },

  // Get all notifications (companyId required to scope to current company; excludes legacy notifications without company_id)
  getAll: async (userId?: string, companyId?: number | null): Promise<Notification[]> => {
    let notifications = await getAll<Notification>(STORES.NOTIFICATIONS)

    if (companyId != null) {
      notifications = notifications.filter(n => n.company_id === companyId)
    }
    if (userId) {
      notifications = notifications.filter(n => !n.userId || n.userId === userId)
    }

    return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  // Get unread notifications count
  getUnreadCount: async (userId?: string, companyId?: number | null): Promise<number> => {
    const notifications = await notificationService.getAll(userId, companyId)
    return notifications.filter(n => !n.read).length
  },

  // Get unread notifications
  getUnread: async (userId?: string, companyId?: number | null): Promise<Notification[]> => {
    const notifications = await notificationService.getAll(userId, companyId)
    return notifications.filter(n => !n.read)
  },

  // Mark notification as read (only if it belongs to companyId when provided)
  markAsRead: async (id: number, companyId?: number | null): Promise<void> => {
    const all = await getAll<Notification>(STORES.NOTIFICATIONS)
    const notification = all.find(n => n.id === id)
    if (!notification || notification.read) return
    if (companyId != null && notification.company_id !== companyId) return
    notification.read = true
    notification.readAt = new Date().toISOString()
    await put(STORES.NOTIFICATIONS, notification)
  },

  // Mark all as read for the given user/company
  markAllAsRead: async (userId?: string, companyId?: number | null): Promise<void> => {
    const notifications = await notificationService.getAll(userId, companyId)
    const now = new Date().toISOString()
    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true
        notification.readAt = now
        await put(STORES.NOTIFICATIONS, notification)
      }
    }
  },

  // Delete notification (only if it belongs to companyId when provided)
  delete: async (id: number, companyId?: number | null): Promise<void> => {
    if (companyId != null) {
      const all = await getAll<Notification>(STORES.NOTIFICATIONS)
      const notification = all.find(n => n.id === id)
      if (!notification || notification.company_id !== companyId) return
    }
    await deleteById(STORES.NOTIFICATIONS, id)
  },

  // Delete all read notifications for the given user/company
  deleteRead: async (userId?: string, companyId?: number | null): Promise<void> => {
    const notifications = await notificationService.getAll(userId, companyId)
    for (const notification of notifications) {
      if (notification.read) {
        await deleteById(STORES.NOTIFICATIONS, notification.id)
      }
    }
  },

  // Generate stock alerts for a company only
  generateStockAlerts: async (companyId?: number | null): Promise<void> => {
    if (companyId == null) return
    const products = await productService.getAll(false, companyId)

    for (const product of products) {
      if (product.min_stock_level !== undefined) {
        if (product.stock_quantity === 0) {
          await notificationService.create(
            'out_of_stock',
            'high',
            'Out of Stock',
            `${product.name} is out of stock`,
            {
              module: 'stock',
              entityType: 'Product',
              entityId: product.id,
              entityName: product.name,
              actionUrl: `/products/${product.id}/edit`,
              companyId,
            }
          )
        } else if (product.stock_quantity <= product.min_stock_level) {
          await notificationService.create(
            'low_stock',
            'medium',
            'Low Stock Alert',
            `${product.name} is running low (${product.stock_quantity} ${product.unit} remaining, min: ${product.min_stock_level})`,
            {
              module: 'stock',
              entityType: 'Product',
              entityId: product.id,
              entityName: product.name,
              actionUrl: `/products/${product.id}/edit`,
              companyId,
            }
          )
        }
      }
    }
  },

  // Generate payment alerts for a company only
  generatePaymentAlerts: async (companyId?: number | null): Promise<void> => {
    if (companyId == null) return
    const outstandingPayments = await paymentService.getOutstandingPayments('sale', companyId)

    for (const payment of outstandingPayments) {
      if (payment.payment_status === 'overdue' && payment.days_overdue && payment.days_overdue > 0) {
        await notificationService.create(
          'payment_overdue',
          'urgent',
          'Overdue Payment',
          `${payment.customer_name || payment.supplier_name} has an overdue payment of ₹${payment.pending_amount} (${payment.days_overdue} days overdue)`,
          {
            module: 'payments',
            entityType: payment.type === 'sale' ? 'Sale' : 'Purchase',
            entityId: payment.payment_record_id,
            entityName: payment.reference_number,
            actionUrl: `/payments/outstanding`,
            companyId,
          }
        )
      } else if (payment.payment_status === 'pending') {
        await notificationService.create(
          'payment_pending',
          'medium',
          'Pending Payment',
          `${payment.customer_name || payment.supplier_name} has a pending payment of ₹${payment.pending_amount}`,
          {
            module: 'payments',
            entityType: payment.type === 'sale' ? 'Sale' : 'Purchase',
            entityId: payment.payment_record_id,
            entityName: payment.reference_number,
            actionUrl: `/payments/outstanding`,
            companyId,
          }
        )
      }
    }
  },

  // Get notifications by type
  getByType: async (type: NotificationType, userId?: string, companyId?: number | null): Promise<Notification[]> => {
    const notifications = await notificationService.getAll(userId, companyId)
    return notifications.filter(n => n.type === type)
  },

  // Get notifications by priority
  getByPriority: async (priority: NotificationPriority, userId?: string, companyId?: number | null): Promise<Notification[]> => {
    const notifications = await notificationService.getAll(userId, companyId)
    return notifications.filter(n => n.priority === priority)
  },

  // Get recent notifications (last N)
  getRecent: async (limit: number = 20, userId?: string, companyId?: number | null): Promise<Notification[]> => {
    const notifications = await notificationService.getAll(userId, companyId)
    return notifications.slice(0, limit)
  },
}
