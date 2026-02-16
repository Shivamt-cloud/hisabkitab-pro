// Cloud Technician Service - Supabase sync for technicians (Services module)
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import type { Technician, TechnicianCreate } from '../types/technician'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

export const cloudTechnicianService = {
  getAll: async (companyId?: number | null): Promise<Technician[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      const rows = await getAll<Technician>(STORES.TECHNICIANS)
      const list = companyId != null ? rows.filter((r) => r.company_id === companyId) : rows
      list.sort((a, b) => a.name.localeCompare(b.name))
      return list
    }

    try {
      let query = supabase!.from('technicians').select('*')
      if (companyId != null) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query.order('name', { ascending: true })

      if (error) {
        console.error('Error fetching technicians from cloud:', error)
        const rows = await getAll<Technician>(STORES.TECHNICIANS)
        const list = companyId != null ? rows.filter((r) => r.company_id === companyId) : rows
        list.sort((a, b) => a.name.localeCompare(b.name))
        return list
      }

      if (data) {
        for (const row of data) {
          const t: Technician = {
            id: Number(row.id),
            company_id: row.company_id != null ? Number(row.company_id) : undefined,
            name: row.name,
            phone: row.phone ?? undefined,
            notes: row.notes ?? undefined,
          }
          await put(STORES.TECHNICIANS, t)
        }
      }

      const out = (data || []).map((row: any) => ({
        id: Number(row.id),
        company_id: row.company_id != null ? Number(row.company_id) : undefined,
        name: row.name,
        phone: row.phone ?? undefined,
        notes: row.notes ?? undefined,
      })) as Technician[]
      out.sort((a, b) => a.name.localeCompare(b.name))
      return out
    } catch (error) {
      console.error('Error in cloudTechnicianService.getAll:', error)
      const rows = await getAll<Technician>(STORES.TECHNICIANS)
      const list = companyId != null ? rows.filter((r) => r.company_id === companyId) : rows
      list.sort((a, b) => a.name.localeCompare(b.name))
      return list
    }
  },

  getById: async (id: number): Promise<Technician | undefined> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<Technician>(STORES.TECHNICIANS, id)
    }

    try {
      const { data, error } = await supabase!
        .from('technicians')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        return await getById<Technician>(STORES.TECHNICIANS, id)
      }

      const t: Technician = {
        id: Number(data.id),
        company_id: data.company_id != null ? Number(data.company_id) : undefined,
        name: data.name,
        phone: data.phone ?? undefined,
        notes: data.notes ?? undefined,
      }
      await put(STORES.TECHNICIANS, t)
      return t
    } catch {
      return await getById<Technician>(STORES.TECHNICIANS, id)
    }
  },

  create: async (data: TechnicianCreate): Promise<Technician> => {
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data: row, error } = await supabase!
          .from('technicians')
          .insert([{
            company_id: data.company_id ?? null,
            name: data.name,
            phone: data.phone ?? null,
            notes: data.notes ?? null,
          }])
          .select()
          .single()

        if (!error && row) {
          const t: Technician = {
            id: Number(row.id),
            company_id: row.company_id != null ? Number(row.company_id) : undefined,
            name: row.name,
            phone: row.phone ?? undefined,
            notes: row.notes ?? undefined,
          }
          await put(STORES.TECHNICIANS, t)
          return t
        }
      } catch (e) {
        console.error('Error creating technician in cloud:', e)
      }
    }

    const all = await getAll<Technician>(STORES.TECHNICIANS)
    const nextId = all.length === 0 ? 1 : Math.max(...all.map((r) => r.id), 0) + 1
    const technician: Technician = { ...data, id: nextId }
    await put(STORES.TECHNICIANS, technician)
    return technician
  },

  update: async (id: number, data: Partial<TechnicianCreate>): Promise<Technician | null> => {
    const existing = await getById<Technician>(STORES.TECHNICIANS, id)
    if (!existing) return null

    const updated: Technician = { ...existing, ...data, id }

    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data: row, error } = await supabase!
          .from('technicians')
          .update({
            company_id: updated.company_id ?? null,
            name: updated.name,
            phone: updated.phone ?? null,
            notes: updated.notes ?? null,
          })
          .eq('id', id)
          .select()
          .maybeSingle()

        if (!error && row) {
          const t: Technician = { ...updated, id: Number(row.id) }
          await put(STORES.TECHNICIANS, t)
          return t
        }
      } catch (e) {
        console.error('Error updating technician in cloud:', e)
      }
    }

    await put(STORES.TECHNICIANS, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.TECHNICIANS, id)
    } catch {
      return false
    }

    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!.from('technicians').delete().eq('id', id)
      } catch (e) {
        console.error('Error deleting technician from cloud:', e)
      }
    }
    return true
  },
}
