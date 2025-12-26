// IndexedDB Database wrapper for HisabKitab
// Provides a simple interface to interact with IndexedDB

const DB_NAME = 'hisabkitab_db'
const DB_VERSION = 8 // Incremented to add SUPPLIER_PAYMENTS and SUPPLIER_CHECKS stores

// Object store names (tables)
export const STORES = {
  COMPANIES: 'companies',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  SALES: 'sales',
  PURCHASES: 'purchases',
  STOCK_ADJUSTMENTS: 'stock_adjustments',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  PAYMENT_RECORDS: 'payment_records',
  PAYMENT_TRANSACTIONS: 'payment_transactions',
  SALES_PERSONS: 'sales_persons',
  CATEGORY_COMMISSIONS: 'category_commissions',
  SALES_COMMISSIONS: 'sales_commissions',
  SALES_PERSON_CATEGORY_ASSIGNMENTS: 'sales_person_category_assignments',
  USER_PERMISSIONS: 'user_permissions',
  AUTOMATIC_BACKUPS: 'automatic_backups',
  EXPENSES: 'expenses',
  SUPPLIER_PAYMENTS: 'supplier_payments',
  SUPPLIER_CHECKS: 'supplier_checks',
} as const

let dbInstance: IDBDatabase | null = null
let isUpgrading = false
let upgradePromise: Promise<void> | null = null

export interface DBConfig {
  name?: string
  version?: number
}

/**
 * Initialize and open the database
 */
export function initDB(config: DBConfig = {}): Promise<IDBDatabase> {
  const dbName = config.name || DB_NAME
  const dbVersion = config.version || DB_VERSION

  return new Promise((resolve, reject) => {
    if (dbInstance && !isUpgrading) {
      // Check if database is still open
      try {
        dbInstance.transaction([STORES.USERS], 'readonly')
        resolve(dbInstance)
        return
      } catch (e) {
        // Database connection is closed, reset and reopen
        dbInstance = null
      }
    }

    // If upgrade is in progress, wait for it
    if (isUpgrading && upgradePromise) {
      upgradePromise.then(() => {
        if (dbInstance) {
          resolve(dbInstance)
        } else {
          // Retry after upgrade
          initDB(config).then(resolve).catch(reject)
        }
      }).catch(reject)
      return
    }

    const request = indexedDB.open(dbName, dbVersion)

    request.onerror = () => {
      isUpgrading = false
      upgradePromise = null
      reject(new Error(`Failed to open database: ${request.error}`))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      isUpgrading = false
      upgradePromise = null
      
      // Add error handler for connection close
      dbInstance.onclose = () => {
        console.warn('Database connection closed')
        dbInstance = null
      }
      
      dbInstance.onerror = (event) => {
        console.error('Database error:', event)
      }
      
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      isUpgrading = true
      upgradePromise = new Promise<void>((resolveUpgrade, rejectUpgrade) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = (event.target as IDBOpenDBRequest).transaction!
        
        transaction.oncomplete = () => {
          isUpgrading = false
          upgradePromise = null
          resolveUpgrade()
        }
        
        transaction.onerror = () => {
          isUpgrading = false
          upgradePromise = null
          rejectUpgrade(new Error(`Database upgrade failed: ${transaction.error}`))
        }

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.COMPANIES)) {
        const companiesStore = db.createObjectStore(STORES.COMPANIES, { keyPath: 'id' })
        companiesStore.createIndex('name', 'name', { unique: false })
        companiesStore.createIndex('email', 'email', { unique: false })
        companiesStore.createIndex('is_active', 'is_active', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productsStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' })
        productsStore.createIndex('company_id', 'company_id', { unique: false })
        productsStore.createIndex('category_id', 'category_id', { unique: false })
        productsStore.createIndex('sku', 'sku', { unique: false })
        productsStore.createIndex('barcode', 'barcode', { unique: false })
        productsStore.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        const categoriesStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' })
        categoriesStore.createIndex('company_id', 'company_id', { unique: false })
        categoriesStore.createIndex('parent_id', 'parent_id', { unique: false })
      }

      // Handle CUSTOMERS store - create if needed, or add missing indexes
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customersStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' })
        customersStore.createIndex('company_id', 'company_id', { unique: false })
        customersStore.createIndex('email', 'email', { unique: false })
        customersStore.createIndex('phone', 'phone', { unique: false })
      } else {
        // Store exists, check and create missing indexes
        const customersStore = transaction.objectStore(STORES.CUSTOMERS)
        if (!customersStore.indexNames.contains('company_id')) {
          customersStore.createIndex('company_id', 'company_id', { unique: false })
        }
        if (!customersStore.indexNames.contains('email')) {
          customersStore.createIndex('email', 'email', { unique: false })
        }
        if (!customersStore.indexNames.contains('phone')) {
          customersStore.createIndex('phone', 'phone', { unique: false })
        }
      }

      // Handle SUPPLIERS store - create if needed, or add missing indexes
      if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
        const suppliersStore = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' })
        suppliersStore.createIndex('company_id', 'company_id', { unique: false })
        suppliersStore.createIndex('email', 'email', { unique: false })
        suppliersStore.createIndex('phone', 'phone', { unique: false })
      } else {
        // Store exists, check and create missing indexes
        const suppliersStore = transaction.objectStore(STORES.SUPPLIERS)
        if (!suppliersStore.indexNames.contains('company_id')) {
          suppliersStore.createIndex('company_id', 'company_id', { unique: false })
        }
        if (!suppliersStore.indexNames.contains('email')) {
          suppliersStore.createIndex('email', 'email', { unique: false })
        }
        if (!suppliersStore.indexNames.contains('phone')) {
          suppliersStore.createIndex('phone', 'phone', { unique: false })
        }
      }

      // Handle SALES store - create if needed, or add missing indexes
      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' })
        salesStore.createIndex('company_id', 'company_id', { unique: false })
        salesStore.createIndex('customer_id', 'customer_id', { unique: false })
        salesStore.createIndex('sale_date', 'sale_date', { unique: false })
        salesStore.createIndex('invoice_number', 'invoice_number', { unique: false })
      } else {
        // Store exists, check and create missing indexes
        const salesStore = transaction.objectStore(STORES.SALES)
        if (!salesStore.indexNames.contains('company_id')) {
          salesStore.createIndex('company_id', 'company_id', { unique: false })
        }
        if (!salesStore.indexNames.contains('customer_id')) {
          salesStore.createIndex('customer_id', 'customer_id', { unique: false })
        }
        if (!salesStore.indexNames.contains('sale_date')) {
          salesStore.createIndex('sale_date', 'sale_date', { unique: false })
        }
        if (!salesStore.indexNames.contains('invoice_number')) {
          salesStore.createIndex('invoice_number', 'invoice_number', { unique: false })
        }
      }

      if (!db.objectStoreNames.contains(STORES.PURCHASES)) {
        const purchasesStore = db.createObjectStore(STORES.PURCHASES, { keyPath: 'id' })
        purchasesStore.createIndex('company_id', 'company_id', { unique: false })
        purchasesStore.createIndex('supplier_id', 'supplier_id', { unique: false })
        purchasesStore.createIndex('purchase_date', 'purchase_date', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.STOCK_ADJUSTMENTS)) {
        const stockAdjustmentsStore = db.createObjectStore(STORES.STOCK_ADJUSTMENTS, { keyPath: 'id' })
        stockAdjustmentsStore.createIndex('company_id', 'company_id', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const usersStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' })
        usersStore.createIndex('email', 'email', { unique: true })
        usersStore.createIndex('company_id', 'company_id', { unique: false })
      }

      // Handle AUDIT_LOGS store - create if needed, or add missing indexes
      if (!db.objectStoreNames.contains(STORES.AUDIT_LOGS)) {
        const auditStore = db.createObjectStore(STORES.AUDIT_LOGS, { keyPath: 'id' })
        auditStore.createIndex('timestamp', 'timestamp', { unique: false })
        auditStore.createIndex('userId', 'userId', { unique: false })
        auditStore.createIndex('module', 'module', { unique: false })
        auditStore.createIndex('company_id', 'company_id', { unique: false })
      } else {
        // Store exists, check and create missing indexes
        const auditStore = transaction.objectStore(STORES.AUDIT_LOGS)
        if (!auditStore.indexNames.contains('company_id')) {
          auditStore.createIndex('company_id', 'company_id', { unique: false })
        }
      }

      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notificationsStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' })
        notificationsStore.createIndex('timestamp', 'timestamp', { unique: false })
        notificationsStore.createIndex('type', 'type', { unique: false })
        notificationsStore.createIndex('priority', 'priority', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' })
      }

      if (!db.objectStoreNames.contains(STORES.PAYMENT_RECORDS)) {
        db.createObjectStore(STORES.PAYMENT_RECORDS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORES.PAYMENT_TRANSACTIONS)) {
        db.createObjectStore(STORES.PAYMENT_TRANSACTIONS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORES.SALES_PERSONS)) {
        db.createObjectStore(STORES.SALES_PERSONS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORES.CATEGORY_COMMISSIONS)) {
        db.createObjectStore(STORES.CATEGORY_COMMISSIONS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORES.SALES_COMMISSIONS)) {
        db.createObjectStore(STORES.SALES_COMMISSIONS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORES.SALES_PERSON_CATEGORY_ASSIGNMENTS)) {
        db.createObjectStore(STORES.SALES_PERSON_CATEGORY_ASSIGNMENTS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORES.USER_PERMISSIONS)) {
        const permissionsStore = db.createObjectStore(STORES.USER_PERMISSIONS, { keyPath: 'userId' })
        permissionsStore.createIndex('userId', 'userId', { unique: true })
      }

      // Handle AUTOMATIC_BACKUPS store - create if needed, or add missing indexes
      if (!db.objectStoreNames.contains(STORES.AUTOMATIC_BACKUPS)) {
        const backupsStore = db.createObjectStore(STORES.AUTOMATIC_BACKUPS, { keyPath: 'id', autoIncrement: true })
        backupsStore.createIndex('backup_date', 'backup_date', { unique: false })
        backupsStore.createIndex('created_at', 'created_at', { unique: false })
      } else {
        // Store exists, check and create missing indexes
        const backupsStore = transaction.objectStore(STORES.AUTOMATIC_BACKUPS)
        if (!backupsStore.indexNames.contains('backup_date')) {
          backupsStore.createIndex('backup_date', 'backup_date', { unique: false })
        }
        if (!backupsStore.indexNames.contains('created_at')) {
          backupsStore.createIndex('created_at', 'created_at', { unique: false })
        }
      }

      // Handle EXPENSES store - create if needed, or add missing indexes
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expensesStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' })
        expensesStore.createIndex('company_id', 'company_id', { unique: false })
        expensesStore.createIndex('expense_date', 'expense_date', { unique: false })
        expensesStore.createIndex('expense_type', 'expense_type', { unique: false })
        expensesStore.createIndex('sales_person_id', 'sales_person_id', { unique: false })
      } else {
        // Store exists, check and create missing indexes
        const expensesStore = transaction.objectStore(STORES.EXPENSES)
        if (!expensesStore.indexNames.contains('company_id')) {
          expensesStore.createIndex('company_id', 'company_id', { unique: false })
        }
        if (!expensesStore.indexNames.contains('expense_date')) {
          expensesStore.createIndex('expense_date', 'expense_date', { unique: false })
        }
        if (!expensesStore.indexNames.contains('expense_type')) {
          expensesStore.createIndex('expense_type', 'expense_type', { unique: false })
        }
        if (!expensesStore.indexNames.contains('sales_person_id')) {
          expensesStore.createIndex('sales_person_id', 'sales_person_id', { unique: false })
        }
      }

      // Handle SUPPLIER_PAYMENTS store - create if needed, or add missing indexes
      if (!db.objectStoreNames.contains(STORES.SUPPLIER_PAYMENTS)) {
        const paymentsStore = db.createObjectStore(STORES.SUPPLIER_PAYMENTS, { keyPath: 'id' })
        paymentsStore.createIndex('company_id', 'company_id', { unique: false })
        paymentsStore.createIndex('supplier_id', 'supplier_id', { unique: false })
        paymentsStore.createIndex('purchase_id', 'purchase_id', { unique: false })
        paymentsStore.createIndex('payment_date', 'payment_date', { unique: false })
        paymentsStore.createIndex('check_id', 'check_id', { unique: false })
      } else {
        // Store exists, check and create missing indexes
        const paymentsStore = transaction.objectStore(STORES.SUPPLIER_PAYMENTS)
        if (!paymentsStore.indexNames.contains('company_id')) {
          paymentsStore.createIndex('company_id', 'company_id', { unique: false })
        }
        if (!paymentsStore.indexNames.contains('supplier_id')) {
          paymentsStore.createIndex('supplier_id', 'supplier_id', { unique: false })
        }
        if (!paymentsStore.indexNames.contains('purchase_id')) {
          paymentsStore.createIndex('purchase_id', 'purchase_id', { unique: false })
        }
        if (!paymentsStore.indexNames.contains('payment_date')) {
          paymentsStore.createIndex('payment_date', 'payment_date', { unique: false })
        }
        if (!paymentsStore.indexNames.contains('check_id')) {
          paymentsStore.createIndex('check_id', 'check_id', { unique: false })
        }
      }

      // Handle SUPPLIER_CHECKS store - create if needed, or add missing indexes
      if (!db.objectStoreNames.contains(STORES.SUPPLIER_CHECKS)) {
        const checksStore = db.createObjectStore(STORES.SUPPLIER_CHECKS, { keyPath: 'id' })
        checksStore.createIndex('company_id', 'company_id', { unique: false })
        checksStore.createIndex('supplier_id', 'supplier_id', { unique: false })
        checksStore.createIndex('purchase_id', 'purchase_id', { unique: false })
        checksStore.createIndex('check_number', 'check_number', { unique: false })
        checksStore.createIndex('due_date', 'due_date', { unique: false })
        checksStore.createIndex('status', 'status', { unique: false })
      } else {
        // Store exists, check and create missing indexes
        const checksStore = transaction.objectStore(STORES.SUPPLIER_CHECKS)
        if (!checksStore.indexNames.contains('company_id')) {
          checksStore.createIndex('company_id', 'company_id', { unique: false })
        }
        if (!checksStore.indexNames.contains('supplier_id')) {
          checksStore.createIndex('supplier_id', 'supplier_id', { unique: false })
        }
        if (!checksStore.indexNames.contains('purchase_id')) {
          checksStore.createIndex('purchase_id', 'purchase_id', { unique: false })
        }
        if (!checksStore.indexNames.contains('check_number')) {
          checksStore.createIndex('check_number', 'check_number', { unique: false })
        }
        if (!checksStore.indexNames.contains('due_date')) {
          checksStore.createIndex('due_date', 'due_date', { unique: false })
        }
        if (!checksStore.indexNames.contains('status')) {
          checksStore.createIndex('status', 'status', { unique: false })
        }
      }
      }) // Close upgradePromise Promise
    }
  })
}

/**
 * Get database instance
 */
export async function getDB(): Promise<IDBDatabase> {
  // Wait for any ongoing upgrade to complete
  if (isUpgrading && upgradePromise) {
    await upgradePromise
  }
  
  if (!dbInstance) {
    dbInstance = await initDB()
  }
  
  // Verify connection is still open
  try {
    dbInstance.transaction([STORES.USERS], 'readonly')
  } catch (e) {
    // Connection closed, reopen
    dbInstance = null
    dbInstance = await initDB()
  }
  
  return dbInstance
}

/**
 * Generic function to get all items from a store
 */
export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(new Error(`Failed to get all from ${storeName}: ${request.error}`))
    }
  })
}

/**
 * Generic function to get an item by ID
 */
export async function getById<T>(storeName: string, id: number | string): Promise<T | undefined> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(id)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(new Error(`Failed to get ${id} from ${storeName}: ${request.error}`))
    }
  })
}

/**
 * Generic function to add an item
 */
export async function add<T>(storeName: string, item: T): Promise<T> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.add(item)

    request.onsuccess = () => {
      resolve(item)
    }

    request.onerror = () => {
      reject(new Error(`Failed to add to ${storeName}: ${request.error}`))
    }
  })
}

/**
 * Generic function to put (add or update) an item
 */
export async function put<T>(storeName: string, item: T): Promise<T> {
  // Ensure database is ready (not upgrading)
  if (isUpgrading && upgradePromise) {
    await upgradePromise
  }
  
  const db = await getDB()
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(item)

      request.onsuccess = () => {
        resolve(item)
      }

      request.onerror = () => {
        reject(new Error(`Failed to put to ${storeName}: ${request.error}`))
      }
      
      transaction.onerror = () => {
        reject(new Error(`Transaction failed for ${storeName}: ${transaction.error}`))
      }
    } catch (error: any) {
      // If connection is closing, wait a bit and retry once
      if (error.message && error.message.includes('closing')) {
        setTimeout(async () => {
          try {
            const retryDb = await getDB()
            const retryTransaction = retryDb.transaction([storeName], 'readwrite')
            const retryStore = retryTransaction.objectStore(storeName)
            const retryRequest = retryStore.put(item)
            
            retryRequest.onsuccess = () => resolve(item)
            retryRequest.onerror = () => reject(new Error(`Failed to put to ${storeName} after retry: ${retryRequest.error}`))
          } catch (retryError) {
            reject(new Error(`Failed to put to ${storeName}: ${retryError}`))
          }
        }, 100)
      } else {
        reject(error)
      }
    }
  })
}

/**
 * Generic function to delete an item by ID
 */
export async function deleteById(storeName: string, id: number | string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(new Error(`Failed to delete ${id} from ${storeName}: ${request.error}`))
    }
  })
}

/**
 * Generic function to get items by index
 */
export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: any
): Promise<T[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)

    request.onsuccess = () => {
      resolve(request.result || [])
    }

    request.onerror = () => {
      reject(new Error(`Failed to get by index ${indexName} from ${storeName}: ${request.error}`))
    }
  })
}

/**
 * Generic function to clear all items from a store
 */
export async function clear(storeName: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(new Error(`Failed to clear ${storeName}: ${request.error}`))
    }
  })
}

/**
 * Delete the entire database
 */
export async function deleteDB(dbName: string = DB_NAME): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName)

    request.onsuccess = () => {
      dbInstance = null
      resolve()
    }

    request.onerror = () => {
      reject(new Error(`Failed to delete database: ${request.error}`))
    }
  })
}

