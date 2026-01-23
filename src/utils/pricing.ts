/**
 * Country-wise pricing configuration for HisabKitab-Pro
 */

export interface CountryPricing {
  countryCode: string
  countryName: string
  currency: string
  currencySymbol: string
  yearlyPrice: number
  originalPrice?: number
  discount?: number
  discountText?: string
  period: 'year' | 'month'
}

export type SupportedCountryCode = keyof typeof COUNTRY_PRICING

export const COUNTRY_PRICING: Record<string, CountryPricing> = {
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    yearlyPrice: 6000, // Discounted price (50% off)
    originalPrice: 12000, // Original price (6000 × 2 = 12000 for 50% discount)
    discount: 50,
    discountText: '50% OFF',
    period: 'year',
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    yearlyPrice: 720, // Discounted price (50% off)
    originalPrice: 1440, // Original price (720 × 2 = 1440 for 50% discount)
    discount: 50,
    discountText: '50% OFF',
    period: 'year',
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    yearlyPrice: 600, // Discounted price (50% off)
    originalPrice: 1200, // Original price (600 × 2 = 1200 for 50% discount)
    discount: 50,
    discountText: '50% OFF',
    period: 'year',
  },
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    yearlyPrice: 1020, // Discounted price (50% off)
    originalPrice: 2040, // Original price (1020 × 2 = 2040 for 50% discount)
    discount: 50,
    discountText: '50% OFF',
    period: 'year',
  },
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    yearlyPrice: 960, // Discounted price (50% off)
    originalPrice: 1920, // Original price (960 × 2 = 1920 for 50% discount)
    discount: 50,
    discountText: '50% OFF',
    period: 'year',
  },
  EU: {
    countryCode: 'EU',
    countryName: 'Europe',
    currency: 'EUR',
    currencySymbol: '€',
    yearlyPrice: 660, // Discounted price (50% off)
    originalPrice: 1320, // Original price (660 × 2 = 1320 for 50% discount)
    discount: 50,
    discountText: '50% OFF',
    period: 'year',
  },
  AE: {
    countryCode: 'AE',
    countryName: 'UAE',
    currency: 'AED',
    currencySymbol: 'AED',
    yearlyPrice: 2640, // Discounted price (50% off)
    originalPrice: 5280, // Original price (2640 × 2 = 5280 for 50% discount)
    discount: 50,
    discountText: '50% OFF',
    period: 'year',
  },
  SG: {
    countryCode: 'SG',
    countryName: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    yearlyPrice: 960, // Discounted price (50% off)
    originalPrice: 1920, // Original price (960 × 2 = 1920 for 50% discount)
    discount: 50,
    discountText: '50% OFF',
    period: 'year',
  },
}

export const COUNTRY_OPTIONS: Array<{
  code: string
  name: string
  currencySymbol: string
}> = [
  { code: 'IN', name: 'India', currencySymbol: '₹' },
  { code: 'US', name: 'United States', currencySymbol: '$' },
  { code: 'GB', name: 'United Kingdom', currencySymbol: '£' },
  { code: 'AU', name: 'Australia', currencySymbol: 'A$' },
  { code: 'CA', name: 'Canada', currencySymbol: 'C$' },
  { code: 'EU', name: 'Europe', currencySymbol: '€' },
  { code: 'AE', name: 'UAE', currencySymbol: 'AED' },
  { code: 'SG', name: 'Singapore', currencySymbol: 'S$' },
]

export function isSupportedCountryCode(code: string | null | undefined): boolean {
  if (!code) return false
  return Boolean(COUNTRY_PRICING[code])
}

const COUNTRY_STORAGE_KEY = 'hisabkitab:selectedCountry'

export function getSavedCountry(): string | null {
  try {
    return localStorage.getItem(COUNTRY_STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveCountry(countryCode: string): void {
  try {
    localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode)
  } catch {
    // ignore (private mode, blocked storage, etc.)
  }
}

/**
 * Get pricing for a specific country
 */
export function getCountryPricing(countryCode: string): CountryPricing {
  return COUNTRY_PRICING[countryCode] || COUNTRY_PRICING.IN // Default to India
}

/**
 * Detect user's country from browser
 */
export function detectCountry(): string {
  // Try to get from browser's timezone
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Map timezones to countries
    if (timezone.includes('Asia/Kolkata') || timezone.includes('India')) return 'IN'
    if (timezone.includes('America/New_York') || timezone.includes('America/Los_Angeles')) return 'US'
    if (timezone.includes('Europe/London')) return 'GB'
    if (timezone.includes('Australia')) return 'AU'
    if (timezone.includes('America/Toronto') || timezone.includes('America/Vancouver')) return 'CA'
    if (timezone.includes('Europe/')) return 'EU'
    if (timezone.includes('Asia/Dubai')) return 'AE'
    if (timezone.includes('Asia/Singapore')) return 'SG'
  } catch (e) {
    console.warn('Could not detect country from timezone:', e)
  }
  
  // Try to get from browser locale
  try {
    const locale = navigator.language || (navigator as any).userLanguage
    const countryCode = locale.split('-')[1]?.toUpperCase()
    if (countryCode && COUNTRY_PRICING[countryCode]) {
      return countryCode
    }
  } catch (e) {
    console.warn('Could not detect country from locale:', e)
  }
  
  // Default to India
  return 'IN'
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currencySymbol: string): string {
  // Format number with commas
  const formatted = amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  return `${currencySymbol}${formatted}`
}


