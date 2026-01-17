// Supplier Payment and Check Management Service

import { SupplierPayment, SupplierCheck, SupplierAccountSummary, CheckStatus } from '../types/supplierPayment'
import { Purchase } from '../types/purchase'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'
import { purchaseService } from './purchaseService'
import { supplierService } from './purchaseService'

export const supplierPaymentService = {
  // ========== PAYMENT METHODS ==========
  
  /**
   * Get all payments for a supplier
   */
  getPaymentsBySupplier: async (supplierId: number, companyId?: number | null): Promise<SupplierPayment[]> => {
    const allPayments = await getAll<SupplierPayment>(STORES.SUPPLIER_PAYMENTS)
    let filtered = allPayments.filter(p => p.supplier_id === supplierId)
    
    if (companyId !== undefined && companyId !== null) {
      filtered = filtered.filter(p => p.company_id === companyId)
    }
    
    return filtered.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  },

  /**
   * Get payment by ID
   */
  getPaymentById: async (id: number): Promise<SupplierPayment | undefined> => {
    return await getById<SupplierPayment>(STORES.SUPPLIER_PAYMENTS, id)
  },

  /**
   * Create a new payment
   */
  createPayment: async (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at'>): Promise<SupplierPayment> => {
    const supplier = await supplierService.getById(payment.supplier_id)
    
    const newPayment: SupplierPayment = {
      ...payment,
      id: Date.now(),
      supplier_name: supplier?.name || payment.supplier_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    await put(STORES.SUPPLIER_PAYMENTS, newPayment)
    return newPayment
  },

  /**
   * Update a payment
   */
  updatePayment: async (id: number, payment: Partial<SupplierPayment>): Promise<SupplierPayment | null> => {
    const existing = await getById<SupplierPayment>(STORES.SUPPLIER_PAYMENTS, id)
    if (!existing) return null

    const updated: SupplierPayment = {
      ...existing,
      ...payment,
      updated_at: new Date().toISOString(),
    }
    
    await put(STORES.SUPPLIER_PAYMENTS, updated)
    return updated
  },

  /**
   * Delete a payment
   */
  deletePayment: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SUPPLIER_PAYMENTS, id)
      return true
    } catch (error) {
      console.error('Error deleting payment:', error)
      return false
    }
  },

  // ========== CHECK METHODS ==========

  /**
   * Get all checks for a supplier
   */
  getChecksBySupplier: async (supplierId: number, companyId?: number | null): Promise<SupplierCheck[]> => {
    const allChecks = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
    let filtered = allChecks.filter(c => c.supplier_id === supplierId)
    
    if (companyId !== undefined && companyId !== null) {
      filtered = filtered.filter(c => c.company_id === companyId)
    }
    
    return filtered.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
  },

  /**
   * Get check by ID
   */
  getCheckById: async (id: number): Promise<SupplierCheck | undefined> => {
    return await getById<SupplierCheck>(STORES.SUPPLIER_CHECKS, id)
  },

  /**
   * Create a new check
   */
  createCheck: async (check: Omit<SupplierCheck, 'id' | 'created_at' | 'updated_at'>): Promise<SupplierCheck> => {
    const supplier = await supplierService.getById(check.supplier_id)
    
    const newCheck: SupplierCheck = {
      ...check,
      id: Date.now(),
      supplier_name: supplier?.name || check.supplier_name,
      status: check.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    await put(STORES.SUPPLIER_CHECKS, newCheck)
    return newCheck
  },

  /**
   * Update a check
   */
  updateCheck: async (id: number, check: Partial<SupplierCheck>): Promise<SupplierCheck | null> => {
    const existing = await getById<SupplierCheck>(STORES.SUPPLIER_CHECKS, id)
    if (!existing) return null

    const updated: SupplierCheck = {
      ...existing,
      ...check,
      updated_at: new Date().toISOString(),
    }
    
    // If status is changed to 'cleared', set cleared_date
    if (check.status === 'cleared' && !updated.cleared_date) {
      updated.cleared_date = new Date().toISOString()
    }
    
    await put(STORES.SUPPLIER_CHECKS, updated)
    return updated
  },

  /**
   * Delete a check
   */
  deleteCheck: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SUPPLIER_CHECKS, id)
      return true
    } catch (error) {
      console.error('Error deleting check:', error)
      return false
    }
  },

  /**
   * Get all upcoming checks (due date in future)
   */
  getUpcomingChecks: async (companyId?: number | null, daysAhead: number = 30): Promise<SupplierCheck[]> => {
    const allChecks = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
    let filtered = allChecks.filter(c => c.status === 'pending')
    
    if (companyId !== undefined && companyId !== null) {
      filtered = filtered.filter(c => c.company_id === companyId)
    }
    
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
    const allChecks = await getAll<SupplierCheck>(STORES.SUPPLIER_CHECKS)
    let filtered = allChecks.filter(c => c.status === 'pending')
    
    if (companyId !== undefined && companyId !== null) {
      filtered = filtered.filter(c => c.company_id === companyId)
    }
    
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

    // Get all purchases for this supplier
    const allPurchases = await purchaseService.getAll(undefined, companyId)
    const supplierPurchases = allPurchases.filter(p => {
      if (p.type === 'gst') {
        return (p as any).supplier_id === supplierId
      }
      return (p as any).supplier_id === supplierId
    })

    // Calculate total purchases
    const totalPurchases = supplierPurchases.reduce((sum, p) => {
      if (p.type === 'gst') {
        return sum + ((p as any).grand_total || 0)
      }
      return sum + ((p as any).total_amount || 0)
    }, 0)

    // Get all payments
    const payments = await supplierPaymentService.getPaymentsBySupplier(supplierId, companyId)
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

    // Calculate pending amount
    const pendingAmount = totalPurchases - totalPaid

    // Get all checks
    const allChecks = await supplierPaymentService.getChecksBySupplier(supplierId, companyId)
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
   * Get account summaries for all suppliers
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




