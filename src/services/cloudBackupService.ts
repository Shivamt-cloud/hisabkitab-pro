// Cloud Backup Service - Handles backup operations with Supabase Storage
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { BackupData } from './backupService'

export interface CloudBackupMetadata {
  id: string
  company_id: number | null
  backup_date: string // YYYY-MM-DD
  backup_time: string // HH:MM (12:00 or 18:00)
  created_at: string
  file_name: string
  size_bytes: number
  compressed: boolean
}

/**
 * Cloud Backup Service
 * Handles backup upload, download, listing, and deletion from Supabase Storage
 */
export const cloudBackupService = {
  /**
   * Get bucket name for a company
   */
  getBucketName: (companyId: number | null): string => {
    if (companyId === null) {
      return 'backups-admin'
    }
    return `backups-company-${companyId}`
  },

  /**
   * Ensure bucket exists (creates if doesn't exist)
   * Note: This requires Supabase Storage admin API, which may not be available
   * For now, buckets should be created manually in Supabase dashboard
   */
  ensureBucket: async (companyId: number | null): Promise<boolean> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      console.warn('Supabase not available or offline, cannot ensure bucket')
      return false
    }

    const bucketName = cloudBackupService.getBucketName(companyId)
    
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase!.storage.listBuckets()
      
      if (listError) {
        console.error('Error listing buckets:', listError)
        return false
      }

      const bucketExists = buckets?.some(b => b.name === bucketName)
      
      if (bucketExists) {
        return true
      }

      // Try to create bucket (requires admin privileges)
      // Note: This might fail if user doesn't have admin access
      // Buckets should ideally be created via Supabase dashboard or admin API
      const { data, error } = await supabase!.storage.createBucket(bucketName, {
        public: false, // Private bucket
        fileSizeLimit: 10485760, // 10 MB limit per file
        allowedMimeTypes: ['application/json', 'application/gzip'],
      })

      if (error) {
        console.warn(`Bucket ${bucketName} might not exist. Please create it in Supabase dashboard. Error:`, error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error ensuring bucket:', error)
      return false
    }
  },

  /**
   * Compress backup data using gzip
   */
  compressBackup: async (backupData: BackupData): Promise<Blob> => {
    const jsonString = JSON.stringify(backupData)
    const encoder = new TextEncoder()
    const data = encoder.encode(jsonString)
    
    // Use CompressionStream if available (modern browsers)
    if ('CompressionStream' in window) {
      const stream = new CompressionStream('gzip')
      const writer = stream.writable.getWriter()
      writer.write(data)
      writer.close()
      
      const chunks: Uint8Array[] = []
      const reader = stream.readable.getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        compressed.set(chunk, offset)
        offset += chunk.length
      }
      
      return new Blob([compressed], { type: 'application/gzip' })
    } else {
      // Fallback: Use pako library if CompressionStream not available
      // For now, return uncompressed (can add pako later if needed)
      console.warn('CompressionStream not available, using uncompressed backup')
      return new Blob([jsonString], { type: 'application/json' })
    }
  },

  /**
   * Decompress backup data
   */
  decompressBackup: async (blob: Blob): Promise<BackupData> => {
    // Check if it's compressed (gzip) or uncompressed (json)
    if (blob.type === 'application/json' || blob.size > 0) {
      // Try to parse as JSON first
      const text = await blob.text()
      try {
        return JSON.parse(text) as BackupData
      } catch (e) {
        // If not JSON, try to decompress
      }
    }

    // Decompress gzip
    if ('DecompressionStream' in window) {
      const stream = new DecompressionStream('gzip')
      const arrayBuffer = await blob.arrayBuffer()
      const writer = stream.writable.getWriter()
      writer.write(new Uint8Array(arrayBuffer))
      writer.close()
      
      const chunks: Uint8Array[] = []
      const reader = stream.readable.getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        decompressed.set(chunk, offset)
        offset += chunk.length
      }
      
      const decoder = new TextDecoder()
      const jsonString = decoder.decode(decompressed)
      return JSON.parse(jsonString) as BackupData
    } else {
      throw new Error('DecompressionStream not available. Please use a modern browser.')
    }
  },

  /**
   * Upload backup to cloud storage
   */
  uploadBackup: async (
    backupData: BackupData,
    companyId: number | null,
    backupTime: '12:00' | '18:00' = '12:00'
  ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return {
        success: false,
        error: 'Supabase not available or offline. Backup saved locally only.',
      }
    }

    try {
      // Ensure bucket exists
      const bucketExists = await cloudBackupService.ensureBucket(companyId)
      if (!bucketExists) {
        console.warn('Bucket might not exist. Please create it in Supabase dashboard.')
        // Continue anyway - might work if bucket exists but ensureBucket failed
      }

      const bucketName = cloudBackupService.getBucketName(companyId)
      
      // Compress backup
      const compressedBlob = await cloudBackupService.compressBackup(backupData)
      const isCompressed = compressedBlob.type === 'application/gzip'
      
      // Generate file name
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
      const timeStr = backupTime.replace(':', '-') // 12-00 or 18-00
      const timestamp = Date.now()
      const extension = isCompressed ? 'json.gz' : 'json'
      const fileName = `backup_${dateStr}_${timeStr}_${timestamp}.${extension}`
      const filePath = `${dateStr}/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase!.storage
        .from(bucketName)
        .upload(filePath, compressedBlob, {
          contentType: isCompressed ? 'application/gzip' : 'application/json',
          upsert: false, // Don't overwrite existing files
        })

      if (error) {
        console.error('Error uploading backup to cloud:', error)
        return {
          success: false,
          error: error.message || 'Failed to upload backup to cloud',
        }
      }

      console.log('✅ Backup uploaded to cloud successfully:', filePath)
      return {
        success: true,
        filePath: data.path,
      }
    } catch (error: any) {
      console.error('Error in cloudBackupService.uploadBackup:', error)
      return {
        success: false,
        error: error.message || 'Unknown error uploading backup',
      }
    }
  },

  /**
   * List all backups for a company
   */
  listBackups: async (
    companyId: number | null,
    limit: number = 100
  ): Promise<{ success: boolean; backups?: CloudBackupMetadata[]; error?: string }> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return {
        success: false,
        error: 'Supabase not available or offline',
      }
    }

    try {
      const bucketName = cloudBackupService.getBucketName(companyId)
      
      // List all files in bucket
      const { data: files, error } = await supabase!.storage
        .from(bucketName)
        .list('', {
          limit,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (error) {
        console.error('Error listing backups:', error)
        return {
          success: false,
          error: error.message || 'Failed to list backups',
        }
      }

      // Parse file names to extract metadata
      const backups: CloudBackupMetadata[] = (files || [])
        .filter(file => file.name.endsWith('.json') || file.name.endsWith('.json.gz'))
        .map(file => {
          // Parse filename: backup_YYYY-MM-DD_HH-MM_timestamp.json[.gz]
          const match = file.name.match(/backup_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})_(\d+)\.json(\.gz)?/)
          if (match) {
            const [, date, hour, minute, timestamp, compressed] = match
            return {
              id: file.id || timestamp,
              company_id: companyId,
              backup_date: date,
              backup_time: `${hour}:${minute}`,
              created_at: file.created_at || new Date(parseInt(timestamp)).toISOString(),
              file_name: file.name,
              size_bytes: file.metadata?.size || 0,
              compressed: !!compressed,
            } as CloudBackupMetadata
          }
          // Fallback for files that don't match pattern
          return {
            id: file.id || file.name,
            company_id: companyId,
            backup_date: new Date(file.created_at || Date.now()).toISOString().split('T')[0],
            backup_time: '12:00',
            created_at: file.created_at || new Date().toISOString(),
            file_name: file.name,
            size_bytes: file.metadata?.size || 0,
            compressed: file.name.endsWith('.gz'),
          } as CloudBackupMetadata
        })

      return {
        success: true,
        backups: backups.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }
    } catch (error: any) {
      console.error('Error in cloudBackupService.listBackups:', error)
      return {
        success: false,
        error: error.message || 'Unknown error listing backups',
      }
      }
  },

  /**
   * Download backup from cloud
   */
  downloadBackup: async (
    filePath: string,
    companyId: number | null
  ): Promise<{ success: boolean; data?: BackupData; error?: string }> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return {
        success: false,
        error: 'Supabase not available or offline',
      }
    }

    try {
      const bucketName = cloudBackupService.getBucketName(companyId)
      
      // Download file from Supabase Storage
      const { data: blob, error } = await supabase!.storage
        .from(bucketName)
        .download(filePath)

      if (error) {
        console.error('Error downloading backup:', error)
        return {
          success: false,
          error: error.message || 'Failed to download backup',
        }
      }

      if (!blob) {
        return {
          success: false,
          error: 'Backup file not found',
        }
      }

      // Decompress if needed
      const backupData = await cloudBackupService.decompressBackup(blob)

      return {
        success: true,
        data: backupData,
      }
    } catch (error: any) {
      console.error('Error in cloudBackupService.downloadBackup:', error)
      return {
        success: false,
        error: error.message || 'Unknown error downloading backup',
      }
    }
  },

  /**
   * Delete backup from cloud
   */
  deleteBackup: async (
    filePath: string,
    companyId: number | null
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return {
        success: false,
        error: 'Supabase not available or offline',
      }
    }

    try {
      const bucketName = cloudBackupService.getBucketName(companyId)
      
      const { error } = await supabase!.storage
        .from(bucketName)
        .remove([filePath])

      if (error) {
        console.error('Error deleting backup:', error)
        return {
          success: false,
          error: error.message || 'Failed to delete backup',
        }
      }

      return {
        success: true,
      }
    } catch (error: any) {
      console.error('Error in cloudBackupService.deleteBackup:', error)
      return {
        success: false,
        error: error.message || 'Unknown error deleting backup',
      }
    }
  },

  /**
   * Cleanup old backups (3-day rolling retention)
   * Deletes backups older than 3 days
   */
  cleanupOldBackups: async (
    companyId: number | null
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return {
        success: false,
        error: 'Supabase not available or offline',
      }
    }

    try {
      const listResult = await cloudBackupService.listBackups(companyId, 1000)
      
      if (!listResult.success || !listResult.backups) {
        return {
          success: false,
          error: 'Failed to list backups for cleanup',
        }
      }

      const now = new Date()
      const threeDaysAgo = new Date(now)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      
      // Find backups older than 3 days
      const oldBackups = listResult.backups.filter(backup => {
        const backupDate = new Date(backup.created_at)
        return backupDate < threeDaysAgo
      })

      if (oldBackups.length === 0) {
        return {
          success: true,
          deletedCount: 0,
        }
      }

      // Delete old backups
      const bucketName = cloudBackupService.getBucketName(companyId)
      const filePaths = oldBackups.map(backup => {
        // Reconstruct file path from metadata
        const dateFolder = backup.backup_date
        return `${dateFolder}/${backup.file_name}`
      })

      const { error } = await supabase!.storage
        .from(bucketName)
        .remove(filePaths)

      if (error) {
        console.error('Error deleting old backups:', error)
        return {
          success: false,
          error: error.message || 'Failed to delete old backups',
        }
      }

      console.log(`✅ Cleaned up ${oldBackups.length} old backups`)
      return {
        success: true,
        deletedCount: oldBackups.length,
      }
    } catch (error: any) {
      console.error('Error in cloudBackupService.cleanupOldBackups:', error)
      return {
        success: false,
        error: error.message || 'Unknown error cleaning up backups',
      }
    }
  },

  /**
   * Verify bucket setup status
   * Returns information about which buckets exist and which are missing
   */
  verifyBucketSetup: async (companyIds: number[]): Promise<{
    success: boolean
    buckets: Array<{
      name: string
      exists: boolean
      companyId: number | null
    }>
    error?: string
  }> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return {
        success: false,
        buckets: [],
        error: 'Supabase not available or offline',
      }
    }

    try {
      // List all existing buckets
      const { data: buckets, error: listError } = await supabase!.storage.listBuckets()
      
      if (listError) {
        return {
          success: false,
          buckets: [],
          error: listError.message || 'Failed to list buckets',
        }
      }

      const existingBucketNames = new Set(buckets?.map(b => b.name) || [])
      const bucketStatus: Array<{ name: string; exists: boolean; companyId: number | null }> = []

      // Check admin bucket
      const adminBucket = 'backups-admin'
      bucketStatus.push({
        name: adminBucket,
        exists: existingBucketNames.has(adminBucket),
        companyId: null,
      })

      // Check company buckets
      for (const companyId of companyIds) {
        const bucketName = `backups-company-${companyId}`
        bucketStatus.push({
          name: bucketName,
          exists: existingBucketNames.has(bucketName),
          companyId: companyId,
        })
      }

      return {
        success: true,
        buckets: bucketStatus,
      }
    } catch (error: any) {
      return {
        success: false,
        buckets: [],
        error: error.message || 'Error verifying bucket setup',
      }
    }
  },
}

