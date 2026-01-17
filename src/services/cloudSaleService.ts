// Cloud Sale Service - Handles sale operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Sale } from '../types/sale'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

/**
 * Cloud Sale Service
 * Handles sale operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudSaleService = {
  /**
   * Get all sales from cloud
   */
  getAll: async (includeArchived: boolean = false, companyId?: number | null): Promise<Sale[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      let sales = await getAll<Sale>(STORES.SALES)
      if (companyId !== undefined && companyId !== null) {
        sales = sales.filter(s => s.company_id === companyId)
      } else if (companyId === null) {
        return []
      }
      if (!includeArchived) {
        sales = sales.filter(s => !s.archived)
      }
      return sales
    }

    try {
      let query = supabase!.from('sales').select('*')

      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      }

      if (!includeArchived) {
        query = query.eq('archived', false)
      }

      const { data, error } = await query.order('sale_date', { ascending: false })

      if (error) {
        console.error('Error fetching sales from cloud:', error)
        // Fallback to local storage
        let sales = await getAll<Sale>(STORES.SALES)
        if (companyId !== undefined && companyId !== null) {
          sales = sales.filter(s => s.company_id === companyId)
        } else if (companyId === null) {
          return []
        }
        if (!includeArchived) {
          sales = sales.filter(s => !s.archived)
        }
        return sales
      }

      // Sync to local storage for offline access
      if (data) {
        for (const sale of data) {
          await put(STORES.SALES, sale as Sale)
        }
      }

      return (data as Sale[]) || []
    } catch (error) {
      console.error('Error in cloudSaleService.getAll:', error)
      // Fallback to local storage
      let sales = await getAll<Sale>(STORES.SALES)
      if (companyId !== undefined && companyId !== null) {
        sales = sales.filter(s => s.company_id === companyId)
      } else if (companyId === null) {
        return []
      }
      if (!includeArchived) {
        sales = sales.filter(s => !s.archived)
      }
      return sales
    }
  },

  /**
   * Get sale by ID from cloud
   */
  getById: async (id: number): Promise<Sale | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<Sale>(STORES.SALES, id)
    }

    try {
      const { data, error } = await supabase!
        .from('sales')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching sale from cloud:', error)
        // Fallback to local storage
        return await getById<Sale>(STORES.SALES, id)
      }

      // If no data found, return undefined (not an error)
      if (!data) {
        return undefined
      }

      // Sync to local storage
      await put(STORES.SALES, data as Sale)

      return data as Sale | undefined
    } catch (error) {
      console.error('Error in cloudSaleService.getById:', error)
      // Fallback to local storage
      return await getById<Sale>(STORES.SALES, id)
    }
  },

  /**
   * Create sale in cloud
   */
  create: async (saleData: Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'archived'>): Promise<Sale> => {
    // If Supabase available and online, create in cloud first to get ID
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('sales')
          .insert([{
            sale_date: saleData.sale_date,
            customer_id: saleData.customer_id || null,
            customer_name: saleData.customer_name || null,
            sales_person_id: saleData.sales_person_id || null,
            sales_person_name: saleData.sales_person_name || null,
            invoice_number: saleData.invoice_number,
            items: saleData.items, // JSONB array
            subtotal: saleData.subtotal,
            discount: saleData.discount || 0,
            tax_amount: saleData.tax_amount,
            grand_total: saleData.grand_total,
            total_commission: saleData.total_commission || null,
            payment_status: saleData.payment_status,
            payment_method: saleData.payment_method || null,
            payment_methods: saleData.payment_methods || null, // JSONB array
            return_amount: saleData.return_amount || null,
            credit_applied: saleData.credit_applied || null,
            credit_added: saleData.credit_added || null,
            notes: saleData.notes || null,
            company_id: saleData.company_id || null,
            created_by: saleData.created_by,
            archived: false,
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating sale in cloud:', error)
          throw error
        }

        if (data) {
          // Save to local storage
          await put(STORES.SALES, data as Sale)
          return data as Sale
        }
      } catch (error) {
        console.error('Error in cloudSaleService.create:', error)
        // Fall through to local creation
      }
    }

    // Fallback to local creation
    const newSale: Sale = {
      ...saleData,
      id: Date.now(),
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SALES, newSale)
    return newSale
  },

  /**
   * Update sale in cloud
   */
  update: async (id: number, saleData: Partial<Omit<Sale, 'id'>>): Promise<Sale | null> => {
    // Get existing sale
    const existing = await getById<Sale>(STORES.SALES, id)
    if (!existing) return null

    const updated: Sale = {
      ...existing,
      ...saleData,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.SALES, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updateData: any = {
          sale_date: updated.sale_date,
          customer_id: updated.customer_id || null,
          customer_name: updated.customer_name || null,
          sales_person_id: updated.sales_person_id || null,
          sales_person_name: updated.sales_person_name || null,
          invoice_number: updated.invoice_number,
          items: updated.items, // JSONB array
          subtotal: updated.subtotal,
          discount: updated.discount || 0,
          tax_amount: updated.tax_amount,
          grand_total: updated.grand_total,
          total_commission: updated.total_commission || null,
          payment_status: updated.payment_status,
          payment_method: updated.payment_method || null,
          payment_methods: updated.payment_methods || null, // JSONB array
          return_amount: updated.return_amount || null,
          credit_applied: updated.credit_applied || null,
          credit_added: updated.credit_added || null,
          notes: updated.notes || null,
          company_id: updated.company_id || null,
          created_by: updated.created_by,
          archived: updated.archived !== undefined ? updated.archived : false,
          updated_at: updated.updated_at,
        }

        const { data, error } = await supabase!
          .from('sales')
          .update(updateData)
          .eq('id', id)
          .select()
          .maybeSingle()

        if (error) {
          console.error('Error updating sale in cloud:', error)
          // Sale is already updated locally, so return it
          const localSale = await getById<Sale>(STORES.SALES, id)
          return localSale || null
        } else if (data) {
          // Update local with cloud data
          await put(STORES.SALES, data as Sale)
          return data as Sale
        } else {
          // No data returned - sale might not exist in Supabase
          // Return the locally updated sale
          const localSale = await getById<Sale>(STORES.SALES, id)
          return localSale || null
        }
      } catch (error) {
        console.error('Error in cloudSaleService.update:', error)
        // Sale is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Delete sale from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    // Delete from local storage first
    try {
      await deleteById(STORES.SALES, id)
    } catch (error) {
      console.error('Error deleting sale from local storage:', error)
      return false
    }

    // If Supabase available and online, delete from cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('sales')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting sale from cloud:', error)
          // Sale is already deleted locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudSaleService.delete:', error)
        // Sale is already deleted locally, so we continue
      }
    }

    return true
  },
}
