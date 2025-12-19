import { User, UserRole } from '../types/auth'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

// Initialize default users if empty
async function initializeUsers(): Promise<void> {
  const users = await getAll<{ id: string; password: string } & User>(STORES.USERS)
  if (users.length === 0) {
    const defaultUsers: (User & { password: string })[] = [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@hisabkitab.com',
        password: 'admin123',
        role: 'admin',
      },
      {
        id: '2',
        name: 'Manager User',
        email: 'manager@hisabkitab.com',
        password: 'manager123',
        role: 'manager',
      },
      {
        id: '3',
        name: 'Staff User',
        email: 'staff@hisabkitab.com',
        password: 'staff123',
        role: 'staff',
      },
      {
        id: '4',
        name: 'Viewer User',
        email: 'viewer@hisabkitab.com',
        password: 'viewer123',
        role: 'viewer',
      },
    ]
    for (const user of defaultUsers) {
      await put(STORES.USERS, user)
    }
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
