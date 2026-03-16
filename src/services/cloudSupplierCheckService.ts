// Cloud Supplier Check Service - Handles supplier check operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { SupplierCheck } from '../types/supplierPayment'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

function toSupplierCheck(row: any): SupplierCheck {
  return {
    id: Number(row.id),
    supplier_id: Number(row.supplier_id),
    supplier_name: row.supplier_name ?? undefined,
    purchase_id: row.purchase_id != null ? Number(row.purchase_id) : undefined,
    check_number: String(row.check_number ?? ''),
    bank_name: String(row.bank_name ?? ''),
    account_number: row.account_number ?? undefined,
    amount: Number(row.amount),
    issue_date: typeof row.issue_date === 'string' ? row.issue_date.split('T')[0] : row.issue_date,
    due_date: typeof row.due_date === 'string' ? row.due_date.split('T')[0] : row.due_date,
    status: (row.status || 'pending') as SupplierCheck['status'],
    cleared_date: row.cleared_date ?? undefined,
    notes: row.notes ?? undefined,
    company_id: row.company_id != null ? Number(row.company_id) : undefined,
    created_by: Number(row.created_by ?? 0),
    created_by_name: row.created_by_name ?? undefined,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? undefined,
  }
}

/**
 * Cloud Supplier Check Service
 * Handles check operations with Supabase cloud storage.
 * Falls back to IndexedDB when Supabase is not available or offline.
 */
export const cloudSupplierCheckService = {
  /**
   * Get all checks (optionally filtered by company)
   */
  getAll: async (companyId?: number | null): Promise<SupplierCheck[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      let checks = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
      if (companyId !== undefined && companyId !== null) {
        checks = checks.filter(c => c.company_id === companyId)
      }
      return checks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    }

    try {
      let query = supabase!.from('supplier_checks').select('*')
      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query.order('due_date', { ascending: true })

      if (error) {
        console.error('Error fetching supplier checks from cloud:', error)
        let checks = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
        if (companyId !== undefined && companyId !== null) checks = checks.filter(c => c.company_id === companyId)
        return checks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      }

      const checks = (data || []).map(toSupplierCheck)
      if (checks.length > 0) {
        void Promise.all(checks.map(c => put(STORES.SUPPLIER_CHECKS, c))).catch(e =>
          console.warn('[cloudSupplierCheckService] Background sync failed:', e)
        )
        return checks
      }
      // Supabase returned empty – fallback to IndexedDB (e.g. checks created before migration)
      let localChecks = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
      if (companyId !== undefined && companyId !== null) {
        localChecks = localChecks.filter(c => c.company_id === companyId)
      }
      return localChecks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    } catch (err) {
      console.error('Error in cloudSupplierCheckService.getAll:', err)
      let checks = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
      if (companyId !== undefined && companyId !== null) checks = checks.filter(c => c.company_id === companyId)
      return checks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    }
  },

  /**
   * Get checks for one supplier – single query when online.
   */
  getBySupplier: async (supplierId: number, companyId?: number | null): Promise<SupplierCheck[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      const all = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
      const filtered = all.filter(c => c.supplier_id === supplierId && (companyId == null || c.company_id === companyId))
      return filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    }
    try {
      let query = supabase!.from('supplier_checks').select('*').eq('supplier_id', supplierId)
      if (companyId != null) query = query.eq('company_id', companyId)
      const { data, error } = await query.order('due_date', { ascending: true })
      if (error) throw error
      return (data || []).map(toSupplierCheck)
    } catch {
      const all = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
      const filtered = all.filter(c => c.supplier_id === supplierId && (companyId == null || c.company_id === companyId))
      return filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    }
  },

  /**
   * Get check by ID
   */
  getById: async (id: number): Promise<SupplierCheck | undefined> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<SupplierCheck>(STORES.SUPPLIER_CHECKS, id)
    }

    try {
      const { data, error } = await supabase!
        .from('supplier_checks')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) return await getById<SupplierCheck>(STORES.SUPPLIER_CHECKS, id)
      const check = toSupplierCheck(data)
      await put(STORES.SUPPLIER_CHECKS, check)
      return check
    } catch {
      return await getById<SupplierCheck>(STORES.SUPPLIER_CHECKS, id)
    }
  },

  /**
   * Create check in cloud
   */
  create: async (checkData: Omit<SupplierCheck, 'id' | 'created_at' | 'updated_at'>): Promise<SupplierCheck> => {
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('supplier_checks')
          .insert([{
            supplier_id: checkData.supplier_id,
            supplier_name: checkData.supplier_name || null,
            purchase_id: checkData.purchase_id ?? null,
            check_number: checkData.check_number,
            bank_name: checkData.bank_name || null,
            account_number: checkData.account_number || null,
            amount: checkData.amount,
            issue_date: checkData.issue_date,
            due_date: checkData.due_date,
            status: checkData.status || 'pending',
            cleared_date: checkData.cleared_date || null,
            notes: checkData.notes || null,
            company_id: checkData.company_id ?? null,
            created_by: checkData.created_by,
            created_by_name: checkData.created_by_name || null,
          }])
          .select()
          .single()

        if (!error && data) {
          const check = toSupplierCheck(data)
          await put(STORES.SUPPLIER_CHECKS, check)
          return check
        }
      } catch (e) {
        console.error('Error creating supplier check in cloud:', e)
      }
    }

    const newCheck: SupplierCheck = {
      ...checkData,
      id: Date.now(),
      status: (checkData.status || 'pending') as SupplierCheck['status'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SUPPLIER_CHECKS, newCheck)
    return newCheck
  },

  /**
   * Update check in cloud
   */
  update: async (id: number, checkData: Partial<SupplierCheck>): Promise<SupplierCheck | null> => {
    const existing = await getById<SupplierCheck>(STORES.SUPPLIER_CHECKS, id)
    if (!existing) return null

    const updated: SupplierCheck = {
      ...existing,
      ...checkData,
      id,
      updated_at: new Date().toISOString(),
    }
    if (checkData.status === 'cleared' && !updated.cleared_date) {
      updated.cleared_date = new Date().toISOString()
    }

    await put(STORES.SUPPLIER_CHECKS, updated)

    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('supplier_checks')
          .update({
            supplier_id: updated.supplier_id,
            supplier_name: updated.supplier_name || null,
            purchase_id: updated.purchase_id ?? null,
            check_number: updated.check_number,
            bank_name: updated.bank_name || null,
            account_number: updated.account_number || null,
            amount: updated.amount,
            issue_date: updated.issue_date,
            due_date: updated.due_date,
            status: updated.status,
            cleared_date: updated.cleared_date || null,
            notes: updated.notes || null,
            company_id: updated.company_id ?? null,
            created_by: updated.created_by,
            created_by_name: updated.created_by_name || null,
            updated_at: updated.updated_at,
          })
          .eq('id', id)
          .select()
          .maybeSingle()

        if (!error && data) {
          const synced = toSupplierCheck(data)
          await put(STORES.SUPPLIER_CHECKS, synced)
          return synced
        }
      } catch (e) {
        console.error('Error updating supplier check in cloud:', e)
      }
    }
    return updated
  },

  /**
   * Delete check from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SUPPLIER_CHECKS, id)
    } catch {
      return false
    }

    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!.from('supplier_checks').delete().eq('id', id)
      } catch (e) {
        console.error('Error deleting supplier check from cloud:', e)
      }
    }
    return true
  },
}
