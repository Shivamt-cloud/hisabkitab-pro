import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { backupService } from '../services/backupService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Home, Download, Upload, Database, FileText, AlertCircle, CheckCircle, Info, X, Cloud, CloudDownload, Trash2, RefreshCw } from 'lucide-react'
import { CloudBackupMetadata } from '../services/cloudBackupService'
import { convertXLSXToJSON } from '../utils/xlsxConverter'
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

  useEffect(() => {
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
    loadStats()
    loadCloudBackups()
  }, [])

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

  const handleExportJSON = async () => {
    try {
      const companyId = getCurrentCompanyId()
      // Pass companyId to export only company's data
      await backupService.exportToFile(user?.id, companyId)
    } catch (error) {
      alert('Failed to export backup file')
    }
  }

  const handleExportCSV = async () => {
    try {
      const companyId = getCurrentCompanyId()
      // Pass companyId to export only company's data
      await backupService.exportSummaryToCSV(companyId)
    } catch (error) {
      alert('Failed to export summary')
    }
  }

  const handleCreateCloudBackup = async () => {
    try {
      const companyId = getCurrentCompanyId()
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleCreateCloudBackup}
                className="group bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-xl p-6 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-4"
              >
                <Cloud className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Create Cloud Backup</h3>
                  <p className="text-sm opacity-90">Create and upload backup to cloud</p>
                  <p className="text-xs opacity-75 mt-2">Automatically uploaded to Supabase Storage</p>
                </div>
              </button>

              <button
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
                onClick={handleExportCSV}
                className="group bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-6 hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 flex flex-col items-center gap-4"
              >
                <Database className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">Export Summary</h3>
                  <p className="text-sm opacity-90">Download data summary as CSV</p>
                  <p className="text-xs opacity-75 mt-2">Quick overview of record counts</p>
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

          {/* Cloud Backups Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Cloud className="w-6 h-6 text-blue-600" />
                  Cloud Backups
                </h2>
                <p className="text-gray-600">Restore from automatic cloud backups (12 PM & 6 PM)</p>
              </div>
              <button
                onClick={loadCloudBackups}
                disabled={loadingCloudBackups}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCloudBackups ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingCloudBackups ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Loading cloud backups...
              </div>
            ) : cloudBackups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Cloud className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium mb-1">No cloud backups found</p>
                <p className="text-sm">Automatic backups are scheduled at 12 PM and 6 PM</p>
                <p className="text-sm mt-2">Backups are kept for 3 days (rolling retention)</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cloudBackups.map((backup) => (
                      <tr key={backup.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(backup.backup_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {backup.backup_time}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {formatFileSize(backup.size_bytes)}
                          {backup.compressed && (
                            <span className="ml-1 text-xs text-gray-500">(compressed)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Available
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRestoreFromCloud(backup)}
                              disabled={restoringFromCloud}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                            >
                              <CloudDownload className="w-3 h-3" />
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteCloudBackup(backup)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

