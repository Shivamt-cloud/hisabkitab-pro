import { Company } from '../types/company'
import { getAll, getById, put, deleteById, STORES } from '../database/db'

/**
 * Generate next available company code
 * Format: COMP001, COMP002, etc.
 * Or allow custom codes (3-6 alphanumeric characters, uppercase)
 */
async function generateNextCompanyCode(customCode?: string): Promise<string> {
  const companies = await getAll<Company>(STORES.COMPANIES)
  const existingCodes = companies.map(c => c.unique_code?.toUpperCase()).filter(Boolean) as string[]
  
  if (customCode) {
    const upperCode = customCode.toUpperCase().trim()
    // Validate custom code: 3-6 alphanumeric characters
    if (!/^[A-Z0-9]{3,6}$/.test(upperCode)) {
      throw new Error('Company code must be 3-6 alphanumeric characters (uppercase)')
    }
    if (existingCodes.includes(upperCode)) {
      throw new Error(`Company code "${upperCode}" already exists`)
    }
    return upperCode
  }
  
  // Auto-generate: COMP001, COMP002, etc.
  let nextNumber = 1
  while (existingCodes.includes(`COMP${String(nextNumber).padStart(3, '0')}`)) {
    nextNumber++
  }
  return `COMP${String(nextNumber).padStart(3, '0')}`
}

/**
 * Get company code by company ID
 */
async function getCompanyCode(companyId: number | undefined | null): Promise<string | null> {
  if (!companyId) return null
  const company = await getById<Company>(STORES.COMPANIES, companyId)
  return company?.unique_code || null
}

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
  create: async (companyData: Omit<Company, 'id' | 'created_at' | 'updated_at' | 'unique_code'> & { unique_code?: string }): Promise<Company> => {
    const companies = await companyService.getAll(true)
    
    // Check if company name already exists
    if (companies.some(c => c.name.toLowerCase() === companyData.name.toLowerCase())) {
      throw new Error('Company with this name already exists')
    }

    // Generate unique code
    const uniqueCode = await generateNextCompanyCode(companyData.unique_code)

    const newCompany: Company = {
      ...companyData,
      unique_code: uniqueCode,
      id: Date.now(),
      is_active: companyData.is_active !== undefined ? companyData.is_active : true,
      created_at: new Date().toISOString(),
    }
    
    await put(STORES.COMPANIES, newCompany)
    return newCompany
  },

  // Update company
  update: async (id: number, companyData: Partial<Omit<Company, 'id' | 'created_at' | 'unique_code'>>): Promise<Company | null> => {
    const existing = await getById<Company>(STORES.COMPANIES, id)
    if (!existing) return null

    // Prevent changing unique_code (immutable) - remove it from updateData if present
    const { unique_code, ...updateData } = companyData as any
    if (unique_code && unique_code !== existing.unique_code) {
      throw new Error('Company unique code cannot be changed once set')
    }

    // Check if name is being changed and conflicts with another company
    if (companyData.name && existing.name !== companyData.name) {
      const companies = await companyService.getAll(true)
      if (companies.some(c => c.id !== id && c.name.toLowerCase() === companyData.name!.toLowerCase())) {
        throw new Error('Company with this name already exists')
      }
    }

    const updated: Company = {
      ...existing,
      ...updateData,
      id: existing.id, // Ensure ID doesn't change
      unique_code: existing.unique_code, // Preserve unique code (immutable)
      updated_at: new Date().toISOString(),
    }
    
    await put(STORES.COMPANIES, updated)
    return updated
  },
  
  // Get company code by ID
  getCompanyCode: async (companyId: number | undefined | null): Promise<string | null> => {
    return await getCompanyCode(companyId)
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

