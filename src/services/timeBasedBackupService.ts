// Time-Based Backup Service
// Handles scheduling backups at specific times (12 PM and 6 PM)
// with 3-day rolling retention

import { backupService } from './backupService'
import { cloudBackupService } from './cloudBackupService'
import { companyService } from './companyService'

let scheduledTimeouts: Map<string, NodeJS.Timeout> = new Map()
let isRunning = false

interface ScheduledBackup {
  companyId: number | null
  time: '12:00' | '18:00'
  timeoutId: NodeJS.Timeout
}

/**
 * Time-Based Backup Service
 * Schedules backups at 12:00 PM and 6:00 PM for each company
 * Implements 3-day rolling retention
 */
export const timeBasedBackupService = {
  /**
   * Calculate milliseconds until next backup time
   */
  getMsUntilTime: (targetTime: '12:00' | '18:00'): number => {
    const now = new Date()
    const [targetHour, targetMinute] = targetTime.split(':').map(Number)
    
    const target = new Date()
    target.setHours(targetHour, targetMinute, 0, 0)
    
    // If target time has passed today, schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1)
    }
    
    return target.getTime() - now.getTime()
  },

  /**
   * Schedule a backup for a specific time
   */
  scheduleBackup: async (
    companyId: number | null,
    time: '12:00' | '18:00',
    userId?: string
  ): Promise<void> => {
    const key = `${companyId || 'admin'}-${time}`
    
    // Clear existing timeout if any
    const existing = scheduledTimeouts.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    const msUntilTime = timeBasedBackupService.getMsUntilTime(time)
    
    console.log(`📅 Scheduling ${time} backup for company ${companyId || 'admin'} in ${Math.round(msUntilTime / 1000 / 60)} minutes`)

    const timeoutId = setTimeout(async () => {
      try {
        console.log(`🔄 Starting scheduled backup at ${time} for company ${companyId || 'admin'}`)
        
        // Create backup
        const result = await backupService.createAutomaticBackup(userId, companyId, time)
        
        if (result.success) {
          console.log(`✅ Backup created successfully at ${time} for company ${companyId || 'admin'}`)
          
          // Cleanup old backups (3-day rolling retention)
          try {
            const cleanupResult = await cloudBackupService.cleanupOldBackups(companyId)
            if (cleanupResult.success && cleanupResult.deletedCount) {
              console.log(`🧹 Cleaned up ${cleanupResult.deletedCount} old backups`)
            }
          } catch (cleanupError) {
            console.error('Error cleaning up old backups:', cleanupError)
          }
        } else {
          console.error(`❌ Failed to create backup at ${time} for company ${companyId || 'admin'}`)
        }

        // Schedule next backup (24 hours later)
        await timeBasedBackupService.scheduleBackup(companyId, time, userId)
      } catch (error) {
        console.error(`Error in scheduled backup at ${time}:`, error)
        // Retry scheduling
        await timeBasedBackupService.scheduleBackup(companyId, time, userId)
      }
    }, msUntilTime)

    scheduledTimeouts.set(key, timeoutId)
  },

  /**
   * Start time-based backup service for all companies
   */
  start: async (userId?: string): Promise<void> => {
    if (isRunning) {
      console.log('Time-based backup service already running')
      return
    }

    console.log('🚀 Starting time-based backup service (12 PM & 6 PM)')

    try {
      // Get all active companies
      const companies = await companyService.getAll(false)
      
      // Schedule backups for admin (null companyId)
      await timeBasedBackupService.scheduleBackup(null, '12:00', userId)
      await timeBasedBackupService.scheduleBackup(null, '18:00', userId)

      // Schedule backups for each company
      for (const company of companies) {
        await timeBasedBackupService.scheduleBackup(company.id, '12:00', userId)
        await timeBasedBackupService.scheduleBackup(company.id, '18:00', userId)
      }

      isRunning = true
      console.log(`✅ Time-based backup service started for ${companies.length + 1} companies (admin + ${companies.length} companies)`)
    } catch (error) {
      console.error('Error starting time-based backup service:', error)
      throw error
    }
  },

  /**
   * Stop time-based backup service
   */
  stop: (): void => {
    console.log('🛑 Stopping time-based backup service')
    
    scheduledTimeouts.forEach((timeout, key) => {
      clearTimeout(timeout)
      console.log(`Cleared scheduled backup: ${key}`)
    })
    
    scheduledTimeouts.clear()
    isRunning = false
    console.log('✅ Time-based backup service stopped')
  },

  /**
   * Check if service is running
   */
  isActive: (): boolean => {
    return isRunning
  },

  /**
   * Get scheduled backups info
   */
  getScheduledBackups: (): Array<{ companyId: number | null; time: '12:00' | '18:00' }> => {
    const scheduled: Array<{ companyId: number | null; time: '12:00' | '18:00' }> = []
    
    scheduledTimeouts.forEach((_, key) => {
      const [companyIdStr, time] = key.split('-')
      const companyId = companyIdStr === 'admin' ? null : parseInt(companyIdStr)
      scheduled.push({ companyId, time: time as '12:00' | '18:00' })
    })
    
    return scheduled
  },

  /**
   * Add a new company to backup schedule
   */
  addCompany: async (companyId: number, userId?: string): Promise<void> => {
    if (!isRunning) {
      console.warn('Time-based backup service is not running. Start it first.')
      return
    }

    await timeBasedBackupService.scheduleBackup(companyId, '12:00', userId)
    await timeBasedBackupService.scheduleBackup(companyId, '18:00', userId)
    console.log(`✅ Added company ${companyId} to backup schedule`)
  },

  /**
   * Remove a company from backup schedule
   */
  removeCompany: (companyId: number): void => {
    const keys = [`${companyId}-12:00`, `${companyId}-18:00`]
    
    keys.forEach(key => {
      const timeout = scheduledTimeouts.get(key)
      if (timeout) {
        clearTimeout(timeout)
        scheduledTimeouts.delete(key)
        console.log(`Removed scheduled backup: ${key}`)
      }
    })
  },
}





