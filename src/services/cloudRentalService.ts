// Cloud Rental Service – Supabase-first for fast global loading
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import type { Rental } from '../types/rental'
import { getAll, getById, put, STORES } from '../database/db'

export const cloudRentalService = {
  /**
   * Fast fetch: Supabase only, no IndexedDB sync. Use for list/report so data loads fast.
   */
  getAllFast: async (companyId?: number | null): Promise<Rental[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      const all = await getAll<Rental>(STORES.RENTALS)
      if (companyId != null) {
        return all.filter((r) => r.company_id == null || r.company_id === companyId)
      }
      return all
    }
    try {
      let query = supabase!.from('rentals').select('*')
      if (companyId != null) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`)
      }
      const { data, error } = await query.order('booking_date', { ascending: false })
      if (error) {
        const all = await getAll<Rental>(STORES.RENTALS)
        if (companyId != null) return all.filter((r) => r.company_id == null || r.company_id === companyId)
        return all
      }
      return (data as Rental[]) || []
    } catch (_) {
      const all = await getAll<Rental>(STORES.RENTALS)
      if (companyId != null) return all.filter((r) => r.company_id == null || r.company_id === companyId)
      return all
    }
  },

  getAll: async (companyId?: number | null): Promise<Rental[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      const all = await getAll<Rental>(STORES.RENTALS)
      if (companyId != null) return all.filter((r) => r.company_id == null || r.company_id === companyId)
      return all
    }
    try {
      let query = supabase!.from('rentals').select('*')
      if (companyId != null) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`)
      }
      const { data, error } = await query.order('booking_date', { ascending: false })
      if (error) {
        console.error('Error fetching rentals from cloud:', error)
        const all = await getAll<Rental>(STORES.RENTALS)
        if (companyId != null) return all.filter((r) => r.company_id == null || r.company_id === companyId)
        return all
      }
      if (data && data.length > 0) {
        void Promise.all((data as Rental[]).map((r) => put(STORES.RENTALS, r))).catch((e) =>
          console.warn('[cloudRentalService] Background sync failed:', e)
        )
      }
      return (data as Rental[]) || []
    } catch (e) {
      console.error('Error in cloudRentalService.getAll:', e)
      const all = await getAll<Rental>(STORES.RENTALS)
      if (companyId != null) return all.filter((r) => r.company_id == null || r.company_id === companyId)
      return all
    }
  },

  getById: async (id: number): Promise<Rental | null> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      const r = await getById<Rental>(STORES.RENTALS, id)
      return r ?? null
    }
    try {
      const { data, error } = await supabase!
        .from('rentals')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) {
        console.error('Error fetching rental from cloud:', error)
        const r = await getById<Rental>(STORES.RENTALS, id)
        return r ?? null
      }
      if (!data) {
        const local = await getById<Rental>(STORES.RENTALS, id)
        return local ?? null
      }
      await put(STORES.RENTALS, data as Rental)
      return data as Rental
    } catch (e) {
      console.error('Error in cloudRentalService.getById:', e)
      const r = await getById<Rental>(STORES.RENTALS, id)
      return r ?? null
    }
  },

  create: async (data: Omit<Rental, 'created_at' | 'updated_at'>): Promise<Rental> => {
    const now = new Date().toISOString()
    const rental: Rental = {
      ...data,
      created_at: now,
      updated_at: now,
    }
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!.from('rentals').insert([
          {
            id: data.id,
            rental_number: data.rental_number,
            booking_date: data.booking_date,
            pickup_date: data.pickup_date,
            return_date: data.return_date,
            customer_id: data.customer_id ?? null,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone ?? null,
            customer_id_type: data.customer_id_type ?? null,
            customer_id_number: data.customer_id_number ?? null,
            sales_person_id: data.sales_person_id ?? null,
            sales_person_name: data.sales_person_name ?? null,
            items: data.items,
            total_rent_amount: data.total_rent_amount,
            total_security_deposit: data.total_security_deposit,
            status: data.status,
            discount_type: data.discount_type ?? null,
            discount_value: data.discount_value ?? null,
            discount_amount: data.discount_amount ?? null,
            payment_method: data.payment_method ?? null,
            payment_status: data.payment_status ?? null,
            payment_methods: data.payment_methods ?? null,
            advance_amount: data.advance_amount ?? null,
            internal_remarks: data.internal_remarks ?? null,
            notes: data.notes ?? null,
            company_id: data.company_id ?? null,
            created_by: data.created_by,
            created_at: now,
            updated_at: now,
          },
        ])
        if (error) throw error
      } catch (e) {
        console.error('Error creating rental in cloud:', e)
      }
    }
    await put(STORES.RENTALS, rental)
    return rental
  },

  update: async (id: number, data: Partial<Omit<Rental, 'id' | 'created_at'>>): Promise<Rental> => {
    let existing = await getById<Rental>(STORES.RENTALS, id)
    if (!existing && isSupabaseAvailable() && isOnline()) {
      const { data: row } = await supabase!.from('rentals').select('*').eq('id', id).maybeSingle()
      if (row) {
        existing = row as Rental
        await put(STORES.RENTALS, existing)
      }
    }
    if (!existing) throw new Error('Rental not found')
    const updated: Rental = {
      ...existing,
      ...data,
      id: existing.id,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.RENTALS, updated)
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('rentals')
          .update({
            rental_number: updated.rental_number,
            booking_date: updated.booking_date,
            pickup_date: updated.pickup_date,
            return_date: updated.return_date,
            customer_id: updated.customer_id ?? null,
            customer_name: updated.customer_name,
            customer_phone: updated.customer_phone ?? null,
            customer_id_type: updated.customer_id_type ?? null,
            customer_id_number: updated.customer_id_number ?? null,
            sales_person_id: updated.sales_person_id ?? null,
            sales_person_name: updated.sales_person_name ?? null,
            items: updated.items,
            total_rent_amount: updated.total_rent_amount,
            total_security_deposit: updated.total_security_deposit,
            status: updated.status,
            discount_type: updated.discount_type ?? null,
            discount_value: updated.discount_value ?? null,
            discount_amount: updated.discount_amount ?? null,
            payment_method: updated.payment_method ?? null,
            payment_status: updated.payment_status ?? null,
            payment_methods: updated.payment_methods ?? null,
            advance_amount: updated.advance_amount ?? null,
            internal_remarks: updated.internal_remarks ?? null,
            notes: updated.notes ?? null,
            company_id: updated.company_id ?? null,
            created_by: updated.created_by,
            updated_at: updated.updated_at,
          })
          .eq('id', id)
        if (error) {
          console.error('Error updating rental in cloud:', error)
          throw new Error(error.message || 'Failed to update rental in cloud')
        }
      } catch (e) {
        console.error('Error in cloudRentalService.update:', e)
        if (e instanceof Error) throw e
        throw new Error('Failed to update rental')
      }
    }
    return updated
  },
}
