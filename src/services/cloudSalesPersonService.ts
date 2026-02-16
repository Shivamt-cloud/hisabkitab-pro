// Cloud Sales Person Service - Supabase sync for sales_persons
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import type { SalesPerson } from '../types/salesperson'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

function fromDbRow(row: any): SalesPerson {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    employee_id: row.employee_id ?? undefined,
    commission_rate: row.commission_rate != null ? Number(row.commission_rate) : undefined,
    joining_date: row.joining_date ?? undefined,
    current_salary: row.current_salary != null ? Number(row.current_salary) : undefined,
    is_active: row.is_active === true,
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
  }
}

export const cloudSalesPersonService = {
  getAll: async (includeInactive: boolean = false, companyId?: number | null): Promise<SalesPerson[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      let persons = await getAll<SalesPerson>(STORES.SALES_PERSONS)
      if (!includeInactive) {
        persons = persons.filter((p) => p.is_active)
      }
      if (companyId != null) {
        persons = persons.filter((p) => (p as any).company_id === companyId)
      }
      return persons
    }

    try {
      let query = supabase!.from('sales_persons').select('*')
      if (companyId != null) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query.order('name', { ascending: true })

      if (error) {
        console.error('Error fetching sales persons from cloud:', error)
        let persons = await getAll<SalesPerson>(STORES.SALES_PERSONS)
        if (!includeInactive) persons = persons.filter((p) => p.is_active)
        if (companyId != null) persons = persons.filter((p) => (p as any).company_id === companyId)
        return persons
      }

      if (data) {
        for (const row of data) {
          await put(STORES.SALES_PERSONS, fromDbRow(row))
        }
      }

      let out = (data || []).map(fromDbRow)
      if (!includeInactive) {
        out = out.filter((p) => p.is_active)
      }
      return out
    } catch (error) {
      console.error('Error in cloudSalesPersonService.getAll:', error)
      let persons = await getAll<SalesPerson>(STORES.SALES_PERSONS)
      if (!includeInactive) persons = persons.filter((p) => p.is_active)
      if (companyId != null) persons = persons.filter((p) => (p as any).company_id === companyId)
      return persons
    }
  },

  getById: async (id: number): Promise<SalesPerson | undefined> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<SalesPerson>(STORES.SALES_PERSONS, id)
    }

    try {
      const { data, error } = await supabase!
        .from('sales_persons')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        return await getById<SalesPerson>(STORES.SALES_PERSONS, id)
      }

      const person = fromDbRow(data)
      await put(STORES.SALES_PERSONS, person)
      return person
    } catch {
      return await getById<SalesPerson>(STORES.SALES_PERSONS, id)
    }
  },

  create: async (person: Omit<SalesPerson, 'id' | 'created_at' | 'updated_at'>): Promise<SalesPerson> => {
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data: row, error } = await supabase!
          .from('sales_persons')
          .insert([
            {
              company_id: (person as any).company_id ?? null,
              name: person.name,
              email: person.email ?? null,
              phone: person.phone ?? null,
              employee_id: person.employee_id ?? null,
              commission_rate: person.commission_rate ?? null,
              joining_date: person.joining_date ?? null,
              current_salary: person.current_salary ?? null,
              is_active: person.is_active !== undefined ? person.is_active : true,
            },
          ])
          .select()
          .single()

        if (!error && row) {
          const out = fromDbRow(row)
          await put(STORES.SALES_PERSONS, out)
          return out
        }
      } catch (e) {
        console.error('Error creating sales person in cloud:', e)
      }
    }

    const all = await getAll<SalesPerson>(STORES.SALES_PERSONS)
    const nextId = all.length === 0 ? 1 : Math.max(...all.map((p) => p.id), 0) + 1
    const now = new Date().toISOString()
    const newPerson: SalesPerson = {
      ...person,
      id: nextId,
      is_active: person.is_active !== undefined ? person.is_active : true,
      created_at: now,
      updated_at: now,
    }
    await put(STORES.SALES_PERSONS, newPerson)
    return newPerson
  },

  update: async (id: number, person: Partial<SalesPerson>): Promise<SalesPerson | null> => {
    const existing = await getById<SalesPerson>(STORES.SALES_PERSONS, id)
    if (!existing) return null

    const updated: SalesPerson = {
      ...existing,
      ...person,
      updated_at: new Date().toISOString(),
    }

    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data: row, error } = await supabase!
          .from('sales_persons')
          .update({
            name: updated.name,
            email: updated.email ?? null,
            phone: updated.phone ?? null,
            employee_id: updated.employee_id ?? null,
            commission_rate: updated.commission_rate ?? null,
            joining_date: updated.joining_date ?? null,
            current_salary: updated.current_salary ?? null,
            is_active: updated.is_active,
            updated_at: updated.updated_at,
          })
          .eq('id', id)
          .select()
          .maybeSingle()

        if (!error && row) {
          const out = fromDbRow(row)
          await put(STORES.SALES_PERSONS, out)
          return out
        }
      } catch (e) {
        console.error('Error updating sales person in cloud:', e)
      }
    }

    await put(STORES.SALES_PERSONS, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SALES_PERSONS, id)
    } catch {
      return false
    }

    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!.from('sales_persons').delete().eq('id', id)
      } catch (e) {
        console.error('Error deleting sales person from cloud:', e)
      }
    }
    return true
  },
}
