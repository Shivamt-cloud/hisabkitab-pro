// Cloud Purchase Service - Handles purchase operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Purchase, GSTPurchase, SimplePurchase, PurchaseType } from '../types/purchase'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

/**
 * Cloud Purchase Service
 * Handles purchase operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudPurchaseService = {
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
      return purchases
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

      // Sync to local storage for offline access
      if (data) {
        for (const purchase of data) {
          await put(STORES.PURCHASES, purchase as Purchase)
        }
      }

      return (data as Purchase[]) || []
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
      return purchases
    }
  },

  /**
   * Get purchase by ID from cloud
   */
  getById: async (id: number): Promise<Purchase | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<Purchase>(STORES.PURCHASES, id)
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

      // Sync to local storage
      if (data) {
        await put(STORES.PURCHASES, data as Purchase)
      }

      return data as Purchase | undefined
    } catch (error) {
      console.error('Error in cloudPurchaseService.getById:', error)
      // Fallback to local storage
      return await getById<Purchase>(STORES.PURCHASES, id)
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
          items: purchaseData.items, // JSONB array
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
          // Save to local storage
          await put(STORES.PURCHASES, data as Purchase)
          return data as Purchase
        }
      } catch (error) {
        console.error('Error in cloudPurchaseService.create:', error)
        // Fall through to local creation
      }
    }

    // Fallback to local creation
    const newPurchase: Purchase = {
      ...purchaseData,
      id: Date.now(),
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
    // Get existing purchase
    const existing = await getById<Purchase>(STORES.PURCHASES, id)
    if (!existing) return null

    const updated: Purchase = {
      ...existing,
      ...purchaseData,
      updated_at: new Date().toISOString(),
    } as Purchase

    // Always update local storage first
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
          company_id: updated.company_id || null,
          created_by: updated.created_by,
          updated_at: updated.updated_at,
        }

        const { data, error } = await supabase!
          .from('purchases')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Error updating purchase in cloud:', error)
          // Purchase is already updated locally, so we continue
        } else if (data) {
          // Update local with cloud data
          await put(STORES.PURCHASES, data as Purchase)
          return data as Purchase
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
