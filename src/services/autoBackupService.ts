// Automatic Backup Service
// Handles scheduling and execution of automatic backups

import { backupService } from './backupService'
import { BackupSettings } from '../types/backup'

let backupInterval: NodeJS.Timeout | null = null
let isRunning = false

export const autoBackupService = {
  /**
   * Start automatic backup scheduler
   */
  async start(userId?: string): Promise<void> {
    if (isRunning) {
      console.log('Automatic backup service already running')
      return
    }

    const settings = await backupService.getBackupSettings()
    
    if (!settings.enabled) {
      console.log('Automatic backups are disabled')
      return
    }

    // Calculate interval based on frequency
    let intervalMs: number
    
    switch (settings.frequency) {
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000 // 24 hours
        break
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000 // 7 days
        break
      case 'monthly':
        intervalMs = 30 * 24 * 60 * 60 * 1000 // 30 days (approximate)
        break
      default:
        intervalMs = 24 * 60 * 60 * 1000 // Default to daily
    }

    // Create backup immediately on start (if enabled)
    try {
      await backupService.createAutomaticBackup(userId)
      console.log('Initial automatic backup created')
    } catch (error) {
      console.error('Error creating initial backup:', error)
    }

    // Schedule periodic backups
    backupInterval = setInterval(async () => {
      try {
        console.log('Creating scheduled automatic backup...')
        const result = await backupService.createAutomaticBackup(userId)
        if (result.success) {
          console.log('Automatic backup created successfully:', result.fileName)
          
          // Cleanup old backups
          const keepDays = settings.keep_backups_days || 30
          const deletedCount = await backupService.cleanupOldBackups(keepDays)
          if (deletedCount > 0) {
            console.log(`Cleaned up ${deletedCount} old backups`)
          }
        } else {
          console.error('Failed to create automatic backup')
        }
      } catch (error) {
        console.error('Error in automatic backup:', error)
      }
    }, intervalMs)

    isRunning = true
    console.log(`Automatic backup service started (${settings.frequency} backups)`)
  },

  /**
   * Stop automatic backup scheduler
   */
  stop(): void {
    if (backupInterval) {
      clearInterval(backupInterval)
      backupInterval = null
      isRunning = false
      console.log('Automatic backup service stopped')
    }
  },

  /**
   * Check if service is running
   */
  isActive(): boolean {
    return isRunning
  },

  /**
   * Create a backup immediately (manual trigger)
   */
  async createNow(userId?: string): Promise<{ success: boolean; fileName?: string }> {
    try {
      const result = await backupService.createAutomaticBackup(userId)
      return { success: result.success, fileName: result.fileName }
    } catch (error: any) {
      console.error('Error creating backup now:', error)
      return { success: false }
    }
  },
}







