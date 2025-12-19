// Sale service using IndexedDB
// Handles sales and product archival

import { Sale, SaleItem, Customer } from '../types/sale'
import { productService } from './productService'
import { salesCommissionService } from './salespersonService'
import { customerService } from './customerService'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

// Sales
export const saleService = {
  getAll: async (includeArchived: boolean = false, companyId?: number): Promise<Sale[]> => {
    let sales: Sale[]
    
    if (companyId !== undefined) {
      sales = await getByIndex<Sale>(STORES.SALES, 'company_id', companyId)
    } else {
      sales = await getAll<Sale>(STORES.SALES)
    }
    
    if (!includeArchived) {
      sales = sales.filter(s => !s.archived)
    }
    return sales
  },

  getById: async (id: number): Promise<Sale | undefined> => {
    return await getById<Sale>(STORES.SALES, id)
  },

  create: async (sale: Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'archived'>): Promise<Sale> => {
    // Generate invoice number with company code
    let invoiceNumber = sale.invoice_number
    if (!invoiceNumber) {
      const { generateInvoiceNumber } = await import('../utils/companyCodeHelper')
      const allSales = await saleService.getAll(true, sale.company_id)
      const existingInvoiceNumbers = allSales.map(s => s.invoice_number)
      invoiceNumber = await generateInvoiceNumber(sale.company_id, existingInvoiceNumbers)
    }
    
    const newSale: Sale = {
      ...sale,
      id: Date.now(),
      invoice_number: invoiceNumber,
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Process each item: update stock based on sale_type
    // Purchase price should already be included in sale.items from SaleForm
    for (const item of sale.items) {
      const product = await productService.getById(item.product_id, true)
      if (product) {
        // Update stock: subtract for sale, add for return
        if (item.sale_type === 'return') {
          await productService.updateStock(item.product_id, item.quantity, 'add')
        } else {
          await productService.updateStock(item.product_id, item.quantity, 'subtract')
          
          // If stock reaches zero or product is sold, mark as sold/archived (only for sale items)
          const updatedProduct = await productService.getById(item.product_id, true)
          if (updatedProduct && updatedProduct.stock_quantity <= 0) {
            await productService.update(item.product_id, {
              status: 'sold',
              barcode_status: 'used',
              sold_date: new Date().toISOString(),
              sale_id: newSale.id,
            })
          }
        }
      }
    }

    // Calculate and save commissions if sales person is assigned
    let totalCommission = 0
    if (sale.sales_person_id) {
      const products = await productService.getAll(true)
      const itemsWithCategory = sale.items.map(item => {
        const product = products.find(p => p.id === item.product_id)
        return {
          product_id: item.product_id,
          product_name: item.product_name || product?.name || '',
          category_id: product?.category_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.total,
        }
      })

      const commissions = await salesCommissionService.calculateCommission(
        sale.sales_person_id,
        newSale.id,
        sale.sale_date,
        itemsWithCategory
      )
      await salesCommissionService.saveCommissions(commissions)
      totalCommission = commissions.reduce((sum, c) => sum + c.commission_amount, 0)
    }

    // Update sale with total commission
    newSale.total_commission = totalCommission
    
    await put(STORES.SALES, newSale)
    return newSale
  },

  update: async (id: number, sale: Partial<Sale>): Promise<Sale | null> => {
    const existing = await getById<Sale>(STORES.SALES, id)
    if (!existing) return null

    const updated: Sale = {
      ...existing,
      ...sale,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SALES, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SALES, id)
      return true
    } catch (error) {
      return false
    }
  },

  // Archive a sale (mark products as archived)
  archive: async (id: number): Promise<boolean> => {
    const sale = await saleService.getById(id)
    if (!sale) return false

    // Mark all products in sale as archived
    for (const item of sale.items) {
      await productService.update(item.product_id, {
        status: 'archived',
        barcode_status: 'inactive',
      })
    }

    // Mark sale as archived
    await saleService.update(id, { archived: true })
    return true
  },

  // Get sales statistics
  getStats: async () => {
    const sales = await saleService.getAll(true)
    return {
      total: sales.length,
      archived: sales.filter(s => s.archived).length,
      active: sales.filter(s => !s.archived).length,
      totalRevenue: sales.reduce((sum, s) => sum + s.grand_total, 0),
      thisMonth: sales.filter(s => {
        const saleDate = new Date(s.sale_date)
        const now = new Date()
        return saleDate.getMonth() === now.getMonth() && 
               saleDate.getFullYear() === now.getFullYear()
      }).reduce((sum, s) => sum + s.grand_total, 0),
    }
  },

  // Calculate profit from sold items
  calculateProfit: async (startDate?: string, endDate?: string) => {
    const allSales = await saleService.getAll(true)
    
    // Filter by date range if provided
    let filteredSales = allSales
    if (startDate || endDate) {
      filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.sale_date).getTime()
        if (startDate && saleDate < new Date(startDate).getTime()) return false
        if (endDate) {
          const endDateTime = new Date(endDate).getTime()
          // Include the entire end date (add 24 hours)
          if (saleDate > endDateTime + 86400000) return false
        }
        return true
      })
    }

    let totalProfit = 0
    let totalRevenue = 0
    let totalCost = 0

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        // Only calculate profit for 'sale' items, not returns
        if (item.sale_type === 'sale') {
          const saleRevenue = item.total
          const purchasePrice = item.purchase_price || 0
          const itemCost = purchasePrice * item.quantity
          const itemProfit = saleRevenue - itemCost

          totalRevenue += saleRevenue
          totalCost += itemCost
          totalProfit += itemProfit
        } else if (item.sale_type === 'return') {
          // For returns, reverse the calculation
          const saleRevenue = item.total
          const purchasePrice = item.purchase_price || 0
          const itemCost = purchasePrice * item.quantity
          const itemProfit = saleRevenue - itemCost

          // Subtract from totals (returns reduce profit)
          totalRevenue -= saleRevenue
          totalCost -= itemCost
          totalProfit -= itemProfit
        }
      })
    })

    return {
      totalProfit,
      totalRevenue,
      totalCost,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      salesCount: filteredSales.length,
    }
  },
}
