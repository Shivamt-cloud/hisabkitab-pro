// Supabase client configuration
import { createClient } from '@supabase/supabase-js'

// Get environment variables (Vite exposes them via import.meta.env)
// Trim whitespace in case there are leading/trailing spaces
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.toString().trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.toString().trim() || ''

// Validate URL format
const isValidUrl = (url: string): boolean => {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// Debug logging (only in development or when not configured)
if (typeof window !== 'undefined') {
  const hasUrl = !!supabaseUrl
  const hasKey = !!supabaseAnonKey
  const urlValid = isValidUrl(supabaseUrl)
  
  if (!hasUrl || !hasKey || !urlValid) {
    console.warn('⚠️ Supabase Configuration Check:')
    console.warn('VITE_SUPABASE_URL:', hasUrl ? (urlValid ? '✅ Valid URL' : '❌ Invalid URL format') : '❌ Missing')
    if (hasUrl && !urlValid) {
      console.warn('  Current value:', JSON.stringify(supabaseUrl))
      console.warn('  Expected format: https://xxxxx.supabase.co')
    }
    console.warn('VITE_SUPABASE_ANON_KEY:', hasKey ? '✅ Set' : '❌ Missing')
    if (hasUrl && hasKey && !urlValid) {
      console.warn('⚠️ URL format issue detected. Please check:')
      console.warn('  1. No extra spaces before/after the URL')
      console.warn('  2. URL starts with https://')
      console.warn('  3. URL ends with .supabase.co')
    }
  }
}

// Check if Supabase is configured and valid
const isConfigured = supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)

if (!isConfigured) {
  console.warn('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.')
  if (typeof window !== 'undefined') {
    console.warn('For local development: Add them to .env file')
    console.warn('For production (Netlify): Add them in Netlify Dashboard → Site Settings → Environment Variables')
    console.warn('⚠️ IMPORTANT: After adding variables in Netlify, you MUST trigger a new deploy for them to take effect!')
  }
}

// Create Supabase client (only if properly configured)
export const supabase = isConfigured
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

