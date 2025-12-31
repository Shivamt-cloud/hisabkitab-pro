export interface AutomaticBackup {
  id?: number
  backup_date: string // ISO date string
  created_at: string // ISO timestamp
  backup_data: string // JSON string of BackupData
  file_name: string // Name of the downloaded file
  size_bytes?: number // Size of backup data
}

export interface BackupSettings {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  time_of_day?: string // HH:mm format (e.g., "02:00" for 2 AM)
  day_of_week?: number // 0-6 (Sunday-Saturday) for weekly
  day_of_month?: number // 1-31 for monthly
  keep_backups_days?: number // Keep backups for X days (default: 30)
  auto_download?: boolean // Automatically download backup files
}






