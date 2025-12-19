import { User, UserRole } from '../types/auth'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

// Initialize users with default admin user
async function initializeUsers(): Promise<void> {
  const users = await getAll<{ id: string; password: string } & User>(STORES.USERS)
  
  // Check if admin user exists
  const adminExists = users.some(u => 
    u.email.toLowerCase() === 'hisabkitabpro@hisabkitab.com'
  )
  
  // Create default admin user if it doesn't exist (either empty DB or admin not found)
  if (!adminExists) {
    const defaultAdminUser: (User & { password: string }) = {
      id: users.length === 0 ? '1' : Date.now().toString(),
      name: 'HisabKitab Pro Admin',
      email: 'hisabkitabpro@hisabkitab.com',
      password: 'Shiv845496!@#',
      role: 'admin',
      company_id: undefined, // Admin has no company_id - can access all companies
    }
    await put(STORES.USERS, defaultAdminUser)
    console.log('Default admin user created/updated')
  }
}

export interface UserWithPassword extends User {
  password: string
}

export const userService = {
  // Get all users
  getAll: async (): Promise<UserWithPassword[]> => {
    await initializeUsers()
    return await getAll<UserWithPassword>(STORES.USERS)
  },

  // Get user by ID
  getById: async (id: string): Promise<UserWithPassword | undefined> => {
    return await getById<UserWithPassword>(STORES.USERS, id)
  },

  // Get user by email
  getByEmail: async (email: string): Promise<UserWithPassword | undefined> => {
    const users = await userService.getAll()
    return users.find(u => u.email.toLowerCase() === email.toLowerCase())
  },

  // Create new user
  create: async (userData: Omit<UserWithPassword, 'id'>): Promise<UserWithPassword> => {
    const users = await userService.getAll()
    
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('User with this email already exists')
    }

    const newUser: UserWithPassword = {
      ...userData,
      id: Date.now().toString(),
    }
    await put(STORES.USERS, newUser)
    return newUser
  },

  // Update user
  update: async (id: string, userData: Partial<Omit<UserWithPassword, 'id'>>): Promise<UserWithPassword | null> => {
    const existing = await getById<UserWithPassword>(STORES.USERS, id)
    if (!existing) return null

    // Check if email is being changed and if it conflicts with another user
    if (userData.email && existing.email !== userData.email) {
      const users = await userService.getAll()
      if (users.some(u => u.id !== id && u.email.toLowerCase() === userData.email!.toLowerCase())) {
        throw new Error('User with this email already exists')
      }
    }

    const updated: UserWithPassword = {
      ...existing,
      ...userData,
    }
    await put(STORES.USERS, updated)
    return updated
  },

  // Delete user
  delete: async (id: string): Promise<boolean> => {
    try {
      await deleteById(STORES.USERS, id)
      return true
    } catch (error) {
      return false
    }
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
    const user = await userService.getByEmail(email)
    if (user && user.password === password) {
      // Return user without password
      const { password: _, ...userWithoutPassword } = user
      return userWithoutPassword
    }
    return null
  },
}
