// Cloud User Service - Handles user operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { User } from '../types/auth'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

export interface UserWithPassword extends User {
  password: string
}

/**
 * Cloud User Service
 * Handles user operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudUserService = {
  /**
   * Get all users from cloud
   */
  getAll: async (): Promise<UserWithPassword[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getAll<UserWithPassword>(STORES.USERS)
    }

    try {
      const { data, error } = await supabase!
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users from cloud:', error)
        // Fallback to local storage
        return await getAll<UserWithPassword>(STORES.USERS)
      }

      // Sync to local storage for offline access
      if (data) {
        for (const user of data) {
          await put(STORES.USERS, user as UserWithPassword)
        }
      }

      return (data as UserWithPassword[]) || []
    } catch (error) {
      console.error('Error in cloudUserService.getAll:', error)
      // Fallback to local storage
      return await getAll<UserWithPassword>(STORES.USERS)
    }
  },

  /**
   * Get user by ID from cloud
   */
  getById: async (id: string): Promise<UserWithPassword | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      return await getById<UserWithPassword>(STORES.USERS, id)
    }

    try {
      const { data, error } = await supabase!
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching user from cloud:', error)
        // Fallback to local storage
        return await getById<UserWithPassword>(STORES.USERS, id)
      }

      // Sync to local storage
      if (data) {
        // Remove any Supabase-specific fields that don't exist in User type
        const { created_at, updated_at, ...userData } = data as any
        await put(STORES.USERS, userData as UserWithPassword)
      }

      return data as UserWithPassword | undefined
    } catch (error) {
      console.error('Error in cloudUserService.getById:', error)
      // Fallback to local storage
      return await getById<UserWithPassword>(STORES.USERS, id)
    }
  },

  /**
   * Get user by email from cloud
   */
  getByEmail: async (email: string): Promise<UserWithPassword | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const users = await getAll<UserWithPassword>(STORES.USERS)
      return users.find(u => u.email.toLowerCase() === email.toLowerCase())
    }

    try {
      const { data, error } = await supabase!
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      if (error) {
        console.error('Error fetching user by email from cloud:', error)
        // Fallback to local storage
        const users = await getAll<UserWithPassword>(STORES.USERS)
        return users.find(u => u.email.toLowerCase() === email.toLowerCase())
      }

      // Sync to local storage
      if (data) {
        // Remove any Supabase-specific fields that don't exist in User type
        const { created_at, updated_at, ...userData } = data as any
        await put(STORES.USERS, userData as UserWithPassword)
      }

      return data as UserWithPassword | undefined
    } catch (error) {
      console.error('Error in cloudUserService.getByEmail:', error)
      // Fallback to local storage
      const users = await getAll<UserWithPassword>(STORES.USERS)
      return users.find(u => u.email.toLowerCase() === email.toLowerCase())
    }
  },

  /**
   * Create user in cloud
   */
  create: async (userData: Omit<UserWithPassword, 'id'>): Promise<UserWithPassword> => {
    // Check if email already exists in local storage (IndexedDB) to avoid constraint errors
    try {
      const localUsers = await getAll<UserWithPassword>(STORES.USERS)
      const existingUser = localUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase())
      if (existingUser) {
        throw new Error('User with this email already exists')
      }
    } catch (error: any) {
      // If it's already our duplicate error, rethrow it
      if (error.message && error.message.includes('already exists')) {
        throw error
      }
      // Otherwise, log and continue (might be a database issue, but we'll let the constraint handle it)
      console.warn('Error checking for duplicate email in local storage:', error)
    }

    const newUser: UserWithPassword = {
      ...userData,
      id: Date.now().toString(),
    }

    // Always save to local storage first (for offline support)
    try {
      await put(STORES.USERS, newUser)
    } catch (error: any) {
      // If it's a constraint error (duplicate email), provide a better error message
      if (error.message && error.message.includes('constraint')) {
        throw new Error('User with this email already exists')
      }
      throw error
    }

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('users')
          .insert([{
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            password: newUser.password, // Note: In production, hash this!
            role: newUser.role,
            company_id: newUser.company_id || null,
            user_code: newUser.user_code || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating user in cloud:', error)
          // User is already saved locally, so we continue
        } else if (data) {
          // Update local with cloud data (in case cloud modified anything)
          await put(STORES.USERS, data as UserWithPassword)
          return data as UserWithPassword
        }
      } catch (error) {
        console.error('Error in cloudUserService.create:', error)
        // User is already saved locally, so we continue
      }
    }

    return newUser
  },

  /**
   * Update user in cloud
   */
  update: async (id: string, userData: Partial<Omit<UserWithPassword, 'id'>>): Promise<UserWithPassword | null> => {
    // Get existing user
    const existing = await getById<UserWithPassword>(STORES.USERS, id)
    if (!existing) return null

    const updated: UserWithPassword = {
      ...existing,
      ...userData,
    }

    // Always update local storage first
    await put(STORES.USERS, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('users')
          .update({
            name: updated.name,
            email: updated.email,
            password: updated.password, // Note: In production, hash this!
            role: updated.role,
            company_id: updated.company_id || null,
            user_code: updated.user_code || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Error updating user in cloud:', error)
          // User is already updated locally, so we continue
        } else if (data) {
          // Update local with cloud data
          await put(STORES.USERS, data as UserWithPassword)
          return data as UserWithPassword
        }
      } catch (error) {
        console.error('Error in cloudUserService.update:', error)
        // User is already updated locally, so we continue
      }
    }

    return updated
  },

  /**
   * Delete user from cloud
   */
  delete: async (id: string): Promise<boolean> => {
    // Delete from local storage first
    try {
      await deleteById(STORES.USERS, id)
    } catch (error) {
      console.error('Error deleting user from local storage:', error)
      return false
    }

    // If Supabase available and online, delete from cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('users')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting user from cloud:', error)
          // User is already deleted locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudUserService.delete:', error)
        // User is already deleted locally, so we continue
      }
    }

    return true
  },
}

