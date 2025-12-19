import { AuditLog, AuditAction, AuditModule, AuditLogFilter } from '../types/audit'
import { getAll, put, deleteById, STORES } from '../database/db'

const MAX_LOGS = 10000 // Maximum number of logs to keep

export const auditService = {
  // Create a new audit log entry
  log: async (
    userId: string,
    userName: string,
    userEmail: string,
    module: AuditModule,
    action: AuditAction,
    entityType: string,
    entityId: string | number,
    description: string,
    options?: {
      entityName?: string
      changes?: { field: string; oldValue: any; newValue: any }[]
      metadata?: Record<string, any>
    }
  ): Promise<AuditLog> => {
    const logs = await auditService.getAll()
    
    const newLog: AuditLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userEmail,
      module,
      action,
      entityType,
      entityId,
      entityName: options?.entityName,
      description,
      changes: options?.changes,
      metadata: options?.metadata,
    }

    // Keep only the most recent logs (delete old ones if over limit)
    let logsToKeep = [newLog, ...logs]
    if (logsToKeep.length > MAX_LOGS) {
      // Delete oldest logs
      const toDelete = logsToKeep.slice(MAX_LOGS)
      for (const log of toDelete) {
        try {
          await deleteById(STORES.AUDIT_LOGS, log.id)
        } catch (error) {
          // Ignore deletion errors
        }
      }
      logsToKeep = logsToKeep.slice(0, MAX_LOGS)
    }

    await put(STORES.AUDIT_LOGS, newLog)
    return newLog
  },

  // Get all audit logs
  getAll: async (): Promise<AuditLog[]> => {
    return await getAll<AuditLog>(STORES.AUDIT_LOGS)
  },

  // Get audit logs with filters
  getFiltered: async (filter: AuditLogFilter = {}): Promise<AuditLog[]> => {
    let logs = await auditService.getAll()

    // Filter by user
    if (filter.userId) {
      logs = logs.filter(log => log.userId === filter.userId)
    }

    // Filter by module
    if (filter.module) {
      logs = logs.filter(log => log.module === filter.module)
    }

    // Filter by action
    if (filter.action) {
      logs = logs.filter(log => log.action === filter.action)
    }

    // Filter by entity type
    if (filter.entityType) {
      logs = logs.filter(log => log.entityType === filter.entityType)
    }

    // Filter by date range
    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime()
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= start)
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime() + 86400000 // Add 24 hours to include entire day
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= end)
    }

    // Search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      logs = logs.filter(log =>
        log.description.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query) ||
        log.userEmail.toLowerCase().includes(query) ||
        log.entityName?.toLowerCase().includes(query) ||
        log.entityType.toLowerCase().includes(query)
      )
    }

    return logs
  },

  // Get audit logs for a specific entity
  getByEntity: async (entityType: string, entityId: string | number): Promise<AuditLog[]> => {
    const logs = await auditService.getAll()
    return logs.filter(
      log => log.entityType === entityType && log.entityId === entityId
    )
  },

  // Get audit logs for a specific user
  getByUser: async (userId: string): Promise<AuditLog[]> => {
    const logs = await auditService.getAll()
    return logs.filter(log => log.userId === userId)
  },

  // Get recent audit logs
  getRecent: async (limit: number = 50): Promise<AuditLog[]> => {
    const logs = await auditService.getAll()
    return logs.slice(0, limit)
  },

  // Get statistics
  getStatistics: async () => {
    const logs = await auditService.getAll()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return {
      total: logs.length,
      today: logs.filter(log => new Date(log.timestamp) >= today).length,
      thisWeek: logs.filter(log => new Date(log.timestamp) >= thisWeek).length,
      thisMonth: logs.filter(log => new Date(log.timestamp) >= thisMonth).length,
      byModule: logs.reduce((acc, log) => {
        acc[log.module] = (acc[log.module] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byAction: logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
  },

  // Export audit logs
  export: async (filter: AuditLogFilter = {}): Promise<string> => {
    const logs = await auditService.getFiltered(filter)
    return JSON.stringify(logs, null, 2)
  },

  // Clear old logs (keep last N days)
  clearOldLogs: async (daysToKeep: number = 30): Promise<number> => {
    const logs = await auditService.getAll()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysToKeep)
    const cutoffTime = cutoff.getTime()

    const toDelete = logs.filter(log => new Date(log.timestamp).getTime() < cutoffTime)
    
    for (const log of toDelete) {
      try {
        await deleteById(STORES.AUDIT_LOGS, log.id)
      } catch (error) {
        // Ignore deletion errors
      }
    }
    
    return toDelete.length // Return number of deleted logs
  },
}
