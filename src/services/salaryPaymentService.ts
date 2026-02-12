// Employee salary payment records – linked to sales persons (cloud + local)
import type { SalaryPayment } from '../types/salaryPayment'
import { cloudSalaryPaymentService } from './cloudSalaryPaymentService'

export const salaryPaymentService = {
  getAll: async (companyId?: number | null): Promise<SalaryPayment[]> => {
    return await cloudSalaryPaymentService.getAll(companyId)
  },

  getById: async (id: number): Promise<SalaryPayment | undefined> => {
    return await cloudSalaryPaymentService.getById(id)
  },

  getBySalesPersonId: async (salesPersonId: number, companyId?: number | null): Promise<SalaryPayment[]> => {
    const all = await cloudSalaryPaymentService.getAll(companyId)
    return all
      .filter(p => p.sales_person_id === salesPersonId)
      .sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
  },

  getTotalPaidBySalesPersonId: async (salesPersonId: number, companyId?: number | null): Promise<number> => {
    const payments = await salaryPaymentService.getBySalesPersonId(salesPersonId, companyId)
    return payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  },

  create: async (
    payment: Omit<SalaryPayment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SalaryPayment> => {
    return await cloudSalaryPaymentService.create(payment)
  },

  update: async (id: number, payment: Partial<SalaryPayment>): Promise<SalaryPayment | null> => {
    return await cloudSalaryPaymentService.update(id, payment)
  },

  delete: async (id: number): Promise<boolean> => {
    return await cloudSalaryPaymentService.delete(id)
  },
}
