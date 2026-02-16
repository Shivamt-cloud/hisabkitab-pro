// Cloud Service Record Service - Supabase sync for services (Services module)
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import type { ServiceRecord, ServiceRecordCreate, ServiceVehicleType } from '../types/serviceRecord'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

function toDbRow(r: Partial<ServiceRecord>): Record<string, unknown> {
  return {
    company_id: r.company_id ?? null,
    vehicle_type: r.vehicle_type,
    service_date: r.service_date ?? null,
    customer_name: r.customer_name ?? '',
    vehicle_number: r.vehicle_number ?? '',
    customer_phone: r.customer_phone ?? null,
    customer_email: r.customer_email ?? null,
    service_type: r.service_type ?? 'Other',
    amount: Number(r.amount ?? 0),
    parts_total: r.parts_total != null ? Number(r.parts_total) : 0,
    discount_percentage: r.discount_percentage != null ? Number(r.discount_percentage) : 0,
    discount_amount: r.discount_amount != null ? Number(r.discount_amount) : 0,
    description: r.description ?? '',
    next_service_date: r.next_service_date ?? null,
    status: r.status ?? 'draft',
    pickup_verification_notes: r.pickup_verification_notes ?? null,
    assigned_to: r.assigned_to ?? null,
    assigned_technician_id: r.assigned_technician_id ?? null,
    technician_name: r.technician_name ?? null,
    technician_phone: r.technician_phone ?? null,
    technician_notes: r.technician_notes ?? null,
    payment_status: r.payment_status ?? null,
    payment_method: r.payment_method ?? null,
    payment_date: r.payment_date ?? null,
    receipt_number: r.receipt_number ?? null,
    created_by: r.created_by ?? null,
  }
}

function fromDbRow(row: any): ServiceRecord {
  return {
    id: Number(row.id),
    company_id: row.company_id != null ? Number(row.company_id) : undefined,
    vehicle_type: row.vehicle_type as ServiceVehicleType,
    service_date: row.service_date,
    customer_name: row.customer_name ?? '',
    vehicle_number: row.vehicle_number ?? '',
    customer_phone: row.customer_phone ?? undefined,
    customer_email: row.customer_email ?? undefined,
    service_type: row.service_type ?? 'Other',
    amount: Number(row.amount ?? 0),
    parts_total: row.parts_total != null ? Number(row.parts_total) : 0,
    discount_percentage: row.discount_percentage != null ? Number(row.discount_percentage) : 0,
    discount_amount: row.discount_amount != null ? Number(row.discount_amount) : 0,
    description: row.description ?? '',
    next_service_date: row.next_service_date ?? undefined,
    status: row.status ?? undefined,
    pickup_verification_notes: row.pickup_verification_notes ?? undefined,
    assigned_to: row.assigned_to ?? undefined,
    assigned_technician_id: row.assigned_technician_id != null ? Number(row.assigned_technician_id) : undefined,
    technician_name: row.technician_name ?? undefined,
    technician_phone: row.technician_phone ?? undefined,
    technician_notes: row.technician_notes ?? undefined,
    payment_status: row.payment_status ?? undefined,
    payment_method: row.payment_method ?? undefined,
    payment_date: row.payment_date ?? undefined,
    receipt_number: row.receipt_number ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? undefined,
    created_by: row.created_by != null ? Number(row.created_by) : undefined,
  }
}

export const cloudServiceRecordService = {
  getAll: async (
    companyId?: number | null,
    vehicleType?: ServiceVehicleType
  ): Promise<ServiceRecord[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      const rows = await getAll<ServiceRecord>(STORES.SERVICES)
      let list = companyId != null ? rows.filter((r) => r.company_id === companyId) : rows
      if (vehicleType) list = list.filter((r) => r.vehicle_type === vehicleType)
      list.sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())
      return list
    }

    try {
      let query = supabase!.from('services').select('*')
      if (companyId != null) {
        query = query.eq('company_id', companyId)
      }
      if (vehicleType) {
        query = query.eq('vehicle_type', vehicleType)
      }
      const { data, error } = await query.order('service_date', { ascending: false })

      if (error) {
        console.error('Error fetching services from cloud:', error)
        const rows = await getAll<ServiceRecord>(STORES.SERVICES)
        let list = companyId != null ? rows.filter((r) => r.company_id === companyId) : rows
        if (vehicleType) list = list.filter((r) => r.vehicle_type === vehicleType)
        list.sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())
        return list
      }

      if (data) {
        for (const row of data) {
          await put(STORES.SERVICES, fromDbRow(row))
        }
      }

      const out = (data || []).map(fromDbRow)
      out.sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())
      return out
    } catch (error) {
      console.error('Error in cloudServiceRecordService.getAll:', error)
      const rows = await getAll<ServiceRecord>(STORES.SERVICES)
      let list = companyId != null ? rows.filter((r) => r.company_id === companyId) : rows
      if (vehicleType) list = list.filter((r) => r.vehicle_type === vehicleType)
      list.sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())
      return list
    }
  },

  getById: async (id: number): Promise<ServiceRecord | undefined> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<ServiceRecord>(STORES.SERVICES, id)
    }

    try {
      const { data, error } = await supabase!
        .from('services')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        return await getById<ServiceRecord>(STORES.SERVICES, id)
      }

      const record = fromDbRow(data)
      await put(STORES.SERVICES, record)
      return record
    } catch {
      return await getById<ServiceRecord>(STORES.SERVICES, id)
    }
  },

  create: async (data: ServiceRecordCreate): Promise<ServiceRecord> => {
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data: row, error } = await supabase!
          .from('services')
          .insert([toDbRow(data)])
          .select()
          .single()

        if (!error && row) {
          const record = fromDbRow(row)
          await put(STORES.SERVICES, record)
          return record
        }
      } catch (e) {
        console.error('Error creating service in cloud:', e)
      }
    }

    const all = await getAll<ServiceRecord>(STORES.SERVICES)
    const nextId = all.length === 0 ? 1 : Math.max(...all.map((r) => r.id), 0) + 1
    const now = new Date().toISOString()
    const record: ServiceRecord = {
      ...data,
      id: nextId,
      created_at: now,
      updated_at: now,
    }
    await put(STORES.SERVICES, record)
    return record
  },

  update: async (id: number, data: Partial<ServiceRecordCreate>): Promise<ServiceRecord | null> => {
    const existing = await getById<ServiceRecord>(STORES.SERVICES, id)
    if (!existing) return null

    const updated: ServiceRecord = {
      ...existing,
      ...data,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    }

    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updatePayload = toDbRow(updated)
        ;(updatePayload as any).updated_at = updated.updated_at
        const { data: row, error } = await supabase!
          .from('services')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .maybeSingle()

        if (!error && row) {
          const out = fromDbRow(row)
          await put(STORES.SERVICES, out)
          return out
        }
      } catch (e) {
        console.error('Error updating service in cloud:', e)
      }
    }

    await put(STORES.SERVICES, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SERVICES, id)
    } catch {
      return false
    }

    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!.from('services').delete().eq('id', id)
      } catch (e) {
        console.error('Error deleting service from cloud:', e)
      }
    }
    return true
  },
}
