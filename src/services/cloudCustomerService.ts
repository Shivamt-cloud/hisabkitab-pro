// Cloud Customer Service - Handles customer operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Customer } from '../types/customer'
import { getAll, put, getById, deleteById, getByIndex, STORES } from '../database/db'

/**
 * Cloud Customer Service
 * Handles customer operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudCustomerService = {
  /**
   * Get all customers from cloud
   */
  getAll: async (includeInactive: boolean = false, companyId?: number | null): Promise<Customer[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      let customers = await getAll<Customer>(STORES.CUSTOMERS)
      if (companyId !== undefined && companyId !== null) {
        customers = customers.filter(c => c.company_id === companyId)
      } else if (companyId === null) {
        return []
      }
      if (!includeInactive) {
        customers = customers.filter(c => c.is_active)
      }
      return customers.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    }

    try {
      let query = supabase!.from('customers').select('*')

      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      }

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching customers from cloud:', error)
        // Fallback to local storage
        let customers = await getAll<Customer>(STORES.CUSTOMERS)
        if (companyId !== undefined && companyId !== null) {
          customers = customers.filter(c => c.company_id === companyId)
        } else if (companyId === null) {
          return []
        }
        if (!includeInactive) {
          customers = customers.filter(c => c.is_active)
        }
        return customers.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      }

      if (data && data.length > 0) {
        void Promise.all((data as Customer[]).map((c) => put(STORES.CUSTOMERS, c))).catch((e) =>
          console.warn('[cloudCustomerService] Background sync failed:', e)
        )
      }

      return (data as Customer[]) || []
    } catch (error) {
      console.error('Error in cloudCustomerService.getAll:', error)
      // Fallback to local storage
      let customers = await getAll<Customer>(STORES.CUSTOMERS)
      if (companyId !== undefined && companyId !== null) {
        customers = customers.filter(c => c.company_id === companyId)
      } else if (companyId === null) {
        return []
      }
      if (!includeInactive) {
        customers = customers.filter(c => c.is_active)
      }
      return customers.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    }
  },

  /**
   * Get customer by ID from cloud
   */
  getById: async (id: number): Promise<Customer | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const customer = await getById<Customer>(STORES.CUSTOMERS, id)
      return customer || undefined
    }

    try {
      const { data, error } = await supabase!
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching customer from cloud:', error)
        // Fallback to local storage
        return await getById<Customer>(STORES.CUSTOMERS, id) || undefined
      }

      // If no data found, return undefined (not an error)
      if (!data) {
        return undefined
      }

      // Sync to local storage
      if (data) {
        await put(STORES.CUSTOMERS, data as Customer)
      }

      return data as Customer | undefined
    } catch (error) {
      console.error('Error in cloudCustomerService.getById:', error)
      // Fallback to local storage
      return await getById<Customer>(STORES.CUSTOMERS, id) || undefined
    }
  },

  /**
   * Create customer in cloud
   */
  create: async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    // If Supabase available and online, create in cloud first to get ID
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('customers')
          .insert([{
            name: customerData.name,
            email: customerData.email || null,
            phone: customerData.phone || null,
            gstin: customerData.gstin || null,
            address: customerData.address || null,
            city: customerData.city || null,
            state: customerData.state || null,
            pincode: customerData.pincode || null,
            contact_person: customerData.contact_person || null,
            is_active: customerData.is_active !== undefined ? customerData.is_active : true,
            credit_limit: customerData.credit_limit || null,
            outstanding_amount: customerData.outstanding_amount || 0,
            credit_balance: customerData.credit_balance || 0,
            company_id: customerData.company_id || null,
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating customer in cloud:', error)
          throw error
        }

        if (data) {
          // Save to local storage
          await put(STORES.CUSTOMERS, data as Customer)
          return data as Customer
        }
      } catch (error) {
        console.error('Error in cloudCustomerService.create:', error)
        // Fall through to local creation
      }
    }

    // Fallback to local creation
    const newCustomer: Customer = {
      ...customerData,
      id: Date.now(),
      outstanding_amount: customerData.outstanding_amount || 0,
      credit_balance: customerData.credit_balance || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.CUSTOMERS, newCustomer)
    return newCustomer
  },

  /**
   * Update customer in cloud
   */
  update: async (id: number, customerData: Partial<Omit<Customer, 'id'>>): Promise<Customer | null> => {
    // Get existing customer
    const existing = await getById<Customer>(STORES.CUSTOMERS, id)
    if (!existing) return null

    const updated: Customer = {
      ...existing,
      ...customerData,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.CUSTOMERS, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updateData: any = {
          name: updated.name,
          email: updated.email || null,
          phone: updated.phone || null,
          gstin: updated.gstin || null,
          address: updated.address || null,
          city: updated.city || null,
          state: updated.state || null,
          pincode: updated.pincode || null,
          contact_person: updated.contact_person || null,
          is_active: updated.is_active !== undefined ? updated.is_active : true,
          credit_limit: updated.credit_limit || null,
          outstanding_amount: updated.outstanding_amount || 0,
          credit_balance: updated.credit_balance || 0,
          company_id: updated.company_id || null,
          price_segment_id: updated.price_segment_id ?? null,
          updated_at: updated.updated_at,
        }

        const { data, error } = await supabase!
          .from('customers')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Error updating customer in cloud:', error)
          // Customer is already updated locally, so we continue
        } else if (data) {
          // Update local with cloud data
          await put(STORES.CUSTOMERS, data as Customer)
          return data as Customer
        }
      } catch (error) {
        console.error('Error in cloudCustomerService.update:', error)
        // Customer is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Delete customer from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    // Delete from local storage first
    try {
      await deleteById(STORES.CUSTOMERS, id)
    } catch (error) {
      console.error('Error deleting customer from local storage:', error)
      return false
    }

    // If Supabase available and online, delete from cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('customers')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting customer from cloud:', error)
          // Customer is already deleted locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudCustomerService.delete:', error)
        // Customer is already deleted locally, so we continue
      }
    }

    return true
  },
}
