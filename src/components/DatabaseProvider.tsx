// Database Provider Component
// Initializes IndexedDB and runs migration on app startup

import { ReactNode, useEffect, useState } from 'react'
import { initDB } from '../database/db'
import { migrateFromLocalStorage, isMigrationComplete } from '../database/migration'
import { autoBackupService } from '../services/autoBackupService'
import { userService } from '../services/userService'

interface DatabaseProviderProps {
  children: ReactNode
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    async function initializeDatabase() {
      try {
        // Set a timeout to prevent hanging
        timeoutId = setTimeout(() => {
          console.warn('Database initialization taking longer than expected, continuing anyway...')
          setIsInitialized(true)
        }, 5000) // 5 second timeout

        // Initialize database
        await initDB()

        // Check if migration is needed
        if (!isMigrationComplete()) {
          setIsMigrating(true)
          try {
            const result = await migrateFromLocalStorage()
            
            if (!result.success) {
              console.warn('Migration completed with errors:', result.errors)
              // Don't fail app startup if migration has errors
            } else {
              console.log('Migration completed successfully:', result.message)
            }
          } catch (migrationError: any) {
            console.error('Migration error:', migrationError)
            // Continue even if migration fails
          } finally {
            setIsMigrating(false)
          }
        }

               if (timeoutId) clearTimeout(timeoutId)
               setIsInitialized(true)

               // Ensure admin user exists after database is initialized
               try {
                 await userService.getAll() // This will trigger user initialization
               } catch (userError) {
                 console.warn('Could not initialize users:', userError)
               }

               // Start time-based backup service (12 PM & 6 PM) after database is initialized
               // Get user ID from localStorage if available
               try {
                 const savedUser = localStorage.getItem('hisabkitab_user')
                 const user = savedUser ? JSON.parse(savedUser) : null
                 const { timeBasedBackupService } = await import('../services/timeBasedBackupService')
                 await timeBasedBackupService.start(user?.id)
                 console.log('✅ Time-based backup service started (12 PM & 6 PM)')
               } catch (backupError) {
                 console.warn('Could not start time-based backup service:', backupError)
                 // Continue even if backup service fails to start
               }
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId)
        console.error('Database initialization error:', err)
        setError(err.message || 'Failed to initialize database')
        // Still allow app to continue - it will fallback to localStorage
        setIsInitialized(true)
      }
    }

    initializeDatabase()

    // Cleanup: stop backup service and timeout on unmount
    return () => {
      autoBackupService.stop()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // Show loading state during migration
  if (isMigrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Migrating data to database...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    )
  }

  // Show loading state if not initialized yet (but not migrating)
  if (!isInitialized && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Initializing database...</p>
        </div>
      </div>
    )
  }

  // Show error state if initialization failed critically
  if (error && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Database Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // Render children once initialized (or if error but initialized - allows fallback to localStorage)
  return <>{children}</>
}

