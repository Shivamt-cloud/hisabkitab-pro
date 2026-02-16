import { User, UserRole } from '../types/auth'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'
import { cloudUserService } from './cloudUserService'

// Initialize users with default admin user
async function initializeUsers(): Promise<void> {
  const users = await getAll<{ id: string; password: string } & User>(STORES.USERS)
  
  const adminEmail = 'hisabkitabpro@hisabkitab.com'
  const adminPassword = 'Shiv845496!@#'
  
  // Check if admin user exists
  const existingAdmin = users.find(u => 
    u.email.toLowerCase() === adminEmail.toLowerCase()
  )
  
  // Create or update default admin user
  if (!existingAdmin) {
    // Create new admin user
    const defaultAdminUser: (User & { password: string }) = {
      id: users.length === 0 ? '1' : Date.now().toString(),
      name: 'HisabKitab Pro Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      company_id: undefined, // Admin has no company_id - can access all companies
    }
    await put(STORES.USERS, defaultAdminUser)
    console.log('Default admin user created')
  } else if (!existingAdmin.password || existingAdmin.password !== adminPassword) {
    // Update admin user password if it doesn't match
    console.log('Updating admin user password')
    const updatedAdmin: (User & { password: string }) = {
      ...existingAdmin,
      password: adminPassword,
    }
    await put(STORES.USERS, updatedAdmin)
    console.log('Admin user password updated')
  }
}

export interface UserWithPassword extends User {
  password: string
  phone?: string
}

export const userService = {
  // Get all users (from cloud, with local fallback)
  getAll: async (): Promise<UserWithPassword[]> => {
    // First sync from cloud (if available)
    const users = await cloudUserService.getAll()
    // Then ensure admin user exists (after sync, so it doesn't get overwritten)
    await initializeUsers()
    // Return users (admin will be included now)
    return await cloudUserService.getAll()
  },

  // Get user by ID (from cloud, with local fallback)
  getById: async (id: string): Promise<UserWithPassword | undefined> => {
    return await cloudUserService.getById(id)
  },

  // Get user by email (from cloud, with local fallback)
  getByEmail: async (email: string): Promise<UserWithPassword | undefined> => {
    // Ensure admin user exists first
    await initializeUsers()
    return await cloudUserService.getByEmail(email)
  },

  // Create new user (saves to cloud and local)
  create: async (userData: Omit<UserWithPassword, 'id'>): Promise<UserWithPassword> => {
    const users = await userService.getAll()
    
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('User with this email already exists')
    }

    // Format username with company code if company_id is provided
    let displayName = userData.name
    if (userData.company_id) {
      const { formatUsernameWithCompanyCode } = await import('../utils/companyCodeHelper')
      displayName = await formatUsernameWithCompanyCode(userData.name, userData.company_id)
    }

    // Use cloud service which handles both cloud and local storage
    return await cloudUserService.create({
      ...userData,
      name: displayName, // Store formatted name with company code
    })
  },

  // Update user (updates cloud and local)
  update: async (id: string, userData: Partial<Omit<UserWithPassword, 'id'>>): Promise<UserWithPassword | null> => {
    const existing = await userService.getById(id)
    if (!existing) return null

    // Check if email is being changed and if it conflicts with another user
    if (userData.email && existing.email !== userData.email) {
      const users = await userService.getAll()
      if (users.some(u => u.id !== id && u.email.toLowerCase() === userData.email!.toLowerCase())) {
        throw new Error('User with this email already exists')
      }
    }

    // Use cloud service which handles both cloud and local storage
    return await cloudUserService.update(id, userData)
  },

  // Delete user (deletes from cloud and local)
  delete: async (id: string): Promise<boolean> => {
    return await cloudUserService.delete(id)
  },

  // Change password
  changePassword: async (id: string, newPassword: string): Promise<boolean> => {
    const user = await userService.getById(id)
    if (!user) return false
    
    await userService.update(id, { password: newPassword })
    return true
  },

  // Verify login credentials
  verifyLogin: async (email: string, password: string): Promise<User | null> => {
    // Ensure admin user exists (this will create/update it after any Supabase sync)
    await initializeUsers()
    // Get user (will check cloud first, then local)
    const user = await userService.getByEmail(email)
    
    // Debug logging
    if (!user) {
      console.error('Login failed: User not found for email:', email)
      const allUsers = await userService.getAll()
      console.log('Available users:', allUsers.map(u => ({ email: u.email, role: u.role })))
    } else if (user.password !== password) {
      console.error('Login failed: Password mismatch for email:', email)
      console.log('Expected password:', password)
      console.log('Stored password:', user.password ? '***' : '(empty)')
    }
    
    if (user && user.password === password) {
      // Return user without password
      const { password: _, ...userWithoutPassword } = user
      return userWithoutPassword
    }
    return null
  },
  
  // Force reset admin user (utility function)
  resetAdminUser: async (): Promise<void> => {
    const adminEmail = 'hisabkitabpro@hisabkitab.com'
    const adminPassword = 'Shiv845496!@#'
    
    const existingUser = await userService.getByEmail(adminEmail)
    const adminUser: (User & { password: string }) = {
      id: existingUser?.id || '1',
      name: 'HisabKitab Pro Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      company_id: undefined,
    }
    await put(STORES.USERS, adminUser)
    console.log('Admin user reset successfully')
  },
}
