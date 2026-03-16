// Cloud Supplier Payment Service - Handles supplier payment operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { SupplierPayment } from '../types/supplierPayment'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

function toSupplierPayment(row: any): SupplierPayment {
  const paymentDate = row.payment_date
  const paymentDateStr =
    typeof paymentDate === 'string'
      ? paymentDate.includes('T')
        ? paymentDate.split('T')[0]
        : paymentDate
      : paymentDate
  return {
    id: Number(row.id),
    supplier_id: Number(row.supplier_id),
    supplier_name: row.supplier_name ?? undefined,
    purchase_id: row.purchase_id != null ? Number(row.purchase_id) : undefined,
    purchase_invoice_number: row.purchase_invoice_number ?? undefined,
    amount: Number(row.amount),
    payment_method: (row.payment_method || 'cash') as SupplierPayment['payment_method'],
    payment_date: paymentDateStr,
    check_id: row.check_id != null ? Number(row.check_id) : undefined,
    reference_number: row.reference_number ?? undefined,
    notes: row.notes ?? undefined,
    company_id: row.company_id != null ? Number(row.company_id) : undefined,
    created_by: Number(row.created_by ?? 0),
    created_by_name: row.created_by_name ?? undefined,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? undefined,
  }
}

/**
 * Cloud Supplier Payment Service
 * Handles payment operations with Supabase.
 * Falls back to IndexedDB when Supabase is not available or offline.
 */
export const cloudSupplierPaymentService = {
  /**
   * Get all supplier payments (optionally filtered by company)
   */
  getAll: async (companyId?: number | null): Promise<SupplierPayment[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      let payments = await getAll<SupplierPayment>(STORES.SUPPLIER_PAYMENTS)
      if (companyId !== undefined && companyId !== null) {
        payments = payments.filter(p => p.company_id === companyId)
      }
      return payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    }

    try {
      let query = supabase!.from('supplier_payments').select('*')
      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query.order('payment_date', { ascending: false })

      if (error) {
        console.error('Error fetching supplier payments from cloud:', error)
        let payments = await getAll<SupplierPayment>(STORES.SUPPLIER_PAYMENTS)
        if (companyId !== undefined && companyId !== null) {
          payments = payments.filter(p => p.company_id === companyId)
        }
        return payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      }

      const payments = (data || []).map(toSupplierPayment)
      if (payments.length > 0) {
        void Promise.all(payments.map(p => put(STORES.SUPPLIER_PAYMENTS, p))).catch(e =>
          console.warn('[cloudSupplierPaymentService] Background sync failed:', e)
        )
        return payments
      }
      let localPayments = await getAll<SupplierPayment>(STORES.SUPPLIER_PAYMENTS)
      if (companyId !== undefined && companyId !== null) {
        localPayments = localPayments.filter(p => p.company_id === companyId)
      }
      return localPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    } catch (err) {
      console.error('Error in cloudSupplierPaymentService.getAll:', err)
      let payments = await getAll<SupplierPayment>(STORES.SUPPLIER_PAYMENTS)
      if (companyId !== undefined && companyId !== null) {
        payments = payments.filter(p => p.company_id === companyId)
      }
      return payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    }
  },

  /**
   * Get payments for one supplier – single query when online.
   */
  getBySupplier: async (supplierId: number, companyId?: number | null): Promise<SupplierPayment[]> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      const all = await getAll<SupplierPayment>(STORES.SUPPLIER_PAYMENTS)
      const filtered = all.filter(p => p.supplier_id === supplierId && (companyId == null || p.company_id === companyId))
      return filtered.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    }
    try {
      let query = supabase!.from('supplier_payments').select('*').eq('supplier_id', supplierId)
      if (companyId != null) query = query.eq('company_id', companyId)
      const { data, error } = await query.order('payment_date', { ascending: false })
      if (error) throw error
      return (data || []).map(toSupplierPayment)
    } catch {
      const all = await getAll<SupplierPayment>(STORES.SUPPLIER_PAYMENTS)
      const filtered = all.filter(p => p.supplier_id === supplierId && (companyId == null || p.company_id === companyId))
      return filtered.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    }
  },

  /**
   * Get payment by ID
   */
  getById: async (id: number): Promise<SupplierPayment | undefined> => {
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<SupplierPayment>(STORES.SUPPLIER_PAYMENTS, id)
    }

    try {
      const { data, error } = await supabase!
        .from('supplier_payments')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) return await getById<SupplierPayment>(STORES.SUPPLIER_PAYMENTS, id)
      const payment = toSupplierPayment(data)
      await put(STORES.SUPPLIER_PAYMENTS, payment)
      return payment
    } catch {
      return await getById<SupplierPayment>(STORES.SUPPLIER_PAYMENTS, id)
    }
  },

  /**
   * Create payment in cloud
   */
  create: async (paymentData: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at'>): Promise<SupplierPayment> => {
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('supplier_payments')
          .insert([{
            supplier_id: paymentData.supplier_id,
            supplier_name: paymentData.supplier_name || null,
            purchase_id: paymentData.purchase_id ?? null,
            purchase_invoice_number: paymentData.purchase_invoice_number || null,
            amount: paymentData.amount,
            payment_method: paymentData.payment_method || 'cash',
            payment_date: paymentData.payment_date,
            check_id: paymentData.check_id ?? null,
            reference_number: paymentData.reference_number || null,
            notes: paymentData.notes || null,
            company_id: paymentData.company_id ?? null,
            created_by: paymentData.created_by,
            created_by_name: paymentData.created_by_name || null,
          }])
          .select()
          .single()

        if (!error && data) {
          const payment = toSupplierPayment(data)
          await put(STORES.SUPPLIER_PAYMENTS, payment)
          return payment
        }
      } catch (e) {
        console.error('Error creating supplier payment in cloud:', e)
      }
    }

    const newPayment: SupplierPayment = {
      ...paymentData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SUPPLIER_PAYMENTS, newPayment)
    return newPayment
  },

  /**
   * Update payment in cloud
   */
  update: async (id: number, paymentData: Partial<SupplierPayment>): Promise<SupplierPayment | null> => {
    const existing = await getById<SupplierPayment>(STORES.SUPPLIER_PAYMENTS, id)
    if (!existing) return null

    const updated: SupplierPayment = {
      ...existing,
      ...paymentData,
      id,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SUPPLIER_PAYMENTS, updated)

    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('supplier_payments')
          .update({
            supplier_id: updated.supplier_id,
            supplier_name: updated.supplier_name || null,
            purchase_id: updated.purchase_id ?? null,
            purchase_invoice_number: updated.purchase_invoice_number || null,
            amount: updated.amount,
            payment_method: updated.payment_method,
            payment_date: updated.payment_date,
            check_id: updated.check_id ?? null,
            reference_number: updated.reference_number || null,
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
          const synced = toSupplierPayment(data)
          await put(STORES.SUPPLIER_PAYMENTS, synced)
          return synced
        }
      } catch (e) {
        console.error('Error updating supplier payment in cloud:', e)
      }
    }
    return updated
  },

  /**
   * Delete payment from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SUPPLIER_PAYMENTS, id)
    } catch {
      return false
    }

    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!.from('supplier_payments').delete().eq('id', id)
      } catch (e) {
        console.error('Error deleting supplier payment from cloud:', e)
      }
    }
    return true
  },
}
