// Cloud Employee Goods Purchase Service – Supabase sync for global data
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import type { EmployeeGoodsPurchase } from '../types/employeeGoodsPurchase'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

export const cloudEmployeeGoodsPurchaseService = {
  getAll: async (companyId?: number | null): Promise<EmployeeGoodsPurchase[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      let list = await getAll<EmployeeGoodsPurchase>(STORES.EMPLOYEE_GOODS_PURCHASES)
      if (companyId !== undefined && companyId !== null) {
        list = list.filter(p => p.company_id === companyId)
      } else if (companyId === null) return []
      return list.sort((a, b) => (b.period || '').localeCompare(a.period || ''))
    }
    try {
      let query = supabase!.from('employee_goods_purchases').select('*')
      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      } else if (companyId === null) {
        return []
      }
      const { data, error } = await query.order('period', { ascending: false })
      if (error) {
        console.error('Error fetching employee_goods_purchases from cloud:', error)
        let list = await getAll<EmployeeGoodsPurchase>(STORES.EMPLOYEE_GOODS_PURCHASES)
        if (companyId !== undefined && companyId !== null) list = list.filter(p => p.company_id === companyId)
        return list.sort((a, b) => (b.period || '').localeCompare(a.period || ''))
      }
      if (data) {
        for (const row of data) {
          await put(STORES.EMPLOYEE_GOODS_PURCHASES, row as EmployeeGoodsPurchase)
        }
      }
      return (data as EmployeeGoodsPurchase[]) || []
    } catch (e) {
      console.error('cloudEmployeeGoodsPurchaseService.getAll:', e)
      let list = await getAll<EmployeeGoodsPurchase>(STORES.EMPLOYEE_GOODS_PURCHASES)
      if (companyId !== undefined && companyId !== null) list = list.filter(p => p.company_id === companyId)
      return list.sort((a, b) => (b.period || '').localeCompare(a.period || ''))
    }
  },

  getById: async (id: number): Promise<EmployeeGoodsPurchase | undefined> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<EmployeeGoodsPurchase>(STORES.EMPLOYEE_GOODS_PURCHASES, id)
    }
    try {
      const { data, error } = await supabase!.from('employee_goods_purchases').select('*').eq('id', id).maybeSingle()
      if (error || !data) return await getById<EmployeeGoodsPurchase>(STORES.EMPLOYEE_GOODS_PURCHASES, id)
      await put(STORES.EMPLOYEE_GOODS_PURCHASES, data as EmployeeGoodsPurchase)
      return data as EmployeeGoodsPurchase
    } catch {
      return await getById<EmployeeGoodsPurchase>(STORES.EMPLOYEE_GOODS_PURCHASES, id)
    }
  },

  create: async (payload: Omit<EmployeeGoodsPurchase, 'id' | 'created_at' | 'updated_at'>): Promise<EmployeeGoodsPurchase> => {
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('employee_goods_purchases')
          .insert([{
            sales_person_id: payload.sales_person_id,
            sales_person_name: payload.sales_person_name ?? null,
            period: payload.period,
            amount: payload.amount,
            notes: payload.notes ?? null,
            company_id: payload.company_id ?? null,
          }])
          .select()
          .single()
        if (error) throw error
        if (data) {
          await put(STORES.EMPLOYEE_GOODS_PURCHASES, data as EmployeeGoodsPurchase)
          return data as EmployeeGoodsPurchase
        }
      } catch (e) {
        console.error('cloudEmployeeGoodsPurchaseService.create:', e)
      }
    }
    const now = new Date().toISOString()
    const local: EmployeeGoodsPurchase = {
      ...payload,
      id: Date.now(),
      created_at: now,
      updated_at: now,
    }
    await put(STORES.EMPLOYEE_GOODS_PURCHASES, local)
    return local
  },

  update: async (id: number, payload: Partial<EmployeeGoodsPurchase>): Promise<EmployeeGoodsPurchase | null> => {
    const existing = await getById<EmployeeGoodsPurchase>(STORES.EMPLOYEE_GOODS_PURCHASES, id)
    if (!existing) return null
    const updated: EmployeeGoodsPurchase = {
      ...existing,
      ...payload,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.EMPLOYEE_GOODS_PURCHASES, updated)
    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!
          .from('employee_goods_purchases')
          .update({
            sales_person_id: updated.sales_person_id,
            sales_person_name: updated.sales_person_name ?? null,
            period: updated.period,
            amount: updated.amount,
            notes: updated.notes ?? null,
            company_id: updated.company_id ?? null,
            updated_at: updated.updated_at,
          })
          .eq('id', id)
      } catch (e) {
        console.error('cloudEmployeeGoodsPurchaseService.update:', e)
      }
    }
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.EMPLOYEE_GOODS_PURCHASES, id)
    } catch {
      return false
    }
    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!.from('employee_goods_purchases').delete().eq('id', id)
      } catch (e) {
        console.error('cloudEmployeeGoodsPurchaseService.delete:', e)
      }
    }
    return true
  },
}
