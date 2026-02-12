// Expense service using IndexedDB and Supabase
import { Expense } from '../types/expense'
import { cloudExpenseService } from './cloudExpenseService'
import { salaryPaymentService } from './salaryPaymentService'
import { employeeGoodsPurchaseService } from './employeeGoodsPurchaseService'
import type { SalaryPayment, EmployeePaymentType } from '../types/salaryPayment'

function getEmployeePaymentType(expense: Expense): EmployeePaymentType | null {
  if (!expense.sales_person_id) return null
  if (expense.expense_type === 'employee_commission') return 'commission'
  if (expense.expense_type === 'salary' || expense.expense_type === 'sales_person_payment') return 'salary'
  return null
}

function mapExpensePaymentMethod(
  method: Expense['payment_method']
): SalaryPayment['payment_method'] {
  if (method === 'cash' || method === 'upi' || method === 'card' || method === 'other') return method
  return 'other'
}

/** Sync salary/commission expense to Employee Salary (salary_payments) */
async function syncExpenseToSalaryPayment(created: Expense): Promise<void> {
  const paymentType = getEmployeePaymentType(created)
  if (!paymentType) return
  try {
    await salaryPaymentService.create({
      sales_person_id: created.sales_person_id!,
      sales_person_name: created.sales_person_name,
      payment_type: paymentType,
      payment_date: created.expense_date,
      amount: created.amount,
      for_period: undefined,
      payment_method: mapExpensePaymentMethod(created.payment_method),
      notes: created.description ? `${created.description} (from expense)` : `From expense #${created.id}`,
      company_id: created.company_id,
    })
  } catch (err) {
    console.error('Failed to sync expense to employee salary record:', err)
  }
}

/** Sync employee goods purchase expense to Employee Salary (employee_goods_purchases) – deducted from pay */
async function syncExpenseToGoodsPurchase(created: Expense): Promise<void> {
  if (created.expense_type !== 'employee_goods_purchase' || !created.sales_person_id) return
  try {
    const period = created.expense_date ? String(created.expense_date).slice(0, 7) : new Date().toISOString().slice(0, 7)
    await employeeGoodsPurchaseService.create({
      sales_person_id: created.sales_person_id,
      sales_person_name: created.sales_person_name,
      period,
      amount: created.amount,
      notes: created.description ? `${created.description} (from expense)` : `From expense #${created.id}`,
      company_id: created.company_id,
    })
  } catch (err) {
    console.error('Failed to sync expense to employee goods purchase:', err)
  }
}

export const expenseService = {
  // Get all expenses (from cloud, with local fallback)
  getAll: async (companyId?: number | null): Promise<Expense[]> => {
    return await cloudExpenseService.getAll(companyId)
  },

  // Get expense by ID (from cloud, with local fallback)
  getById: async (id: number): Promise<Expense | undefined> => {
    return await cloudExpenseService.getById(id)
  },

  // Create expense (saves to cloud and local); syncs to Employee Salary when type is salary/sales_person_payment/employee_commission
  create: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    const created = await cloudExpenseService.create(expense)
    await syncExpenseToSalaryPayment(created)
    await syncExpenseToGoodsPurchase(created)
    return created
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




