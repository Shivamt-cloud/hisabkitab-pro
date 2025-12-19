import { Notification, NotificationType, NotificationPriority } from '../types/notification'
import { productService } from './productService'
import { paymentService } from './paymentService'
import { getAll, put, deleteById, STORES } from '../database/db'

const MAX_NOTIFICATIONS = 1000

export const notificationService = {
  // Create a new notification
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
    }
  ): Promise<Notification> => {
    const notifications = await notificationService.getAll()
    
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
      read: false,
      createdAt: new Date().toISOString(),
    }

    // Keep only the most recent notifications
    const allNotifications = [newNotification, ...notifications]
    if (allNotifications.length > MAX_NOTIFICATIONS) {
      // Delete oldest notifications
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

  // Get all notifications
  getAll: async (userId?: string): Promise<Notification[]> => {
    let notifications = await getAll<Notification>(STORES.NOTIFICATIONS)
    
    if (userId) {
      // Filter user-specific notifications or global notifications
      notifications = notifications.filter(n => !n.userId || n.userId === userId)
    }
    
    return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  // Get unread notifications count
  getUnreadCount: async (userId?: string): Promise<number> => {
    const notifications = await notificationService.getAll(userId)
    return notifications.filter(n => !n.read).length
  },

  // Get unread notifications
  getUnread: async (userId?: string): Promise<Notification[]> => {
    const notifications = await notificationService.getAll(userId)
    return notifications.filter(n => !n.read)
  },

  // Mark notification as read
  markAsRead: async (id: number): Promise<void> => {
    const notifications = await notificationService.getAll()
    const notification = notifications.find(n => n.id === id)
    if (notification && !notification.read) {
      notification.read = true
      notification.readAt = new Date().toISOString()
      await put(STORES.NOTIFICATIONS, notification)
    }
  },

  // Mark all as read
  markAllAsRead: async (userId?: string): Promise<void> => {
    const notifications = await notificationService.getAll()
    const now = new Date().toISOString()
    
    for (const notification of notifications) {
      if (!notification.read && (!userId || !notification.userId || notification.userId === userId)) {
        notification.read = true
        notification.readAt = now
        await put(STORES.NOTIFICATIONS, notification)
      }
    }
  },

  // Delete notification
  delete: async (id: number): Promise<void> => {
    await deleteById(STORES.NOTIFICATIONS, id)
  },

  // Delete all read notifications
  deleteRead: async (userId?: string): Promise<void> => {
    const notifications = await notificationService.getAll()
    
    for (const notification of notifications) {
      if (notification.read && (!userId || !notification.userId || notification.userId === userId)) {
        await deleteById(STORES.NOTIFICATIONS, notification.id)
      }
    }
  },

  // Generate stock alerts
  generateStockAlerts: async (): Promise<void> => {
    const products = await productService.getAll(false)
    
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
            }
          )
        }
      }
    }
  },

  // Generate payment alerts
  generatePaymentAlerts: async (): Promise<void> => {
    const outstandingPayments = await paymentService.getOutstandingPayments('sale')

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
          }
        )
      }
    }
  },

  // Get notifications by type
  getByType: async (type: NotificationType, userId?: string): Promise<Notification[]> => {
    const notifications = await notificationService.getAll(userId)
    return notifications.filter(n => n.type === type)
  },

  // Get notifications by priority
  getByPriority: async (priority: NotificationPriority, userId?: string): Promise<Notification[]> => {
    const notifications = await notificationService.getAll(userId)
    return notifications.filter(n => n.priority === priority)
  },

  // Get recent notifications (last N)
  getRecent: async (limit: number = 20, userId?: string): Promise<Notification[]> => {
    const notifications = await notificationService.getAll(userId)
    return notifications.slice(0, limit)
  },
}
