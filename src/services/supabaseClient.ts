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

// Debug logging (always log in production to help diagnose issues)
if (typeof window !== 'undefined') {
  const hasUrl = !!supabaseUrl
  const hasKey = !!supabaseAnonKey
  const urlValid = isValidUrl(supabaseUrl)
  
  // Always log configuration status for debugging
  console.log('🔍 Supabase Configuration Check:')
  console.log('VITE_SUPABASE_URL:', hasUrl ? (urlValid ? '✅ Valid URL' : '❌ Invalid URL format') : '❌ Missing')
  if (hasUrl) {
    console.log('  URL value:', supabaseUrl.substring(0, 30) + '...' + (urlValid ? '' : ' (INVALID)'))
  }
  console.log('VITE_SUPABASE_ANON_KEY:', hasKey ? '✅ Set (' + supabaseAnonKey.substring(0, 20) + '...)' : '❌ Missing')
  
  if (!hasUrl || !hasKey || !urlValid) {
    console.error('⚠️ Supabase Configuration Error:')
    if (!hasUrl) {
      console.error('  ❌ VITE_SUPABASE_URL is missing!')
      console.error('  → Add it in Netlify: Site Settings → Environment Variables')
    }
    if (!hasKey) {
      console.error('  ❌ VITE_SUPABASE_ANON_KEY is missing!')
      console.error('  → Add it in Netlify: Site Settings → Environment Variables')
    }
    if (hasUrl && !urlValid) {
      console.error('  ❌ VITE_SUPABASE_URL has invalid format!')
      console.error('  Current value:', JSON.stringify(supabaseUrl))
      console.error('  Expected format: https://xxxxx.supabase.co')
    }
    console.error('⚠️ IMPORTANT: After adding variables in Netlify, trigger a new deployment!')
  } else {
    console.log('✅ Supabase configuration looks good!')
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

// Log connection status
if (typeof window !== 'undefined') {
  if (isConfigured) {
    console.log('✅ Supabase client created successfully')
    // Test connection (async, don't block)
    if (supabase) {
      Promise.resolve(supabase.from('users').select('count').limit(1))
        .then(() => {
          console.log('✅ Supabase connection test: SUCCESS')
        })
        .catch((error: any) => {
          console.error('❌ Supabase connection test: FAILED', error)
        })
    }
  } else {
    console.error('❌ Supabase client NOT created - configuration missing or invalid')
  }
}

// Check if Supabase is available
export const isSupabaseAvailable = (): boolean => {
  return supabase !== null
}

// Helper to check if we're online
export const isOnline = (): boolean => {
  return navigator.onLine
}

