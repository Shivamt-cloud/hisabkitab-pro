// Cloud Registration Request Service - Handles registration requests with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { getAll, put, getById, STORES } from '../database/db'
import { RegistrationRequest } from './registrationRequestService'

/**
 * Cloud Registration Request Service
 * Handles registration request operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudRegistrationRequestService = {
  /**
   * Get all registration requests from cloud
   */
  getAll: async (): Promise<RegistrationRequest[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getAll<RegistrationRequest>(STORES.REGISTRATION_REQUESTS)
    }

    try {
      const { data, error } = await supabase!
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching registration requests from cloud:', error)
        // Fallback to local storage
        return await getAll<RegistrationRequest>(STORES.REGISTRATION_REQUESTS)
      }

      // Sync to local storage for offline access
      if (data) {
        for (const request of data) {
          await put(STORES.REGISTRATION_REQUESTS, request as RegistrationRequest)
        }
      }

      return (data as RegistrationRequest[]) || []
    } catch (error) {
      console.error('Error in cloudRegistrationRequestService.getAll:', error)
      // Fallback to local storage
      return await getAll<RegistrationRequest>(STORES.REGISTRATION_REQUESTS)
    }
  },

  /**
   * Get registration request by ID from cloud
   */
  getById: async (id: number): Promise<RegistrationRequest | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<RegistrationRequest>(STORES.REGISTRATION_REQUESTS, id)
    }

    try {
      const { data, error } = await supabase!
        .from('registration_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching registration request from cloud:', error)
        // Fallback to local storage
        return await getById<RegistrationRequest>(STORES.REGISTRATION_REQUESTS, id)
      }

      // Sync to local storage
      if (data) {
        await put(STORES.REGISTRATION_REQUESTS, data as RegistrationRequest)
      }

      return data as RegistrationRequest | undefined
    } catch (error) {
      console.error('Error in cloudRegistrationRequestService.getById:', error)
      // Fallback to local storage
      return await getById<RegistrationRequest>(STORES.REGISTRATION_REQUESTS, id)
    }
  },

  /**
   * Create registration request in cloud
   */
  create: async (requestData: Omit<RegistrationRequest, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<RegistrationRequest> => {
    const newRequest: RegistrationRequest = {
      ...requestData,
      id: Date.now(),
      status: 'pending',
      communication_initiated: false,
      registration_done: false,
      agreement_done: false,
      payment_done: false,
      company_activated: false,
      company_rejected: false,
      is_free_trial: requestData.is_free_trial || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Always save to local storage first (for offline support)
    await put(STORES.REGISTRATION_REQUESTS, newRequest)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('registration_requests')
          .insert([{
            name: newRequest.name,
            email: newRequest.email,
            password: newRequest.password || null,
            registration_method: newRequest.registration_method,
            business_name: newRequest.business_name,
            business_type: newRequest.business_type,
            address: newRequest.address,
            city: newRequest.city,
            state: newRequest.state,
            pincode: newRequest.pincode,
            country: newRequest.country,
            phone: newRequest.phone,
            gstin: newRequest.gstin || null,
            website: newRequest.website || null,
            description: newRequest.description || null,
            subscription_tier: newRequest.subscription_tier || 'basic',
            status: 'pending',
            communication_initiated: false,
            registration_done: false,
            agreement_done: false,
            payment_done: false,
            company_activated: false,
            company_rejected: false,
            is_free_trial: newRequest.is_free_trial || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating registration request in cloud:', error)
          // Request is already saved locally, so we continue
        } else if (data) {
          // Update local with cloud data (in case cloud modified anything, like ID)
          await put(STORES.REGISTRATION_REQUESTS, data as RegistrationRequest)
          return data as RegistrationRequest
        }
      } catch (error) {
        console.error('Error in cloudRegistrationRequestService.create:', error)
        // Request is already saved locally, so we continue
      }
    }

    return newRequest
  },

  /**
   * Update registration request status in cloud
   */
  updateStatus: async (id: number, status: 'pending' | 'under_review' | 'query_initiated' | 'query_completed' | 'registration_accepted' | 'agreement_pending' | 'agreement_accepted' | 'payment_pending' | 'payment_completed' | 'activation_completed' | 'activation_rejected'): Promise<RegistrationRequest | null> => {
    // Get existing request
    const existing = await getById<RegistrationRequest>(STORES.REGISTRATION_REQUESTS, id)
    if (!existing) return null

    const updated: RegistrationRequest = {
      ...existing,
      status,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.REGISTRATION_REQUESTS, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('registration_requests')
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Error updating registration request in cloud:', error)
          // Request is already updated locally, so we continue
        } else if (data) {
          // Update local with cloud data
          await put(STORES.REGISTRATION_REQUESTS, data as RegistrationRequest)
          return data as RegistrationRequest
        }
      } catch (error) {
        console.error('Error in cloudRegistrationRequestService.updateStatus:', error)
        // Request is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Update registration request flags in cloud
   */
  updateFlags: async (id: number, flags: { communication_initiated?: boolean; registration_done?: boolean; agreement_done?: boolean; payment_done?: boolean; company_activated?: boolean; company_rejected?: boolean }): Promise<RegistrationRequest | null> => {
    // Get existing request
    const existing = await getById<RegistrationRequest>(STORES.REGISTRATION_REQUESTS, id)
    if (!existing) return null

    const updated: RegistrationRequest = {
      ...existing,
      communication_initiated: flags.communication_initiated !== undefined ? flags.communication_initiated : existing.communication_initiated,
      registration_done: flags.registration_done !== undefined ? flags.registration_done : existing.registration_done,
      agreement_done: flags.agreement_done !== undefined ? flags.agreement_done : existing.agreement_done,
      payment_done: flags.payment_done !== undefined ? flags.payment_done : existing.payment_done,
      company_activated: flags.company_activated !== undefined ? flags.company_activated : existing.company_activated,
      company_rejected: flags.company_rejected !== undefined ? flags.company_rejected : existing.company_rejected,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.REGISTRATION_REQUESTS, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updateData: any = {
          updated_at: new Date().toISOString(),
        }
        if (flags.communication_initiated !== undefined) updateData.communication_initiated = flags.communication_initiated
        if (flags.registration_done !== undefined) updateData.registration_done = flags.registration_done
        if (flags.agreement_done !== undefined) updateData.agreement_done = flags.agreement_done
        if (flags.payment_done !== undefined) updateData.payment_done = flags.payment_done
        if (flags.company_activated !== undefined) updateData.company_activated = flags.company_activated
        if (flags.company_rejected !== undefined) updateData.company_rejected = flags.company_rejected

        const { data, error } = await supabase!
          .from('registration_requests')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Error updating registration request flags in cloud:', error)
          // Request is already updated locally, so we continue
        } else if (data) {
          // Update local with cloud data
          await put(STORES.REGISTRATION_REQUESTS, data as RegistrationRequest)
          return data as RegistrationRequest
        }
      } catch (error) {
        console.error('Error in cloudRegistrationRequestService.updateFlags:', error)
        // Request is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Update registration request status and flags together (atomic update)
   */
  updateStatusAndFlags: async (id: number, status: RegistrationRequest['status'], flags: { communication_initiated?: boolean; registration_done?: boolean; agreement_done?: boolean; payment_done?: boolean; company_activated?: boolean; company_rejected?: boolean }): Promise<RegistrationRequest | null> => {
    // Get existing request
    const existing = await getById<RegistrationRequest>(STORES.REGISTRATION_REQUESTS, id)
    if (!existing) return null

    const updated: RegistrationRequest = {
      ...existing,
      status,
      communication_initiated: flags.communication_initiated !== undefined ? flags.communication_initiated : existing.communication_initiated,
      registration_done: flags.registration_done !== undefined ? flags.registration_done : existing.registration_done,
      agreement_done: flags.agreement_done !== undefined ? flags.agreement_done : existing.agreement_done,
      payment_done: flags.payment_done !== undefined ? flags.payment_done : existing.payment_done,
      company_activated: flags.company_activated !== undefined ? flags.company_activated : existing.company_activated,
      company_rejected: flags.company_rejected !== undefined ? flags.company_rejected : existing.company_rejected,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.REGISTRATION_REQUESTS, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updateData: any = {
          status: updated.status,
          communication_initiated: updated.communication_initiated,
          registration_done: updated.registration_done,
          agreement_done: updated.agreement_done,
          payment_done: updated.payment_done,
          company_activated: updated.company_activated,
          company_rejected: updated.company_rejected,
          updated_at: new Date().toISOString(),
        }

        // Log the status value being sent for debugging
        console.log('Updating registration request with status:', updated.status)
        console.log('Update data:', JSON.stringify(updateData, null, 2))

        const { data, error } = await supabase!
          .from('registration_requests')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Error updating registration request status and flags in cloud:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          console.error('Update data attempted:', JSON.stringify(updateData, null, 2))
          console.error('Record ID:', id)
          // Request is already updated locally, so we continue
          // But throw error so caller knows Supabase update failed
          throw new Error(`Failed to update registration request in Supabase: ${error.message}`)
        } else if (data) {
          // Update local with cloud data
          await put(STORES.REGISTRATION_REQUESTS, data as RegistrationRequest)
          return data as RegistrationRequest
        } else {
          // No error, but no data returned - this shouldn't happen, but handle it
          console.warn('Supabase update returned no error but also no data for registration request:', id)
          // Return local updated data
        }
      } catch (error) {
        console.error('Error in cloudRegistrationRequestService.updateStatusAndFlags:', error)
        // If it's an error we threw (Supabase update failed), re-throw it
        if (error instanceof Error && error.message.includes('Failed to update registration request in Supabase')) {
          throw error
        }
        // For other errors, log and continue (return local updated data)
        console.error('Unexpected error during Supabase update, continuing with local update:', error)
      }
    }

    return updated
  },
}
