// Sync Service - Handles data synchronization between IndexedDB and Supabase
import { isSupabaseAvailable, isOnline, supabase } from './supabaseClient'
import { getAll, put, deleteById, STORES } from '../database/db'
import { cloudProductService } from './cloudProductService'
import { cloudCustomerService } from './cloudCustomerService'
import { cloudSupplierService } from './cloudSupplierService'
import { cloudPurchaseService } from './cloudPurchaseService'
import { cloudSaleService } from './cloudSaleService'
import { cloudExpenseService } from './cloudExpenseService'
import { Product } from './productService'
import { Customer } from '../types/customer'
import { Supplier } from '../types/purchase'
import { Purchase } from '../types/purchase'
import { Sale } from '../types/sale'
import { Expense } from '../types/expense'

export interface SyncStatus {
  lastSyncTime: string | null // ISO timestamp
  lastSyncStatus: 'success' | 'failed' | 'never' // Status
  pendingRecords: number // Count of records needing sync
  isOnline: boolean
  isSyncing: boolean
}

interface SyncResult {
  success: boolean
  synced: number
  failed: number
  deleted: number
  errors: string[]
}

const SYNC_STATUS_KEY = 'hisabkitab_sync_status'

/**
 * Sync Service
 * Handles synchronization of IndexedDB records to Supabase
 */
export const syncService = {
  /**
   * Get current sync status
   */
  getSyncStatus: async (): Promise<SyncStatus> => {
    try {
      const stored = localStorage.getItem(SYNC_STATUS_KEY)
      if (stored) {
        const status = JSON.parse(stored) as SyncStatus
        // Update online status
        status.isOnline = isOnline()
        // Recalculate pending records
        status.pendingRecords = await syncService.countPendingRecords()
        return status
      }
    } catch (error) {
      console.error('Error getting sync status:', error)
    }

    return {
      lastSyncTime: null,
      lastSyncStatus: 'never',
      pendingRecords: await syncService.countPendingRecords(),
      isOnline: isOnline(),
      isSyncing: false,
    }
  },

  /**
   * Update sync status
   */
  updateSyncStatus: (status: Partial<SyncStatus>): void => {
    try {
      syncService.getSyncStatus().then(current => {
        const updated = { ...current, ...status }
        localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated))
      })
    } catch (error) {
      console.error('Error updating sync status:', error)
    }
  },

  /**
   * Count records that need syncing
   * This is an approximation - we count all local records and assume they need syncing
   * In a production app, you'd track which records have been synced
   */
  countPendingRecords: async (): Promise<number> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      // If offline or Supabase not available, we can't sync, so count all local records
      try {
        const [
          products,
          customers,
          suppliers,
          purchases,
          sales,
          expenses,
        ] = await Promise.all([
          getAll<Product>(STORES.PRODUCTS),
          getAll<Customer>(STORES.CUSTOMERS),
          getAll<Supplier>(STORES.SUPPLIERS),
          getAll<Purchase>(STORES.PURCHASES),
          getAll<Sale>(STORES.SALES),
          getAll<Expense>(STORES.EXPENSES),
        ])
        return products.length + customers.length + suppliers.length + purchases.length + sales.length + expenses.length
      } catch (error) {
        console.error('Error counting pending records:', error)
        return 0
      }
    }
    // If online, we assume all local records are synced (since we sync on create/update)
    // This is a simplification - in production you'd track sync status per record
    return 0
  },

  /**
   * Sync all pending records to Supabase
   * Uses count-based approach: only syncs new records that don't exist in Supabase
   */
  syncAllPendingRecords: async (companyId?: number | null): Promise<SyncResult> => {
    const result: SyncResult = {
      success: false,
      synced: 0,
      failed: 0,
      deleted: 0,
      errors: [],
    }

    if (!isSupabaseAvailable()) {
      result.errors.push('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables in Netlify Dashboard → Site Settings → Environment Variables')
      return result
    }

    if (!isOnline()) {
      result.errors.push('Device is offline')
      return result
    }

    // Update status to syncing
    syncService.updateSyncStatus({ isSyncing: true })

    try {
      // Sync Products
      try {
        // Get all products from IndexedDB and Supabase
        const localProducts = await getAll<Product>(STORES.PRODUCTS)
        const companyLocalProducts = companyId !== undefined && companyId !== null
          ? localProducts.filter(p => p.company_id === companyId)
          : localProducts

        const cloudProducts = await cloudProductService.getAll(true, companyId)
        
        // Create a set of SKUs that exist in Supabase (for duplicate checking)
        const cloudSkus = new Set(cloudProducts.map(p => p.sku).filter(Boolean))
        const cloudProductIds = new Set(cloudProducts.map(p => p.id))

        console.log(`📊 Products: Local: ${companyLocalProducts.length}, Cloud: ${cloudProducts.length}`)

        // Only sync products that don't exist in Supabase (by SKU or ID)
        const productsToSync = companyLocalProducts.filter(product => {
          if (product.sku && cloudSkus.has(product.sku)) {
            return false // Already exists in Supabase
          }
          if (cloudProductIds.has(product.id)) {
            return false // Already exists in Supabase
          }
          return true // New product, needs sync
        })

        console.log(`📊 Products to sync: ${productsToSync.length} new records`)

        // Sync new products to Supabase
        if (productsToSync.length === 0) {
          console.log('✅ Products already synced - counts match')
        } else {
          for (const product of productsToSync) {
            try {
              await cloudProductService.create(product)
              result.synced++
              // Add to cloud sets after successful sync
              if (product.sku) {
                cloudSkus.add(product.sku)
              }
              cloudProductIds.add(product.id)
            } catch (error: any) {
              result.failed++
              result.errors.push(`Product ${product.sku || product.id}: ${error.message}`)
              console.error(`Error syncing product ${product.sku || product.id}:`, error)
            }
          }
        }

        // Two-way sync: Delete records from IndexedDB that were deleted in Supabase
        // Get cloud products directly from Supabase (without syncing to IndexedDB first)
        // to avoid re-adding products we're about to delete
        let updatedCloudProducts: Product[] = []
        if (isSupabaseAvailable() && isOnline()) {
          try {
            let query = supabase!.from('products').select('*')
            if (companyId !== undefined && companyId !== null) {
              query = query.eq('company_id', companyId)
            }
            const { data, error } = await query.order('created_at', { ascending: false })
            if (!error && data) {
              updatedCloudProducts = data as Product[]
            }
          } catch (error) {
            console.error('Error fetching products from Supabase for deletion check:', error)
            // Fallback: use getAll but be aware it will sync
            updatedCloudProducts = await cloudProductService.getAll(true, companyId)
          }
        } else {
          updatedCloudProducts = await cloudProductService.getAll(true, companyId)
        }
        
        const updatedCloudSkus = new Set(updatedCloudProducts.map(p => p.sku).filter(Boolean))
        const updatedCloudProductIds = new Set(updatedCloudProducts.map(p => p.id))
        const updatedCloudBarcodes = new Set(updatedCloudProducts.map(p => String(p.barcode || '').trim()).filter(Boolean))
        
        // Also create a map of products by name+company for better matching
        const cloudProductsByName = new Map<string, Set<number>>()
        updatedCloudProducts.forEach(p => {
          const key = `${p.name?.toLowerCase()}_${p.company_id || ''}`
          if (!cloudProductsByName.has(key)) {
            cloudProductsByName.set(key, new Set())
          }
          cloudProductsByName.get(key)!.add(p.id)
        })

        console.log(`📊 After sync - Cloud: ${updatedCloudProducts.length} products`)
        console.log(`📊 Checking ${companyLocalProducts.length} local products for deletion...`)
        console.log(`📊 Cloud SKUs: ${updatedCloudSkus.size}, Cloud IDs: ${updatedCloudProductIds.size}, Cloud Barcodes: ${updatedCloudBarcodes.size}`)

        // Find products in IndexedDB that don't exist in Supabase (by unique identifier)
        // These are likely deleted records that should be removed from IndexedDB
        const productsToDelete = companyLocalProducts.filter(product => {
          // Skip products we just synced (they're new, not deleted)
          const wasJustSynced = productsToSync.some(p => 
            p.id === product.id || 
            (p.sku && product.sku && p.sku === product.sku) ||
            (p.name && product.name && p.name.toLowerCase() === product.name.toLowerCase() && p.company_id === product.company_id)
          )
          if (wasJustSynced) {
            return false // This is a new product, not a deleted one
          }
          
          // Check if product exists in Supabase by unique identifier
          const existsBySku = product.sku && updatedCloudSkus.has(product.sku)
          const existsById = updatedCloudProductIds.has(product.id)
          
          // Also check by name+company as fallback
          const nameKey = `${product.name?.toLowerCase()}_${product.company_id || ''}`
          const existsByName = product.name && cloudProductsByName.has(nameKey)
          
          // Check by barcode as well
          const productBarcode = product.barcode ? String(product.barcode).trim() : ''
          const existsByBarcode = productBarcode && updatedCloudBarcodes.has(productBarcode)
          
          // If doesn't exist in Supabase by any identifier, it was likely deleted
          const shouldDelete = !existsBySku && !existsById && !existsByName && !existsByBarcode
          
          if (shouldDelete && (productsToDelete.length < 10 || productsToDelete.length % 100 === 0)) {
            console.log(`🔍 Marking for deletion: Product ID ${product.id}, SKU: ${product.sku || 'none'}, Name: ${product.name || 'none'}, Barcode: ${product.barcode || 'none'}`)
            console.log(`   - Exists by SKU: ${existsBySku}, by ID: ${existsById}, by Name: ${existsByName}, by Barcode: ${existsByBarcode}`)
          }
          
          return shouldDelete
        })

        console.log(`🗑️ Found ${productsToDelete.length} products to delete from IndexedDB`)

        if (productsToDelete.length > 0) {
          console.log(`🗑️ Products to delete from local: ${productsToDelete.length} deleted records`)
          let deletedCount = 0
          let failedCount = 0
          for (const product of productsToDelete) {
            try {
              await deleteById(STORES.PRODUCTS, product.id)
              deletedCount++
              if (deletedCount % 100 === 0) {
                console.log(`🗑️ Deleted ${deletedCount}/${productsToDelete.length} products so far...`)
              }
            } catch (error: any) {
              failedCount++
              console.error(`❌ Error deleting product ${product.sku || product.id} (ID: ${product.id}) from IndexedDB:`, error)
            }
          }
          console.log(`🗑️ Successfully deleted ${deletedCount}/${productsToDelete.length} products from IndexedDB (${failedCount} failed)`)
          result.deleted = (result.deleted || 0) + deletedCount
        } else {
          console.log('✅ No products to delete from IndexedDB')
        }
      } catch (error: any) {
        result.errors.push(`Products sync error: ${error.message}`)
      }

      // Sync Customers
      try {
        // Get all customers from IndexedDB and Supabase
        const localCustomers = await getAll<Customer>(STORES.CUSTOMERS)
        const companyLocalCustomers = companyId !== undefined && companyId !== null
          ? localCustomers.filter(c => c.company_id === companyId)
          : localCustomers

        const cloudCustomers = await cloudCustomerService.getAll(true, companyId)
        
        // Create a set of unique identifiers (email or name+phone) that exist in Supabase
        const cloudCustomerKeys = new Set(
          cloudCustomers.map(c => 
            c.email?.toLowerCase() || 
            `${c.name?.toLowerCase()}_${c.phone || ''}` || 
            c.id.toString()
          ).filter(Boolean)
        )
        const cloudCustomerIds = new Set(cloudCustomers.map(c => c.id))

        console.log(`📊 Customers: Local: ${companyLocalCustomers.length}, Cloud: ${cloudCustomers.length}`)

        // Only sync customers that don't exist in Supabase
        const customersToSync = companyLocalCustomers.filter(customer => {
          const customerKey = customer.email?.toLowerCase() || 
            `${customer.name?.toLowerCase()}_${customer.phone || ''}` || 
            customer.id.toString()
          
          if (cloudCustomerKeys.has(customerKey)) {
            return false // Already exists in Supabase
          }
          if (cloudCustomerIds.has(customer.id)) {
            return false // Already exists in Supabase
          }
          return true // New customer, needs sync
        })

        console.log(`📊 Customers to sync: ${customersToSync.length} new records`)

        // Sync new customers to Supabase
        if (customersToSync.length === 0) {
          console.log('✅ Customers already synced - counts match')
        } else {
          for (const customer of customersToSync) {
            try {
              await cloudCustomerService.create(customer)
              result.synced++
              // Add to cloud sets after successful sync
              const customerKey = customer.email?.toLowerCase() || 
                `${customer.name?.toLowerCase()}_${customer.phone || ''}` || 
                customer.id.toString()
              cloudCustomerKeys.add(customerKey)
              cloudCustomerIds.add(customer.id)
            } catch (error: any) {
              result.failed++
              result.errors.push(`Customer ${customer.id}: ${error.message}`)
              console.error(`Error syncing customer ${customer.id}:`, error)
            }
          }
        }

        // Two-way sync: Delete records from IndexedDB that were deleted in Supabase
        // Re-fetch cloud customers after syncing to get updated list
        const updatedCloudCustomers = await cloudCustomerService.getAll(true, companyId)
        const updatedCloudCustomerKeys = new Set(
          updatedCloudCustomers.map(c => 
            c.email?.toLowerCase() || 
            `${c.name?.toLowerCase()}_${c.phone || ''}` || 
            c.id.toString()
          ).filter(Boolean)
        )
        const updatedCloudCustomerIds = new Set(updatedCloudCustomers.map(c => c.id))

        console.log(`📊 After sync - Cloud: ${updatedCloudCustomers.length} customers`)
        console.log(`📊 Checking ${companyLocalCustomers.length} local customers for deletion...`)

        const customersToDelete = companyLocalCustomers.filter(customer => {
          // Skip customers we just synced (they're new, not deleted)
          const wasJustSynced = customersToSync.some(c => 
            c.id === customer.id ||
            (c.email && customer.email && c.email.toLowerCase() === customer.email.toLowerCase()) ||
            (c.name && customer.name && c.name.toLowerCase() === customer.name.toLowerCase() && c.phone === customer.phone)
          )
          if (wasJustSynced) {
            return false // This is a new customer, not a deleted one
          }
          
          const customerKey = customer.email?.toLowerCase() || 
            `${customer.name?.toLowerCase()}_${customer.phone || ''}` || 
            customer.id.toString()
          
          // Check if customer exists in Supabase by unique identifier
          const existsByKey = updatedCloudCustomerKeys.has(customerKey)
          const existsById = updatedCloudCustomerIds.has(customer.id)
          
          // If doesn't exist in Supabase by any identifier, it was likely deleted
          const shouldDelete = !existsByKey && !existsById
          return shouldDelete
        })

        console.log(`🗑️ Found ${customersToDelete.length} customers to delete from IndexedDB`)

        if (customersToDelete.length > 0) {
          console.log(`🗑️ Customers to delete from local: ${customersToDelete.length} deleted records`)
          let deletedCount = 0
          let failedCount = 0
          for (const customer of customersToDelete) {
            try {
              await deleteById(STORES.CUSTOMERS, customer.id)
              deletedCount++
              if (deletedCount % 100 === 0) {
                console.log(`🗑️ Deleted ${deletedCount}/${customersToDelete.length} customers so far...`)
              }
            } catch (error: any) {
              failedCount++
              console.error(`❌ Error deleting customer ${customer.id} from IndexedDB:`, error)
            }
          }
          console.log(`🗑️ Successfully deleted ${deletedCount}/${customersToDelete.length} customers from IndexedDB (${failedCount} failed)`)
          result.deleted = (result.deleted || 0) + deletedCount
        } else {
          console.log('✅ No customers to delete from IndexedDB')
        }
      } catch (error: any) {
        result.errors.push(`Customers sync error: ${error.message}`)
      }

      // Sync Suppliers
      try {
        // Get all suppliers from IndexedDB and Supabase
        const localSuppliers = await getAll<Supplier>(STORES.SUPPLIERS)
        const companyLocalSuppliers = companyId !== undefined && companyId !== null
          ? localSuppliers.filter(s => s.company_id === companyId)
          : localSuppliers

        const cloudSuppliers = await cloudSupplierService.getAll(companyId)
        
        // Create a set of unique identifiers (email, gstin, or name+phone) that exist in Supabase
        const cloudSupplierKeys = new Set(
          cloudSuppliers.map(s => 
            s.email?.toLowerCase() || 
            s.gstin?.toUpperCase() || 
            `${s.name?.toLowerCase()}_${s.phone || ''}` || 
            s.id.toString()
          ).filter(Boolean)
        )
        const cloudSupplierIds = new Set(cloudSuppliers.map(s => s.id))

        console.log(`📊 Suppliers: Local: ${companyLocalSuppliers.length}, Cloud: ${cloudSuppliers.length}`)

        // Only sync suppliers that don't exist in Supabase
        const suppliersToSync = companyLocalSuppliers.filter(supplier => {
          const supplierKey = supplier.email?.toLowerCase() || 
            supplier.gstin?.toUpperCase() || 
            `${supplier.name?.toLowerCase()}_${supplier.phone || ''}` || 
            supplier.id.toString()
          
          if (cloudSupplierKeys.has(supplierKey)) {
            return false // Already exists in Supabase
          }
          if (cloudSupplierIds.has(supplier.id)) {
            return false // Already exists in Supabase
          }
          return true // New supplier, needs sync
        })

        console.log(`📊 Suppliers to sync: ${suppliersToSync.length} new records`)

        // Sync new suppliers to Supabase
        if (suppliersToSync.length === 0) {
          console.log('✅ Suppliers already synced - counts match')
        } else {
          for (const supplier of suppliersToSync) {
            try {
              await cloudSupplierService.create(supplier)
              result.synced++
              // Add to cloud sets after successful sync
              const supplierKey = supplier.email?.toLowerCase() || 
                supplier.gstin?.toUpperCase() || 
                `${supplier.name?.toLowerCase()}_${supplier.phone || ''}` || 
                supplier.id.toString()
              cloudSupplierKeys.add(supplierKey)
              cloudSupplierIds.add(supplier.id)
            } catch (error: any) {
              result.failed++
              result.errors.push(`Supplier ${supplier.id}: ${error.message}`)
              console.error(`Error syncing supplier ${supplier.id}:`, error)
            }
          }
        }

        // Two-way sync: Delete records from IndexedDB that were deleted in Supabase
        // Re-fetch cloud suppliers after syncing to get updated list
        const updatedCloudSuppliers = await cloudSupplierService.getAll(companyId)
        const updatedCloudSupplierKeys = new Set(
          updatedCloudSuppliers.map(s => {
            const key = s.email?.toLowerCase() || 
              s.gstin?.toUpperCase() || 
              `${s.name?.toLowerCase()}_${s.phone || ''}` || 
              s.id.toString()
            return key
          }).filter(Boolean)
        )
        const updatedCloudSupplierIds = new Set(updatedCloudSuppliers.map(s => s.id))

        console.log(`📊 After sync - Cloud: ${updatedCloudSuppliers.length} suppliers`)
        console.log(`📊 Checking ${companyLocalSuppliers.length} local suppliers for deletion...`)

        const suppliersToDelete = companyLocalSuppliers.filter(supplier => {
          // Skip suppliers we just synced (they're new, not deleted)
          const wasJustSynced = suppliersToSync.some(s => 
            s.id === supplier.id ||
            (s.email && supplier.email && s.email.toLowerCase() === supplier.email.toLowerCase()) ||
            (s.gstin && supplier.gstin && s.gstin.toUpperCase() === supplier.gstin.toUpperCase()) ||
            (s.name && supplier.name && s.name.toLowerCase() === supplier.name.toLowerCase() && s.phone === supplier.phone)
          )
          if (wasJustSynced) {
            return false // This is a new supplier, not a deleted one
          }
          
          const supplierKey = supplier.email?.toLowerCase() || 
            supplier.gstin?.toUpperCase() || 
            `${supplier.name?.toLowerCase()}_${supplier.phone || ''}` || 
            supplier.id.toString()
          
          // Check if supplier exists in Supabase by unique identifier
          const existsByKey = updatedCloudSupplierKeys.has(supplierKey)
          const existsById = updatedCloudSupplierIds.has(supplier.id)
          
          // If doesn't exist in Supabase by any identifier, it was likely deleted
          return !existsByKey && !existsById
        })

        console.log(`🗑️ Found ${suppliersToDelete.length} suppliers to delete from IndexedDB`)

        if (suppliersToDelete.length > 0) {
          console.log(`🗑️ Suppliers to delete from local: ${suppliersToDelete.length} deleted records`)
          let deletedCount = 0
          let failedCount = 0
          for (const supplier of suppliersToDelete) {
            try {
              await deleteById(STORES.SUPPLIERS, supplier.id)
              deletedCount++
              if (deletedCount % 100 === 0) {
                console.log(`🗑️ Deleted ${deletedCount}/${suppliersToDelete.length} suppliers so far...`)
              }
            } catch (error: any) {
              failedCount++
              console.error(`❌ Error deleting supplier ${supplier.id} from IndexedDB:`, error)
            }
          }
          console.log(`🗑️ Successfully deleted ${deletedCount}/${suppliersToDelete.length} suppliers from IndexedDB (${failedCount} failed)`)
          result.deleted = (result.deleted || 0) + deletedCount
        } else {
          console.log('✅ No suppliers to delete from IndexedDB')
        }
      } catch (error: any) {
        result.errors.push(`Suppliers sync error: ${error.message}`)
      }

      // Sync Purchases
      try {
        // Get all purchases from IndexedDB and Supabase
        const localPurchases = await getAll<Purchase>(STORES.PURCHASES)
        const companyLocalPurchases = companyId !== undefined && companyId !== null
          ? localPurchases.filter(p => p.company_id === companyId)
          : localPurchases

        const cloudPurchases = await cloudPurchaseService.getAll(undefined, companyId)
        
        // Create a set of invoice numbers that exist in Supabase
        const cloudInvoiceNumbers = new Set(
          cloudPurchases.map(p => 
            p.type === 'gst' 
              ? (p as any).invoice_number 
              : (p as any).invoice_number
          ).filter(Boolean)
        )
        const cloudPurchaseIds = new Set(cloudPurchases.map(p => p.id))

        console.log(`📊 Purchases: Local: ${companyLocalPurchases.length}, Cloud: ${cloudPurchases.length}`)

        // Only sync purchases that don't exist in Supabase
        const purchasesToSync = companyLocalPurchases.filter(purchase => {
          const invoiceNumber = purchase.type === 'gst' 
            ? (purchase as any).invoice_number 
            : (purchase as any).invoice_number
          
          if (invoiceNumber && cloudInvoiceNumbers.has(invoiceNumber)) {
            return false // Already exists in Supabase
          }
          if (cloudPurchaseIds.has(purchase.id)) {
            return false // Already exists in Supabase
          }
          return true // New purchase, needs sync
        })

        console.log(`📊 Purchases to sync: ${purchasesToSync.length} new records`)

        // Sync new purchases to Supabase
        if (purchasesToSync.length === 0) {
          console.log('✅ Purchases already synced - counts match')
        } else {
          for (const purchase of purchasesToSync) {
            try {
              await cloudPurchaseService.create(purchase)
              result.synced++
              // Add to cloud sets after successful sync
              const invoiceNumber = purchase.type === 'gst' 
                ? (purchase as any).invoice_number 
                : (purchase as any).invoice_number
              if (invoiceNumber) {
                cloudInvoiceNumbers.add(invoiceNumber)
              }
              cloudPurchaseIds.add(purchase.id)
            } catch (error: any) {
              result.failed++
              result.errors.push(`Purchase ${purchase.id}: ${error.message}`)
              console.error(`Error syncing purchase ${purchase.id}:`, error)
            }
          }
        }

        // Two-way sync: Delete records from IndexedDB that were deleted in Supabase
        // Re-fetch cloud purchases after syncing to get updated list
        const updatedCloudPurchases = await cloudPurchaseService.getAll(undefined, companyId)
        const updatedCloudInvoiceNumbers = new Set(
          updatedCloudPurchases.map(p => 
            p.type === 'gst' 
              ? (p as any).invoice_number 
              : (p as any).invoice_number
          ).filter(Boolean)
        )
        const updatedCloudPurchaseIds = new Set(updatedCloudPurchases.map(p => p.id))

        const purchasesToDelete = companyLocalPurchases.filter(purchase => {
          // Skip purchases we just synced (they're new, not deleted)
          if (purchasesToSync.some(p => p.id === purchase.id)) {
            return false // This is a new purchase, not a deleted one
          }
          
          const invoiceNumber = purchase.type === 'gst' 
            ? (purchase as any).invoice_number 
            : (purchase as any).invoice_number
          
          // Check if purchase exists in Supabase by unique identifier
          const existsByInvoice = invoiceNumber && updatedCloudInvoiceNumbers.has(invoiceNumber)
          const existsById = updatedCloudPurchaseIds.has(purchase.id)
          
          // If doesn't exist in Supabase by any identifier, it was likely deleted
          return !existsByInvoice && !existsById
        })

        if (purchasesToDelete.length > 0) {
          console.log(`🗑️ Purchases to delete from local: ${purchasesToDelete.length} deleted records`)
          let deletedCount = 0
          for (const purchase of purchasesToDelete) {
            try {
              await deleteById(STORES.PURCHASES, purchase.id)
              deletedCount++
              console.log(`✅ Deleted purchase ${purchase.id} from IndexedDB (was deleted in Supabase)`)
            } catch (error: any) {
              console.error(`❌ Error deleting purchase ${purchase.id} from IndexedDB:`, error)
            }
          }
          console.log(`🗑️ Successfully deleted ${deletedCount}/${purchasesToDelete.length} purchases from IndexedDB`)
        } else {
          console.log('✅ No purchases to delete from IndexedDB')
        }
      } catch (error: any) {
        result.errors.push(`Purchases sync error: ${error.message}`)
      }

      // Sync Sales
      try {
        // Get all sales from IndexedDB and Supabase
        const localSales = await getAll<Sale>(STORES.SALES)
        const companyLocalSales = companyId !== undefined && companyId !== null
          ? localSales.filter(s => s.company_id === companyId)
          : localSales

        const cloudSales = await cloudSaleService.getAll(true, companyId)
        
        // Create a set of invoice numbers that exist in Supabase
        const cloudInvoiceNumbers = new Set(cloudSales.map(s => s.invoice_number).filter(Boolean))
        const cloudSaleIds = new Set(cloudSales.map(s => s.id))

        console.log(`📊 Sales: Local: ${companyLocalSales.length}, Cloud: ${cloudSales.length}`)

        // Only sync sales that don't exist in Supabase
        const salesToSync = companyLocalSales.filter(sale => {
          if (sale.invoice_number && cloudInvoiceNumbers.has(sale.invoice_number)) {
            return false // Already exists in Supabase
          }
          if (cloudSaleIds.has(sale.id)) {
            return false // Already exists in Supabase
          }
          return true // New sale, needs sync
        })

        console.log(`📊 Sales to sync: ${salesToSync.length} new records`)

        // Sync new sales to Supabase
        if (salesToSync.length === 0) {
          console.log('✅ Sales already synced - counts match')
        } else {
          for (const sale of salesToSync) {
            try {
              await cloudSaleService.create(sale)
              result.synced++
              // Add to cloud sets after successful sync
              if (sale.invoice_number) {
                cloudInvoiceNumbers.add(sale.invoice_number)
              }
              cloudSaleIds.add(sale.id)
            } catch (error: any) {
              result.failed++
              result.errors.push(`Sale ${sale.id}: ${error.message}`)
              console.error(`Error syncing sale ${sale.id}:`, error)
            }
          }
        }

        // Two-way sync: Delete records from IndexedDB that were deleted in Supabase
        // Re-fetch cloud sales after syncing to get updated list
        const updatedCloudSales = await cloudSaleService.getAll(true, companyId)
        const updatedCloudInvoiceNumbers = new Set(updatedCloudSales.map(s => s.invoice_number).filter(Boolean))
        const updatedCloudSaleIds = new Set(updatedCloudSales.map(s => s.id))

        const salesToDelete = companyLocalSales.filter(sale => {
          // Skip sales we just synced (they're new, not deleted)
          if (salesToSync.some(s => s.id === sale.id)) {
            return false // This is a new sale, not a deleted one
          }
          
          // Check if sale exists in Supabase by unique identifier
          const existsByInvoice = sale.invoice_number && updatedCloudInvoiceNumbers.has(sale.invoice_number)
          const existsById = updatedCloudSaleIds.has(sale.id)
          
          // If doesn't exist in Supabase by any identifier, it was likely deleted
          return !existsByInvoice && !existsById
        })

        if (salesToDelete.length > 0) {
          console.log(`🗑️ Sales to delete from local: ${salesToDelete.length} deleted records`)
          let deletedCount = 0
          for (const sale of salesToDelete) {
            try {
              await deleteById(STORES.SALES, sale.id)
              deletedCount++
              console.log(`✅ Deleted sale ${sale.id} from IndexedDB (was deleted in Supabase)`)
            } catch (error: any) {
              console.error(`❌ Error deleting sale ${sale.id} from IndexedDB:`, error)
            }
          }
          console.log(`🗑️ Successfully deleted ${deletedCount}/${salesToDelete.length} sales from IndexedDB`)
        } else {
          console.log('✅ No sales to delete from IndexedDB')
        }
      } catch (error: any) {
        result.errors.push(`Sales sync error: ${error.message}`)
      }

      // Sync Expenses
      try {
        // Get all expenses from IndexedDB and Supabase
        const localExpenses = await getAll<Expense>(STORES.EXPENSES)
        const companyLocalExpenses = companyId !== undefined && companyId !== null
          ? localExpenses.filter(e => e.company_id === companyId)
          : localExpenses

        const cloudExpenses = await cloudExpenseService.getAll(companyId)
        
        // Create a set of receipt numbers or expense identifiers that exist in Supabase
        const cloudExpenseKeys = new Set(
          cloudExpenses.map(e => 
            e.receipt_number || 
            `${e.expense_date}_${e.amount}_${e.category || ''}_${e.description || ''}`.toLowerCase() ||
            e.id.toString()
          ).filter(Boolean)
        )
        const cloudExpenseIds = new Set(cloudExpenses.map(e => e.id))

        console.log(`📊 Expenses: Local: ${companyLocalExpenses.length}, Cloud: ${cloudExpenses.length}`)

        // Only sync expenses that don't exist in Supabase
        const expensesToSync = companyLocalExpenses.filter(expense => {
          const expenseKey = expense.receipt_number || 
            `${expense.expense_date}_${expense.amount}_${expense.category || ''}_${expense.description || ''}`.toLowerCase() ||
            expense.id.toString()
          
          if (cloudExpenseKeys.has(expenseKey)) {
            return false // Already exists in Supabase
          }
          if (cloudExpenseIds.has(expense.id)) {
            return false // Already exists in Supabase
          }
          return true // New expense, needs sync
        })

        console.log(`📊 Expenses to sync: ${expensesToSync.length} new records`)

        // Sync new expenses to Supabase
        if (expensesToSync.length === 0) {
          console.log('✅ Expenses already synced - counts match')
        } else {
          for (const expense of expensesToSync) {
            try {
              await cloudExpenseService.create(expense)
              result.synced++
              // Add to cloud sets after successful sync
              const expenseKey = expense.receipt_number || 
                `${expense.expense_date}_${expense.amount}_${expense.category || ''}_${expense.description || ''}`.toLowerCase() ||
                expense.id.toString()
              cloudExpenseKeys.add(expenseKey)
              cloudExpenseIds.add(expense.id)
            } catch (error: any) {
              result.failed++
              result.errors.push(`Expense ${expense.id}: ${error.message}`)
              console.error(`Error syncing expense ${expense.id}:`, error)
            }
          }
        }

        // Two-way sync: Delete records from IndexedDB that were deleted in Supabase
        // Re-fetch cloud expenses after syncing to get updated list
        const updatedCloudExpenses = await cloudExpenseService.getAll(companyId)
        const updatedCloudExpenseKeys = new Set(
          updatedCloudExpenses.map(e => 
            e.receipt_number || 
            `${e.expense_date}_${e.amount}_${e.category || ''}_${e.description || ''}`.toLowerCase() ||
            e.id.toString()
          ).filter(Boolean)
        )
        const updatedCloudExpenseIds = new Set(updatedCloudExpenses.map(e => e.id))

        const expensesToDelete = companyLocalExpenses.filter(expense => {
          // Skip expenses we just synced (they're new, not deleted)
          if (expensesToSync.some(e => e.id === expense.id)) {
            return false // This is a new expense, not a deleted one
          }
          
          const expenseKey = expense.receipt_number || 
            `${expense.expense_date}_${expense.amount}_${expense.category || ''}_${expense.description || ''}`.toLowerCase() ||
            expense.id.toString()
          
          // Check if expense exists in Supabase by unique identifier
          const existsByKey = updatedCloudExpenseKeys.has(expenseKey)
          const existsById = updatedCloudExpenseIds.has(expense.id)
          
          // If doesn't exist in Supabase by any identifier, it was likely deleted
          return !existsByKey && !existsById
        })

        if (expensesToDelete.length > 0) {
          console.log(`🗑️ Expenses to delete from local: ${expensesToDelete.length} deleted records`)
          let deletedCount = 0
          for (const expense of expensesToDelete) {
            try {
              await deleteById(STORES.EXPENSES, expense.id)
              deletedCount++
              console.log(`✅ Deleted expense ${expense.id} from IndexedDB (was deleted in Supabase)`)
            } catch (error: any) {
              console.error(`❌ Error deleting expense ${expense.id} from IndexedDB:`, error)
            }
          }
          console.log(`🗑️ Successfully deleted ${deletedCount}/${expensesToDelete.length} expenses from IndexedDB`)
        } else {
          console.log('✅ No expenses to delete from IndexedDB')
        }
      } catch (error: any) {
        result.errors.push(`Expenses sync error: ${error.message}`)
      }

      // Update sync status
      const now = new Date().toISOString()
      syncService.updateSyncStatus({
        lastSyncTime: now,
        lastSyncStatus: result.failed === 0 ? 'success' : (result.synced > 0 ? 'success' : 'failed'),
        isSyncing: false,
        pendingRecords: 0, // Reset after sync
      })

      result.success = result.failed === 0 || result.synced > 0
    } catch (error: any) {
      console.error('Error in syncAllPendingRecords:', error)
      result.errors.push(`Sync error: ${error.message}`)
      syncService.updateSyncStatus({
        lastSyncStatus: 'failed',
        isSyncing: false,
      })
    }

    return result
  },

  /**
   * Initialize automatic sync on online event
   */
  initializeAutoSync: (companyId?: number | null): (() => void) => {
    const handleOnline = async () => {
      console.log('🌐 Internet connection restored. Starting automatic sync...')
      
      // Wait a bit to ensure connection is stable
      setTimeout(async () => {
        if (isOnline() && isSupabaseAvailable()) {
          try {
            const result = await syncService.syncAllPendingRecords(companyId)
            if (result.success) {
              console.log(`✅ Automatic sync completed: ${result.synced} records synced`)
            } else {
              console.warn(`⚠️ Automatic sync completed with errors: ${result.failed} failed, ${result.synced} synced`)
            }
          } catch (error) {
            console.error('❌ Error during automatic sync:', error)
          }
        }
      }, 2000) // Wait 2 seconds after online event
    }

    window.addEventListener('online', handleOnline)

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  },
}
