// Cloud Expense Service - Handles expense operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Expense } from '../types/expense'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

/**
 * Cloud Expense Service
 * Handles expense operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudExpenseService = {
  /**
   * Get all expenses from cloud
   */
  getAll: async (companyId?: number | null): Promise<Expense[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      let expenses = await getAll<Expense>(STORES.EXPENSES)
      if (companyId !== undefined && companyId !== null) {
        expenses = expenses.filter(e => e.company_id === companyId)
      } else if (companyId === null) {
        return []
      }
      return expenses.sort((a, b) => 
        new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
      )
    }

    try {
      let query = supabase!.from('expenses').select('*')

      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query.order('expense_date', { ascending: false })

      if (error) {
        console.error('Error fetching expenses from cloud:', error)
        // Fallback to local storage
        let expenses = await getAll<Expense>(STORES.EXPENSES)
        if (companyId !== undefined && companyId !== null) {
          expenses = expenses.filter(e => e.company_id === companyId)
        } else if (companyId === null) {
          return []
        }
        return expenses.sort((a, b) => 
          new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
        )
      }

      // Sync to local storage for offline access
      if (data) {
        for (const expense of data) {
          await put(STORES.EXPENSES, expense as Expense)
        }
      }

      return (data as Expense[]) || []
    } catch (error) {
      console.error('Error in cloudExpenseService.getAll:', error)
      // Fallback to local storage
      let expenses = await getAll<Expense>(STORES.EXPENSES)
      if (companyId !== undefined && companyId !== null) {
        expenses = expenses.filter(e => e.company_id === companyId)
      } else if (companyId === null) {
        return []
      }
      return expenses.sort((a, b) => 
        new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
      )
    }
  },

  /**
   * Get expense by ID from cloud
   */
  getById: async (id: number): Promise<Expense | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<Expense>(STORES.EXPENSES, id)
    }

    try {
      const { data, error } = await supabase!
        .from('expenses')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching expense from cloud:', error)
        // Fallback to local storage
        return await getById<Expense>(STORES.EXPENSES, id)
      }

      // If no data found, return undefined (not an error)
      if (!data) {
        return undefined
      }

      // Sync to local storage
      await put(STORES.EXPENSES, data as Expense)

      return data as Expense | undefined
    } catch (error) {
      console.error('Error in cloudExpenseService.getById:', error)
      // Fallback to local storage
      return await getById<Expense>(STORES.EXPENSES, id)
    }
  },

  /**
   * Create expense in cloud
   */
  create: async (expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    // If Supabase available and online, create in cloud first to get ID
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('expenses')
          .insert([{
            expense_date: expenseData.expense_date,
            expense_type: expenseData.expense_type,
            amount: expenseData.amount,
            description: expenseData.description,
            sales_person_id: expenseData.sales_person_id || null,
            sales_person_name: expenseData.sales_person_name || null,
            payment_method: expenseData.payment_method,
            receipt_number: expenseData.receipt_number || null,
            category: expenseData.category || null,
            cash_denominations: expenseData.cash_denominations || null, // JSONB object
            company_id: expenseData.company_id || null,
            created_by: expenseData.created_by,
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating expense in cloud:', error)
          throw error
        }

        if (data) {
          // Save to local storage
          await put(STORES.EXPENSES, data as Expense)
          return data as Expense
        }
      } catch (error) {
        console.error('Error in cloudExpenseService.create:', error)
        // Fall through to local creation
      }
    }

    // Fallback to local creation
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.EXPENSES, newExpense)
    return newExpense
  },

  /**
   * Update expense in cloud
   */
  update: async (id: number, expenseData: Partial<Omit<Expense, 'id'>>): Promise<Expense | null> => {
    // Get existing expense
    const existing = await getById<Expense>(STORES.EXPENSES, id)
    if (!existing) return null

    const updated: Expense = {
      ...existing,
      ...expenseData,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.EXPENSES, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updateData: any = {
          expense_date: updated.expense_date,
          expense_type: updated.expense_type,
          amount: updated.amount,
          description: updated.description,
          sales_person_id: updated.sales_person_id || null,
          sales_person_name: updated.sales_person_name || null,
          payment_method: updated.payment_method,
          receipt_number: updated.receipt_number || null,
          category: updated.category || null,
          cash_denominations: updated.cash_denominations || null, // JSONB object
          company_id: updated.company_id || null,
          created_by: updated.created_by,
          updated_at: updated.updated_at,
        }

        const { data, error } = await supabase!
          .from('expenses')
          .update(updateData)
          .eq('id', id)
          .select()
          .maybeSingle()

        if (error) {
          console.error('Error updating expense in cloud:', error)
          // Expense is already updated locally, so return it
          const localExpense = await getById<Expense>(STORES.EXPENSES, id)
          return localExpense || null
        } else if (data) {
          // Update local with cloud data
          await put(STORES.EXPENSES, data as Expense)
          return data as Expense
        } else {
          // No data returned - expense might not exist in Supabase
          // Return the locally updated expense
          const localExpense = await getById<Expense>(STORES.EXPENSES, id)
          return localExpense || null
        }
      } catch (error) {
        console.error('Error in cloudExpenseService.update:', error)
        // Expense is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Delete expense from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    // Delete from local storage first
    try {
      await deleteById(STORES.EXPENSES, id)
    } catch (error) {
      console.error('Error deleting expense from local storage:', error)
      return false
    }

    // If Supabase available and online, delete from cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('expenses')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting expense from cloud:', error)
          // Expense is already deleted locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudExpenseService.delete:', error)
        // Expense is already deleted locally, so we continue
      }
    }

    return true
  },
}
