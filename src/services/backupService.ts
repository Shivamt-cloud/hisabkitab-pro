import { productService, categoryService } from './productService'
import { saleService } from './saleService'
import { purchaseService, supplierService } from './purchaseService'
import { customerService } from './customerService'
import { salesPersonService, categoryCommissionService, salesPersonCategoryAssignmentService } from './salespersonService'
import { stockAdjustmentService } from './stockAdjustmentService'
import { settingsService } from './settingsService'
import { userService } from './userService'
import { companyService } from './companyService'
import { put, getAll, deleteById, getById, STORES } from '../database/db'
import { AutomaticBackup, BackupSettings } from '../types/backup'
import { cloudBackupService, CloudBackupMetadata } from './cloudBackupService'

export interface BackupData {
  version: string
  export_date: string
  export_by?: string
  data: {
    // Company and User data (for admin management)
    companies: any[] // All companies (admin needs to manage all)
    users: any[] // All users (admin needs to manage all users of all companies)
    // Business data (company-specific)
    products: any[]
    categories: any[]
    sales: any[]
    purchases: any[]
    suppliers: any[]
    customers: any[]
    sales_persons: any[]
    category_commissions: any[]
    sub_categories: any[]
    sales_person_category_assignments: any[]
    stock_adjustments: any[]
    settings: any
  }
}

const BACKUP_VERSION = '1.0.0'

export const backupService = {
  // Export all data
  exportAll: async (userId?: string, companyId?: number | null): Promise<BackupData> => {
    // Always include all companies and users (for admin management from anywhere)
    // Business data is filtered by company if companyId is provided
    const [
      companies,
      users,
      products,
      categories,
      sales,
      purchases,
      suppliers,
      customers,
      salesPersons,
      categoryCommissions,
      salesPersonCategoryAssignments,
      stockAdjustments,
      settings,
    ] = await Promise.all([
      companyService.getAll(true), // All companies (admin needs to manage all)
      userService.getAll(), // All users (admin needs to manage all users of all companies)
      productService.getAll(true, companyId), // Include archived products, filter by company
      categoryService.getAll(),
      saleService.getAll(true, companyId), // Include archived sales, filter by company
      purchaseService.getAll(undefined, companyId), // Filter by company
      supplierService.getAll(companyId), // Filter by company
      customerService.getAll(true, companyId), // Filter by company
      salesPersonService.getAll(true), // Sales persons might be shared, but we can filter if needed
      categoryCommissionService.getAll(true), // Commissions might be shared, but we can filter if needed
      salesPersonCategoryAssignmentService.getAll(true), // Assignments might be shared
      stockAdjustmentService.getAll(companyId), // Filter by company
      settingsService.getAll(), // Settings might be shared
    ])

    const backup: BackupData = {
      version: BACKUP_VERSION,
      export_date: new Date().toISOString(),
      export_by: userId,
      data: {
        companies, // All companies included
        users, // All users included (for admin management)
        products,
        categories,
        sales,
        purchases,
        suppliers,
        customers,
        sales_persons: salesPersons,
        category_commissions: categoryCommissions,
        sub_categories: categories.filter(c => c.is_subcategory),
        sales_person_category_assignments: salesPersonCategoryAssignments,
        stock_adjustments: stockAdjustments,
        settings,
      },
    }

    return backup
  },

  // Export to JSON file
  exportToFile: async (userId?: string, companyId?: number | null): Promise<void> => {
    const backup = await backupService.exportAll(userId, companyId)
    const jsonString = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hisabkitab_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  },

  // Export to CSV (summary data)
  exportSummaryToCSV: async (companyId?: number | null): Promise<void> => {
    const backup = await backupService.exportAll(undefined, companyId)
    const summary = [
      ['Data Type', 'Count'],
      ['Companies', backup.data.companies?.length || 0],
      ['Users', backup.data.users?.length || 0],
      ['Products', backup.data.products.length],
      ['Categories', backup.data.categories.length],
      ['Sales', backup.data.sales.length],
      ['Purchases', backup.data.purchases.length],
      ['Suppliers', backup.data.suppliers.length],
      ['Customers', backup.data.customers.length],
      ['Sales Persons', backup.data.sales_persons.length],
      ['Stock Adjustments', backup.data.stock_adjustments.length],
    ]

    const csvContent = summary.map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hisabkitab_summary_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  },

  // Import data from JSON
  importFromFile: async (jsonString: string, userId?: string, options: { 
    importCompanies?: boolean
    importUsers?: boolean
    importProducts?: boolean
    importSales?: boolean
    importPurchases?: boolean
    importSuppliers?: boolean
    importCustomers?: boolean
    importSalesPersons?: boolean
    importSettings?: boolean
    importStockAdjustments?: boolean
    merge?: boolean // If false, clear existing data first
  } = {}): Promise<{ success: boolean; message: string; imported: number }> => {
    try {
      const backup: BackupData = JSON.parse(jsonString)

      // Validate backup structure
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format')
      }

      let importedCount = 0

      // Clear existing data if not merging
      if (!options.merge) {
        // Note: In a real app, you'd have clear/delete all methods
        // For now, we'll just import and let it merge
      }

      // Import Companies first (needed for users and business data)
      if (options.importCompanies !== false && backup.data.companies) {
        for (const company of backup.data.companies) {
          try {
            const existing = await companyService.getById(company.id)
            if (!existing) {
              await companyService.create({
                name: company.name,
                unique_code: company.unique_code,
                email: company.email || '',
                phone: company.phone || '',
                address: company.address || '',
                city: company.city || '',
                state: company.state || '',
                pincode: company.pincode || '',
                country: company.country || 'India',
                gstin: company.gstin || '',
                pan: company.pan || '',
                website: company.website || '',
                valid_from: company.valid_from || '',
                valid_to: company.valid_to || '',
                is_active: company.is_active !== undefined ? company.is_active : true,
              })
              importedCount++
            } else {
              // Update existing company if needed
              await companyService.update(company.id, {
                name: company.name,
                email: company.email || '',
                phone: company.phone || '',
                address: company.address || '',
                city: company.city || '',
                state: company.state || '',
                pincode: company.pincode || '',
                country: company.country || 'India',
                gstin: company.gstin || '',
                pan: company.pan || '',
                website: company.website || '',
                valid_from: company.valid_from || '',
                valid_to: company.valid_to || '',
                is_active: company.is_active !== undefined ? company.is_active : true,
              })
              importedCount++
            }
          } catch (error) {
            console.error('Error importing company:', error)
          }
        }
      }

      // Import Users (needed for admin management, companies should exist first)
      if (options.importUsers !== false && backup.data.users) {
        for (const user of backup.data.users) {
          try {
            const existing = await userService.getById(user.id)
            if (!existing) {
              await userService.create({
                name: user.name,
                email: user.email,
                password: user.password || 'temp123', // Default password, user should change
                role: user.role || 'staff',
                company_id: user.company_id,
                user_code: user.user_code,
              })
              importedCount++
            } else {
              // Update existing user if needed (preserve password if not provided)
              await userService.update(user.id, {
                name: user.name,
                email: user.email,
                role: user.role || 'staff',
                company_id: user.company_id,
                user_code: user.user_code,
                // Only update password if provided in backup
                ...(user.password && { password: user.password }),
              })
              importedCount++
            }
          } catch (error) {
            console.error('Error importing user:', error)
          }
        }
      }

      // Import Categories (needed for products)
      if (backup.data.categories) {
        for (const category of backup.data.categories) {
          try {
            const existing = await categoryService.getById(category.id)
            if (!existing) {
              await categoryService.create({
                name: category.name,
                description: category.description || '',
                parent_id: category.parent_id,
                is_subcategory: category.is_subcategory || false,
              })
              importedCount++
            }
          } catch (error) {
            console.error('Error importing category:', error)
          }
        }
      }

      // Import Suppliers
      if (options.importSuppliers !== false && backup.data.suppliers) {
        for (const supplier of backup.data.suppliers) {
          try {
            // Check if supplier already exists
            const existing = await supplierService.getById(supplier.id)
            if (!existing) {
              await supplierService.create({
                name: supplier.name,
                email: supplier.email || '',
                phone: supplier.phone || '',
                gstin: supplier.gstin || '',
                address: supplier.address || '',
                city: supplier.city || '',
                state: supplier.state || '',
                pincode: supplier.pincode || '',
                contact_person: supplier.contact_person || '',
                is_registered: supplier.is_registered || false,
              })
              importedCount++
            }
          } catch (error) {
            console.error('Error importing supplier:', error)
          }
        }
      }

      // Import Customers
      if (options.importCustomers !== false && backup.data.customers) {
        for (const customer of backup.data.customers) {
          try {
            const existing = await customerService.getById(customer.id)
            if (!existing) {
              await customerService.create({
                name: customer.name,
                email: customer.email || '',
                phone: customer.phone || '',
                gstin: customer.gstin || '',
                address: customer.address || '',
                city: customer.city || '',
                state: customer.state || '',
                pincode: customer.pincode || '',
                contact_person: customer.contact_person || '',
                credit_limit: customer.credit_limit || 0,
                is_active: customer.is_active !== undefined ? customer.is_active : true,
              })
              importedCount++
            }
          } catch (error) {
            console.error('Error importing customer:', error)
          }
        }
      }

      // Import Products
      if (options.importProducts !== false && backup.data.products) {
        for (const product of backup.data.products) {
          try {
            const existing = await productService.getById(product.id, true)
            if (!existing) {
              await productService.create({
                name: product.name || 'Imported Product',
                sku: product.sku,
                description: product.description,
                category_id: product.category_id,
                unit: product.unit || 'pcs',
                purchase_price: product.purchase_price,
                selling_price: product.selling_price,
                stock_quantity: product.stock_quantity || 0,
                min_stock_level: product.min_stock_level,
                hsn_code: product.hsn_code,
                gst_rate: product.gst_rate || 0,
                tax_type: product.tax_type || 'exclusive',
                barcode: product.barcode,
                is_active: product.is_active !== undefined ? product.is_active : (product.status === 'active'),
                status: product.status || 'active',
                barcode_status: product.barcode_status || (product.barcode ? 'active' : 'inactive'),
              })
              importedCount++
            }
          } catch (error) {
            console.error('Error importing product:', error)
          }
        }
      }

      // Import Purchases (requires products and suppliers to exist)
      if (options.importPurchases !== false && backup.data.purchases) {
        for (const purchase of backup.data.purchases) {
          try {
            const existing = await purchaseService.getById(purchase.id)
            if (!existing) {
              if (purchase.type === 'gst') {
                const gstPurchase = purchase as any
                await purchaseService.createGST({
                  supplier_id: gstPurchase.supplier_id,
                  invoice_number: gstPurchase.invoice_number || '',
                  purchase_date: gstPurchase.purchase_date,
                  items: gstPurchase.items || [],
                  subtotal: gstPurchase.subtotal || 0,
                  total_tax: gstPurchase.total_tax || gstPurchase.tax_amount || 0,
                  grand_total: gstPurchase.grand_total || 0,
                  payment_status: (gstPurchase.payment_status || 'pending') as any,
                  notes: gstPurchase.notes,
                  created_by: userId ? parseInt(userId) : 1,
                } as any)
                importedCount++
              } else {
                const simplePurchase = purchase as any
                await purchaseService.createSimple({
                  supplier_id: simplePurchase.supplier_id,
                  invoice_number: simplePurchase.invoice_number,
                  purchase_date: simplePurchase.purchase_date,
                  items: simplePurchase.items || [],
                  total_amount: simplePurchase.total_amount || 0,
                  payment_status: (simplePurchase.payment_status || 'pending') as any,
                  notes: simplePurchase.notes,
                } as any)
                importedCount++
              }
            }
          } catch (error) {
            console.error('Error importing purchase:', error)
          }
        }
      }

      // Import Settings
      if (options.importSettings !== false && backup.data.settings) {
        await settingsService.updateAll(backup.data.settings, userId ? parseInt(userId) : undefined)
        importedCount++
      }

      return {
        success: true,
        message: `Successfully imported ${importedCount} records`,
        imported: importedCount,
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to import backup file',
        imported: 0,
      }
    }
  },

  // Get backup statistics
  getStatistics: async (companyId?: number | null) => {
    const [
      companies,
      users,
      products,
      categories,
      sales,
      purchases,
      suppliers,
      customers,
      salesPersons,
      categoryCommissions,
      subCategories,
      salesPersonCategoryAssignments,
      stockAdjustments,
    ] = await Promise.all([
      companyService.getAll(true), // All companies (for admin management)
      userService.getAll(), // All users (for admin management)
      productService.getAll(true, companyId), // Filter by company
      categoryService.getAll(),
      saleService.getAll(true, companyId), // Filter by company
      purchaseService.getAll(undefined, companyId), // Filter by company
      supplierService.getAll(companyId), // Filter by company
      customerService.getAll(true, companyId), // Filter by company
      salesPersonService.getAll(true), // Sales persons might be shared
      categoryCommissionService.getAll(true), // Commissions might be shared
      categoryService.getAll(),
      salesPersonCategoryAssignmentService.getAll(true), // Assignments might be shared
      stockAdjustmentService.getAll(companyId), // Filter by company
    ])

    return {
      companies: companies.length,
      users: users.length,
      products: products.length,
      categories: categories.length,
      sales: sales.length,
      purchases: purchases.length,
      suppliers: suppliers.length,
      customers: customers.length,
      sales_persons: salesPersons.length,
      category_commissions: categoryCommissions.length,
      sub_categories: subCategories.filter(c => c.is_subcategory).length,
      sales_person_category_assignments: salesPersonCategoryAssignments.length,
      stock_adjustments: stockAdjustments.length,
    }
  },

  // Automatic Backup Functions
  async createAutomaticBackup(
    userId?: string, 
    companyId?: number | null,
    backupTime?: '12:00' | '18:00'
  ): Promise<{ success: boolean; backupId?: number; fileName?: string; cloudUploaded?: boolean; message?: string }> {
    try {
      const backup = await backupService.exportAll(userId, companyId)
      const backupDataString = JSON.stringify(backup)
      const now = new Date()
      
      const automaticBackup: AutomaticBackup = {
        backup_date: now.toISOString().split('T')[0],
        created_at: now.toISOString(),
        backup_data: backupDataString,
        file_name: `hisabkitab_auto_backup_${now.toISOString().split('T')[0]}_${Date.now()}.json`,
        size_bytes: new Blob([backupDataString]).size,
      }

      const saved = await put(STORES.AUTOMATIC_BACKUPS, automaticBackup)
      
      // Upload to cloud if available
      let cloudUploaded = false
      try {
        const { cloudBackupService } = await import('./cloudBackupService')
        const uploadResult = await cloudBackupService.uploadBackup(
          backup,
          companyId ?? null,
          backupTime || '12:00'
        )
        cloudUploaded = uploadResult.success
        if (uploadResult.success) {
          console.log('✅ Backup uploaded to cloud successfully')
        } else {
          console.warn('⚠️ Backup saved locally, cloud upload failed:', uploadResult.error)
        }
      } catch (cloudError) {
        console.warn('⚠️ Cloud backup service not available, backup saved locally only:', cloudError)
      }
      
      // Auto-download backup file (only if cloud upload failed or disabled)
      if (!cloudUploaded) {
        try {
          const blob = new Blob([backupDataString], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = automaticBackup.file_name
          link.click()
          URL.revokeObjectURL(url)
        } catch (downloadError) {
          console.warn('Could not auto-download backup:', downloadError)
        }
      }

      return { 
        success: true, 
        backupId: saved.id, 
        fileName: automaticBackup.file_name,
        cloudUploaded
      }
    } catch (error: any) {
      console.error('Error creating automatic backup:', error)
      return { 
        success: false,
        message: error?.message || error?.toString() || 'Unknown error creating backup'
      }
    }
  },

  async getAllAutomaticBackups(): Promise<AutomaticBackup[]> {
    try {
      const backups = await getAll<AutomaticBackup>(STORES.AUTOMATIC_BACKUPS)
      return backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error getting automatic backups:', error)
      return []
    }
  },

  async getAutomaticBackup(backupId: number): Promise<AutomaticBackup | null> {
    try {
      return await getById<AutomaticBackup>(STORES.AUTOMATIC_BACKUPS, backupId) || null
    } catch (error) {
      console.error('Error getting automatic backup:', error)
      return null
    }
  },

  async deleteAutomaticBackup(backupId: number): Promise<boolean> {
    try {
      await deleteById(STORES.AUTOMATIC_BACKUPS, backupId)
      return true
    } catch (error) {
      console.error('Error deleting automatic backup:', error)
      return false
    }
  },

  async cleanupOldBackups(keepDays: number = 30): Promise<number> {
    try {
      const backups = await backupService.getAllAutomaticBackups()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - keepDays)
      
      let deletedCount = 0
      for (const backup of backups) {
        const backupDate = new Date(backup.created_at)
        if (backupDate < cutoffDate && backup.id) {
          await backupService.deleteAutomaticBackup(backup.id)
          deletedCount++
        }
      }
      
      return deletedCount
    } catch (error) {
      console.error('Error cleaning up old backups:', error)
      return 0
    }
  },

  async restoreFromAutomaticBackup(backupId: number, userId?: string): Promise<{ success: boolean; message: string; imported: number }> {
    try {
      const backup = await backupService.getAutomaticBackup(backupId)
      if (!backup) {
        return { success: false, message: 'Backup not found', imported: 0 }
      }

      return await backupService.importFromFile(backup.backup_data, userId, {
        importSettings: true,
        merge: false,
      })
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to restore backup', imported: 0 }
    }
  },

  async getBackupSettings(): Promise<BackupSettings> {
    return {
      enabled: true,
      frequency: 'daily',
      time_of_day: '02:00',
      keep_backups_days: 30,
      auto_download: true,
    }
  },

  // Cloud Backup Functions
  /**
   * List cloud backups for a company
   */
  listCloudBackups: async (companyId?: number | null): Promise<{
    success: boolean
    backups?: CloudBackupMetadata[]
    error?: string
  }> => {
    try {
      return await cloudBackupService.listBackups(companyId ?? null)
    } catch (error: any) {
      console.error('Error listing cloud backups:', error)
      return {
        success: false,
        error: error.message || 'Failed to list cloud backups',
      }
    }
  },

  /**
   * Restore from cloud backup
   */
  restoreFromCloud: async (
    filePath: string,
    companyId?: number | null,
    userId?: string,
    options: {
      importCompanies?: boolean
      importUsers?: boolean
      importProducts?: boolean
      importSales?: boolean
      importPurchases?: boolean
      importSuppliers?: boolean
      importCustomers?: boolean
      importSalesPersons?: boolean
      importSettings?: boolean
      importStockAdjustments?: boolean
      merge?: boolean
    } = {}
  ): Promise<{ success: boolean; message: string; imported: number }> => {
    try {
      // Download backup from cloud
      const downloadResult = await cloudBackupService.downloadBackup(filePath, companyId ?? null)
      
      if (!downloadResult.success || !downloadResult.data) {
        return {
          success: false,
          message: downloadResult.error || 'Failed to download backup from cloud',
          imported: 0,
        }
      }

      // Import the backup data
      const jsonString = JSON.stringify(downloadResult.data)
      return await backupService.importFromFile(jsonString, userId, options)
    } catch (error: any) {
      console.error('Error restoring from cloud backup:', error)
      return {
        success: false,
        message: error.message || 'Failed to restore from cloud backup',
        imported: 0,
      }
    }
  },

  /**
   * Delete cloud backup
   */
  deleteCloudBackup: async (
    filePath: string,
    companyId?: number | null
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      return await cloudBackupService.deleteBackup(filePath, companyId ?? null)
    } catch (error: any) {
      console.error('Error deleting cloud backup:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete cloud backup',
      }
    }
  },

  /**
   * Cleanup old cloud backups (3-day rolling retention)
   */
  cleanupCloudBackups: async (companyId?: number | null): Promise<{
    success: boolean
    deletedCount?: number
    error?: string
  }> => {
    try {
      return await cloudBackupService.cleanupOldBackups(companyId ?? null)
    } catch (error: any) {
      console.error('Error cleaning up cloud backups:', error)
      return {
        success: false,
        error: error.message || 'Failed to cleanup cloud backups',
      }
    }
  },
}
