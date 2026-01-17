// Expense service using IndexedDB and Supabase
import { Expense } from '../types/expense'
import { cloudExpenseService } from './cloudExpenseService'

export const expenseService = {
  // Get all expenses (from cloud, with local fallback)
  getAll: async (companyId?: number | null): Promise<Expense[]> => {
    return await cloudExpenseService.getAll(companyId)
  },

  // Get expense by ID (from cloud, with local fallback)
  getById: async (id: number): Promise<Expense | undefined> => {
    return await cloudExpenseService.getById(id)
  },

  // Create expense (saves to cloud and local)
  create: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    return await cloudExpenseService.create(expense)
  },

  // Update expense (updates cloud and local)
  update: async (id: number, expense: Partial<Expense>): Promise<Expense | null> => {
    return await cloudExpenseService.update(id, expense)
  },

  // Delete expense (deletes from cloud and local)
  delete: async (id: number): Promise<boolean> => {
    return await cloudExpenseService.delete(id)
  },

  getByDateRange: async (startDate: string, endDate: string, companyId?: number | null): Promise<Expense[]> => {
    const allExpenses = await expenseService.getAll(companyId)
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime() + 86400000 // Add 24 hours to include entire end date
    
    return allExpenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date).getTime()
      return expenseDate >= start && expenseDate <= end
    })
  },

  getBySalesPerson: async (salesPersonId: number, companyId?: number | null): Promise<Expense[]> => {
    const allExpenses = await expenseService.getAll(companyId)
    return allExpenses.filter(e => e.sales_person_id === salesPersonId)
  },

  getTotalByDate: async (date: string, companyId?: number | null): Promise<number> => {
    const expenses = await expenseService.getByDateRange(date, date, companyId)
    return expenses.reduce((sum, e) => sum + e.amount, 0)
  },
}




