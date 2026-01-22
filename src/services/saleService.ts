// Sale service using IndexedDB and Supabase
// Handles sales and product archival

import { Sale, SaleItem, Customer } from '../types/sale'
import { Purchase, PurchaseItem } from '../types/purchase'
import { productService } from './productService'
import { purchaseService } from './purchaseService'
import { salesCommissionService } from './salespersonService'
import { customerService } from './customerService'
import { cloudSaleService } from './cloudSaleService'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

// Sales
export const saleService = {
  // Get all sales (from cloud, with local fallback)
  getAll: async (includeArchived: boolean = false, companyId?: number | null): Promise<Sale[]> => {
    return await cloudSaleService.getAll(includeArchived, companyId)
  },

  // Get sale by ID (from cloud, with local fallback)
  getById: async (id: number): Promise<Sale | undefined> => {
    return await cloudSaleService.getById(id)
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
    
    // Generate unique ID with timestamp + random + counter to avoid collisions
    // Use performance.now() for microsecond precision and add random component
    const uniqueId = Math.floor(performance.now() * 1000) + Math.floor(Math.random() * 10000000) + Math.floor(Math.random() * 1000)
    
    const newSale: Sale = {
      ...sale,
      id: uniqueId,
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
    
    // Process each item: ONLY link to purchase items, DON'T update inventory yet
    // We'll update inventory AFTER the sale is successfully saved
    const updatedSaleItems: SaleItem[] = []
    
    for (const item of sale.items) {
      const product = await productService.getById(item.product_id, true)
      if (!product) continue
      
      let updatedItem: SaleItem = { ...item }
      
      if (item.sale_type === 'return') {
        // For returns: Just link to purchase items (inventory update happens after sale is saved)
        if (item.purchase_id && item.purchase_item_id) {
          const purchase = allPurchases.find(p => p.id === item.purchase_id)
          if (purchase) {
            const purchaseItem = purchase.items.find(pi => pi.id === item.purchase_item_id)
            if (purchaseItem) {
              // Link the return to this purchase item
              updatedItem.purchase_id = purchase.id
              updatedItem.purchase_item_id = purchaseItem.id
              updatedItem.purchase_item_article = purchaseItem.article
              updatedItem.purchase_item_barcode = purchaseItem.barcode
            }
          }
        } else {
          // If no specific purchase item, find the most recent purchase item for this product (LIFO for returns)
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
            
            // Link the return to the first purchase item with sold quantity
            for (const purchaseItem of purchaseItems) {
              const currentSoldQty = purchaseItem.sold_quantity || 0
              if (currentSoldQty > 0) {
                if (!updatedItem.purchase_id) {
                  updatedItem.purchase_id = purchase.id
                  updatedItem.purchase_item_id = purchaseItem.id
                  updatedItem.purchase_item_article = purchaseItem.article
                  updatedItem.purchase_item_barcode = purchaseItem.barcode
                }
                break
              }
            }
            if (updatedItem.purchase_id) break
          }
        }
      } else {
        // For sales: Just link to purchase items (inventory update happens after sale is saved)
        console.log(`[SaleService] Processing sale for product ${item.product_id}, quantity: ${item.quantity}`)
        console.log(`[SaleService] Purchase item info: purchase_id=${item.purchase_id}, purchase_item_id=${item.purchase_item_id}, article=${item.purchase_item_article}`)
        
        // If we have specific purchase item info, use it
        if (item.purchase_id && item.purchase_item_id) {
          const purchase = allPurchases.find(p => p.id === item.purchase_id)
          if (purchase) {
            const purchaseItem = purchase.items.find(pi => pi.id === item.purchase_item_id)
            if (purchaseItem && purchaseItem.product_id === item.product_id) {
              // Link the sale item to this purchase item
              updatedItem.purchase_id = purchase.id
              updatedItem.purchase_item_id = purchaseItem.id
              updatedItem.purchase_item_article = purchaseItem.article
              updatedItem.purchase_item_barcode = purchaseItem.barcode
              console.log(`[SaleService] Linked to specific purchase item (ID: ${purchaseItem.id}, Article: ${purchaseItem.article})`)
            }
          }
        }
        
        // If we still don't have a purchase item link, use FIFO to find one
        if (!updatedItem.purchase_item_id) {
          const productPurchases = allPurchases
            .filter(p => p.items.some(pi => pi.product_id === item.product_id))
            .sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()) // FIFO: oldest first
          
          console.log(`[SaleService] Using FIFO to find purchase item. Found ${productPurchases.length} purchases with this product`)
          
          for (const purchase of productPurchases) {
            // Get purchase items for this product with available quantity
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
            
            // Link to the first available purchase item
            if (purchaseItemsWithInfo.length > 0) {
              const { item: purchaseItem, originalIndex } = purchaseItemsWithInfo[0]
              const actualItem = purchase.items[originalIndex]
              if (actualItem) {
                updatedItem.purchase_id = purchase.id
                updatedItem.purchase_item_id = actualItem.id
                updatedItem.purchase_item_article = actualItem.article
                updatedItem.purchase_item_barcode = actualItem.barcode
                console.log(`[SaleService] Linked to purchase item (ID: ${actualItem.id}, Article: ${actualItem.article}) via FIFO`)
                break
              }
            }
          }
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
    
    // Save sale FIRST before updating inventory
    // This ensures we have a valid sale ID and can handle errors properly
    let savedSale: Sale
    try {
      savedSale = await cloudSaleService.create(newSale)
      console.log(`[SaleService] ✅ Sale ${savedSale.id} created successfully`)
    } catch (error: any) {
      console.error(`[SaleService] ❌ Error creating sale:`, error)
      // No inventory changes were made yet, so no rollback needed
      throw new Error(`Failed to create sale: ${error.message || error}`)
    }
    
    // Now that sale is saved, apply inventory updates
    try {
      // Reload purchases to get latest state
      const latestPurchases = await purchaseService.getAll(undefined, sale.company_id)
      
      for (const item of savedSale.items) {
        console.log(`[SaleService] Processing inventory update for item: product ${item.product_id}, quantity ${item.quantity}, type ${item.sale_type}`)
        
        if (item.sale_type === 'return') {
          // For returns: add back to purchase items and product stock
          if (item.purchase_id && item.purchase_item_id) {
            const purchase = latestPurchases.find(p => p.id === item.purchase_id)
            if (purchase) {
              const purchaseItemIndex = purchase.items.findIndex(pi => pi.id === item.purchase_item_id)
              const purchaseItem = purchase.items[purchaseItemIndex]
              if (purchaseItem) {
                const currentSoldQty = purchaseItem.sold_quantity || 0
                
                // Create a NEW purchase object with updated items array
                const updatedItems = [...purchase.items]
                updatedItems[purchaseItemIndex] = {
                  ...purchaseItem,
                  sold_quantity: Math.max(0, currentSoldQty - item.quantity)
                }
                
                const updatedPurchase: Purchase = {
                  ...purchase,
                  items: updatedItems,
                  updated_at: new Date().toISOString()
                }
                
                // Use purchaseService.update to ensure sync to cloud
                // Extract only the fields that changed (items and updated_at)
                const { id, ...purchaseUpdateData } = updatedPurchase
                await purchaseService.update(purchase.id, purchaseUpdateData)
                console.log(`[SaleService] Updated purchase item ${purchaseItem.id} sold_quantity: ${currentSoldQty} -> ${updatedItems[purchaseItemIndex].sold_quantity}`)
              }
            }
          }
          // Add back to product stock
          await productService.updateStock(item.product_id, item.quantity, 'add')
          console.log(`[SaleService] Added ${item.quantity} back to product ${item.product_id} stock`)
        } else {
        // For sales: deduct from purchase items and product stock
        let remainingQty = item.quantity
        
        if (item.purchase_id && item.purchase_item_id) {
          // Deduct from specific purchase item
          const purchase = latestPurchases.find(p => p.id === item.purchase_id)
          if (purchase) {
            const purchaseItemIndex = purchase.items.findIndex(pi => pi.id === item.purchase_item_id)
            const purchaseItem = purchase.items[purchaseItemIndex]
            if (purchaseItem && purchaseItem.product_id === item.product_id) {
              const soldQty = purchaseItem.sold_quantity || 0
              const availableQty = purchaseItem.quantity - soldQty
              const qtyToSell = Math.min(remainingQty, availableQty)
              
              console.log(`[SaleService] BEFORE UPDATE - Purchase ${purchase.id}, Item ${purchaseItem.id}:`, {
                barcode: purchaseItem.barcode,
                article: purchaseItem.article,
                quantity: purchaseItem.quantity,
                sold_quantity: purchaseItem.sold_quantity,
                availableQty,
                qtyToSell
              })
              
              // Create a NEW purchase object with updated items array to ensure IndexedDB detects the change
              const updatedItems = [...purchase.items]
              updatedItems[purchaseItemIndex] = {
                ...purchaseItem,
                sold_quantity: soldQty + qtyToSell
              }
              
              const updatedPurchase: Purchase = {
                ...purchase,
                items: updatedItems,
                updated_at: new Date().toISOString()
              }
              
              remainingQty -= qtyToSell
              
              const updatedItem = updatedItems[purchaseItemIndex]
              if (updatedItem) {
                console.log(`[SaleService] AFTER UPDATE (before save) - Purchase ${updatedPurchase.id}, Item ${updatedItem.id}:`, {
                  barcode: updatedItem.barcode,
                  article: updatedItem.article,
                  quantity: updatedItem.quantity,
                  sold_quantity: updatedItem.sold_quantity,
                  remaining: updatedItem.quantity - (updatedItem.sold_quantity || 0)
                })
              }
              
              // Save the updated purchase using purchaseService.update to ensure sync to cloud
              // Extract only the fields that changed (items and updated_at)
              const { id, ...purchaseUpdateData } = updatedPurchase
              await purchaseService.update(purchase.id, purchaseUpdateData)
              console.log(`[SaleService] 💾 Saved purchase ${updatedPurchase.id} to IndexedDB and cloud`)
              
              // Verify the save worked by reading it back
              const verifyPurchase = await purchaseService.getById(purchase.id)
              if (verifyPurchase) {
                const verifyItem = verifyPurchase.items.find(pi => pi.id === item.purchase_item_id)
                console.log(`[SaleService] VERIFIED - Purchase ${purchase.id}, Item ${item.purchase_item_id}:`, {
                  barcode: verifyItem?.barcode,
                  article: verifyItem?.article,
                  quantity: verifyItem?.quantity,
                  sold_quantity: verifyItem?.sold_quantity,
                  remaining: verifyItem ? verifyItem.quantity - (verifyItem.sold_quantity || 0) : 'N/A',
                  match: verifyItem?.sold_quantity === (soldQty + qtyToSell) ? '✅ MATCH' : '❌ MISMATCH'
                })
                
                if (verifyItem?.sold_quantity !== (soldQty + qtyToSell)) {
                  console.error(`[SaleService] ❌ CRITICAL: sold_quantity mismatch! Expected ${soldQty + qtyToSell}, got ${verifyItem?.sold_quantity}`)
                }
              } else {
                console.error(`[SaleService] ❌ CRITICAL: Could not verify purchase ${purchase.id} after save!`)
              }
              
              if (updatedItem) {
                console.log(`[SaleService] ✅ Updated purchase item ${updatedItem.id} sold_quantity: ${soldQty} -> ${updatedItem.sold_quantity}`)
              }
            } else {
              console.warn(`[SaleService] ⚠️ Purchase item not found: purchase_id=${item.purchase_id}, purchase_item_id=${item.purchase_item_id}, product_id=${item.product_id}`)
            }
          } else {
            console.warn(`[SaleService] ⚠️ Purchase not found: purchase_id=${item.purchase_id}`)
          }
        }
          
          // If still have remaining quantity, use FIFO
          if (remainingQty > 0) {
            const productPurchases = latestPurchases
              .filter(p => p.items.some(pi => pi.product_id === item.product_id))
              .sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime())
            
            for (const purchase of productPurchases) {
              if (remainingQty <= 0) break
              
              // Create updated items array
              const updatedItems = [...purchase.items]
              let purchaseUpdated = false
              
              for (let i = 0; i < updatedItems.length; i++) {
                if (remainingQty <= 0) break
                const purchaseItem = updatedItems[i]
                if (purchaseItem.product_id !== item.product_id) continue
                
                const soldQty = purchaseItem.sold_quantity || 0
                const availableQty = purchaseItem.quantity - soldQty
                const qtyToSell = Math.min(remainingQty, availableQty)
                
                if (qtyToSell > 0) {
                  // Update the item in the new array
                  updatedItems[i] = {
                    ...purchaseItem,
                    sold_quantity: soldQty + qtyToSell
                  }
                  remainingQty -= qtyToSell
                  purchaseUpdated = true
                  console.log(`[SaleService] Updated purchase item ${purchaseItem.id} sold_quantity: ${soldQty} -> ${updatedItems[i].sold_quantity} (FIFO)`)
                }
              }
              
              // Only save if we made changes
              if (purchaseUpdated) {
                const updatedPurchase: Purchase = {
                  ...purchase,
                  items: updatedItems,
                  updated_at: new Date().toISOString()
                }
                // Use purchaseService.update to ensure sync to cloud
                // Extract only the fields that changed (items and updated_at)
                const { id, ...purchaseUpdateData } = updatedPurchase
                await purchaseService.update(purchase.id, purchaseUpdateData)
                console.log(`[SaleService] 💾 Saved purchase ${updatedPurchase.id} to IndexedDB and cloud (FIFO)`)
              }
            }
          }
          
          // Deduct from product stock
          const productBefore = await productService.getById(item.product_id, true)
          const stockBefore = productBefore?.stock_quantity || 0
          await productService.updateStock(item.product_id, item.quantity, 'subtract')
          const productAfter = await productService.getById(item.product_id, true)
          const stockAfter = productAfter?.stock_quantity || 0
          console.log(`[SaleService] Updated product ${item.product_id} stock: ${stockBefore} -> ${stockAfter} (deducted ${item.quantity})`)
          
          // If stock reaches zero, mark as sold/archived
          if (stockAfter <= 0) {
            await productService.update(item.product_id, {
              status: 'sold',
              barcode_status: 'used',
              sold_date: new Date().toISOString(),
              sale_id: savedSale.id,
            })
            console.log(`[SaleService] Marked product ${item.product_id} as sold (stock reached zero)`)
          }
        }
      }
      
      console.log(`[SaleService] ✅ Inventory updated successfully for sale ${savedSale.id}`)
    } catch (inventoryError: any) {
      console.error(`[SaleService] ❌ Error updating inventory for sale ${savedSale.id}:`, inventoryError)
      // Sale is already saved, but inventory update failed
      // This is a partial failure - sale exists but inventory might be inconsistent
      // In production, you might want to mark the sale as needing review
      throw new Error(`Sale created but inventory update failed: ${inventoryError.message || inventoryError}`)
    }
    
    return savedSale
  },

  // Update sale (updates cloud and local)
  update: async (id: number, sale: Partial<Sale>): Promise<Sale | null> => {
    // Use cloud service which handles both cloud and local storage
    return await cloudSaleService.update(id, sale)
  },

  // Delete sale (deletes from cloud and local)
  delete: async (id: number): Promise<boolean> => {
    return await cloudSaleService.delete(id)
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
