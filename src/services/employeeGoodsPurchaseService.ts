// Employee goods purchase – amounts to deduct from salary (cloud + local)
import type { EmployeeGoodsPurchase } from '../types/employeeGoodsPurchase'
import { cloudEmployeeGoodsPurchaseService } from './cloudEmployeeGoodsPurchaseService'

export const employeeGoodsPurchaseService = {
  getAll: async (companyId?: number | null): Promise<EmployeeGoodsPurchase[]> => {
    return await cloudEmployeeGoodsPurchaseService.getAll(companyId)
  },

  getById: async (id: number): Promise<EmployeeGoodsPurchase | undefined> => {
    return await cloudEmployeeGoodsPurchaseService.getById(id)
  },

  getBySalesPersonId: async (salesPersonId: number, companyId?: number | null): Promise<EmployeeGoodsPurchase[]> => {
    const all = await cloudEmployeeGoodsPurchaseService.getAll(companyId)
    return all
      .filter(p => p.sales_person_id === salesPersonId)
      .sort((a, b) => (b.period || '').localeCompare(a.period || ''))
  },

  getTotalBySalesPersonId: async (salesPersonId: number, companyId?: number | null): Promise<number> => {
    const list = await employeeGoodsPurchaseService.getBySalesPersonId(salesPersonId, companyId)
    return list.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  },

  create: async (
    item: Omit<EmployeeGoodsPurchase, 'id' | 'created_at' | 'updated_at'>
  ): Promise<EmployeeGoodsPurchase> => {
    return await cloudEmployeeGoodsPurchaseService.create(item)
  },

  update: async (id: number, item: Partial<EmployeeGoodsPurchase>): Promise<EmployeeGoodsPurchase | null> => {
    return await cloudEmployeeGoodsPurchaseService.update(id, item)
  },

  delete: async (id: number): Promise<boolean> => {
    return await cloudEmployeeGoodsPurchaseService.delete(id)
  },
}
