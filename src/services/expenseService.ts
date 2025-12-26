// Expense service using IndexedDB
import { Expense } from '../types/expense'
import { STORES, getAll, getById, put, deleteById } from '../database/db'

export const expenseService = {
  getAll: async (companyId?: number | null): Promise<Expense[]> => {
    let expenses = await getAll<Expense>(STORES.EXPENSES)
    
    // Filter by company_id if provided
    if (companyId !== undefined && companyId !== null) {
      expenses = expenses.filter(e => e.company_id === companyId)
    } else if (companyId === null) {
      expenses = []
    }
    
    // Sort by date (newest first)
    return expenses.sort((a, b) => 
      new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    )
  },

  getById: async (id: number): Promise<Expense | undefined> => {
    return await getById<Expense>(STORES.EXPENSES, id)
  },

  create: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    await put(STORES.EXPENSES, newExpense)
    return newExpense
  },

  update: async (id: number, expense: Partial<Expense>): Promise<Expense | null> => {
    const existing = await getById<Expense>(STORES.EXPENSES, id)
    if (!existing) return null

    const updated: Expense = {
      ...existing,
      ...expense,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.EXPENSES, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.EXPENSES, id)
      return true
    } catch (error) {
      return false
    }
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

