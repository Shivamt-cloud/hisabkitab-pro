// Sale service using IndexedDB
// Handles sales and product archival

import { Sale, SaleItem, Customer } from '../types/sale'
import { Purchase, PurchaseItem } from '../types/purchase'
import { productService } from './productService'
import { purchaseService } from './purchaseService'
import { salesCommissionService } from './salespersonService'
import { customerService } from './customerService'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

// Sales
export const saleService = {
  getAll: async (includeArchived: boolean = false, companyId?: number | null): Promise<Sale[]> => {
    // Always load all sales first to avoid index issues
    let sales = await getAll<Sale>(STORES.SALES)
    
    // If companyId is provided, filter STRICTLY by company_id (no backward compatibility - data isolation is critical)
    // Also explicitly exclude records with null/undefined company_id to prevent data leakage
    if (companyId !== undefined && companyId !== null) {
      sales = sales.filter(s => {
        // Only include records that have the exact matching company_id
        return s.company_id === companyId
      })
    } else if (companyId === null) {
      // If companyId is explicitly null (user has no company), return empty array for data isolation
      sales = []
    }
    // If companyId is undefined, return all (for admin users who haven't selected a company)
    
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
    
    // Load all purchases for this company to track purchase item inventory
    const allPurchases = await purchaseService.getAll(undefined, sale.company_id)
    
    // Ensure all purchase items have sold_quantity initialized and IDs
    for (const purchase of allPurchases) {
      let needsUpdate = false
      for (const purchaseItem of purchase.items) {
        if (purchaseItem.sold_quantity === undefined) {
          purchaseItem.sold_quantity = 0
          needsUpdate = true
        }
        if (!purchaseItem.id) {
          purchaseItem.id = Date.now() + Math.random() // Generate unique ID
          needsUpdate = true
        }
      }
      if (needsUpdate) {
        purchase.updated_at = new Date().toISOString()
        await put(STORES.PURCHASES, purchase)
      }
    }
    
    // Process each item: update stock and purchase item inventory based on sale_type
    const updatedSaleItems: SaleItem[] = []
    
    for (const item of sale.items) {
      const product = await productService.getById(item.product_id, true)
      if (!product) continue
      
      let updatedItem: SaleItem = { ...item }
      
      if (item.sale_type === 'return') {
        // For returns: add back to purchase items and product stock
        // Try to find the original purchase item if purchase_item_id is provided
        if (item.purchase_id && item.purchase_item_id) {
          const purchase = allPurchases.find(p => p.id === item.purchase_id)
          if (purchase) {
            const purchaseItem = purchase.items.find(pi => pi.id === item.purchase_item_id)
            if (purchaseItem) {
              // Add back to the specific purchase item
              const currentSoldQty = purchaseItem.sold_quantity || 0
              const newSoldQty = Math.max(0, currentSoldQty - item.quantity)
              purchaseItem.sold_quantity = newSoldQty
              
              // Update the purchase in the database (directly update to avoid stock recalculation)
              purchase.updated_at = new Date().toISOString()
              await put(STORES.PURCHASES, purchase)
            }
          }
        } else {
          // If no specific purchase item, add to the most recent purchase item for this product (LIFO for returns)
          const productPurchases = allPurchases
            .filter(p => p.items.some(pi => pi.product_id === item.product_id))
            .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
          
          for (const purchase of productPurchases) {
            const purchaseItems = purchase.items
              .filter(pi => pi.product_id === item.product_id)
              .sort((a, b) => {
                // Sort by sold_quantity descending (items with more sold quantity first)
                const aSold = a.sold_quantity || 0
                const bSold = b.sold_quantity || 0
                return bSold - aSold
              })
            
            let remainingQty = item.quantity
            for (const purchaseItem of purchaseItems) {
              if (remainingQty <= 0) break
              
              const currentSoldQty = purchaseItem.sold_quantity || 0
              if (currentSoldQty > 0) {
                const qtyToReturn = Math.min(remainingQty, currentSoldQty)
                purchaseItem.sold_quantity = currentSoldQty - qtyToReturn
                remainingQty -= qtyToReturn
                
                // Link the return to this purchase item
                if (!updatedItem.purchase_id) {
                  updatedItem.purchase_id = purchase.id
                  updatedItem.purchase_item_id = purchaseItem.id
                  updatedItem.purchase_item_article = purchaseItem.article
                  updatedItem.purchase_item_barcode = purchaseItem.barcode
                }
              }
            }
            
            if (remainingQty > 0) {
              // Update the purchase in the database (directly update to avoid stock recalculation)
              purchase.updated_at = new Date().toISOString()
              await put(STORES.PURCHASES, purchase)
            }
          }
        }
        
        // Add back to product stock
        await productService.updateStock(item.product_id, item.quantity, 'add')
      } else {
        // For sales: deduct from purchase items
        // If purchase_item_id is provided, deduct from that specific item
        // Otherwise, use FIFO (First In First Out)
        let remainingQty = item.quantity
        
        console.log(`[SaleService] Processing sale for product ${item.product_id}, quantity: ${item.quantity}`)
        console.log(`[SaleService] Purchase item info: purchase_id=${item.purchase_id}, purchase_item_id=${item.purchase_item_id}, article=${item.purchase_item_article}`)
        
        // If we have specific purchase item info, use it
        if (item.purchase_id && item.purchase_item_id) {
          const purchase = allPurchases.find(p => p.id === item.purchase_id)
          if (purchase) {
            const purchaseItemIndex = purchase.items.findIndex(pi => pi.id === item.purchase_item_id)
            if (purchaseItemIndex >= 0) {
              const purchaseItem = purchase.items[purchaseItemIndex]
              if (purchaseItem.product_id === item.product_id) {
                const soldQty = purchaseItem.sold_quantity || 0
                const availableQty = purchaseItem.quantity - soldQty
                const qtyToSell = Math.min(remainingQty, availableQty)
                
                console.log(`[SaleService] Deducting ${qtyToSell} from specific purchase item (ID: ${purchaseItem.id}, Article: ${purchaseItem.article}), available: ${availableQty}, current sold: ${soldQty}`)
                
                purchaseItem.sold_quantity = soldQty + qtyToSell
                remainingQty -= qtyToSell
                
                console.log(`[SaleService] Updated purchase item sold_quantity from ${soldQty} to ${purchaseItem.sold_quantity}`)
                
                // Update the purchase in the database
                purchase.updated_at = new Date().toISOString()
                await put(STORES.PURCHASES, purchase)
                console.log(`[SaleService] Purchase ${purchase.id} saved successfully`)
                
                // Link the sale item to this purchase item
                updatedItem.purchase_id = purchase.id
                updatedItem.purchase_item_id = purchaseItem.id
                updatedItem.purchase_item_article = purchaseItem.article
                updatedItem.purchase_item_barcode = purchaseItem.barcode
              }
            }
          }
        }
        
        // If we still have remaining quantity or no specific purchase item, use FIFO
        if (remainingQty > 0 || !item.purchase_item_id) {
          const productPurchases = allPurchases
            .filter(p => p.items.some(pi => pi.product_id === item.product_id))
            .sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()) // FIFO: oldest first
          
          console.log(`[SaleService] Using FIFO for remaining ${remainingQty} units. Found ${productPurchases.length} purchases with this product`)
          
          for (const purchase of productPurchases) {
            if (remainingQty <= 0) break
            
            console.log(`[SaleService] Checking purchase ${purchase.id}, date: ${purchase.purchase_date}`)
            
            // Get purchase items for this product with available quantity info
            // If we have article info, prioritize matching by article
            const purchaseItemsWithInfo = purchase.items
              .map((pi, idx) => {
                if (pi.product_id !== item.product_id) return null
                
                // If we have article info and this item matches, prioritize it
                const matchesArticle = item.purchase_item_article && pi.article && 
                  pi.article.toLowerCase() === item.purchase_item_article.toLowerCase()
                
                const soldQty = pi.sold_quantity || 0
                const availableQty = pi.quantity - soldQty
                return availableQty > 0 ? { item: pi, availableQty, originalIndex: idx, matchesArticle } : null
              })
              .filter((p): p is { item: PurchaseItem; availableQty: number; originalIndex: number; matchesArticle: boolean } => p !== null)
              .sort((a, b) => {
                // Prioritize items that match the article
                if (a.matchesArticle && !b.matchesArticle) return -1
                if (!a.matchesArticle && b.matchesArticle) return 1
                // Then sort by available quantity (most available first)
                return b.availableQty - a.availableQty
              })
            
            console.log(`[SaleService] Found ${purchaseItemsWithInfo.length} purchase items with available quantity`)
            
            let purchaseUpdated = false
            
            for (const { item: purchaseItem, availableQty, originalIndex } of purchaseItemsWithInfo) {
              if (remainingQty <= 0) break
              
              const qtyToSell = Math.min(remainingQty, availableQty)
              
              console.log(`[SaleService] Selling ${qtyToSell} from purchase item (ID: ${purchaseItem.id}, Article: ${purchaseItem.article}), available: ${availableQty}, current sold: ${purchaseItem.sold_quantity || 0}`)
              
              // Update sold_quantity for the ACTUAL purchase item in the purchase.items array
              const actualItem = purchase.items[originalIndex]
              if (actualItem && actualItem.product_id === item.product_id) {
                const oldSoldQty = actualItem.sold_quantity || 0
                actualItem.sold_quantity = oldSoldQty + qtyToSell
                purchaseUpdated = true
                
                console.log(`[SaleService] Updated purchase item sold_quantity from ${oldSoldQty} to ${actualItem.sold_quantity}`)
                
                // Link the sale item to the first purchase item (primary allocation)
                if (!updatedItem.purchase_id && qtyToSell > 0) {
                  updatedItem.purchase_id = purchase.id
                  updatedItem.purchase_item_id = actualItem.id
                  updatedItem.purchase_item_article = actualItem.article
                  updatedItem.purchase_item_barcode = actualItem.barcode
                }
              }
              
              remainingQty -= qtyToSell
            }
            
            // Update the purchase in the database if it was modified
            if (purchaseUpdated) {
              console.log(`[SaleService] Saving updated purchase ${purchase.id} to database`)
              purchase.updated_at = new Date().toISOString()
              await put(STORES.PURCHASES, purchase)
              console.log(`[SaleService] Purchase ${purchase.id} saved successfully`)
            }
          }
        }
        
        if (remainingQty > 0) {
          console.warn(`[SaleService] Warning: Only ${item.quantity - remainingQty} units available for product ${item.product_id}, but trying to sell ${item.quantity}`)
        } else {
          console.log(`[SaleService] Successfully allocated all ${item.quantity} units for product ${item.product_id}`)
        }
        
        if (remainingQty > 0) {
          console.warn(`Warning: Only ${item.quantity - remainingQty} units available for product ${item.product_id}, but trying to sell ${item.quantity}`)
        }
        
        // Deduct from product stock
        await productService.updateStock(item.product_id, item.quantity, 'subtract')
        
        // If stock reaches zero, mark as sold/archived
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
      
      updatedSaleItems.push(updatedItem)
    }
    
    // Update sale items with purchase item links
    newSale.items = updatedSaleItems

    // Calculate and save commissions if sales person is assigned
    let totalCommission = 0
    if (sale.sales_person_id) {
      const products = await productService.getAll(true)
      const itemsWithCategory = newSale.items.map(item => {
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
    
    // Handle customer credit balance
    if (sale.customer_id) {
      // Calculate return amount (negative total for return items)
      const returnItemsTotal = newSale.items
        .filter(item => item.sale_type === 'return')
        .reduce((sum, item) => sum + item.total, 0)
      
      // Calculate credit from payment methods (credit payment method)
      const creditPaymentTotal = (newSale.payment_methods || [])
        .filter((pm: { method: string; amount: number }) => pm.method === 'credit')
        .reduce((sum: number, pm: { method: string; amount: number }) => sum + (pm.amount || 0), 0)
      
      // If there are returns OR credit payment method, add credit to customer
      // Priority: Use credit payment method amount if available, otherwise use return items total
      const creditToAdd = creditPaymentTotal > 0 ? creditPaymentTotal : returnItemsTotal
      
      if (creditToAdd > 0) {
        await customerService.updateCreditBalance(sale.customer_id, creditToAdd)
        newSale.credit_added = creditToAdd
      }
      
      // If credit was applied (from available balance), deduct from customer balance
      if (sale.credit_applied && sale.credit_applied > 0) {
        await customerService.updateCreditBalance(sale.customer_id, -sale.credit_applied)
        newSale.credit_applied = sale.credit_applied
      }
    }
    
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
