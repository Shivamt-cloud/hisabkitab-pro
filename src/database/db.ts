// IndexedDB Database wrapper for HisabKitab
// Provides a simple interface to interact with IndexedDB

const DB_NAME = 'hisabkitab_db'
const DB_VERSION = 2 // Incremented to add company_id indexes and COMPANIES store

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
} as const

let dbInstance: IDBDatabase | null = null

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
    if (dbInstance) {
      resolve(dbInstance)
      return
    }

    const request = indexedDB.open(dbName, dbVersion)

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error}`))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

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

      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customersStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' })
        customersStore.createIndex('company_id', 'company_id', { unique: false })
        customersStore.createIndex('email', 'email', { unique: false })
        customersStore.createIndex('phone', 'phone', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
        const suppliersStore = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' })
        suppliersStore.createIndex('company_id', 'company_id', { unique: false })
        suppliersStore.createIndex('email', 'email', { unique: false })
        suppliersStore.createIndex('phone', 'phone', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' })
        salesStore.createIndex('company_id', 'company_id', { unique: false })
        salesStore.createIndex('customer_id', 'customer_id', { unique: false })
        salesStore.createIndex('sale_date', 'sale_date', { unique: false })
        salesStore.createIndex('invoice_number', 'invoice_number', { unique: false })
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

      if (!db.objectStoreNames.contains(STORES.AUDIT_LOGS)) {
        const auditStore = db.createObjectStore(STORES.AUDIT_LOGS, { keyPath: 'id' })
        auditStore.createIndex('timestamp', 'timestamp', { unique: false })
        auditStore.createIndex('userId', 'userId', { unique: false })
        auditStore.createIndex('module', 'module', { unique: false })
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

      if (!db.objectStoreNames.contains(STORES.AUTOMATIC_BACKUPS)) {
        const backupsStore = db.createObjectStore(STORES.AUTOMATIC_BACKUPS, { keyPath: 'id', autoIncrement: true })
        backupsStore.createIndex('backup_date', 'backup_date', { unique: false })
        backupsStore.createIndex('created_at', 'created_at', { unique: false })
      }
    }
  })
}

/**
 * Get database instance
 */
export async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
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
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(item)

    request.onsuccess = () => {
      resolve(item)
    }

    request.onerror = () => {
      reject(new Error(`Failed to put to ${storeName}: ${request.error}`))
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

