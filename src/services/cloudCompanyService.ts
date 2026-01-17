// Cloud Company Service - Handles company operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Company } from '../types/company'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

/**
 * Cloud Company Service
 * Handles company operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudCompanyService = {
  /**
   * Get all companies from cloud
   */
  getAll: async (includeInactive: boolean = false): Promise<Company[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      let companies = await getAll<Company>(STORES.COMPANIES)
      if (!includeInactive) {
        companies = companies.filter(c => c.is_active)
      }
      return companies
    }

    try {
      let query = supabase!.from('companies').select('*')

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching companies from cloud:', error)
        // Fallback to local storage
        let companies = await getAll<Company>(STORES.COMPANIES)
        if (!includeInactive) {
          companies = companies.filter(c => c.is_active)
        }
        return companies
      }

      // Sync to local storage for offline access
      if (data) {
        for (const company of data) {
          await put(STORES.COMPANIES, company as Company)
        }
      }

      return (data as Company[]) || []
    } catch (error) {
      console.error('Error in cloudCompanyService.getAll:', error)
      // Fallback to local storage
      let companies = await getAll<Company>(STORES.COMPANIES)
      if (!includeInactive) {
        companies = companies.filter(c => c.is_active)
      }
      return companies
    }
  },

  /**
   * Get company by ID from cloud
   */
  getById: async (id: number): Promise<Company | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<Company>(STORES.COMPANIES, id)
    }

    try {
      const { data, error } = await supabase!
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching company from cloud:', error)
        // Fallback to local storage
        return await getById<Company>(STORES.COMPANIES, id)
      }

      // Sync to local storage
      if (data) {
        await put(STORES.COMPANIES, data as Company)
      }

      return data as Company | undefined
    } catch (error) {
      console.error('Error in cloudCompanyService.getById:', error)
      // Fallback to local storage
      return await getById<Company>(STORES.COMPANIES, id)
    }
  },

  /**
   * Get company by unique code from cloud
   */
  getByCode: async (code: string): Promise<Company | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const companies = await getAll<Company>(STORES.COMPANIES)
      return companies.find(c => c.unique_code?.toUpperCase() === code.toUpperCase())
    }

    try {
      const { data, error } = await supabase!
        .from('companies')
        .select('*')
        .eq('unique_code', code.toUpperCase())
        .single()

      if (error) {
        console.error('Error fetching company by code from cloud:', error)
        // Fallback to local storage
        const companies = await getAll<Company>(STORES.COMPANIES)
        return companies.find(c => c.unique_code?.toUpperCase() === code.toUpperCase())
      }

      // Sync to local storage
      if (data) {
        await put(STORES.COMPANIES, data as Company)
      }

      return data as Company | undefined
    } catch (error) {
      console.error('Error in cloudCompanyService.getByCode:', error)
      // Fallback to local storage
      const companies = await getAll<Company>(STORES.COMPANIES)
      return companies.find(c => c.unique_code?.toUpperCase() === code.toUpperCase())
    }
  },

  /**
   * Create company in cloud
   */
  create: async (companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> => {
    // If Supabase available and online, create in cloud first to get ID
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('companies')
          .insert([{
            name: companyData.name,
            unique_code: companyData.unique_code,
            email: companyData.email || null,
            phone: companyData.phone || null,
            address: companyData.address || null,
            city: companyData.city || null,
            state: companyData.state || null,
            pincode: companyData.pincode || null,
            country: companyData.country || 'India',
            gstin: companyData.gstin || null,
            pan: companyData.pan || null,
            website: companyData.website || null,
            valid_from: companyData.valid_from || null,
            valid_to: companyData.valid_to || null,
            is_active: companyData.is_active !== undefined ? companyData.is_active : true,
            subscription_tier: companyData.subscription_tier || 'basic',
            max_users: companyData.max_users || 3,
            subscription_start_date: companyData.subscription_start_date || null,
            subscription_end_date: companyData.subscription_end_date || null,
            subscription_status: companyData.subscription_status || 'active',
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating company in cloud:', error)
          throw error
        }

        if (data) {
          // Save to local storage
          await put(STORES.COMPANIES, data as Company)
          return data as Company
        }
      } catch (error) {
        console.error('Error in cloudCompanyService.create:', error)
        // Fall through to local creation
      }
    }

    // Fallback to local creation
    const newCompany: Company = {
      ...companyData,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.COMPANIES, newCompany)
    return newCompany
  },

  /**
   * Update company in cloud
   */
  update: async (id: number, companyData: Partial<Omit<Company, 'id'>>): Promise<Company | null> => {
    // Get existing company
    const existing = await getById<Company>(STORES.COMPANIES, id)
    if (!existing) return null

    const updated: Company = {
      ...existing,
      ...companyData,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.COMPANIES, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('companies')
          .update({
            name: updated.name,
            unique_code: updated.unique_code,
            email: updated.email || null,
            phone: updated.phone || null,
            address: updated.address || null,
            city: updated.city || null,
            state: updated.state || null,
            pincode: updated.pincode || null,
            country: updated.country || 'India',
            gstin: updated.gstin || null,
            pan: updated.pan || null,
            website: updated.website || null,
            valid_from: updated.valid_from || null,
            valid_to: updated.valid_to || null,
            is_active: updated.is_active !== undefined ? updated.is_active : true,
            updated_at: updated.updated_at,
          })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Error updating company in cloud:', error)
          // Company is already updated locally, so we continue
        } else if (data) {
          // Update local with cloud data
          await put(STORES.COMPANIES, data as Company)
          return data as Company
        }
      } catch (error) {
        console.error('Error in cloudCompanyService.update:', error)
        // Company is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Delete company from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    // Delete from local storage first
    try {
      await deleteById(STORES.COMPANIES, id)
    } catch (error) {
      console.error('Error deleting company from local storage:', error)
      return false
    }

    // If Supabase available and online, delete from cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('companies')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting company from cloud:', error)
          // Company is already deleted locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudCompanyService.delete:', error)
        // Company is already deleted locally, so we continue
      }
    }

    return true
  },
}





