// React hook for database initialization and migration

import { useEffect, useState } from 'react'
import { initDB } from './db'
import { migrateFromLocalStorage, isMigrationComplete, MigrationResult } from './migration'

interface DatabaseStatus {
  initialized: boolean
  migrating: boolean
  migrationResult: MigrationResult | null
  error: string | null
}

/**
 * Hook to initialize database and handle migration
 */
export function useDatabase(): DatabaseStatus {
  const [status, setStatus] = useState<DatabaseStatus>({
    initialized: false,
    migrating: false,
    migrationResult: null,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    async function initializeDatabase() {
      try {
        // Initialize database
        await initDB()

        if (!mounted) return

        // Check if migration is needed
        if (!isMigrationComplete()) {
          setStatus(prev => ({ ...prev, migrating: true }))
          
          const migrationResult = await migrateFromLocalStorage()

          if (!mounted) return

          setStatus({
            initialized: true,
            migrating: false,
            migrationResult,
            error: migrationResult.success ? null : migrationResult.message,
          })
        } else {
          setStatus({
            initialized: true,
            migrating: false,
            migrationResult: null,
            error: null,
          })
        }
      } catch (error: any) {
        if (!mounted) return

        setStatus({
          initialized: false,
          migrating: false,
          migrationResult: null,
          error: error.message || 'Failed to initialize database',
        })
      }
    }

    initializeDatabase()

    return () => {
      mounted = false
    }
  }, [])

  return status
}






