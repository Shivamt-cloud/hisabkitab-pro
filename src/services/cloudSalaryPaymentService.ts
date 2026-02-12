// Cloud Salary Payment Service – Supabase sync for global employee salary/commission data
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import type { SalaryPayment } from '../types/salaryPayment'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

function toDateOnly(iso: string): string {
  return iso ? iso.slice(0, 10) : ''
}

export const cloudSalaryPaymentService = {
  getAll: async (companyId?: number | null): Promise<SalaryPayment[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      let list = await getAll<SalaryPayment>(STORES.SALARY_PAYMENTS)
      if (companyId !== undefined && companyId !== null) {
        list = list.filter(p => p.company_id === companyId)
      } else if (companyId === null) return []
      return list.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
    }
    try {
      let query = supabase!.from('salary_payments').select('*')
      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      } else if (companyId === null) {
        return []
      }
      const { data, error } = await query.order('payment_date', { ascending: false })
      if (error) {
        console.error('Error fetching salary_payments from cloud:', error)
        let list = await getAll<SalaryPayment>(STORES.SALARY_PAYMENTS)
        if (companyId !== undefined && companyId !== null) list = list.filter(p => p.company_id === companyId)
        return list.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
      }
      if (data) {
        for (const row of data) {
          const p = { ...row, payment_date: row.payment_date ? String(row.payment_date).slice(0, 10) : (row as any).payment_date }
          await put(STORES.SALARY_PAYMENTS, p as SalaryPayment)
        }
      }
      const out = (data || []).map((row: any) => ({
        ...row,
        payment_date: row.payment_date ? String(row.payment_date).slice(0, 10) : row.payment_date,
      }))
      return out as SalaryPayment[]
    } catch (e) {
      console.error('cloudSalaryPaymentService.getAll:', e)
      let list = await getAll<SalaryPayment>(STORES.SALARY_PAYMENTS)
      if (companyId !== undefined && companyId !== null) list = list.filter(p => p.company_id === companyId)
      return list.sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
    }
  },

  getById: async (id: number): Promise<SalaryPayment | undefined> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<SalaryPayment>(STORES.SALARY_PAYMENTS, id)
    }
    try {
      const { data, error } = await supabase!.from('salary_payments').select('*').eq('id', id).maybeSingle()
      if (error || !data) return await getById<SalaryPayment>(STORES.SALARY_PAYMENTS, id)
      const p = { ...data, payment_date: data.payment_date ? String(data.payment_date).slice(0, 10) : (data as any).payment_date }
      await put(STORES.SALARY_PAYMENTS, p as SalaryPayment)
      return p as SalaryPayment
    } catch {
      return await getById<SalaryPayment>(STORES.SALARY_PAYMENTS, id)
    }
  },

  create: async (payload: Omit<SalaryPayment, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryPayment> => {
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('salary_payments')
          .insert([{
            sales_person_id: payload.sales_person_id,
            sales_person_name: payload.sales_person_name ?? null,
            payment_type: payload.payment_type ?? 'salary',
            payment_date: toDateOnly(payload.payment_date),
            amount: payload.amount,
            for_period: payload.for_period ?? null,
            payment_method: payload.payment_method ?? null,
            notes: payload.notes ?? null,
            company_id: payload.company_id ?? null,
          }])
          .select()
          .single()
        if (error) throw error
        if (data) {
          const p = { ...data, payment_date: data.payment_date ? String(data.payment_date).slice(0, 10) : (data as any).payment_date }
          await put(STORES.SALARY_PAYMENTS, p as SalaryPayment)
          return p as SalaryPayment
        }
      } catch (e) {
        console.error('cloudSalaryPaymentService.create:', e)
      }
    }
    const now = new Date().toISOString()
    const local: SalaryPayment = {
      ...payload,
      id: Date.now(),
      created_at: now,
      updated_at: now,
    }
    await put(STORES.SALARY_PAYMENTS, local)
    return local
  },

  update: async (id: number, payload: Partial<SalaryPayment>): Promise<SalaryPayment | null> => {
    const existing = await getById<SalaryPayment>(STORES.SALARY_PAYMENTS, id)
    if (!existing) return null
    const updated: SalaryPayment = {
      ...existing,
      ...payload,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SALARY_PAYMENTS, updated)
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('salary_payments')
          .update({
            sales_person_id: updated.sales_person_id,
            sales_person_name: updated.sales_person_name ?? null,
            payment_type: updated.payment_type ?? 'salary',
            payment_date: toDateOnly(updated.payment_date),
            amount: updated.amount,
            for_period: updated.for_period ?? null,
            payment_method: updated.payment_method ?? null,
            notes: updated.notes ?? null,
            company_id: updated.company_id ?? null,
            updated_at: updated.updated_at,
          })
          .eq('id', id)
          .select()
          .maybeSingle()
        if (!error && data) await put(STORES.SALARY_PAYMENTS, data as SalaryPayment)
      } catch (e) {
        console.error('cloudSalaryPaymentService.update:', e)
      }
    }
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SALARY_PAYMENTS, id)
    } catch {
      return false
    }
    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!.from('salary_payments').delete().eq('id', id)
      } catch (e) {
        console.error('cloudSalaryPaymentService.delete:', e)
      }
    }
    return true
  },
}
