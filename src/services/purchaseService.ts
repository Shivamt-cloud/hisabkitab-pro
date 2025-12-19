// Purchase service using IndexedDB
// Handles both GST and Simple purchases

import { Purchase, GSTPurchase, SimplePurchase, PurchaseItem, Supplier, PurchaseType } from '../types/purchase'
import { productService } from './productService'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

// Suppliers
export const supplierService = {
  getAll: async (companyId?: number): Promise<Supplier[]> => {
    if (companyId !== undefined) {
      return await getByIndex<Supplier>(STORES.SUPPLIERS, 'company_id', companyId)
    }
    return await getAll<Supplier>(STORES.SUPPLIERS)
  },

  getById: async (id: number): Promise<Supplier | undefined> => {
    return await getById<Supplier>(STORES.SUPPLIERS, id)
  },

  create: async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
    const newSupplier: Supplier = {
      ...supplier,
      id: Date.now(),
      is_registered: !!supplier.gstin,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SUPPLIERS, newSupplier)
    return newSupplier
  },

  update: async (id: number, supplier: Partial<Supplier>): Promise<Supplier | null> => {
    const existing = await getById<Supplier>(STORES.SUPPLIERS, id)
    if (!existing) return null

    const updated: Supplier = {
      ...existing,
      ...supplier,
      is_registered: supplier.gstin ? true : existing.is_registered,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SUPPLIERS, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SUPPLIERS, id)
      return true
    } catch (error) {
      return false
    }
  },
}

// Purchases
export const purchaseService = {
  getAll: async (type?: PurchaseType, companyId?: number): Promise<Purchase[]> => {
    let purchases: Purchase[]
    
    if (companyId !== undefined) {
      purchases = await getByIndex<Purchase>(STORES.PURCHASES, 'company_id', companyId)
    } else {
      purchases = await getAll<Purchase>(STORES.PURCHASES)
    }
    
    if (type) {
      purchases = purchases.filter(p => p.type === type)
    }
    return purchases
  },

  getById: async (id: number): Promise<Purchase | undefined> => {
    return await getById<Purchase>(STORES.PURCHASES, id)
  },

  createGST: async (purchase: Omit<GSTPurchase, 'id' | 'created_at' | 'updated_at'>): Promise<GSTPurchase> => {
    const newPurchase: GSTPurchase = {
      ...purchase,
      id: Date.now(),
      type: 'gst',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Update product stock, purchase price, MRP, and selling price
    for (const item of purchase.items) {
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
    
    await put(STORES.PURCHASES, newPurchase)
    return newPurchase
  },

  createSimple: async (purchase: Omit<SimplePurchase, 'id' | 'created_at' | 'updated_at'>): Promise<SimplePurchase> => {
    const newPurchase: SimplePurchase = {
      ...purchase,
      id: Date.now(),
      type: 'simple',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Update product stock, purchase price, MRP, and selling price
    for (const item of purchase.items) {
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
    
    await put(STORES.PURCHASES, newPurchase)
    return newPurchase
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

    await put(STORES.PURCHASES, updatedPurchase)
    return updatedPurchase
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.PURCHASES, id)
      return true
    } catch (error) {
      return false
    }
  },

  // Get purchase statistics
  getStats: async (companyId?: number) => {
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
