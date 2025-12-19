// Migration script to move data from localStorage to IndexedDB

import { initDB, STORES, put, getAll } from './db'

const STORAGE_KEYS = {
  PRODUCTS: 'hisabkitab_products',
  CATEGORIES: 'hisabkitab_categories',
  CUSTOMERS: 'hisabkitab_customers',
  SUPPLIERS: 'hisabkitab_suppliers',
  SALES: 'hisabkitab_sales',
  PURCHASES: 'hisabkitab_purchases',
  STOCK_ADJUSTMENTS: 'hisabkitab_stock_adjustments',
  USERS: 'hisabkitab_users',
  AUDIT_LOGS: 'hisabkitab_audit_logs',
  NOTIFICATIONS: 'hisabkitab_notifications',
  SETTINGS: 'hisabkitab_settings',
  PAYMENT_RECORDS: 'hisabkitab_payment_records',
  PAYMENT_TRANSACTIONS: 'hisabkitab_payment_transactions',
  SALES_PERSONS: 'hisabkitab_sales_persons',
  CATEGORY_COMMISSIONS: 'hisabkitab_category_commissions',
  SALES_COMMISSIONS: 'hisabkitab_sales_commissions',
  SALES_PERSON_CATEGORY_ASSIGNMENTS: 'hisabkitab_sales_person_category_assignments',
  USER_PERMISSIONS: 'hisabkitab_user_permissions',
} as const

const MIGRATION_KEY = 'hisabkitab_db_migrated'

export interface MigrationResult {
  success: boolean
  migrated: number
  errors: string[]
  message: string
}

/**
 * Check if migration has already been performed
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true'
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(): void {
  localStorage.setItem(MIGRATION_KEY, 'true')
}

/**
 * Get data from localStorage
 */
function getLocalStorageData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error)
    return []
  }
}

function getLocalStorageObject<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error)
    return null
  }
}

/**
 * Migrate all data from localStorage to IndexedDB
 */
export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: 0,
    errors: [],
    message: '',
  }

  try {
    // Check if already migrated
    if (isMigrationComplete()) {
      // Check if IndexedDB has data
      await initDB()
      const products = await getAll(STORES.PRODUCTS)
      
      if (products.length > 0) {
        result.success = true
        result.message = 'Migration already completed. IndexedDB contains data.'
        return result
      }
    }

    console.log('Starting migration from localStorage to IndexedDB...')
    
    // Initialize database
    await initDB()

    // Migrate Products
    try {
      const products = getLocalStorageData(STORAGE_KEYS.PRODUCTS)
      if (products.length > 0) {
        for (const product of products) {
          await put(STORES.PRODUCTS, product)
        }
        result.migrated += products.length
        console.log(`Migrated ${products.length} products`)
      }
    } catch (error: any) {
      result.errors.push(`Products: ${error.message}`)
      console.error('Error migrating products:', error)
    }

    // Migrate Categories
    try {
      const categories = getLocalStorageData(STORAGE_KEYS.CATEGORIES)
      if (categories.length > 0) {
        for (const category of categories) {
          await put(STORES.CATEGORIES, category)
        }
        result.migrated += categories.length
        console.log(`Migrated ${categories.length} categories`)
      }
    } catch (error: any) {
      result.errors.push(`Categories: ${error.message}`)
      console.error('Error migrating categories:', error)
    }

    // Migrate Customers
    try {
      const customers = getLocalStorageData(STORAGE_KEYS.CUSTOMERS)
      if (customers.length > 0) {
        for (const customer of customers) {
          await put(STORES.CUSTOMERS, customer)
        }
        result.migrated += customers.length
        console.log(`Migrated ${customers.length} customers`)
      }
    } catch (error: any) {
      result.errors.push(`Customers: ${error.message}`)
      console.error('Error migrating customers:', error)
    }

    // Migrate Suppliers
    try {
      const suppliers = getLocalStorageData(STORAGE_KEYS.SUPPLIERS)
      if (suppliers.length > 0) {
        for (const supplier of suppliers) {
          await put(STORES.SUPPLIERS, supplier)
        }
        result.migrated += suppliers.length
        console.log(`Migrated ${suppliers.length} suppliers`)
      }
    } catch (error: any) {
      result.errors.push(`Suppliers: ${error.message}`)
      console.error('Error migrating suppliers:', error)
    }

    // Migrate Sales
    try {
      const sales = getLocalStorageData(STORAGE_KEYS.SALES)
      if (sales.length > 0) {
        for (const sale of sales) {
          await put(STORES.SALES, sale)
        }
        result.migrated += sales.length
        console.log(`Migrated ${sales.length} sales`)
      }
    } catch (error: any) {
      result.errors.push(`Sales: ${error.message}`)
      console.error('Error migrating sales:', error)
    }

    // Migrate Purchases
    try {
      const purchases = getLocalStorageData(STORAGE_KEYS.PURCHASES)
      if (purchases.length > 0) {
        for (const purchase of purchases) {
          await put(STORES.PURCHASES, purchase)
        }
        result.migrated += purchases.length
        console.log(`Migrated ${purchases.length} purchases`)
      }
    } catch (error: any) {
      result.errors.push(`Purchases: ${error.message}`)
      console.error('Error migrating purchases:', error)
    }

    // Migrate Stock Adjustments
    try {
      const adjustments = getLocalStorageData(STORAGE_KEYS.STOCK_ADJUSTMENTS)
      if (adjustments.length > 0) {
        for (const adjustment of adjustments) {
          await put(STORES.STOCK_ADJUSTMENTS, adjustment)
        }
        result.migrated += adjustments.length
        console.log(`Migrated ${adjustments.length} stock adjustments`)
      }
    } catch (error: any) {
      result.errors.push(`Stock Adjustments: ${error.message}`)
      console.error('Error migrating stock adjustments:', error)
    }

    // Migrate Users
    try {
      const users = getLocalStorageData(STORAGE_KEYS.USERS)
      if (users.length > 0) {
        for (const user of users) {
          await put(STORES.USERS, user)
        }
        result.migrated += users.length
        console.log(`Migrated ${users.length} users`)
      }
    } catch (error: any) {
      result.errors.push(`Users: ${error.message}`)
      console.error('Error migrating users:', error)
    }

    // Migrate Audit Logs
    try {
      const auditLogs = getLocalStorageData(STORAGE_KEYS.AUDIT_LOGS)
      if (auditLogs.length > 0) {
        for (const log of auditLogs) {
          await put(STORES.AUDIT_LOGS, log)
        }
        result.migrated += auditLogs.length
        console.log(`Migrated ${auditLogs.length} audit logs`)
      }
    } catch (error: any) {
      result.errors.push(`Audit Logs: ${error.message}`)
      console.error('Error migrating audit logs:', error)
    }

    // Migrate Notifications
    try {
      const notifications = getLocalStorageData(STORAGE_KEYS.NOTIFICATIONS)
      if (notifications.length > 0) {
        for (const notification of notifications) {
          await put(STORES.NOTIFICATIONS, notification)
        }
        result.migrated += notifications.length
        console.log(`Migrated ${notifications.length} notifications`)
      }
    } catch (error: any) {
      result.errors.push(`Notifications: ${error.message}`)
      console.error('Error migrating notifications:', error)
    }

    // Migrate Settings (stored as object, not array)
    try {
      const settings = getLocalStorageObject(STORAGE_KEYS.SETTINGS)
      if (settings) {
        await put(STORES.SETTINGS, { key: 'main', ...settings })
        result.migrated += 1
        console.log('Migrated settings')
      }
    } catch (error: any) {
      result.errors.push(`Settings: ${error.message}`)
      console.error('Error migrating settings:', error)
    }

    // Migrate Payment Records
    try {
      const paymentRecords = getLocalStorageData(STORAGE_KEYS.PAYMENT_RECORDS)
      if (paymentRecords.length > 0) {
        for (const record of paymentRecords) {
          await put(STORES.PAYMENT_RECORDS, record)
        }
        result.migrated += paymentRecords.length
        console.log(`Migrated ${paymentRecords.length} payment records`)
      }
    } catch (error: any) {
      result.errors.push(`Payment Records: ${error.message}`)
      console.error('Error migrating payment records:', error)
    }

    // Migrate Payment Transactions
    try {
      const transactions = getLocalStorageData(STORAGE_KEYS.PAYMENT_TRANSACTIONS)
      if (transactions.length > 0) {
        for (const transaction of transactions) {
          await put(STORES.PAYMENT_TRANSACTIONS, transaction)
        }
        result.migrated += transactions.length
        console.log(`Migrated ${transactions.length} payment transactions`)
      }
    } catch (error: any) {
      result.errors.push(`Payment Transactions: ${error.message}`)
      console.error('Error migrating payment transactions:', error)
    }

    // Migrate Sales Persons
    try {
      const salesPersons = getLocalStorageData(STORAGE_KEYS.SALES_PERSONS)
      if (salesPersons.length > 0) {
        for (const person of salesPersons) {
          await put(STORES.SALES_PERSONS, person)
        }
        result.migrated += salesPersons.length
        console.log(`Migrated ${salesPersons.length} sales persons`)
      }
    } catch (error: any) {
      result.errors.push(`Sales Persons: ${error.message}`)
      console.error('Error migrating sales persons:', error)
    }

    // Migrate Category Commissions
    try {
      const commissions = getLocalStorageData(STORAGE_KEYS.CATEGORY_COMMISSIONS)
      if (commissions.length > 0) {
        for (const commission of commissions) {
          await put(STORES.CATEGORY_COMMISSIONS, commission)
        }
        result.migrated += commissions.length
        console.log(`Migrated ${commissions.length} category commissions`)
      }
    } catch (error: any) {
      result.errors.push(`Category Commissions: ${error.message}`)
      console.error('Error migrating category commissions:', error)
    }

    // Migrate Sales Commissions
    try {
      const salesCommissions = getLocalStorageData(STORAGE_KEYS.SALES_COMMISSIONS)
      if (salesCommissions.length > 0) {
        for (const commission of salesCommissions) {
          await put(STORES.SALES_COMMISSIONS, commission)
        }
        result.migrated += salesCommissions.length
        console.log(`Migrated ${salesCommissions.length} sales commissions`)
      }
    } catch (error: any) {
      result.errors.push(`Sales Commissions: ${error.message}`)
      console.error('Error migrating sales commissions:', error)
    }

    // Migrate Sales Person Category Assignments
    try {
      const assignments = getLocalStorageData(STORAGE_KEYS.SALES_PERSON_CATEGORY_ASSIGNMENTS)
      if (assignments.length > 0) {
        for (const assignment of assignments) {
          await put(STORES.SALES_PERSON_CATEGORY_ASSIGNMENTS, assignment)
        }
        result.migrated += assignments.length
        console.log(`Migrated ${assignments.length} sales person category assignments`)
      }
    } catch (error: any) {
      result.errors.push(`Sales Person Category Assignments: ${error.message}`)
      console.error('Error migrating sales person category assignments:', error)
    }

    // Migrate User Permissions
    try {
      const permissions = getLocalStorageData(STORAGE_KEYS.USER_PERMISSIONS)
      if (permissions.length > 0) {
        for (const permission of permissions) {
          await put(STORES.USER_PERMISSIONS, permission)
        }
        result.migrated += permissions.length
        console.log(`Migrated ${permissions.length} user permissions`)
      }
    } catch (error: any) {
      result.errors.push(`User Permissions: ${error.message}`)
      console.error('Error migrating user permissions:', error)
    }

    // Mark migration as complete
    markMigrationComplete()

    result.success = result.errors.length === 0
    result.message = result.success
      ? `Successfully migrated ${result.migrated} items from localStorage to IndexedDB`
      : `Migrated ${result.migrated} items with ${result.errors.length} errors`

    console.log('Migration completed:', result.message)
    if (result.errors.length > 0) {
      console.error('Migration errors:', result.errors)
    }

    return result
  } catch (error: any) {
    result.success = false
    result.errors.push(`Migration failed: ${error.message}`)
    result.message = `Migration failed: ${error.message}`
    console.error('Migration error:', error)
    return result
  }
}

/**
 * Reset migration flag (for testing/debugging)
 */
export function resetMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_KEY)
}

