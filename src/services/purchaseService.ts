// Purchase service using IndexedDB and Supabase
// Handles both GST and Simple purchases

import { Purchase, GSTPurchase, SimplePurchase, PurchaseItem, Supplier, PurchaseType } from '../types/purchase'
import { productService } from './productService'
import { cloudPurchaseService } from './cloudPurchaseService'
import { cloudSupplierService } from './cloudSupplierService'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

// Suppliers
export const supplierService = {
  // Get all suppliers (from cloud, with local fallback)
  getAll: async (companyId?: number | null): Promise<Supplier[]> => {
    return await cloudSupplierService.getAll(companyId)
  },

  // Get supplier by ID (from cloud, with local fallback)
  getById: async (id: number): Promise<Supplier | undefined> => {
    return await cloudSupplierService.getById(id)
  },

  // Create supplier (saves to cloud and local)
  create: async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
    return await cloudSupplierService.create(supplier)
  },

  // Update supplier (updates cloud and local)
  update: async (id: number, supplier: Partial<Supplier>): Promise<Supplier | null> => {
    return await cloudSupplierService.update(id, supplier)
  },

  // Delete supplier (deletes from cloud and local)
  delete: async (id: number): Promise<boolean> => {
    return await cloudSupplierService.delete(id)
  },
}

// Purchases
export const purchaseService = {
  // Get all purchases (from cloud, with local fallback)
  getAll: async (type?: PurchaseType, companyId?: number | null): Promise<Purchase[]> => {
    return await cloudPurchaseService.getAll(type, companyId)
  },

  // Get purchase by ID (from cloud, with local fallback)
  getById: async (id: number): Promise<Purchase | undefined> => {
    return await cloudPurchaseService.getById(id)
  },

  createGST: async (purchase: Omit<GSTPurchase, 'id' | 'created_at' | 'updated_at'>): Promise<GSTPurchase> => {
    // Generate invoice number with company code if not provided
    let invoiceNumber = purchase.invoice_number
    if (!invoiceNumber) {
      const { generatePurchaseInvoiceNumber } = await import('../utils/companyCodeHelper')
      const allPurchases = await purchaseService.getAll('gst', purchase.company_id)
      const existingInvoiceNumbers = allPurchases.map(p => p.invoice_number).filter(Boolean) as string[]
      invoiceNumber = await generatePurchaseInvoiceNumber(purchase.company_id, existingInvoiceNumbers)
    }
    
    // Assign IDs to purchase items if they don't have them, and initialize sold_quantity
    const itemsWithIds = purchase.items.map((item, index) => ({
      ...item,
      id: item.id || Date.now() + index, // Assign unique ID if not present
      sold_quantity: item.sold_quantity || 0, // Initialize sold_quantity to 0
    }))
    
    const newPurchase: GSTPurchase = {
      ...purchase,
      items: itemsWithIds,
      invoice_number: invoiceNumber,
      id: Date.now(),
      type: 'gst',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Update product stock, purchase price, MRP, and selling price
    for (const item of newPurchase.items) {
      const product = await productService.getById(item.product_id, true)
      if (product) {
        await productService.updateStock(item.product_id, item.quantity, 'add')
        // Update product prices, min stock level, and barcode if provided
        const updates: any = {}
        if (item.unit_price || item.mrp || item.sale_price) {
          updates.purchase_price = item.unit_price || product.purchase_price
          updates.selling_price = item.sale_price || item.mrp || product.selling_price
        }
        if (item.min_stock_level !== undefined) {
          updates.min_stock_level = item.min_stock_level
        }
        // Assign barcode to product if provided and product doesn't have one
        if (item.barcode && !product.barcode) {
          updates.barcode = item.barcode
          updates.barcode_status = 'active'
        }
        if (Object.keys(updates).length > 0) {
          await productService.update(item.product_id, updates)
        }
      }
    }
    
    // Use cloud service which handles both cloud and local storage
    return await cloudPurchaseService.create(newPurchase) as GSTPurchase
  },

  createSimple: async (purchase: Omit<SimplePurchase, 'id' | 'created_at' | 'updated_at'>): Promise<SimplePurchase> => {
    // Generate invoice number with company code if not provided
    let invoiceNumber = purchase.invoice_number
    if (!invoiceNumber) {
      const { generatePurchaseInvoiceNumber } = await import('../utils/companyCodeHelper')
      const allPurchases = await purchaseService.getAll('simple', purchase.company_id)
      const existingInvoiceNumbers = allPurchases.map(p => p.invoice_number || '').filter(Boolean) as string[]
      invoiceNumber = await generatePurchaseInvoiceNumber(purchase.company_id, existingInvoiceNumbers)
    }
    
    // Assign IDs to purchase items if they don't have them, and initialize sold_quantity
    const itemsWithIds = purchase.items.map((item, index) => ({
      ...item,
      id: item.id || Date.now() + index, // Assign unique ID if not present
      sold_quantity: item.sold_quantity || 0, // Initialize sold_quantity to 0
    }))
    
    const newPurchase: SimplePurchase = {
      ...purchase,
      items: itemsWithIds,
      invoice_number: invoiceNumber || undefined,
      id: Date.now(),
      type: 'simple',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Update product stock, purchase price, MRP, and selling price
    for (const item of newPurchase.items) {
      const product = await productService.getById(item.product_id, true)
      if (product) {
        await productService.updateStock(item.product_id, item.quantity, 'add')
        // Update product prices, min stock level, and barcode if provided
        const updates: any = {}
        if (item.unit_price || item.mrp || item.sale_price) {
          updates.purchase_price = item.unit_price || product.purchase_price
          updates.selling_price = item.sale_price || item.mrp || product.selling_price
        }
        if (item.min_stock_level !== undefined) {
          updates.min_stock_level = item.min_stock_level
        }
        // Assign barcode to product if provided and product doesn't have one
        if (item.barcode && !product.barcode) {
          updates.barcode = item.barcode
          updates.barcode_status = 'active'
        }
        if (Object.keys(updates).length > 0) {
          await productService.update(item.product_id, updates)
        }
      }
    }
    
    // Use cloud service which handles both cloud and local storage
    return await cloudPurchaseService.create(newPurchase) as SimplePurchase
  },

  update: async (id: number, purchase: Partial<Purchase>): Promise<Purchase | null> => {
    const existing = await getById<Purchase>(STORES.PURCHASES, id)
    if (!existing) return null

    // Revert old stock before updating with new stock
    if (existing && existing.items) {
      for (const oldItem of existing.items) {
        await productService.updateStock(oldItem.product_id, oldItem.quantity, 'subtract')
      }
    }

    const updatedPurchase = {
      ...existing,
      ...purchase,
      updated_at: new Date().toISOString(),
    } as Purchase

    // Update product stock and prices for new/updated items
    if (purchase.items) {
      for (const item of purchase.items) {
        const product = await productService.getById(item.product_id, true)
        if (product) {
          await productService.updateStock(item.product_id, item.quantity, 'add')
          // Update product prices and min stock level if provided
          const updates: any = {}
          if (item.unit_price || item.mrp || item.sale_price) {
            updates.purchase_price = item.unit_price || product.purchase_price
            updates.selling_price = item.sale_price || item.mrp || product.selling_price
          }
          if (item.min_stock_level !== undefined) {
            updates.min_stock_level = item.min_stock_level
          }
          if (Object.keys(updates).length > 0) {
            await productService.update(item.product_id, updates)
          }
        }
      }
    }

    // Use cloud service which handles both cloud and local storage
    return await cloudPurchaseService.update(id, purchase)
  },

  // Delete purchase (deletes from cloud and local)
  delete: async (id: number): Promise<boolean> => {
    try {
      console.log(`[PurchaseService] Attempting to delete purchase ${id}`)
      const result = await cloudPurchaseService.delete(id)
      console.log(`[PurchaseService] ✅ Successfully deleted purchase ${id}`)
      return result
    } catch (error: any) {
      console.error(`[PurchaseService] ❌ Error deleting purchase ${id}:`, error)
      console.error(`[PurchaseService] Error details:`, {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      })
      // Throw error for better error handling in calling code
      throw error
    }
  },

  // Get purchase statistics
  getStats: async (companyId?: number | null) => {
    const purchases = await purchaseService.getAll(undefined, companyId)
    const gstPurchases = purchases.filter(p => p.type === 'gst') as GSTPurchase[]
    const simplePurchases = purchases.filter(p => p.type === 'simple') as SimplePurchase[]
    
    return {
      total: purchases.length,
      gst: {
        count: gstPurchases.length,
        total: gstPurchases.reduce((sum, p) => sum + p.grand_total, 0),
        tax: gstPurchases.reduce((sum, p) => sum + p.total_tax, 0),
      },
      simple: {
        count: simplePurchases.length,
        total: simplePurchases.reduce((sum, p) => sum + p.total_amount, 0),
      },
    }
  },
}
