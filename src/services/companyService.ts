import { Company } from '../types/company'
import { getAll, getById, put, deleteById, STORES } from '../database/db'

export const companyService = {
  // Get all companies (admin only)
  getAll: async (includeInactive: boolean = false): Promise<Company[]> => {
    let companies = await getAll<Company>(STORES.COMPANIES)
    
    if (!includeInactive) {
      companies = companies.filter(c => c.is_active)
    }
    
    return companies.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  // Get company by ID
  getById: async (id: number): Promise<Company | null> => {
    const company = await getById<Company>(STORES.COMPANIES, id)
    return company || null
  },

  // Create new company
  create: async (companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> => {
    const companies = await companyService.getAll(true)
    
    // Check if company name already exists
    if (companies.some(c => c.name.toLowerCase() === companyData.name.toLowerCase())) {
      throw new Error('Company with this name already exists')
    }

    const newCompany: Company = {
      ...companyData,
      id: Date.now(),
      is_active: companyData.is_active !== undefined ? companyData.is_active : true,
      created_at: new Date().toISOString(),
    }
    
    await put(STORES.COMPANIES, newCompany)
    return newCompany
  },

  // Update company
  update: async (id: number, companyData: Partial<Omit<Company, 'id' | 'created_at'>>): Promise<Company | null> => {
    const existing = await getById<Company>(STORES.COMPANIES, id)
    if (!existing) return null

    // Check if name is being changed and conflicts with another company
    if (companyData.name && existing.name !== companyData.name) {
      const companies = await companyService.getAll(true)
      if (companies.some(c => c.id !== id && c.name.toLowerCase() === companyData.name!.toLowerCase())) {
        throw new Error('Company with this name already exists')
      }
    }

    const updated: Company = {
      ...existing,
      ...companyData,
      id: existing.id, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    }
    
    await put(STORES.COMPANIES, updated)
    return updated
  },

  // Delete company (soft delete - set is_active to false)
  delete: async (id: number): Promise<boolean> => {
    try {
      const company = await companyService.getById(id)
      if (!company) return false
      
      // Soft delete - set is_active to false
      await companyService.update(id, { is_active: false })
      return true
    } catch (error) {
      console.error('Error deleting company:', error)
      return false
    }
  },

  // Hard delete company (admin only - use with caution)
  hardDelete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.COMPANIES, id)
      return true
    } catch (error) {
      console.error('Error hard deleting company:', error)
      return false
    }
  },
}

