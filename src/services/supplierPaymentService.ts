// Supplier Payment and Check Management Service

import { SupplierPayment, SupplierCheck, SupplierAccountSummary } from '../types/supplierPayment'
import { Purchase } from '../types/purchase'
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { purchaseService } from './purchaseService'
import { supplierService } from './purchaseService'
import { cloudSupplierCheckService } from './cloudSupplierCheckService'
import { cloudSupplierPaymentService } from './cloudSupplierPaymentService'

export const supplierPaymentService = {
  // ========== PAYMENT METHODS ==========
  
  /**
   * Get all payments for a supplier (uses Supabase when online)
   */
  getPaymentsBySupplier: async (supplierId: number, companyId?: number | null): Promise<SupplierPayment[]> => {
    return await cloudSupplierPaymentService.getBySupplier(supplierId, companyId)
  },

  /**
   * Get payment by ID (uses Supabase when online)
   */
  getPaymentById: async (id: number): Promise<SupplierPayment | undefined> => {
    return await cloudSupplierPaymentService.getById(id)
  },

  /**
   * Create a new payment (syncs to Supabase when online)
   */
  createPayment: async (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at'>): Promise<SupplierPayment> => {
    const supplier = await supplierService.getById(payment.supplier_id)
    const payload = {
      ...payment,
      supplier_name: supplier?.name || payment.supplier_name,
    }
    return await cloudSupplierPaymentService.create(payload)
  },

  /**
   * Update a payment (syncs to Supabase when online)
   */
  updatePayment: async (id: number, payment: Partial<SupplierPayment>): Promise<SupplierPayment | null> => {
    return await cloudSupplierPaymentService.update(id, payment)
  },

  /**
   * Delete a payment (syncs to Supabase when online)
   */
  deletePayment: async (id: number): Promise<boolean> => {
    return await cloudSupplierPaymentService.delete(id)
  },

  // ========== CHECK METHODS (use cloud for cross-device sync) ==========

  /**
   * Get all checks linked to a purchase
   */
  getChecksByPurchase: async (purchaseId: number): Promise<SupplierCheck[]> => {
    const allChecks = await cloudSupplierCheckService.getAll()
    return allChecks
      .filter(c => c.purchase_id === purchaseId)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  },

  /**
   * Get all checks for a supplier
   */
  getChecksBySupplier: async (supplierId: number, companyId?: number | null): Promise<SupplierCheck[]> => {
    const checks = await cloudSupplierCheckService.getBySupplier(supplierId, companyId)
    return checks.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
  },

  /**
   * Get check by ID
   */
  getCheckById: async (id: number): Promise<SupplierCheck | undefined> => {
    return await cloudSupplierCheckService.getById(id)
  },

  /**
   * Create a new check (syncs to Supabase when online)
   */
  createCheck: async (check: Omit<SupplierCheck, 'id' | 'created_at' | 'updated_at'>): Promise<SupplierCheck> => {
    const supplier = await supplierService.getById(check.supplier_id)
    const payload = {
      ...check,
      supplier_name: supplier?.name || check.supplier_name,
    }
    return await cloudSupplierCheckService.create(payload)
  },

  /**
   * Update a check (syncs to Supabase when online)
   */
  updateCheck: async (id: number, check: Partial<SupplierCheck>): Promise<SupplierCheck | null> => {
    return await cloudSupplierCheckService.update(id, check)
  },

  /**
   * Delete a check (syncs to Supabase when online)
   */
  deleteCheck: async (id: number): Promise<boolean> => {
    return await cloudSupplierCheckService.delete(id)
  },

  /**
   * Get all upcoming checks (due date in future)
   */
  getUpcomingChecks: async (companyId?: number | null, daysAhead: number = 30): Promise<SupplierCheck[]> => {
    const allChecks = await cloudSupplierCheckService.getAll(companyId)
    const filtered = allChecks.filter(c => c.status === 'pending')
    const today = new Date()
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    return filtered
      .filter(c => {
        const dueDate = new Date(c.due_date)
        return dueDate >= today && dueDate <= futureDate
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  },

  /**
   * Get all overdue checks
   */
  getOverdueChecks: async (companyId?: number | null): Promise<SupplierCheck[]> => {
    const allChecks = await cloudSupplierCheckService.getAll(companyId)
    const filtered = allChecks.filter(c => c.status === 'pending')
    const today = new Date()
    return filtered
      .filter(c => new Date(c.due_date) < today)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  },

  // ========== ACCOUNT SUMMARY METHODS ==========

  /**
   * Get comprehensive account summary for a supplier
   */
  getAccountSummary: async (supplierId: number, companyId?: number | null): Promise<SupplierAccountSummary | null> => {
    const supplier = await supplierService.getById(supplierId)
    if (!supplier) return null

    const [totalPurchases, payments, allChecks] = await Promise.all([
      purchaseService.getPurchaseTotalBySupplier(supplierId, companyId),
      supplierPaymentService.getPaymentsBySupplier(supplierId, companyId),
      supplierPaymentService.getChecksBySupplier(supplierId, companyId),
    ])
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const pendingAmount = totalPurchases - totalPaid
    const today = new Date()
    
    const upcomingChecks = allChecks.filter(c => {
      const dueDate = new Date(c.due_date)
      return c.status === 'pending' && dueDate >= today
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

    const overdueChecks = allChecks.filter(c => {
      const dueDate = new Date(c.due_date)
      return c.status === 'pending' && dueDate < today
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

    return {
      supplier_id: supplierId,
      supplier_name: supplier.name,
      total_purchases: totalPurchases,
      total_paid: totalPaid,
      pending_amount: pendingAmount,
      upcoming_checks: upcomingChecks,
      overdue_checks: overdueChecks,
      recent_payments: payments.slice(0, 10), // Last 10 payments
      payment_history: payments,
      check_history: allChecks,
    }
  },

  /**
   * Lightweight supplier ledger summary. Uses Supabase RPC when online (single fast query).
   * Falls back to in-memory aggregation when offline.
   */
  getSupplierLedgerSummariesFast: async (companyId?: number | null): Promise<{ supplier_id: number; supplier_name: string; total_purchases: number; total_paid: number; pending_amount: number }[]> => {
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!.rpc('get_supplier_ledger_summary', {
          p_company_id: companyId ?? null,
        })
        if (!error && Array.isArray(data)) {
          return data.map((row: any) => ({
            supplier_id: Number(row.supplier_id),
            supplier_name: String(row.supplier_name ?? ''),
            total_purchases: Number(row.total_purchases ?? 0),
            total_paid: Number(row.total_paid ?? 0),
            pending_amount: Number(row.pending_amount ?? 0),
          }))
        }
      } catch (e) {
        console.warn('[supplierPaymentService] RPC get_supplier_ledger_summary failed, falling back:', e)
      }
    }

    const [suppliers, allPurchases, allPayments] = await Promise.all([
      supplierService.getAll(companyId),
      purchaseService.getAll(undefined, companyId),
      cloudSupplierPaymentService.getAll(companyId),
    ])

    const bySupplier = new Map<number, { supplier_name: string; total_purchases: number; total_paid: number }>()
    suppliers.forEach(s => bySupplier.set(s.id, { supplier_name: s.name, total_purchases: 0, total_paid: 0 }))

    allPurchases.forEach(p => {
      const sid = (p as any).supplier_id
      if (sid == null) return
      const total = p.type === 'gst' ? (p as any).grand_total : (p as any).total_amount
      const amtPaid = (p as any).amount_paid ?? (p.payment_status === 'paid' ? (total ?? 0) : 0)
      const entry = bySupplier.get(sid)
      if (entry) {
        entry.total_purchases += total ?? 0
        entry.total_paid += amtPaid
      } else {
        bySupplier.set(sid, { supplier_name: (p as any).supplier_name || 'Unknown', total_purchases: total ?? 0, total_paid: amtPaid })
      }
    })

    const paymentsFiltered = companyId != null ? allPayments.filter(p => p.company_id === companyId) : allPayments
    paymentsFiltered.forEach(p => {
      const entry = bySupplier.get(p.supplier_id)
      if (entry) entry.total_paid += p.amount ?? 0
    })

    return Array.from(bySupplier.entries()).map(([supplier_id, data]) => ({
      supplier_id,
      supplier_name: data.supplier_name,
      total_purchases: data.total_purchases,
      total_paid: data.total_paid,
      pending_amount: Math.max(0, data.total_purchases - data.total_paid),
    })).sort((a, b) => b.pending_amount - a.pending_amount)
  },

  /**
   * Get account summaries for all suppliers (full detail – slower, used by SupplierAccount)
   */
  getAllAccountSummaries: async (companyId?: number | null): Promise<SupplierAccountSummary[]> => {
    const suppliers = await supplierService.getAll(companyId)
    const summaries: SupplierAccountSummary[] = []

    for (const supplier of suppliers) {
      const summary = await supplierPaymentService.getAccountSummary(supplier.id, companyId)
      if (summary) {
        summaries.push(summary)
      }
    }

    return summaries.sort((a, b) => b.pending_amount - a.pending_amount) // Sort by pending amount (highest first)
  },
}




