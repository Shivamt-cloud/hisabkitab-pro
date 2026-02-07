// Cloud Supplier Service - Handles supplier operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Supplier } from '../types/purchase'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

/**
 * Cloud Supplier Service
 * Handles supplier operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudSupplierService = {
  /**
   * Get all suppliers from cloud
   */
  getAll: async (companyId?: number | null): Promise<Supplier[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const allSuppliers = await getAll<Supplier>(STORES.SUPPLIERS)
      if (companyId !== undefined && companyId !== null) {
        return allSuppliers.filter(s => s.company_id === companyId || s.company_id === null || s.company_id === undefined)
      } else if (companyId === null) {
        return []
      }
      return allSuppliers
    }

    try {
      const effectiveId = companyId ?? null
      let query = supabase!.from('suppliers').select('*')

      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching suppliers from cloud:', error)
        const allSuppliers = await getAll<Supplier>(STORES.SUPPLIERS)
        if (effectiveId !== undefined && effectiveId !== null) {
          return allSuppliers.filter(s => s.company_id === effectiveId || s.company_id === null || s.company_id === undefined)
        }
        return allSuppliers
      }

      if (data && data.length > 0) {
        void Promise.all((data as Supplier[]).map((s) => put(STORES.SUPPLIERS, s))).catch((e) =>
          console.warn('[cloudSupplierService] Background sync failed:', e)
        )
      }

      return (data as Supplier[]) || []
    } catch (error) {
      console.error('Error in cloudSupplierService.getAll:', error)
      const allSuppliers = await getAll<Supplier>(STORES.SUPPLIERS)
      const effectiveId = companyId ?? null
      if (effectiveId !== undefined && effectiveId !== null) {
        return allSuppliers.filter(s => s.company_id === effectiveId || s.company_id === null || s.company_id === undefined)
      }
      return allSuppliers
    }
  },

  /**
   * Get supplier by ID from cloud
   */
  getById: async (id: number): Promise<Supplier | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<Supplier>(STORES.SUPPLIERS, id)
    }

    try {
      const { data, error } = await supabase!
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching supplier from cloud:', error)
        // Fallback to local storage
        return await getById<Supplier>(STORES.SUPPLIERS, id)
      }

      // If no data found, return undefined (not an error)
      if (!data) {
        return undefined
      }

      // Sync to local storage
      if (data) {
        await put(STORES.SUPPLIERS, data as Supplier)
      }

      return data as Supplier | undefined
    } catch (error) {
      console.error('Error in cloudSupplierService.getById:', error)
      // Fallback to local storage
      return await getById<Supplier>(STORES.SUPPLIERS, id)
    }
  },

  /**
   * Create supplier in cloud
   */
  create: async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
    // If Supabase available and online, create in cloud first to get ID
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('suppliers')
          .insert([{
            name: supplierData.name,
            gstin: supplierData.gstin || null,
            contact_person: supplierData.contact_person || null,
            email: supplierData.email || null,
            phone: supplierData.phone || null,
            address: supplierData.address || null,
            city: supplierData.city || null,
            state: supplierData.state || null,
            pincode: supplierData.pincode || null,
            is_registered: supplierData.is_registered !== undefined ? supplierData.is_registered : false,
            company_id: supplierData.company_id || null,
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating supplier in cloud:', error)
          throw error
        }

        if (data) {
          // Save to local storage
          await put(STORES.SUPPLIERS, data as Supplier)
          return data as Supplier
        }
      } catch (error) {
        console.error('Error in cloudSupplierService.create:', error)
        // Fall through to local creation
      }
    }

    // Fallback to local creation
    const newSupplier: Supplier = {
      ...supplierData,
      id: Date.now(),
      is_registered: !!supplierData.gstin,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SUPPLIERS, newSupplier)
    return newSupplier
  },

  /**
   * Update supplier in cloud
   */
  update: async (id: number, supplierData: Partial<Omit<Supplier, 'id'>>): Promise<Supplier | null> => {
    // Get existing supplier
    const existing = await getById<Supplier>(STORES.SUPPLIERS, id)
    if (!existing) return null

    const updated: Supplier = {
      ...existing,
      ...supplierData,
      is_registered: supplierData.gstin !== undefined ? !!supplierData.gstin : existing.is_registered,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.SUPPLIERS, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updateData: any = {
          name: updated.name,
          gstin: updated.gstin || null,
          contact_person: updated.contact_person || null,
          email: updated.email || null,
          phone: updated.phone || null,
          address: updated.address || null,
          city: updated.city || null,
          state: updated.state || null,
          pincode: updated.pincode || null,
          is_registered: updated.is_registered,
          company_id: updated.company_id || null,
          updated_at: updated.updated_at,
        }

        const { data, error } = await supabase!
          .from('suppliers')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Error updating supplier in cloud:', error)
          // Supplier is already updated locally, so we continue
        } else if (data) {
          // Update local with cloud data
          await put(STORES.SUPPLIERS, data as Supplier)
          return data as Supplier
        }
      } catch (error) {
        console.error('Error in cloudSupplierService.update:', error)
        // Supplier is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Delete supplier from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    // Delete from local storage first
    try {
      await deleteById(STORES.SUPPLIERS, id)
    } catch (error) {
      console.error('Error deleting supplier from local storage:', error)
      return false
    }

    // If Supabase available and online, delete from cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('suppliers')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting supplier from cloud:', error)
          // Supplier is already deleted locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudSupplierService.delete:', error)
        // Supplier is already deleted locally, so we continue
      }
    }

    return true
  },
}
