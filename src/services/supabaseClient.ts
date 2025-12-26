// Supabase client configuration
import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY

// Check if Supabase is configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file')
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Check if Supabase is available
export const isSupabaseAvailable = (): boolean => {
  return supabase !== null
}

// Helper to check if we're online
export const isOnline = (): boolean => {
  return navigator.onLine
}

