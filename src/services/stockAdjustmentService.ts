import { StockAdjustment, StockAdjustmentType, StockAdjustmentReason } from '../types/stock'
import { productService } from './productService'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

export const stockAdjustmentService = {
  // Get all stock adjustments
  getAll: async (companyId?: number): Promise<StockAdjustment[]> => {
    if (companyId !== undefined) {
      return await getByIndex<StockAdjustment>(STORES.STOCK_ADJUSTMENTS, 'company_id', companyId)
    }
    return await getAll<StockAdjustment>(STORES.STOCK_ADJUSTMENTS)
  },

  // Get adjustments by product ID
  getByProductId: async (productId: number, companyId?: number): Promise<StockAdjustment[]> => {
    const allAdjustments = await stockAdjustmentService.getAll(companyId)
    return allAdjustments.filter(adj => adj.product_id === productId)
      .sort((a, b) => new Date(b.adjustment_date).getTime() - new Date(a.adjustment_date).getTime())
  },

  // Get adjustment by ID
  getById: async (id: number): Promise<StockAdjustment | undefined> => {
    return await getById<StockAdjustment>(STORES.STOCK_ADJUSTMENTS, id)
  },

  // Create a new stock adjustment
  create: async (adjustment: Omit<StockAdjustment, 'id' | 'created_at' | 'updated_at'>): Promise<StockAdjustment> => {
    const product = await productService.getById(adjustment.product_id, true)
    if (!product) {
      throw new Error('Product not found')
    }

    // Calculate new stock based on adjustment type
    let newStock = adjustment.previous_stock
    switch (adjustment.adjustment_type) {
      case 'increase':
        newStock = adjustment.previous_stock + adjustment.quantity
        break
      case 'decrease':
        newStock = Math.max(0, adjustment.previous_stock - adjustment.quantity)
        break
      case 'set':
        newStock = adjustment.quantity
        break
      case 'damaged':
      case 'expired':
        newStock = Math.max(0, adjustment.previous_stock - adjustment.quantity)
        break
      case 'returned':
        newStock = adjustment.previous_stock + adjustment.quantity
        break
      case 'other':
        // For 'other', use the new_stock value directly
        newStock = adjustment.new_stock
        break
    }

    const newAdjustment: StockAdjustment = {
      ...adjustment,
      id: Date.now(),
      new_stock: newStock,
      created_at: new Date().toISOString(),
    }

    // Update product stock (using 'set' type to set exact quantity)
    await productService.updateStock(adjustment.product_id, newStock, 'set')

    await put(STORES.STOCK_ADJUSTMENTS, newAdjustment)
    return newAdjustment
  },

  // Update stock adjustment (rarely needed, but included for completeness)
  update: async (id: number, updates: Partial<StockAdjustment>): Promise<StockAdjustment> => {
    const existing = await getById<StockAdjustment>(STORES.STOCK_ADJUSTMENTS, id)
    if (!existing) {
      throw new Error('Stock adjustment not found')
    }

    const updatedAdjustment: StockAdjustment = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    await put(STORES.STOCK_ADJUSTMENTS, updatedAdjustment)
    return updatedAdjustment
  },

  // Delete stock adjustment (and revert stock change)
  delete: async (id: number): Promise<void> => {
    const adjustment = await getById<StockAdjustment>(STORES.STOCK_ADJUSTMENTS, id)
    if (!adjustment) {
      throw new Error('Stock adjustment not found')
    }

    // Revert stock to previous value
    await productService.updateStock(adjustment.product_id, adjustment.previous_stock, 'set')

    await deleteById(STORES.STOCK_ADJUSTMENTS, id)
  },

  // Get statistics
  getStats: async (companyId?: number) => {
    const stockAdjustments = await stockAdjustmentService.getAll(companyId)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    const todayAdjustments = stockAdjustments.filter(adj => 
      new Date(adj.adjustment_date) >= today
    )

    const thisMonthAdjustments = stockAdjustments.filter(adj => 
      new Date(adj.adjustment_date) >= thisMonth
    )

    const thisYearAdjustments = stockAdjustments.filter(adj => 
      new Date(adj.adjustment_date) >= thisYear
    )

    return {
      total: stockAdjustments.length,
      today: todayAdjustments.length,
      thisMonth: thisMonthAdjustments.length,
      thisYear: thisYearAdjustments.length,
      byType: {
        increase: stockAdjustments.filter(adj => adj.adjustment_type === 'increase').length,
        decrease: stockAdjustments.filter(adj => adj.adjustment_type === 'decrease').length,
        set: stockAdjustments.filter(adj => adj.adjustment_type === 'set').length,
        damaged: stockAdjustments.filter(adj => adj.adjustment_type === 'damaged').length,
        expired: stockAdjustments.filter(adj => adj.adjustment_type === 'expired').length,
        returned: stockAdjustments.filter(adj => adj.adjustment_type === 'returned').length,
        other: stockAdjustments.filter(adj => adj.adjustment_type === 'other').length,
      }
    }
  },

  // Initialize with sample data (optional - for migration compatibility)
  init: async (data: StockAdjustment[]): Promise<void> => {
    for (const adjustment of data) {
      await put(STORES.STOCK_ADJUSTMENTS, adjustment)
    }
  },
}
