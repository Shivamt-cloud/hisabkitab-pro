// Cloud Purchase Service - Handles purchase operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Purchase, GSTPurchase, SimplePurchase, PurchaseType, PurchaseItem } from '../types/purchase'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

/**
 * Ensure every purchase item has a unique numeric id (for JSONB storage and sale form).
 * Use when saving/reading so each article (A, B, C…) is treated uniquely.
 * - Keeps existing id if it's a positive number; otherwise assigns a unique id.
 * - When purchaseId is provided: id = purchaseId*1000000+index (stable per purchase).
 * - When creating (no id yet): id = Date.now()+index.
 */
function normalizePurchaseItems(items: PurchaseItem[] | undefined, purchaseId?: number): PurchaseItem[] {
  if (!items || !items.length) return []
  const base = purchaseId != null ? purchaseId * 1000000 : Date.now()
  return items.map((item: any, index: number) => ({
    ...item,
    id: (typeof item.id === 'number' && item.id > 0) ? item.id : (base + index),
    sold_quantity: item.sold_quantity !== undefined ? item.sold_quantity : 0
  }))
}

/**
 * Cloud Purchase Service
 * Handles purchase operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudPurchaseService = {
  /**
   * Fast fetch: Supabase only, no IndexedDB merge/sync. Use for Dashboard initial load.
   * Falls back to IndexedDB when offline.
   */
  getAllFast: async (type?: PurchaseType, companyId?: number | null): Promise<Purchase[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      let purchases = await getAll<Purchase>(STORES.PURCHASES)
      if (companyId !== undefined && companyId !== null) {
        purchases = purchases.filter(p => p.company_id === companyId || p.company_id == null)
      } else if (companyId === null) return []
      if (type) purchases = purchases.filter(p => p.type === type)
      return purchases.map(p => ({ ...p, items: normalizePurchaseItems(p.items, p.id) }))
    }
    try {
      let query = supabase!.from('purchases').select('*')
      if (companyId !== undefined && companyId !== null) query = query.eq('company_id', companyId)
      if (type) query = query.eq('type', type)
      const { data, error } = await query.order('purchase_date', { ascending: false })
      if (error) {
        let purchases = await getAll<Purchase>(STORES.PURCHASES)
        if (companyId !== undefined && companyId !== null) purchases = purchases.filter(p => p.company_id === companyId || p.company_id == null)
        else if (companyId === null) return []
        if (type) purchases = purchases.filter(p => p.type === type)
        return purchases.map(p => ({ ...p, items: normalizePurchaseItems(p.items, p.id) }))
      }
      const normalized = (data || []).map((p: Purchase) => ({
        ...p,
        items: normalizePurchaseItems(p.items, p.id)
      }))
      return normalized
    } catch (_) {
      let purchases = await getAll<Purchase>(STORES.PURCHASES)
      if (companyId !== undefined && companyId !== null) purchases = purchases.filter(p => p.company_id === companyId || p.company_id == null)
      else if (companyId === null) return []
      if (type) purchases = purchases.filter(p => p.type === type)
      return purchases.map(p => ({ ...p, items: normalizePurchaseItems(p.items, p.id) }))
    }
  },

  /**
   * Get all purchases from cloud
   */
  getAll: async (type?: PurchaseType, companyId?: number | null): Promise<Purchase[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      let purchases = await getAll<Purchase>(STORES.PURCHASES)
      if (companyId !== undefined && companyId !== null) {
        purchases = purchases.filter(p => p.company_id === companyId || p.company_id === null || p.company_id === undefined)
      } else if (companyId === null) {
        return []
      }
      if (type) {
        purchases = purchases.filter(p => p.type === type)
      }
      return purchases.map(p => ({ ...p, items: normalizePurchaseItems(p.items, p.id) }))
    }

    try {
      let query = supabase!.from('purchases').select('*')

      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      }

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query.order('purchase_date', { ascending: false })

      if (error) {
        console.error('Error fetching purchases from cloud:', error)
        // Fallback to local storage
        let purchases = await getAll<Purchase>(STORES.PURCHASES)
        if (companyId !== undefined && companyId !== null) {
          purchases = purchases.filter(p => p.company_id === companyId || p.company_id === null || p.company_id === undefined)
        } else if (companyId === null) {
          return []
        }
        if (type) {
          purchases = purchases.filter(p => p.type === type)
        }
        return purchases
      }

      const normalized = (data || []).map((purchase: Purchase) => ({
        ...purchase,
        items: normalizePurchaseItems(purchase.items, purchase.id)
      }))

      // When IndexedDB is empty (incognito/fresh), skip merge and return immediately
      let localPurchases: Purchase[] = []
      try {
        localPurchases = await getAll<Purchase>(STORES.PURCHASES)
      } catch (_) {}
      if (localPurchases.length === 0) {
        void Promise.all(normalized.map((p) => put(STORES.PURCHASES, p))).catch((e) =>
          console.warn('[cloudPurchaseService] Background sync failed:', e)
        )
        return normalized
      }

      // Merge with local sold_quantity so we never overwrite a valid local inventory update (e.g. after a sale) with stale cloud data
      const merged = normalized.map((purchase: Purchase) => {
        const local = localPurchases.find((p: Purchase) => p.id === purchase.id)
        if (!local?.items?.length) return purchase
        const mergedItems = purchase.items.map((pi: PurchaseItem) => {
          const localItem = local.items!.find((li: PurchaseItem) => li.id === pi.id)
          const cloudSold = pi.sold_quantity ?? 0
          const localSold = localItem?.sold_quantity ?? 0
          const sold = Math.max(cloudSold, localSold)
          if (sold === cloudSold) return pi
          return { ...pi, sold_quantity: sold }
        })
        return { ...purchase, items: mergedItems }
      })

      // Sync to local storage in background (don't block UI – IndexedDB writes are slow with large datasets)
      if (merged.length > 0) {
        void Promise.all(merged.map((p) => put(STORES.PURCHASES, p))).catch((e) =>
          console.warn('[cloudPurchaseService] Background sync failed:', e)
        )
      }

      // Push local sold_quantity increases to cloud in background (don't block)
      void (async () => {
        for (let i = 0; i < merged.length; i++) {
          const p = merged[i]
          const orig = normalized[i]
          if (!orig || !p.items?.length) continue
          const hadLocalIncrease = p.items.some((pi: PurchaseItem, idx: number) => (pi.sold_quantity ?? 0) > (orig.items?.[idx]?.sold_quantity ?? 0))
          if (!hadLocalIncrease) continue
          try {
            await supabase!.from('purchases').update({
              items: p.items,
              updated_at: p.updated_at,
            }).eq('id', p.id).select().single()
          } catch (_) {}
        }
      })()

      return merged
    } catch (error) {
      console.error('Error in cloudPurchaseService.getAll:', error)
      // Fallback to local storage
      let purchases = await getAll<Purchase>(STORES.PURCHASES)
      if (companyId !== undefined && companyId !== null) {
        purchases = purchases.filter(p => p.company_id === companyId || p.company_id === null || p.company_id === undefined)
      } else if (companyId === null) {
        return []
      }
      if (type) {
        purchases = purchases.filter(p => p.type === type)
      }
      return purchases.map(p => ({ ...p, items: normalizePurchaseItems(p.items, p.id) }))
    }
  },

  /**
   * Get purchase by ID from cloud
   */
  getById: async (id: number): Promise<Purchase | undefined> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      const local = await getById<Purchase>(STORES.PURCHASES, id)
      if (local) return { ...local, items: normalizePurchaseItems(local.items, local.id) }
      return undefined
    }

    try {
      const { data, error } = await supabase!
        .from('purchases')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching purchase from cloud:', error)
        // Fallback to local storage
        return await getById<Purchase>(STORES.PURCHASES, id)
      }

      const purchase = data as Purchase
      if (purchase) {
        purchase.items = normalizePurchaseItems(purchase.items, purchase.id)
        await put(STORES.PURCHASES, purchase)
      }
      return purchase
    } catch (error) {
      console.error('Error in cloudPurchaseService.getById:', error)
      const local = await getById<Purchase>(STORES.PURCHASES, id)
      if (local) return { ...local, items: normalizePurchaseItems(local.items, local.id) }
      return undefined
    }
  },

  /**
   * Create purchase in cloud
   */
  create: async (purchaseData: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>): Promise<Purchase> => {
    // If Supabase available and online, create in cloud first to get ID
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const insertData: any = {
          type: purchaseData.type,
          purchase_date: purchaseData.purchase_date,
          supplier_id: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).supplier_id : (purchaseData as SimplePurchase).supplier_id || null,
          supplier_name: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).supplier_name : (purchaseData as SimplePurchase).supplier_name || null,
          supplier_gstin: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).supplier_gstin : null,
          invoice_number: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).invoice_number : (purchaseData as SimplePurchase).invoice_number || null,
          items: normalizePurchaseItems(purchaseData.items), // JSONB: each item has unique id for sale form
          subtotal: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).subtotal : null,
          total_tax: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).total_tax : null,
          cgst_amount: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).cgst_amount : null,
          sgst_amount: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).sgst_amount : null,
          igst_amount: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).igst_amount : null,
          grand_total: purchaseData.type === 'gst' ? (purchaseData as GSTPurchase).grand_total : null,
          total_amount: purchaseData.type === 'simple' ? (purchaseData as SimplePurchase).total_amount : null,
          payment_status: purchaseData.payment_status,
          payment_method: purchaseData.payment_method || null,
          notes: purchaseData.notes || null,
          return_remarks: (purchaseData as any).return_remarks || null,
          due_date: (purchaseData as any).due_date || null,
          company_id: purchaseData.company_id || null,
          created_by: purchaseData.created_by,
        }

        const { data, error } = await supabase!
          .from('purchases')
          .insert([insertData])
          .select()
          .single()

        if (error) {
          console.error('Error creating purchase in cloud:', error)
          throw error
        }

        if (data) {
          const purchase = data as Purchase
          purchase.items = normalizePurchaseItems(purchase.items, purchase.id)
          await put(STORES.PURCHASES, purchase)
          return purchase
        }
      } catch (error) {
        console.error('Error in cloudPurchaseService.create:', error)
        // Fall through to local creation
      }
    }

    const newId = Date.now()
    const newPurchase: Purchase = {
      ...purchaseData,
      id: newId,
      items: normalizePurchaseItems(purchaseData.items, newId),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Purchase
    await put(STORES.PURCHASES, newPurchase)
    return newPurchase
  },

  /**
   * Update purchase in cloud
   */
  update: async (id: number, purchaseData: Partial<Omit<Purchase, 'id'>>): Promise<Purchase | null> => {
    const existing = await getById<Purchase>(STORES.PURCHASES, id)
    if (!existing) return null

    const updated: Purchase = {
      ...existing,
      ...purchaseData,
      items: normalizePurchaseItems(purchaseData.items ?? existing.items, id),
      updated_at: new Date().toISOString(),
    } as Purchase

    await put(STORES.PURCHASES, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updateData: any = {
          type: updated.type,
          purchase_date: updated.purchase_date,
          supplier_id: updated.type === 'gst' ? (updated as GSTPurchase).supplier_id : (updated as SimplePurchase).supplier_id || null,
          supplier_name: updated.type === 'gst' ? (updated as GSTPurchase).supplier_name : (updated as SimplePurchase).supplier_name || null,
          supplier_gstin: updated.type === 'gst' ? (updated as GSTPurchase).supplier_gstin : null,
          invoice_number: updated.type === 'gst' ? (updated as GSTPurchase).invoice_number : (updated as SimplePurchase).invoice_number || null,
          items: updated.items, // JSONB array
          subtotal: updated.type === 'gst' ? (updated as GSTPurchase).subtotal : null,
          total_tax: updated.type === 'gst' ? (updated as GSTPurchase).total_tax : null,
          cgst_amount: updated.type === 'gst' ? (updated as GSTPurchase).cgst_amount : null,
          sgst_amount: updated.type === 'gst' ? (updated as GSTPurchase).sgst_amount : null,
          igst_amount: updated.type === 'gst' ? (updated as GSTPurchase).igst_amount : null,
          grand_total: updated.type === 'gst' ? (updated as GSTPurchase).grand_total : null,
          total_amount: updated.type === 'simple' ? (updated as SimplePurchase).total_amount : null,
          payment_status: updated.payment_status,
          payment_method: updated.payment_method || null,
          notes: updated.notes || null,
          return_remarks: (updated as any).return_remarks || null,
          due_date: (updated as any).due_date || null,
          company_id: updated.company_id || null,
          created_by: updated.created_by,
          updated_at: updated.updated_at,
        }

        let result: { data: Purchase | null; error: any } = { data: null, error: null }
        for (let attempt = 0; attempt < 2; attempt++) {
          const { data, error } = await supabase!
            .from('purchases')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()
          result = { data, error }
          if (!error) break
          console.error(`Error updating purchase in cloud (attempt ${attempt + 1}):`, error)
          if (attempt === 0) await new Promise(r => setTimeout(r, 500))
        }

        if (result.error) {
          console.error('Error updating purchase in cloud after retry:', result.error)
          // Purchase is already updated locally; getAll() will merge local sold_quantity when fetching
        } else if (result.data) {
          // Update local with cloud data
          await put(STORES.PURCHASES, result.data as Purchase)
          return result.data as Purchase
        }
      } catch (error) {
        console.error('Error in cloudPurchaseService.update:', error)
        // Purchase is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Delete purchase from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    // Delete from local storage first
    try {
      await deleteById(STORES.PURCHASES, id)
    } catch (error) {
      console.error('Error deleting purchase from local storage:', error)
      return false
    }

    // If Supabase available and online, delete from cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('purchases')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting purchase from cloud:', error)
          // Purchase is already deleted locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudPurchaseService.delete:', error)
        // Purchase is already deleted locally, so we continue
      }
    }

    return true
  },
}
