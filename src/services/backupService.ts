import { productService, categoryService } from './productService'
import { saleService } from './saleService'
import { purchaseService, supplierService } from './purchaseService'
import { Purchase } from '../types/purchase'
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
    companyId?: number | null // Optional: company ID to assign to imported records
  } = {}): Promise<{ success: boolean; message: string; imported: number }> => {
    try {
      const backup: BackupData = JSON.parse(jsonString)
      const companyId = options.companyId

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
        const allCategories = await categoryService.getAll()
        for (const category of backup.data.categories) {
          try {
            // Check by ID first
            const existingById = await categoryService.getById(category.id)
            if (existingById) {
              continue // Skip if exists by ID
            }

            // Check for duplicates by name (and parent_id for subcategories)
            const duplicate = allCategories.find(c => {
              // Match by name (case-insensitive)
              if (c.name.toLowerCase() !== category.name.toLowerCase()) return false
              // For subcategories, also match parent_id
              if (category.parent_id || c.parent_id) {
                return c.parent_id === category.parent_id
              }
              // For main categories, both should have no parent
              return !c.parent_id && !category.parent_id
            })

            if (duplicate) {
              console.log(`Skipping duplicate category: ${category.name} (already exists)`)
              continue
            }

            await categoryService.create({
              name: category.name,
              description: category.description || '',
              parent_id: category.parent_id,
              is_subcategory: category.is_subcategory || false,
            })
            importedCount++
          } catch (error) {
            console.error('Error importing category:', error)
          }
        }
      }

      // Import Suppliers
      if (options.importSuppliers !== false && backup.data.suppliers) {
        for (const supplier of backup.data.suppliers) {
          try {
            // Check if supplier already exists by ID
            const existingById = await supplierService.getById(supplier.id)
            if (existingById) {
              continue // Skip if exists by ID
            }

            // Check for duplicates by name, email, or phone
            // Get suppliers from the same company if companyId is provided, otherwise all suppliers
            const targetCompanyId = companyId || supplier.company_id
            const allSuppliers = targetCompanyId 
              ? await supplierService.getAll(targetCompanyId)
              : await supplierService.getAll(userId ? undefined : null)
            
            const duplicate = allSuppliers.find(s => {
              // For name, email, phone: check within same company
              const sameCompany = targetCompanyId ? (s.company_id === targetCompanyId) : true
              
              // Match by name (case-insensitive) within same company
              if (sameCompany && s.name.toLowerCase() === supplier.name.toLowerCase()) return true
              // Match by email if both have email, within same company
              if (sameCompany && s.email && supplier.email && s.email.toLowerCase() === supplier.email.toLowerCase()) return true
              // Match by phone if both have phone, within same company
              if (sameCompany && s.phone && supplier.phone && s.phone === supplier.phone) return true
              // Match by GSTIN globally (GSTIN should be unique across all companies)
              if (s.gstin && supplier.gstin && s.gstin === supplier.gstin) return true
              return false
            })

            if (duplicate) {
              console.log(`Skipping duplicate supplier: ${supplier.name} (already exists)`)
              continue
            }

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
              company_id: companyId || supplier.company_id, // Set company_id from options or use existing
            })
            importedCount++
          } catch (error) {
            console.error('Error importing supplier:', error)
          }
        }
      }

      // Import Customers
      console.log(`📦 [Import] Customer import check. Options.importCustomers: ${options.importCustomers}, Backup has customers: ${!!backup.data.customers}, Count: ${backup.data.customers?.length || 0}`)
      if (options.importCustomers !== false && backup.data.customers && backup.data.customers.length > 0) {
        console.log(`📦 Starting import of ${backup.data.customers.length} customers for company ${companyId}`)
        let customersImported = 0
        let customersSkipped = 0
        let customersErrors = 0
        
        for (const customer of backup.data.customers) {
          try {
            const existing = await customerService.getById(customer.id)
            if (!existing) {
              // Preserve all customer fields from the backup
              await customerService.create({
                name: customer.name || '',
                email: customer.email || '',
                phone: customer.phone || '',
                gstin: customer.gstin || '',
                address: customer.address || '',
                city: customer.city || '',
                state: customer.state || '',
                pincode: customer.pincode || '',
                contact_person: customer.contact_person || '',
                credit_limit: customer.credit_limit !== undefined ? customer.credit_limit : 0,
                is_active: customer.is_active !== undefined ? customer.is_active : true,
                company_id: companyId || customer.company_id, // Set company_id from options or use existing
              })
              customersImported++
              importedCount++
            } else {
              customersSkipped++
              // Update existing customer with full information if needed
              try {
                await customerService.update(customer.id, {
                  name: customer.name || existing.name,
                  email: customer.email || existing.email,
                  phone: customer.phone || existing.phone,
                  gstin: customer.gstin || existing.gstin,
                  address: customer.address || existing.address,
                  city: customer.city || existing.city,
                  state: customer.state || existing.state,
                  pincode: customer.pincode || existing.pincode,
                  contact_person: customer.contact_person || existing.contact_person,
                  credit_limit: customer.credit_limit !== undefined ? customer.credit_limit : existing.credit_limit,
                  is_active: customer.is_active !== undefined ? customer.is_active : existing.is_active,
                })
                importedCount++
              } catch (updateError) {
                console.error(`Error updating customer ${customer.id}:`, updateError)
              }
            }
          } catch (error: any) {
            customersErrors++
            console.error(`Error importing customer ${customer.name || customer.id}:`, {
              error: error.message || error,
              customer_data: customer,
            })
          }
        }
        
        console.log(`📊 Customers Import Summary: Imported: ${customersImported}, Updated: ${customersSkipped}, Errors: ${customersErrors}`)
      }

      // Import Products
      if (options.importProducts !== false && backup.data.products) {
        // Get products filtered by company for duplicate checking
        const targetCompanyId = companyId !== undefined ? companyId : (userId ? undefined : null)
        const allProducts = await productService.getAll(true, targetCompanyId)
        for (const product of backup.data.products) {
          try {
            // Check by ID first
            const existingById = await productService.getById(product.id, true)
            if (existingById) {
              continue // Skip if exists by ID
            }

            // Check for duplicates by name, SKU, or barcode within the same company
            const duplicate = allProducts.find(p => {
              // Match by name (case-insensitive) within same company
              if (p.name.toLowerCase() === (product.name || '').toLowerCase()) return true
              // Match by SKU if both have SKU
              if (p.sku && product.sku && p.sku.toLowerCase() === product.sku.toLowerCase()) return true
              // Match by barcode if both have barcode
              if (p.barcode && product.barcode && p.barcode === product.barcode) return true
              return false
            })

            if (duplicate) {
              console.log(`Skipping duplicate product: ${product.name} (already exists)`)
              continue
            }

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
              company_id: companyId || product.company_id, // Set company_id from options or use existing
            })
            importedCount++
          } catch (error) {
            console.error('Error importing product:', error)
          }
        }
      }

      // Import Purchases (requires products and suppliers to exist)
      console.log(`📦 [Import] Purchase import check. Options.importPurchases: ${options.importPurchases}, Backup has purchases: ${!!backup.data.purchases}, Count: ${backup.data.purchases?.length || 0}`)
      if (options.importPurchases !== false && backup.data.purchases && Array.isArray(backup.data.purchases) && backup.data.purchases.length > 0) {
        console.log(`📦 [Import] Starting purchase import. Total purchases in file: ${backup.data.purchases.length}`)
        console.log(`📦 [Import] Company ID: ${companyId}, User ID: ${userId}`)
        console.log(`📦 [Import] Options:`, { importPurchases: options.importPurchases })
        
        // Load purchases filtered by company for duplicate checking
        const allPurchases = await purchaseService.getAll(undefined, companyId !== undefined ? companyId : (userId ? undefined : null))
        const allProducts = await productService.getAll(true, companyId !== undefined ? companyId : (userId ? undefined : null))
        // Load suppliers filtered by company for proper matching
        const allSuppliers = await supplierService.getAll(companyId !== undefined ? companyId : (userId ? undefined : null))
        
        console.log(`📦 [Import] Existing data: ${allPurchases.length} purchases, ${allProducts.length} products, ${allSuppliers.length} suppliers`)
        
        // Create lookup maps for faster access
        const purchaseIdMap = new Set(allPurchases.map(p => p.id))
        const purchaseKeyMap = new Map<string, Purchase>()
        allPurchases.forEach(p => {
          const key = `${p.invoice_number}_${new Date(p.purchase_date).toISOString().split('T')[0]}_${p.supplier_id || (p as any).supplier_name || ''}`
          purchaseKeyMap.set(key.toLowerCase(), p)
        })
        const productNameMap = new Map<string, any>()
        allProducts.forEach(p => {
          productNameMap.set(p.name.toLowerCase(), p)
        })
        const supplierNameMap = new Map<string, any>()
        allSuppliers.forEach(s => {
          supplierNameMap.set(s.name.toLowerCase(), s)
        })
        
        let processedCount = 0
        let skippedCount = 0
        let errorCount = 0
        let purchaseImportedCount = 0 // Separate counter for purchases
        let itemsWithBarcodes = 0
        let itemsWithArticles = 0
        let itemsWithoutBarcodes = 0
        
        const totalPurchases = backup.data.purchases.length
        console.log(`📦 Starting import of ${totalPurchases} purchases for company ${companyId}`)
        
        // Process in batches to show progress
        const BATCH_SIZE = 50
        let batchStart = 0
        
        while (batchStart < totalPurchases) {
          const batch = backup.data.purchases.slice(batchStart, batchStart + BATCH_SIZE)
          
          for (const purchase of batch) {
            processedCount++
            
            // Show progress every 50 records
            if (processedCount % 50 === 0) {
              console.log(`⏳ Progress: ${processedCount}/${totalPurchases} (${Math.round(processedCount/totalPurchases*100)}%)`)
            }
            
            try {
              // Check by ID first (using Set for O(1) lookup)
              if (purchaseIdMap.has(purchase.id)) {
                skippedCount++
                continue // Skip if exists by ID
              }

              // Check for duplicates using Map for O(1) lookup
              const purchaseDate = new Date(purchase.purchase_date).toISOString().split('T')[0]
              const supplierKey = purchase.supplier_id || purchase.supplier_name || ''
              const duplicateKey = `${purchase.invoice_number}_${purchaseDate}_${supplierKey}`.toLowerCase()
              
              const existingPurchase = purchaseKeyMap.get(duplicateKey)
              if (existingPurchase) {
                // Check if it's truly a duplicate (same company)
                if (companyId !== undefined && companyId !== null) {
                  const existingCompanyId = existingPurchase.company_id
                  if (existingCompanyId !== null && existingCompanyId !== undefined && existingCompanyId !== companyId) {
                    // Different companies, not a duplicate - continue
                  } else {
                    // Same company or old data - skip as duplicate
                    skippedCount++
                    continue
                  }
                } else {
                  // No company filter - skip as duplicate
                  skippedCount++
                  continue
                }
              }

              // Process purchase items: try to match products by name, barcode, or article
              // IMPORTANT: Preserve barcode and article data for sales search functionality
              const processedItems = (purchase.items || []).map((item: any) => {
                // Preserve all item data including barcode and article
                // CRITICAL: Convert barcode/article to strings (Excel might provide numbers)
                let barcodeValue = item.barcode
                if (barcodeValue !== null && barcodeValue !== undefined) {
                  barcodeValue = String(barcodeValue).trim()
                  if (barcodeValue === '' || barcodeValue === 'null' || barcodeValue === 'undefined') {
                    barcodeValue = undefined
                  }
                } else {
                  barcodeValue = undefined
                }
                
                let articleValue = item.article
                if (articleValue !== null && articleValue !== undefined) {
                  articleValue = String(articleValue).trim()
                  if (articleValue === '' || articleValue === 'null' || articleValue === 'undefined') {
                    articleValue = undefined
                  }
                } else {
                  articleValue = undefined
                }
                
                const processedItem: any = {
                  ...item,
                  // Preserve barcode and article - critical for sales search
                  barcode: barcodeValue,
                  article: articleValue,
                }
                
                // If product_id already exists and is valid, use it
                if (processedItem.product_id && processedItem.product_id > 0) {
                  return processedItem
                }
                
                // Strategy 1: If product_name exists, try to find product by name
                if (item.product_name && item.product_name.trim()) {
                  const product = productNameMap.get(item.product_name.toLowerCase())
                  if (product) {
                    processedItem.product_id = product.id
                    return processedItem
                  } else {
                    // Product not found - will be created later using product_name
                    processedItem.product_id = null
                    processedItem._needsProductCreation = true
                    processedItem._productNameForCreation = item.product_name.trim()
                    return processedItem
                  }
                }
                
                // Strategy 2: If product_name is empty but barcode/article exists, try to match existing products
                // First try to match by barcode (most reliable)
                if (processedItem.barcode && processedItem.barcode.trim()) {
                  const barcodeStr = String(processedItem.barcode).trim()
                  const existingProductByBarcode = allProducts.find(p => 
                    p.barcode && String(p.barcode).trim() === barcodeStr
                  )
                  if (existingProductByBarcode) {
                    processedItem.product_id = existingProductByBarcode.id
                    console.log(`✅ [Import] Matched product by barcode "${barcodeStr}": ${existingProductByBarcode.name} (ID: ${existingProductByBarcode.id})`)
                    return processedItem
                  }
                }
                
                // Try to match by article (search in purchase items of existing products)
                // Note: This is more complex, so we'll create product using article/barcode instead
                
                // Strategy 3: Create product using article (preferred) or barcode as name
                if (processedItem.article && processedItem.article.trim()) {
                  // Create product using article as name
                  processedItem.product_id = null
                  processedItem._needsProductCreation = true
                  processedItem._productNameForCreation = String(processedItem.article).trim()
                  processedItem._creationReason = 'article'
                  return processedItem
                } else if (processedItem.barcode && processedItem.barcode.trim()) {
                  // Create product using barcode as name (fallback)
                  processedItem.product_id = null
                  processedItem._needsProductCreation = true
                  processedItem._productNameForCreation = String(processedItem.barcode).trim()
                  processedItem._creationReason = 'barcode'
                  return processedItem
                }
                
                // If nothing works, set to 0 (will be skipped)
                console.warn(`⚠️ [Import] Purchase item has no product_id, product_name, article, or barcode - cannot create product. Item:`, item)
                processedItem.product_id = 0
                return processedItem
              })
              
              // Create missing products in batch
              for (const item of processedItems) {
                if (item._needsProductCreation && item._productNameForCreation) {
                  try {
                    // Check if product was already created in this batch (avoid duplicates)
                    const existingInBatch = productNameMap.get(item._productNameForCreation.toLowerCase())
                    if (existingInBatch) {
                      item.product_id = existingInBatch.id
                      delete item._needsProductCreation
                      delete item._productNameForCreation
                      delete item._creationReason
                      continue
                    }
                    
                    // Ensure barcode is properly formatted (string, not number)
                    const productBarcode = item.barcode && String(item.barcode).trim() ? String(item.barcode).trim() : ''
                    
                    const product = await productService.create({
                      name: item._productNameForCreation,
                      sku: item._productNameForCreation.substring(0, 20).toUpperCase().replace(/\s/g, '-'),
                      description: item.product_name || item._productNameForCreation,
                      unit: item.unit || 'pcs',
                      purchase_price: item.unit_price || item.purchase_price || 0,
                      selling_price: item.sale_price || item.mrp || item.unit_price || 0,
                      stock_quantity: 0,
                      hsn_code: item.hsn_code || '',
                      gst_rate: item.gst_rate || 0,
                      tax_type: 'exclusive',
                      barcode: productBarcode,
                      is_active: true,
                      status: 'active',
                      barcode_status: productBarcode ? 'active' : 'inactive',
                      company_id: companyId ?? undefined,
                    })
                    
                    // Log barcode assignment for debugging
                    if (productBarcode) {
                      console.log(`✅ [Import] Created product "${product.name}" with barcode "${productBarcode}"`)
                    }
                    item.product_id = product.id
                    productNameMap.set(item._productNameForCreation.toLowerCase(), product)
                    allProducts.push(product)
                    console.log(`✅ [Import] Created product "${product.name}" (ID: ${product.id}) from ${item._creationReason || 'product_name'}`)
                    delete item._needsProductCreation
                    delete item._productNameForCreation
                    delete item._creationReason
                  } catch (error) {
                    console.error(`❌ [Import] Failed to create product "${item._productNameForCreation}":`, error)
                    item.product_id = 0
                    delete item._needsProductCreation
                    delete item._productNameForCreation
                    delete item._creationReason
                  }
                }
              }

              // Verify supplier exists - check by company_id and name (using Map for O(1) lookup)
              let supplierId = purchase.supplier_id
              if (!supplierId && purchase.supplier_name) {
                // Try to find supplier by name (using Map)
                const supplier = supplierNameMap.get(purchase.supplier_name.toLowerCase())
                
                if (supplier && (!companyId || supplier.company_id === companyId || !supplier.company_id)) {
                  supplierId = supplier.id
                  // Update supplier with GSTIN if missing (batch updates later)
                  if (purchase.supplier_gstin && !supplier.gstin) {
                    try {
                      await supplierService.update(supplier.id, {
                        gstin: purchase.supplier_gstin,
                        is_registered: true,
                      })
                      supplier.gstin = purchase.supplier_gstin
                      supplier.is_registered = true
                    } catch (updateError) {
                      // Continue even if update fails
                    }
                  }
                } else {
                  // Supplier not found - create it
                  try {
                    const newSupplier = await supplierService.create({
                      name: purchase.supplier_name,
                      email: '',
                      phone: '',
                      gstin: purchase.supplier_gstin || '',
                      address: '',
                      city: '',
                      state: '',
                      pincode: '',
                      contact_person: '',
                      is_registered: !!purchase.supplier_gstin,
                      company_id: companyId ?? undefined,
                    })
                    supplierId = newSupplier.id
                    supplierNameMap.set(purchase.supplier_name.toLowerCase(), newSupplier)
                    allSuppliers.push(newSupplier)
                  } catch (supplierError: any) {
                    errorCount++
                    continue // Skip this purchase if supplier can't be created
                  }
                }
              } else if (supplierId) {
                // Supplier ID provided - verify it exists
                const supplier = allSuppliers.find(s => s.id === supplierId)
                if (!supplier) {
                  // Try to find by name
                  if (purchase.supplier_name) {
                    const supplierByName = supplierNameMap.get(purchase.supplier_name.toLowerCase())
                    if (supplierByName && (!companyId || supplierByName.company_id === companyId || !supplierByName.company_id)) {
                      supplierId = supplierByName.id
                    } else {
                      errorCount++
                      continue
                    }
                  } else {
                    errorCount++
                    continue
                  }
                } else if (companyId && supplier.company_id && supplier.company_id !== companyId) {
                  errorCount++
                  continue
                }
              }

              if (!supplierId) {
                errorCount++
                continue
              }

            // Clean up processed items and ensure valid product_id
            // Remove internal processing flags and ensure product_id is valid
            // CRITICAL: Preserve barcode and article fields for sales functionality
            // ALWAYS assign sequential IDs (SR No) to items: 1, 2, 3, ...
            // This ensures consistent sequential numbering regardless of Excel SrNo column
            const validItems = processedItems.map((item: any, index: number) => {
              const cleanItem: any = { ...item }
              // Remove internal processing flags
              delete cleanItem._needsProductCreation
              delete cleanItem._productNameForCreation
              delete cleanItem._creationReason
              // Ensure product_id is a number (should be set by now, but fallback to 0)
              cleanItem.product_id = cleanItem.product_id || 0
              // ALWAYS assign sequential ID (SR No) starting from 1
              // System ignores any SrNo from Excel sheet and uses its own logic
              cleanItem.id = index + 1
              
              // CRITICAL: Ensure barcode and article are properly preserved as strings
              // Convert numbers to strings (Excel might read barcodes as numbers)
              if (cleanItem.barcode !== null && cleanItem.barcode !== undefined) {
                const barcodeStr = String(cleanItem.barcode).trim()
                cleanItem.barcode = barcodeStr || undefined // Use undefined for empty strings
              } else {
                cleanItem.barcode = undefined
              }
              
              if (cleanItem.article !== null && cleanItem.article !== undefined) {
                const articleStr = String(cleanItem.article).trim()
                cleanItem.article = articleStr || undefined // Use undefined for empty strings
              } else {
                cleanItem.article = undefined
              }
              
              // Log barcode preservation for debugging and count statistics
              if (cleanItem.barcode) {
                itemsWithBarcodes++
                if (processedCount % 100 === 0) { // Only log every 100th item to reduce spam
                  console.log(`✅ [Import] Preserving barcode "${cleanItem.barcode}" for product_id ${cleanItem.product_id}, article: ${cleanItem.article || 'N/A'}`)
                }
              } else {
                itemsWithoutBarcodes++
              }
              
              if (cleanItem.article) {
                itemsWithArticles++
              }
              
              return cleanItem
            }).filter((item: any) => {
              // Filter out items that still have product_id = 0 (couldn't create/find product)
              // Log a warning for debugging
              if (item.product_id === 0) {
                console.warn(`⚠️ [Import] Skipping purchase item with product_id 0. Item data:`, {
                  article: item.article,
                  barcode: item.barcode,
                  product_name: item.product_name,
                  unit_price: item.unit_price
                })
                return false
              }
              return true
            })
            
            // Skip purchase if no valid items remain
            if (validItems.length === 0) {
              console.warn(`⚠️ [Import] Skipping purchase - no valid items after processing. Purchase invoice: ${purchase.invoice_number || 'N/A'}`)
              errorCount++
              continue
            }

            if (purchase.type === 'gst') {
              const gstPurchase = purchase as any
              try {
                const createdPurchase = await purchaseService.createGST({
                  supplier_id: supplierId,
                  invoice_number: gstPurchase.invoice_number || '',
                  purchase_date: gstPurchase.purchase_date,
                  items: validItems,
                  subtotal: gstPurchase.subtotal || 0,
                  total_tax: gstPurchase.total_tax || gstPurchase.tax_amount || 0,
                  grand_total: gstPurchase.grand_total || 0,
                  payment_status: (gstPurchase.payment_status || 'pending') as any,
                  notes: gstPurchase.notes,
                  company_id: companyId, // Set company_id from options
                  created_by: userId ? parseInt(userId) : 1,
                } as any)
                purchaseImportedCount++
                importedCount++
                // Only log every 10th import to reduce console spam
                if (purchaseImportedCount % 10 === 0) {
                  console.log(`✅ Imported ${purchaseImportedCount} purchases so far... (Invoice: ${gstPurchase.invoice_number || 'N/A'})`)
                }
              } catch (createError: any) {
                console.error(`❌ Failed to create GST purchase:`, {
                  invoice: gstPurchase.invoice_number || 'N/A',
                  supplier_id: supplierId,
                  items_count: validItems.length,
                  error: createError.message || createError,
                })
                errorCount++
                continue
              }
            } else {
              const simplePurchase = purchase as any
              try {
                const createdPurchase = await purchaseService.createSimple({
                  supplier_id: supplierId,
                  invoice_number: simplePurchase.invoice_number,
                  purchase_date: simplePurchase.purchase_date,
                  items: validItems,
                  total_amount: simplePurchase.total_amount || 0,
                  payment_status: (simplePurchase.payment_status || 'pending') as any,
                  notes: simplePurchase.notes,
                  company_id: companyId, // Set company_id from options
                  created_by: userId ? parseInt(userId) : 1,
                } as any)
                purchaseImportedCount++
                importedCount++
                // Only log every 10th import to reduce console spam
                if (purchaseImportedCount % 10 === 0) {
                  console.log(`✅ Imported ${purchaseImportedCount} purchases so far... (Invoice: ${simplePurchase.invoice_number || 'N/A'})`)
                }
              } catch (createError: any) {
                console.error(`❌ Failed to create Simple purchase:`, {
                  invoice: simplePurchase.invoice_number || 'N/A',
                  supplier_id: supplierId,
                  items_count: validItems.length,
                  error: createError.message || createError,
                })
                errorCount++
                continue
              }
            }
          } catch (error: any) {
            errorCount++
            // Only log detailed errors for first few failures to avoid console spam
            if (errorCount <= 5) {
              console.error(`❌ Error importing purchase ${processedCount}/${backup.data.purchases.length}:`, error)
              console.error('Purchase details:', {
                invoice_number: purchase.invoice_number || 'N/A',
                supplier_id: purchase.supplier_id || 'N/A',
                supplier_name: purchase.supplier_name || 'N/A',
                items_count: purchase.items?.length || 0,
                company_id: companyId,
                error_message: error.message,
              })
            }
            // Continue with next purchase instead of stopping
          }
          }
          
          batchStart += BATCH_SIZE
          
          // Small delay between batches to prevent UI freezing
          if (batchStart < totalPurchases) {
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        }
        
        console.log(`📊 Purchase Import Summary: Processed: ${processedCount}, Imported: ${purchaseImportedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`)
        console.log(`📊 Barcode Statistics: Items with barcodes: ${itemsWithBarcodes}, Items with articles: ${itemsWithArticles}, Items without barcodes: ${itemsWithoutBarcodes}`)
      } else {
        console.log(`⚠️ [Import] Purchase import skipped. Options.importPurchases: ${options.importPurchases}, Backup has purchases: ${!!backup.data.purchases}`)
      }

      // Import Sales (if enabled and data exists)
      if (options.importSales !== false && backup.data.sales && backup.data.sales.length > 0) {
        console.log(`📦 Starting import of ${backup.data.sales.length} sales for company ${companyId}`)
        let salesImported = 0
        let salesSkipped = 0
        
        for (const sale of backup.data.sales) {
          try {
            // Check if sale already exists
            const existingSale = await saleService.getById(sale.id)
            if (existingSale) {
              salesSkipped++
              continue
            }
            
            // Import the sale with company_id
            await saleService.create({
              ...sale,
              company_id: companyId,
            } as any)
            salesImported++
          } catch (error: any) {
            console.error(`Error importing sale ${sale.id}:`, error)
          }
        }
        
        console.log(`📊 Sales Import Summary: Imported: ${salesImported}, Skipped: ${salesSkipped}`)
        importedCount += salesImported
      }

      // Import Settings
      if (options.importSettings !== false && backup.data.settings) {
        await settingsService.updateAll(backup.data.settings, userId ? parseInt(userId) : undefined)
        importedCount++
      }

      // Create detailed import message
      let message = ''
      if (importedCount > 0) {
        message = `Successfully imported ${importedCount} records.`
        if (backup.data.purchases && options.importPurchases !== false) {
          message += ` Check browser console (F12) for detailed purchase import logs.`
        }
      } else {
        message = `No records were imported. Please check browser console (F12) for errors.`
      }

      return {
        success: importedCount > 0,
        message: message,
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
