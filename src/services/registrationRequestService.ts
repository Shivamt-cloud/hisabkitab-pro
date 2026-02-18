// Registration Request Service
// Stores user registration requests for review before creating accounts
// Uses cloud service which handles both Supabase and IndexedDB

import { getAll, put, getById, STORES } from '../database/db'
import { cloudRegistrationRequestService } from './cloudRegistrationRequestService'
import { SubscriptionTier, AccessType } from '../types/device'

export interface RegistrationRequest {
  id: number
  name: string
  email: string
  password?: string
  registration_method: 'google' | 'direct'
  business_name: string
  business_type: string
  address: string
  city: string
  state: string
  pincode: string
  country: string
  phone: string
  gstin?: string
  website?: string
  description?: string
  subscription_tier?: SubscriptionTier
  /** Which device access: mobile only, desktop only, or combo (both) */
  access_type?: AccessType
  status: 'pending' | 'under_review' | 'query_initiated' | 'query_completed' | 'registration_accepted' | 'agreement_pending' | 'agreement_accepted' | 'payment_pending' | 'payment_completed' | 'activation_completed' | 'activation_rejected'
  communication_initiated?: boolean
  registration_done?: boolean
  agreement_done?: boolean
  payment_done?: boolean
  company_activated?: boolean
  company_rejected?: boolean
  is_free_trial?: boolean // Indicates if user registered via 1 Month Free Trial button
  created_at: string
  updated_at: string
}

export const registrationRequestService = {
  // Get all registration requests (from cloud, with local fallback)
  getAll: async (): Promise<RegistrationRequest[]> => {
    return await cloudRegistrationRequestService.getAll()
  },

  // Get registration request by ID (from cloud, with local fallback)
  getById: async (id: number): Promise<RegistrationRequest | undefined> => {
    return await cloudRegistrationRequestService.getById(id)
  },

  // Create new registration request (saves to cloud and local)
  create: async (requestData: Omit<RegistrationRequest, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<RegistrationRequest> => {
    // Use cloud service which handles both cloud and local storage
    return await cloudRegistrationRequestService.create(requestData)
  },

  // Update registration request status (updates cloud and local)
  updateStatus: async (id: number, status: 'pending' | 'under_review' | 'query_initiated' | 'query_completed' | 'registration_accepted' | 'agreement_pending' | 'agreement_accepted' | 'payment_pending' | 'payment_completed' | 'activation_completed' | 'activation_rejected'): Promise<RegistrationRequest | null> => {
    // Use cloud service which handles both cloud and local storage
    return await cloudRegistrationRequestService.updateStatus(id, status)
  },

  // Update registration request flags
  updateFlags: async (id: number, flags: { communication_initiated?: boolean; registration_done?: boolean; agreement_done?: boolean; payment_done?: boolean; company_activated?: boolean; company_rejected?: boolean }): Promise<RegistrationRequest | null> => {
    // Use cloud service which handles both cloud and local storage
    return await cloudRegistrationRequestService.updateFlags(id, flags)
  },

  // Update registration request status and flags together (atomic update)
  updateStatusAndFlags: async (id: number, status: 'pending' | 'under_review' | 'query_initiated' | 'query_completed' | 'registration_accepted' | 'agreement_pending' | 'agreement_accepted' | 'payment_pending' | 'payment_completed' | 'activation_completed' | 'activation_rejected', flags: { communication_initiated?: boolean; registration_done?: boolean; agreement_done?: boolean; payment_done?: boolean; company_activated?: boolean; company_rejected?: boolean }): Promise<RegistrationRequest | null> => {
    // Use cloud service which handles both cloud and local storage
    return await cloudRegistrationRequestService.updateStatusAndFlags(id, status, flags)
  },

  // Get pending requests
  getPending: async (): Promise<RegistrationRequest[]> => {
    const allRequests = await registrationRequestService.getAll()
    return allRequests.filter(r => r.status === 'pending')
  },
}
