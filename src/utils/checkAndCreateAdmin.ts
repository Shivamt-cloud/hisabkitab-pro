// Utility to ensure admin user exists
import { userService } from '../services/userService'

export async function ensureAdminUserExists(): Promise<void> {
  try {
    const users = await userService.getAll()
    
    // Check if admin user exists
    const adminExists = users.some(u => 
      u.email.toLowerCase() === 'hisabkitabpro@hisabkitab.com'
    )
    
    if (!adminExists) {
      // Create admin user if it doesn't exist
      await userService.create({
        name: 'HisabKitab Pro Admin',
        email: 'hisabkitabpro@hisabkitab.com',
        password: 'Shiv845496!@#',
        role: 'admin',
      })
      console.log('Admin user created successfully')
    }
  } catch (error) {
    console.error('Error ensuring admin user exists:', error)
  }
}

