import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { backupService } from '../services/backupService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Home, Download, Upload, Database, FileText, AlertCircle, CheckCircle, Info, X, Cloud, CloudDownload, Trash2, RefreshCw, Wifi, WifiOff, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { CloudBackupMetadata, cloudBackupService } from '../services/cloudBackupService'
import { companyService } from '../services/companyService'
import { convertXLSXToJSON } from '../utils/xlsxConverter'
import { syncService, SyncStatus } from '../services/syncService'
import { onOnlineStatusChange } from '../utils/pwa'
import { getAll, STORES } from '../database/db'
import { cloudProductService } from '../services/cloudProductService'
import { cloudCustomerService } from '../services/cloudCustomerService'
import { cloudSupplierService } from '../services/cloudSupplierService'
import { cloudPurchaseService } from '../services/cloudPurchaseService'
import { cloudSaleService } from '../services/cloudSaleService'
import { cloudExpenseService } from '../services/cloudExpenseService'
import { Product } from '../services/productService'
import { Customer } from '../types/customer'
import { Supplier } from '../types/purchase'
import { Purchase } from '../types/purchase'
import { Sale } from '../types/sale'
import { Expense } from '../types/expense'
import { 
  generateSamplePurchases, 
  generateSampleProducts, 
  generateSampleCustomers, 
  generateSampleSuppliers, 
  generateSampleCategories,
  generateUniversalTemplate 
} from '../utils/sampleExcelGenerator'

const BackupRestore = () => {
  const { user, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; message: string } | null>(null)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; validationWarnings?: any[] } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    sales: 0,
    purchases: 0,
    suppliers: 0,
    customers: 0,
    sales_persons: 0,
    category_commissions: 0,
    sub_categories: 0,
    sales_person_category_assignments: 0,
    stock_adjustments: 0,
    companies: 0,
    users: 0,
  })
  const [cloudBackups, setCloudBackups] = useState<CloudBackupMetadata[]>([])
  const [loadingCloudBackups, setLoadingCloudBackups] = useState(false)
  const [restoringFromCloud, setRestoringFromCloud] = useState(false)
  const [bucketStatus, setBucketStatus] = useState<{
    checking: boolean
    status?: {
      success: boolean
      buckets: Array<{ name: string; exists: boolean; companyId: number | null }>
      error?: string
    }
  }>({ checking: false })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    lastSyncStatus: 'never',
    pendingRecords: 0,
    isOnline: navigator.onLine,
    isSyncing: false,
  })
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null)
  const [syncElapsedTime, setSyncElapsedTime] = useState<number>(0)
  const [exportStatus, setExportStatus] = useState<string>('')

  const loadStats = async () => {
    try {
      const companyId = getCurrentCompanyId()
      // Pass companyId directly - services will handle null by returning empty array for data isolation
      // undefined means admin hasn't selected a company (show all), null means user has no company (show nothing)
      const statistics = await backupService.getStatistics(companyId)
      setStats(statistics)
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }

  useEffect(() => {
    const loadSyncStatus = async () => {
      try {
        const status = await syncService.getSyncStatus()
        setSyncStatus(status)
      } catch (error) {
        console.error('Error loading sync status:', error)
        // Set default status if there's an error
        setSyncStatus({
          lastSyncTime: null,
          lastSyncStatus: 'never',
          pendingRecords: 0,
          isOnline: navigator.onLine,
          isSyncing: false,
        })
      }
    }
    
    try {
      loadStats()
      loadSyncStatus()
      
      // Initialize auto-sync
      const companyId = getCurrentCompanyId()
      const cleanupAutoSync = syncService.initializeAutoSync(companyId)
      
      // Listen for online status changes to update sync status
      const cleanupOnlineListener = onOnlineStatusChange(async () => {
        try {
          const status = await syncService.getSyncStatus()
          setSyncStatus(status)
        } catch (error) {
          console.error('Error updating sync status:', error)
        }
      })
      
      // Update sync status periodically (every 30 seconds)
      const interval = setInterval(async () => {
        try {
          const status = await syncService.getSyncStatus()
          setSyncStatus(status)
        } catch (error) {
          console.error('Error updating sync status:', error)
        }
      }, 30000)
      
      return () => {
        try {
          cleanupAutoSync()
          cleanupOnlineListener()
          clearInterval(interval)
        } catch (error) {
          console.error('Error cleaning up sync listeners:', error)
        }
      }
    } catch (error) {
      console.error('Error initializing BackupRestore:', error)
      // Still set a default sync status so the page can render
      setSyncStatus({
        lastSyncTime: null,
        lastSyncStatus: 'never',
        pendingRecords: 0,
        isOnline: navigator.onLine,
        isSyncing: false,
      })
    }
  }, [])

  const checkBucketSetup = async () => {
    setBucketStatus({ checking: true })
    try {
      // Get all companies
      const companies = await companyService.getAll(true)
      const companyIds = companies.map(c => c.id)
      
      // Verify bucket setup
      const result = await cloudBackupService.verifyBucketSetup(companyIds)
      setBucketStatus({ checking: false, status: result })
    } catch (error: any) {
      console.error('Error checking bucket setup:', error)
      setBucketStatus({ 
        checking: false, 
        status: { 
          success: false, 
          buckets: [], 
          error: error.message || 'Failed to check bucket setup' 
        } 
      })
    }
  }

  const loadCloudBackups = async () => {
    setLoadingCloudBackups(true)
    try {
      const companyId = getCurrentCompanyId()
      const result = await backupService.listCloudBackups(companyId)
      if (result.success && result.backups) {
        setCloudBackups(result.backups)
      }
    } catch (error) {
      console.error('Error loading cloud backups:', error)
    } finally {
      setLoadingCloudBackups(false)
    }
  }

  const handleRestoreFromCloud = async (backup: CloudBackupMetadata) => {
    if (!window.confirm(`Are you sure you want to restore from backup dated ${backup.backup_date} at ${backup.backup_time}? This will merge data with existing records.`)) {
      return
    }

    setRestoringFromCloud(true)
    try {
      const companyId = getCurrentCompanyId()
      // Reconstruct file path
      const filePath = `${backup.backup_date}/${backup.file_name}`
      
      const result = await backupService.restoreFromCloud(filePath, companyId, user?.id, {
        importCompanies: true,
        importUsers: true,
        importProducts: true,
        importSales: true,
        importPurchases: true,
        importSuppliers: true,
        importCustomers: true,
        importSalesPersons: true,
        importSettings: true,
        importStockAdjustments: true,
        merge: true,
      })

      if (result.success) {
        alert(`✅ Successfully restored ${result.imported} records from cloud backup!`)
        // Reload stats
        const statistics = await backupService.getStatistics(companyId)
        setStats(statistics)
      } else {
        alert(`❌ Failed to restore: ${result.message}`)
      }
    } catch (error: any) {
      alert(`❌ Error restoring from cloud: ${error.message || 'Unknown error'}`)
    } finally {
      setRestoringFromCloud(false)
    }
  }

  const handleDeleteCloudBackup = async (backup: CloudBackupMetadata) => {
    if (!window.confirm(`Are you sure you want to delete backup from ${backup.backup_date} at ${backup.backup_time}?`)) {
      return
    }

    try {
      const companyId = getCurrentCompanyId()
      const filePath = `${backup.backup_date}/${backup.file_name}`
      const result = await backupService.deleteCloudBackup(filePath, companyId)
      
      if (result.success) {
        alert('✅ Backup deleted successfully')
        loadCloudBackups() // Reload list
      } else {
        alert(`❌ Failed to delete: ${result.error}`)
      }
    } catch (error: any) {
      alert(`❌ Error deleting backup: ${error.message || 'Unknown error'}`)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleManualSync = async () => {
    if (!syncStatus?.isOnline) {
      alert('Device is offline. Please connect to the internet to sync data.')
      return
    }

    const startTime = Date.now()
    setSyncing(true)
    setSyncResult(null)
    setSyncStartTime(startTime)
    setSyncElapsedTime(0)

    try {
      const companyId = getCurrentCompanyId()
      const result = await syncService.syncAllPendingRecords(companyId)
      
      const finalElapsed = Math.floor((Date.now() - startTime) / 1000)
      
      if (result.success) {
        setSyncResult({
          success: true,
          message: `✅ Sync completed successfully! ${result.synced} record(s) synced${result.deleted > 0 ? `, ${result.deleted} record(s) deleted` : ''} in ${finalElapsed}s.${result.failed > 0 ? ` ${result.failed} record(s) failed.` : ''}`,
        })
      } else {
        setSyncResult({
          success: result.synced > 0,
          message: `⚠️ Sync completed with issues. ${result.synced} record(s) synced${result.deleted > 0 ? `, ${result.deleted} record(s) deleted` : ''}, ${result.failed} record(s) failed in ${finalElapsed}s.${result.errors.length > 0 ? ` Errors: ${result.errors.slice(0, 3).join(', ')}` : ''}`,
        })
      }

      // Reload sync status and statistics
      const status = await syncService.getSyncStatus()
      setSyncStatus(status)
      
      // Reload statistics to reflect any deletions
      await loadStats()
    } catch (error: any) {
      setSyncResult({
        success: false,
        message: `❌ Sync failed: ${error.message || 'Unknown error'}`,
      })
    } finally {
      setSyncing(false)
      setSyncStartTime(null)
      setSyncElapsedTime(0)
    }
  }

  // Update elapsed time during sync
  useEffect(() => {
    if (syncing && syncStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - syncStartTime) / 1000)
        setSyncElapsedTime(elapsed)
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [syncing, syncStartTime])

  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatLastSyncTime = (timeStr: string | null): string => {
    if (!timeStr) return 'Never synced'
    
    const syncTime = new Date(timeStr)
    const now = new Date()
    const diffMs = now.getTime() - syncTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    
    return syncTime.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleExportJSON = async () => {
    setExportStatus('Exporting JSON...')
    try {
      const companyId = getCurrentCompanyId?.()
      await backupService.exportToFile(user?.id, companyId)
    } catch (error: any) {
      console.error('Export JSON failed:', error)
      alert('Failed to export backup file: ' + (error?.message || String(error)))
    } finally {
      setExportStatus('')
    }
  }

  const handleExportCSV = async () => {
    setExportStatus('Exporting CSV...')
    try {
      const companyId = getCurrentCompanyId?.()
      await backupService.exportSummaryToCSV(companyId)
    } catch (error: any) {
      console.error('Export CSV failed:', error)
      alert('Failed to export summary: ' + (error?.message || String(error)))
    } finally {
      setExportStatus('')
    }
  }

  const handleExportAllExcel = async () => {
    setExportStatus('Exporting Excel...')
    try {
      const companyId = getCurrentCompanyId?.()
      await backupService.exportAllToExcel(user?.id, companyId)
    } catch (error: any) {
      console.error('Export Excel failed:', error)
      alert('Failed to export Excel backup: ' + (error?.message || String(error)))
    } finally {
      setExportStatus('')
    }
  }

  const handleExportTally = async () => {
    setExportStatus('Exporting for Tally...')
    try {
      const companyId = getCurrentCompanyId?.()
      await backupService.exportTallyFriendly(companyId)
    } catch (error: any) {
      console.error('Export Tally failed:', error)
      alert('Failed to export for Tally: ' + (error?.message || String(error)))
    } finally {
      setExportStatus('')
    }
  }

  const handleCreateCloudBackup = async () => {
    setExportStatus('Creating cloud backup...')
    try {
      const companyId = getCurrentCompanyId?.()
      console.log('🔄 Creating cloud backup...', { userId: user?.id, companyId })
      
      const result = await backupService.createAutomaticBackup(user?.id, companyId)
      
      console.log('📦 Backup result:', result)
      
      if (result.success) {
        alert(`✅ Backup created and uploaded to cloud successfully!\n\nFile: ${result.fileName}\nCloud Uploaded: ${result.cloudUploaded ? 'Yes' : 'No'}`)
        // Reload cloud backups list
        loadCloudBackups()
        // Reload stats
        const statistics = await backupService.getStatistics(companyId)
        setStats(statistics)
      } else {
        const errorMsg = result.message || 'Unknown error'
        console.error('❌ Backup failed:', errorMsg)
        alert(`❌ Failed to create backup: ${errorMsg}\n\nCheck browser console (F12) for more details.`)
      }
    } catch (error: any) {
      console.error('❌ Exception creating backup:', error)
      alert(`❌ Error creating backup: ${error?.message || error?.toString() || 'Unknown error'}\n\nCheck browser console (F12) for more details.`)
    } finally {
      setExportStatus('')
    }
  }

  const handleFileSelect = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setSelectedFile(file)
        setFileName(file.name)
        setImportResult(null)
        
        const fileExtension = file.name.toLowerCase().split('.').pop()
        
        // Handle XLSX/XLS files
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          try {
            setImporting(true)
            const result = await convertXLSXToJSON(file)
            
            if (result.success && result.jsonData) {
              // Validate JSON structure
              const parsed = JSON.parse(result.jsonData)
              if (!parsed.version || !parsed.data) {
                setImportResult({
                  success: false,
                  message: 'Invalid converted file format. File must have version and data fields.',
                })
                setSelectedFile(null)
                setFileContent(null)
                setFileName('')
                setImporting(false)
                return
              }
              setFileContent(result.jsonData)
              
              // Check for validation warnings
              const hasWarnings = result.validationWarnings && result.validationWarnings.length > 0
              let message = result.message || `Successfully converted Excel file. Found: ${result.stats?.products || 0} products, ${result.stats?.categories || 0} categories, ${result.stats?.suppliers || 0} suppliers, ${result.stats?.customers || 0} customers, ${result.stats?.purchases || 0} purchases.`
              
              if (hasWarnings) {
                message += `\n\n⚠️ WARNING: The uploaded Excel file does not match the suggested format. Some data may not import correctly.`
              } else {
                message += ` ⚠️ IMPORTANT: Click the "Import" button below to actually import this data into your database.`
              }
              
              setImportResult({
                success: true,
                message: message,
                validationWarnings: result.validationWarnings,
              })
            } else {
              setImportResult({
                success: false,
                message: result.message || 'Failed to convert Excel file',
              })
              setSelectedFile(null)
              setFileContent(null)
              setFileName('')
            }
            setImporting(false)
          } catch (error: any) {
            setImportResult({
              success: false,
              message: 'Failed to convert Excel file: ' + (error.message || 'Unknown error'),
            })
            setSelectedFile(null)
            setFileContent(null)
            setFileName('')
            setImporting(false)
          }
          return
        }
        
        // Handle JSON files (existing logic)
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string
            // Validate JSON structure
            const parsed = JSON.parse(json)
            if (!parsed.version || !parsed.data) {
              setImportResult({
                success: false,
                message: 'Invalid backup file format. File must have version and data fields.',
              })
              setSelectedFile(null)
              setFileContent(null)
              setFileName('')
              return
            }
            setFileContent(json)
            setImportResult(null) // Clear any previous errors
          } catch (error: any) {
            setImportResult({
              success: false,
              message: 'Invalid JSON file: ' + (error.message || 'Failed to parse file'),
            })
            setSelectedFile(null)
            setFileContent(null)
            setFileName('')
          }
        }
        reader.onerror = () => {
          setImportResult({
            success: false,
            message: 'Failed to read file',
          })
          setSelectedFile(null)
          setFileContent(null)
          setFileName('')
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleSubmitImport = async () => {
    if (!fileContent) {
      setImportResult({
        success: false,
        message: 'No file selected. Please select a backup file first.',
      })
      return
    }

    setImporting(true)
    setImportResult(null)
    setImportProgress(null)
    
    try {
      const companyId = getCurrentCompanyId()
      
      // Validate that a company is selected (for admin users) or user has a company (for regular users)
      if (companyId === null) {
        setImportResult({
          success: false,
          message: user?.role === 'admin' 
            ? 'Please select a company first before importing data. Go to System Settings to select a company.'
            : 'You must be associated with a company to import data. Please contact your administrator.',
        })
        setImporting(false)
        return
      }
      
      // Parse file to estimate total records for progress
      let totalRecords = 0
      try {
        const parsed = JSON.parse(fileContent)
        totalRecords = (parsed.data?.purchases?.length || 0) + 
                      (parsed.data?.products?.length || 0) + 
                      (parsed.data?.suppliers?.length || 0) +
                      (parsed.data?.customers?.length || 0)
        if (totalRecords > 0) {
          setImportProgress({ current: 0, total: totalRecords, message: 'Starting import...' })
        }
      } catch (e) {
        // Ignore parsing errors
      }
      
      const result = await backupService.importFromFile(fileContent, user?.id, {
        importProducts: true,
        importPurchases: true,
        importSuppliers: true,
        importCustomers: true,
        importSettings: true,
        merge: true, // Merge with existing data
        companyId: companyId, // Pass company ID to ensure purchases are linked correctly
      })
      
      setImportResult(result)
      setImportProgress(null)
      
      // Refresh statistics after import
      if (result.success) {
        const companyId = getCurrentCompanyId()
        const statistics = await backupService.getStatistics(companyId)
        setStats(statistics)
      }
      
      // Clear file selection after successful import
      if (result.success) {
        setSelectedFile(null)
        setFileContent(null)
        setFileName('')
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.message || 'Failed to import backup file',
      })
      setImportProgress(null)
    } finally {
      setImporting(false)
    }
  }

  const handleCancelImport = () => {
    setSelectedFile(null)
    setFileContent(null)
    setFileName('')
    setImportResult(null)
  }

  return (
    <ProtectedRoute requiredPermission="products:update">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                title="Back to Dashboard"
              >
                <Home className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Backup & Restore</h1>
                <p className="text-sm text-gray-600 mt-1">Export and import your inventory data</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Statistics */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              Current Data Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Products</p>
                <p className="text-2xl font-bold text-blue-600">{stats.products}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Sales</p>
                <p className="text-2xl font-bold text-green-600">{stats.sales}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-gray-600 mb-1">Purchases</p>
                <p className="text-2xl font-bold text-purple-600">{stats.purchases}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-gray-600 mb-1">Customers</p>
                <p className="text-2xl font-bold text-orange-600">{stats.customers}</p>
              </div>
              <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                <p className="text-sm text-gray-600 mb-1">Suppliers</p>
                <p className="text-2xl font-bold text-cyan-600">{stats.suppliers}</p>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-8 mb-8 border border-white/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Download className="w-6 h-6 text-green-600" />
              Export Data
            </h2>
            <p className="text-gray-600 mb-6">
              Export all your inventory data as a backup file. You can use this file to restore your data later.
            </p>

            {exportStatus && (
              <div className="mb-4 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg text-blue-800 font-medium flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {exportStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleCreateCloudBackup()}
                className="group bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-4 cursor-pointer"
              >
                <Cloud className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Create Cloud Backup</h3>
                  <p className="text-sm opacity-90">Create and upload backup to cloud</p>
                  <p className="text-xs opacity-75 mt-2">Automatically uploaded to Supabase Storage</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="group bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-6 hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-4"
              >
                <FileText className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Export Full Backup</h3>
                  <p className="text-sm opacity-90">Download complete data as JSON file</p>
                  <p className="text-xs opacity-75 mt-2">Includes all: Products, Sales, Purchases, Customers, Suppliers, Settings, etc.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="group bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-6 hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-4"
              >
                <Database className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Export Summary</h3>
                  <p className="text-sm opacity-90">Download data summary as CSV</p>
                  <p className="text-xs opacity-75 mt-2">Summary of products, sales, purchases, etc.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleExportAllExcel}
                className="group bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-6 hover:shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-4"
              >
                <FileText className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Export All Data (Excel)</h3>
                  <p className="text-sm opacity-90">One-click: Products, Customers, Suppliers, Sales, Purchases</p>
                  <p className="text-xs opacity-75 mt-2">Backup or migration – one Excel file with multiple sheets</p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleExportTally}
                className="group bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl p-6 hover:shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-4"
              >
                <FileText className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Export for Tally</h3>
                  <p className="text-sm opacity-90">Excel in Tally-import-friendly format</p>
                  <p className="text-xs opacity-75 mt-2">Sales & Purchases – smoother handover to CA/Tally</p>
                </div>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-8 mb-8 border border-white/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Upload className="w-6 h-6 text-orange-600" />
              Restore Data
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Warning: Importing data will merge with existing data</p>
                <p>Make sure to backup your current data before importing. Import supports: Products, Categories, Suppliers, Customers, Purchases, and Settings.</p>
              </div>
            </div>

            {/* Sample Excel Templates */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Download Sample Excel Templates</h3>
              </div>
              <p className="text-sm text-blue-800 mb-4">
                Download sample Excel files to understand the required format. You can use these as templates and fill in your data.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <button
                  onClick={generateSamplePurchases}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Sample Purchases
                </button>
                <button
                  onClick={generateSampleProducts}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Sample Products
                </button>
                <button
                  onClick={generateSampleCustomers}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Sample Customers
                </button>
                <button
                  onClick={generateSampleSuppliers}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Sample Suppliers
                </button>
                <button
                  onClick={generateSampleCategories}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Sample Categories
                </button>
                <button
                  onClick={generateUniversalTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-colors text-sm font-bold"
                >
                  <Download className="w-4 h-4" />
                  Universal Template ⭐
                </button>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>💡 Tip:</strong> The <strong>Universal Template</strong> contains all data types in separate sheets. Use it as a complete reference for importing all your data at once.
                </p>
              </div>
            </div>


            {importResult && (
              <div className="mb-6 space-y-4">
                <div className={`p-4 rounded-lg flex items-start gap-3 ${
                  importResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold mb-1 ${
                      importResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {importResult.success ? 'File Converted Successfully' : 'Import Failed'}
                    </p>
                    <p className={`text-sm whitespace-pre-line ${
                      importResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {importResult.message}
                    </p>
                  </div>
                </div>

                {/* Show validation warnings if any */}
                {importResult.success && importResult.validationWarnings && importResult.validationWarnings.length > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-yellow-900 mb-2">
                          ⚠️ Format Validation Warning
                        </h3>
                        <p className="text-sm text-yellow-800 mb-4">
                          The uploaded Excel file does not match the suggested format. This may cause data import issues.
                        </p>
                      </div>
                    </div>
                    
                    {importResult.validationWarnings.map((warning, index) => (
                      <div key={index} className="mb-4 last:mb-0 bg-white rounded-lg p-4 border border-yellow-300">
                        <h4 className="font-semibold text-yellow-900 mb-2">
                          Sheet: "{warning.sheetName}"
                        </h4>
                        <div className="mb-3">
                          <p className="text-sm font-medium text-yellow-800 mb-1">
                            Missing Required Columns:
                          </p>
                          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                            {warning.missingColumns.map((col: string, colIndex: number) => (
                              <li key={colIndex}>{col}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-yellow-100 rounded p-3">
                          <p className="text-sm text-yellow-900 whitespace-pre-line font-mono">
                            {warning.explanation}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>💡 What to do:</strong> Download the sample Excel template from above and match your file format. 
                        You can still proceed with import, but some data may be missing or incorrect.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* File Selection */}
            <div className="mb-6">
              {!selectedFile ? (
                <button
                  onClick={handleFileSelect}
                  className="w-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-6 hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-4"
                >
                  <Upload className="w-12 h-12" />
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Select Backup File</h3>
                    <p className="text-sm opacity-90">Choose a backup JSON file or Excel (XLSX) file to import</p>
                  </div>
                </button>
              ) : (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{fileName}</p>
                        <p className="text-sm text-gray-600">File ready for import</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelImport}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSubmitImport}
                      disabled={importing}
                      className="flex-1 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg px-6 py-3 font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {importing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Confirm & Import</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelImport}
                      disabled={importing}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {/* Progress Indicator */}
                  {importProgress && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">{importProgress.message}</span>
                        <span className="text-sm text-blue-700">
                          {Math.round((importProgress.current / importProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        Please wait... This may take a few minutes for large files.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Data Sync Status Section */}
          {(
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    {syncStatus.isOnline ? (
                      <Wifi className="w-6 h-6 text-green-600" />
                    ) : (
                      <WifiOff className="w-6 h-6 text-red-600" />
                    )}
                    Data Sync Status
                  </h2>
                  <p className="text-gray-600">
                    {syncStatus.isOnline 
                      ? 'Your data syncs automatically to cloud when online' 
                      : 'Device is offline. Data will sync when connection is restored'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleManualSync}
                    disabled={syncing || !syncStatus?.isOnline}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? `Syncing... ${formatElapsedTime(syncElapsedTime)}` : 'Sync Now'}
                  </button>
                </div>
              </div>

              {/* Sync Status Card */}
              <div className={`mb-6 p-6 rounded-xl border-2 ${
                syncStatus.lastSyncStatus === 'success'
                  ? 'bg-green-50 border-green-200'
                  : syncStatus.lastSyncStatus === 'failed'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Last Sync Time */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      syncStatus.lastSyncStatus === 'success' 
                        ? 'bg-green-100' 
                        : syncStatus.lastSyncStatus === 'failed'
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}>
                      <Clock className={`w-5 h-5 ${
                        syncStatus.lastSyncStatus === 'success' 
                          ? 'text-green-600' 
                          : syncStatus.lastSyncStatus === 'failed'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Last Sync</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatLastSyncTime(syncStatus.lastSyncTime)}
                      </p>
                    </div>
                  </div>

                  {/* Sync Status */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      syncStatus.lastSyncStatus === 'success' 
                        ? 'bg-green-100' 
                        : syncStatus.lastSyncStatus === 'failed'
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}>
                      {syncStatus.lastSyncStatus === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : syncStatus.lastSyncStatus === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
                      <p className={`text-lg font-bold ${
                        syncStatus.lastSyncStatus === 'success' 
                          ? 'text-green-700' 
                          : syncStatus.lastSyncStatus === 'failed'
                          ? 'text-red-700'
                          : 'text-gray-700'
                      }`}>
                        {syncStatus.lastSyncStatus === 'success' 
                          ? 'Synced' 
                          : syncStatus.lastSyncStatus === 'failed'
                          ? 'Failed'
                          : 'Never Synced'}
                      </p>
                    </div>
                  </div>

                  {/* Pending Records */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      syncStatus.pendingRecords > 0 
                        ? 'bg-yellow-100' 
                        : 'bg-green-100'
                    }`}>
                      <Database className={`w-5 h-5 ${
                        syncStatus.pendingRecords > 0 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Pending Records</p>
                      <p className={`text-lg font-bold ${
                        syncStatus.pendingRecords > 0 
                          ? 'text-yellow-700' 
                          : 'text-green-700'
                      }`}>
                        {syncStatus.pendingRecords === 0 
                          ? 'All Synced' 
                          : `${syncStatus.pendingRecords} waiting`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sync Progress Message */}
                {syncing && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5 animate-spin flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Syncing data to cloud... ({formatElapsedTime(syncElapsedTime)})
                        </p>
                        <p className="text-xs text-blue-700">
                          💡 You can continue working on sales, purchases, and other activities. The sync will continue in the background.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sync Result Message */}
                {syncResult && !syncing && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    syncResult.success 
                      ? 'bg-green-100 border border-green-300' 
                      : 'bg-red-100 border border-red-300'
                  }`}>
                    <p className={`text-sm font-medium ${
                      syncResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {syncResult.message}
                    </p>
                  </div>
                )}

                {/* Online/Offline Status */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm">
                    {syncStatus.isOnline ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">Online - Ready to sync</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-red-600" />
                        <span className="text-red-700 font-medium">Offline - Data will sync automatically when connection is restored</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">How Data Sync Works:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>All data is saved to your device first (works offline)</li>
                      <li>When online, data automatically syncs to cloud (Supabase)</li>
                      <li>If you work offline, data syncs automatically when internet returns</li>
                      <li>Click "Sync Now" to manually sync pending records</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional: Manual Backup Section (Collapsible) */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-600" />
                Manual Backup (Optional)
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Create a manual backup of your data. This is optional as data syncs automatically to cloud.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const companyId = getCurrentCompanyId()
                    const backupData = await backupService.exportAll(user?.id, companyId || undefined)
                    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    alert('Backup downloaded successfully!')
                  } catch (error: any) {
                    alert(`Failed to create backup: ${error.message}`)
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Backup
              </button>
            </div>
          </div>

          {/* Information Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Backup & Restore Information</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Full backup includes all products, sales, purchases, customers, suppliers, companies, users, and settings</li>
                  <li>Backup files are in JSON format (compressed with gzip) and can be opened in any text editor</li>
                  <li><strong>Automatic backups:</strong> Created at 12:00 PM and 6:00 PM daily, stored in cloud</li>
                  <li><strong>Retention:</strong> Backups kept for 3 days (rolling window - oldest deleted when 4th day arrives)</li>
                  <li>Import functionality will merge data with existing records (duplicates by ID are skipped)</li>
                  <li>Import order: Companies → Users → Categories → Products → Suppliers/Customers → Purchases → Settings</li>
                  <li><strong>Required Format:</strong> JSON file exported from this system. File must have version, export_date, and data object with all record types</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default BackupRestore

