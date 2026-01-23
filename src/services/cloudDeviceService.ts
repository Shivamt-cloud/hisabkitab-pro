// Cloud Device Service - Handles device operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Device } from '../types/device'
import { getAll, put, getById, deleteById, getByIndex, STORES } from '../database/db'

/**
 * Cloud Device Service
 * Handles device operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudDeviceService = {
  /**
   * Get all devices for a user from cloud
   */
  getUserDevices: async (userId: string): Promise<Device[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const allDevices = await getAll<Device>(STORES.USER_DEVICES)
      return allDevices.filter(d => d.user_id === userId && d.is_active)
    }

    try {
      const { data, error } = await supabase!
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_accessed', { ascending: false })

      if (error) {
        console.error('Error fetching devices from cloud:', error)
        // Handle 406 (Not Acceptable) or other Supabase errors - fallback to local
        if (error.code === '406' || (error as any).status === 406) {
          console.warn('Supabase returned 406 (Not Acceptable). Using local storage fallback.')
        }
        // Fallback to local storage
        const allDevices = await getAll<Device>(STORES.USER_DEVICES)
        return allDevices.filter(d => d.user_id === userId && d.is_active)
      }

      // Sync to local storage for offline access
      if (data) {
        for (const device of data) {
          await put(STORES.USER_DEVICES, device as Device)
        }
      }

      return (data as Device[]) || []
    } catch (error) {
      console.error('Error in cloudDeviceService.getUserDevices:', error)
      // Fallback to local storage
      const allDevices = await getAll<Device>(STORES.USER_DEVICES)
      return allDevices.filter(d => d.user_id === userId && d.is_active)
    }
  },

  /**
   * Check if device is registered for user
   */
  isDeviceRegistered: async (userId: string, deviceId: string): Promise<boolean> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const allDevices = await getAll<Device>(STORES.USER_DEVICES)
      return allDevices.some(d => d.user_id === userId && d.device_id === deviceId && d.is_active)
    }

    try {
      const { data, error } = await supabase!
        .from('user_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking device registration:', error)
        // Handle 406 (Not Acceptable) or other Supabase errors - fallback to local
        if (error.code === '406' || (error as any).status === 406) {
          console.warn('Supabase returned 406 (Not Acceptable). Using local storage fallback.')
        }
        // Fallback to local storage
        const allDevices = await getAll<Device>(STORES.USER_DEVICES)
        return allDevices.some(d => d.user_id === userId && d.device_id === deviceId && d.is_active)
      }

      return !!data
    } catch (error) {
      console.error('Error in cloudDeviceService.isDeviceRegistered:', error)
      // Fallback to local storage
      const allDevices = await getAll<Device>(STORES.USER_DEVICES)
      return allDevices.some(d => d.user_id === userId && d.device_id === deviceId && d.is_active)
    }
  },

  /**
   * Register a device for a user
   */
  registerDevice: async (userId: string, deviceId: string, deviceInfo: {
    device_name?: string
    device_type?: 'desktop' | 'mobile' | 'tablet' | 'unknown'
    browser_info?: string
    user_agent?: string
  }): Promise<Device> => {
    const newDevice: Device = {
      id: Date.now(),
      user_id: userId,
      device_id: deviceId,
      device_name: deviceInfo.device_name,
      device_type: deviceInfo.device_type,
      browser_info: deviceInfo.browser_info,
      user_agent: deviceInfo.user_agent,
      last_accessed: new Date().toISOString(),
      created_at: new Date().toISOString(),
      is_active: true,
    }

    // Always save to local storage first
    await put(STORES.USER_DEVICES, newDevice)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('user_devices')
          .insert([{
            user_id: userId,
            device_id: deviceId,
            device_name: deviceInfo.device_name || null,
            device_type: deviceInfo.device_type || null,
            browser_info: deviceInfo.browser_info || null,
            user_agent: deviceInfo.user_agent || null,
            is_active: true,
          }])
          .select()
          .single()

        if (error) {
          console.error('Error registering device in cloud:', error)
          // Device is already saved locally, so we continue
        } else if (data) {
          // Update local with cloud data (to get the ID from Supabase)
          await put(STORES.USER_DEVICES, data as Device)
          return data as Device
        }
      } catch (error) {
        console.error('Error in cloudDeviceService.registerDevice:', error)
        // Device is already saved locally, so we continue
      }
    }

    return newDevice
  },

  /**
   * Update device last accessed timestamp
   */
  updateLastAccessed: async (userId: string, deviceId: string): Promise<void> => {
    // Get existing device
    const allDevices = await getAll<Device>(STORES.USER_DEVICES)
    const device = allDevices.find(d => d.user_id === userId && d.device_id === deviceId && d.is_active)

    if (!device) return

    const updated: Device = {
      ...device,
      last_accessed: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.USER_DEVICES, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('user_devices')
          .update({ last_accessed: updated.last_accessed })
          .eq('user_id', userId)
          .eq('device_id', deviceId)

        if (error) {
          console.error('Error updating device last accessed in cloud:', error)
          // Device is already updated locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudDeviceService.updateLastAccessed:', error)
        // Device is already updated locally, so we continue
      }
    }
  },

  /**
   * Remove/deactivate a device
   */
  removeDevice: async (userId: string, deviceId: string): Promise<boolean> => {
    // Get existing device
    const allDevices = await getAll<Device>(STORES.USER_DEVICES)
    const device = allDevices.find(d => d.user_id === userId && d.device_id === deviceId)

    if (!device) return false

    const updated: Device = {
      ...device,
      is_active: false,
    }

    // Always update local storage first
    await put(STORES.USER_DEVICES, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('user_devices')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('device_id', deviceId)

        if (error) {
          console.error('Error removing device in cloud:', error)
          // Device is already updated locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudDeviceService.removeDevice:', error)
        // Device is already updated locally, so we continue
      }
    }

    return true
  },

  /**
   * Get active device count for a user
   */
  getActiveDeviceCount: async (userId: string): Promise<number> => {
    const devices = await cloudDeviceService.getUserDevices(userId)
    return devices.length
  },

  /**
   * Get active device count for a company (all users in the company)
   * Device limits are company-based, so we need to count all devices for all users in the company
   */
  getActiveDeviceCountForCompany: async (companyId: number): Promise<number> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const allDevices = await getAll<Device>(STORES.USER_DEVICES)
      const allUsers = await getAll<{ id: string; company_id?: number }>(STORES.USERS)
      const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id)
      return allDevices.filter(d => companyUserIds.includes(d.user_id) && d.is_active).length
    }

    try {
      // Get all users in the company
      const { data: users, error: usersError } = await supabase!
        .from('users')
        .select('id')
        .eq('company_id', companyId)

      if (usersError) {
        console.error('Error fetching users for company:', usersError)
        // Fallback to local storage
        const allDevices = await getAll<Device>(STORES.USER_DEVICES)
        const allUsers = await getAll<{ id: string; company_id?: number }>(STORES.USERS)
        const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id)
        return allDevices.filter(d => companyUserIds.includes(d.user_id) && d.is_active).length
      }

      if (!users || users.length === 0) {
        return 0
      }

      const userIds = users.map(u => u.id)

      // Count all active devices for all users in the company
      // Use regular select instead of count to avoid 406 errors
      const { data: devices, error: devicesError } = await supabase!
        .from('user_devices')
        .select('id')
        .in('user_id', userIds)
        .eq('is_active', true)

      if (devicesError) {
        console.error('Error counting devices for company:', devicesError)
        // Fallback to local storage
        const allDevices = await getAll<Device>(STORES.USER_DEVICES)
        return allDevices.filter(d => userIds.includes(d.user_id) && d.is_active).length
      }

      return devices?.length || 0
    } catch (error) {
      console.error('Error in cloudDeviceService.getActiveDeviceCountForCompany:', error)
      // Fallback to local storage
      const allDevices = await getAll<Device>(STORES.USER_DEVICES)
      const allUsers = await getAll<{ id: string; company_id?: number }>(STORES.USERS)
      const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id)
      return allDevices.filter(d => companyUserIds.includes(d.user_id) && d.is_active).length
    }
  },

  /**
   * Get all active devices for a company (all users in the company)
   */
  getCompanyDevices: async (companyId: number): Promise<Device[]> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const allDevices = await getAll<Device>(STORES.USER_DEVICES)
      const allUsers = await getAll<{ id: string; company_id?: number }>(STORES.USERS)
      const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id)
      return allDevices.filter(d => companyUserIds.includes(d.user_id) && d.is_active)
    }

    try {
      // Get all users in the company
      const { data: users, error: usersError } = await supabase!
        .from('users')
        .select('id')
        .eq('company_id', companyId)

      if (usersError) {
        console.error('Error fetching users for company:', usersError)
        // Fallback to local storage
        const allDevices = await getAll<Device>(STORES.USER_DEVICES)
        const allUsers = await getAll<{ id: string; company_id?: number }>(STORES.USERS)
        const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id)
        return allDevices.filter(d => companyUserIds.includes(d.user_id) && d.is_active)
      }

      if (!users || users.length === 0) {
        return []
      }

      const userIds = users.map(u => u.id)

      // Get all active devices for all users in the company
      const { data: devices, error: devicesError } = await supabase!
        .from('user_devices')
        .select('*')
        .in('user_id', userIds)
        .eq('is_active', true)
        .order('last_accessed', { ascending: true }) // Oldest first

      if (devicesError) {
        console.error('Error fetching devices for company:', devicesError)
        // Fallback to local storage
        const allDevices = await getAll<Device>(STORES.USER_DEVICES)
        return allDevices.filter(d => userIds.includes(d.user_id) && d.is_active)
          .sort((a, b) => new Date(a.last_accessed).getTime() - new Date(b.last_accessed).getTime())
      }

      // Sync to local storage
      if (devices) {
        for (const device of devices) {
          await put(STORES.USER_DEVICES, device as Device)
        }
      }

      return (devices as Device[]) || []
    } catch (error) {
      console.error('Error in cloudDeviceService.getCompanyDevices:', error)
      // Fallback to local storage
      const allDevices = await getAll<Device>(STORES.USER_DEVICES)
      const allUsers = await getAll<{ id: string; company_id?: number }>(STORES.USERS)
      const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id)
      return allDevices.filter(d => companyUserIds.includes(d.user_id) && d.is_active)
        .sort((a, b) => new Date(a.last_accessed).getTime() - new Date(b.last_accessed).getTime())
    }
  },
}
