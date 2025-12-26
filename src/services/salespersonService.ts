// Sales Person and Commission Management Service using IndexedDB

import { SalesPerson, CategoryCommission, SalesPersonCommission, SalesPersonCategoryAssignment } from '../types/salesperson'
import { productService, categoryService } from './productService'
import { saleService } from './saleService'
import { getAll, getById, put, deleteById, STORES } from '../database/db'

// Sales Persons
export const salesPersonService = {
  getAll: async (includeInactive: boolean = false): Promise<SalesPerson[]> => {
    let persons = await getAll<SalesPerson>(STORES.SALES_PERSONS)
    if (!includeInactive) {
      persons = persons.filter(p => p.is_active)
    }
    return persons
  },

  getById: async (id: number): Promise<SalesPerson | undefined> => {
    return await getById<SalesPerson>(STORES.SALES_PERSONS, id)
  },

  create: async (person: Omit<SalesPerson, 'id' | 'created_at' | 'updated_at'>): Promise<SalesPerson> => {
    const newPerson: SalesPerson = {
      ...person,
      id: Date.now(),
      is_active: person.is_active !== undefined ? person.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SALES_PERSONS, newPerson)
    return newPerson
  },

  update: async (id: number, person: Partial<SalesPerson>): Promise<SalesPerson | null> => {
    const existing = await getById<SalesPerson>(STORES.SALES_PERSONS, id)
    if (!existing) return null

    const updated: SalesPerson = {
      ...existing,
      ...person,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SALES_PERSONS, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SALES_PERSONS, id)
      return true
    } catch (error) {
      return false
    }
  },
}

// Category Commissions
export const categoryCommissionService = {
  getAll: async (includeInactive: boolean = false): Promise<CategoryCommission[]> => {
    let commissions = await getAll<CategoryCommission>(STORES.CATEGORY_COMMISSIONS)
    
    // Enrich with category names
    const categories = await categoryService.getAll()
    commissions = commissions.map(comm => {
      const category = categories.find(c => c.id === comm.category_id)
      return {
        ...comm,
        category_name: category?.name,
      }
    })
    
    if (!includeInactive) {
      commissions = commissions.filter(comm => comm.is_active)
    }
    
    return commissions
  },

  getByCategory: async (categoryId: number): Promise<CategoryCommission | undefined> => {
    const commissions = await categoryCommissionService.getAll(true)
    return commissions.find(c => c.category_id === categoryId && c.is_active)
  },

  create: async (commission: Omit<CategoryCommission, 'id' | 'created_at' | 'updated_at'>): Promise<CategoryCommission> => {
    const commissions = await categoryCommissionService.getAll(true)
    
    // Check if commission already exists for this category
    const existing = commissions.find(c => c.category_id === commission.category_id)
    if (existing) {
      throw new Error('Commission already exists for this category. Please update instead.')
    }

    const newCommission: CategoryCommission = {
      ...commission,
      id: Date.now(),
      is_active: commission.is_active !== undefined ? commission.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.CATEGORY_COMMISSIONS, newCommission)
    return newCommission
  },

  update: async (id: number, commission: Partial<CategoryCommission>): Promise<CategoryCommission | null> => {
    const existing = await getById<CategoryCommission>(STORES.CATEGORY_COMMISSIONS, id)
    if (!existing) return null

    const updated: CategoryCommission = {
      ...existing,
      ...commission,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.CATEGORY_COMMISSIONS, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.CATEGORY_COMMISSIONS, id)
      return true
    } catch (error) {
      return false
    }
  },
}

// Sales Commissions (calculated commissions for each sale)
export const salesCommissionService = {
  calculateCommission: async (
    salesPersonId: number,
    saleId: number,
    saleDate: string,
    items: Array<{
      product_id: number
      product_name: string
      category_id?: number
      quantity: number
      unit_price: number
      subtotal: number
    }>
  ): Promise<SalesPersonCommission[]> => {
    const salesPerson = await salesPersonService.getById(salesPersonId)
    if (!salesPerson) {
      throw new Error('Sales person not found')
    }

    const commissions: SalesPersonCommission[] = []
    const [categories, products] = await Promise.all([
      categoryService.getAll(),
      productService.getAll(true)
    ])

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id)
      const categoryId = item.category_id || product?.category_id
      
      if (!categoryId) {
        // No category, skip commission calculation
        continue
      }

      // Get category commission config
      const categoryCommission = await categoryCommissionService.getByCategory(categoryId)
      const category = categories.find(c => c.id === categoryId)

      let commissionRate = 0
      let commissionType: 'percentage' | 'per_piece' = 'percentage'

      if (categoryCommission) {
        commissionType = categoryCommission.commission_type
        commissionRate = categoryCommission.commission_value
      } else if (salesPerson.commission_rate) {
        // Use sales person's default commission rate
        commissionType = 'percentage'
        commissionRate = salesPerson.commission_rate
      }

      let commissionAmount = 0
      if (commissionType === 'percentage') {
        commissionAmount = (item.subtotal * commissionRate) / 100
      } else {
        // per_piece
        commissionAmount = item.quantity * commissionRate
      }

      commissions.push({
        sales_person_id: salesPersonId,
        sales_person_name: salesPerson.name,
        sale_id: saleId,
        category_id: categoryId,
        category_name: category?.name,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        commission_type: commissionType,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        sale_date: saleDate,
        created_at: new Date().toISOString(),
      })
    }

    return commissions
  },

  saveCommissions: async (commissions: SalesPersonCommission[]): Promise<void> => {
    for (const commission of commissions) {
      // Generate ID if not present
      const commissionWithId = {
        ...commission,
        id: (commission as any).id || Date.now() + Math.random(),
      }
      await put(STORES.SALES_COMMISSIONS, commissionWithId)
    }
  },

  getAll: async (companyId?: number | null): Promise<SalesPersonCommission[]> => {
    let commissions = await getAll<SalesPersonCommission>(STORES.SALES_COMMISSIONS)
    
    // If companyId is provided, filter by checking the sale's company_id
    if (companyId !== undefined && companyId !== null) {
      // Filter commissions by checking their associated sale's company_id
      const filteredCommissions: SalesPersonCommission[] = []
      for (const commission of commissions) {
        const sale = await saleService.getById(commission.sale_id)
        if (sale && sale.company_id === companyId) {
          filteredCommissions.push(commission)
        }
      }
      commissions = filteredCommissions
    } else if (companyId === null) {
      // If companyId is explicitly null (user has no company), return empty array for data isolation
      commissions = []
    }
    // If companyId is undefined, return all (for admin users who haven't selected a company)
    
    return commissions
  },

  getBySalesPerson: async (salesPersonId: number): Promise<SalesPersonCommission[]> => {
    const all = await salesCommissionService.getAll()
    return all.filter(c => c.sales_person_id === salesPersonId)
  },

  getBySale: async (saleId: number): Promise<SalesPersonCommission[]> => {
    const all = await salesCommissionService.getAll()
    return all.filter(c => c.sale_id === saleId)
  },

  // Get commission statistics
  getStats: async (salesPersonId?: number) => {
    const commissions = salesPersonId 
      ? await salesCommissionService.getBySalesPerson(salesPersonId)
      : await salesCommissionService.getAll()
    
    const totalCommission = commissions.reduce((sum, c) => sum + c.commission_amount, 0)
    
    return {
      totalSales: new Set(commissions.map(c => c.sale_id)).size,
      totalItems: commissions.reduce((sum, c) => sum + c.quantity, 0),
      totalCommission,
      averageCommission: commissions.length > 0 ? totalCommission / commissions.length : 0,
      commissions,
    }
  },
}

// Sales Person Category Assignments
export const salesPersonCategoryAssignmentService = {
  getAll: async (includeInactive: boolean = false): Promise<SalesPersonCategoryAssignment[]> => {
    let assignments = await getAll<SalesPersonCategoryAssignment>(STORES.SALES_PERSON_CATEGORY_ASSIGNMENTS)
    
    // Enrich with names
    const [salesPersons, categories] = await Promise.all([
      salesPersonService.getAll(true),
      categoryService.getAll()
    ])
    
    assignments = assignments.map(assignment => {
      const salesPerson = salesPersons.find(sp => sp.id === assignment.sales_person_id)
      const category = categories.find(c => c.id === assignment.category_id)
      // Find parent category if this is a sub-category
      const parentCategory = category?.parent_id 
        ? categories.find(c => c.id === category.parent_id)
        : null
      return {
        ...assignment,
        sales_person_name: salesPerson?.name,
        category_name: category?.name,
        parent_category_name: parentCategory?.name || category?.parent_name || undefined,
      }
    })
    
    if (!includeInactive) {
      assignments = assignments.filter(a => a.is_active)
    }
    
    return assignments
  },

  getByCategory: async (categoryId: number): Promise<SalesPersonCategoryAssignment[]> => {
    const all = await salesPersonCategoryAssignmentService.getAll(true)
    return all.filter(a => a.category_id === categoryId && a.is_active)
  },

  getBySalesPerson: async (salesPersonId: number): Promise<SalesPersonCategoryAssignment[]> => {
    const all = await salesPersonCategoryAssignmentService.getAll(true)
    return all.filter(a => a.sales_person_id === salesPersonId && a.is_active)
  },

  create: async (assignment: Omit<SalesPersonCategoryAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<SalesPersonCategoryAssignment> => {
    const assignments = await salesPersonCategoryAssignmentService.getAll(true)
    
    // Check if assignment already exists
    const exists = assignments.find(
      a => a.sales_person_id === assignment.sales_person_id && 
           a.category_id === assignment.category_id
    )
    if (exists) {
      throw new Error('This sales person is already assigned to this category')
    }

    const newAssignment: SalesPersonCategoryAssignment = {
      ...assignment,
      id: Date.now(),
      is_active: assignment.is_active !== undefined ? assignment.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SALES_PERSON_CATEGORY_ASSIGNMENTS, newAssignment)
    return newAssignment
  },

  update: async (id: number, assignment: Partial<SalesPersonCategoryAssignment>): Promise<SalesPersonCategoryAssignment | null> => {
    const existing = await getById<SalesPersonCategoryAssignment>(STORES.SALES_PERSON_CATEGORY_ASSIGNMENTS, id)
    if (!existing) return null

    const updated: SalesPersonCategoryAssignment = {
      ...existing,
      ...assignment,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.SALES_PERSON_CATEGORY_ASSIGNMENTS, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.SALES_PERSON_CATEGORY_ASSIGNMENTS, id)
      return true
    } catch (error) {
      return false
    }
  },
}
