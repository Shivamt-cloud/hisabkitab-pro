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

/** Locale for number/date formatting by country (affects grouping: 1,000 vs 1,00,000) */
const COUNTRY_LOCALE: Record<string, string> = {
  IN: 'en-IN',
  US: 'en-US',
  GB: 'en-GB',
  AU: 'en-AU',
  CA: 'en-CA',
  EU: 'en-US', // eurozone-style grouping
  AE: 'en-AE',
  SG: 'en-SG',
}

export function getLocaleForCountry(countryCode: string): string {
  return COUNTRY_LOCALE[countryCode] || 'en-IN'
}

/** Browser/local locale for date & number formatting (e.g. daily expense, daily report). Uses local timezone. */
export function getLocalLocale(): string {
  try {
    return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-IN'
  } catch {
    return 'en-IN'
  }
}

/**
 * Format price with currency symbol; optional locale for number grouping (by country).
 */
export function formatPrice(amount: number, currencySymbol: string, locale?: string): string {
  const loc = locale || 'en-IN'
  const formatted = Math.round(amount).toLocaleString(loc, { maximumFractionDigits: 0 })
  return `${currencySymbol}${formatted}`
}

/** Plan key for display (Starter + subscription tiers) */
export type PlanKeyForDisplay = 'starter' | 'basic' | 'standard' | 'premium' | 'premium_plus' | 'premium_plus_plus'

/** INR base: Combo display prices (monthly, yearly, 3yr) – from PLAN_PRICING_COMBINED */
const PLAN_DISPLAY_PRICES_INR: Record<PlanKeyForDisplay, { name: string; monthly: number; yearly: number; threeYear: number }> = {
  starter: { name: 'Starter', monthly: 299, yearly: 3588, threeYear: 7999 },
  basic: { name: 'Basic', monthly: 499, yearly: 5988, threeYear: 12999 },
  standard: { name: 'Standard', monthly: 649, yearly: 7788, threeYear: 16999 },
  premium: { name: 'Premium', monthly: 999, yearly: 11988, threeYear: 26999 },
  premium_plus: { name: 'Premium Plus', monthly: 1249, yearly: 14988, threeYear: 32999 },
  premium_plus_plus: { name: 'Premium Plus Plus', monthly: 1499, yearly: 17988, threeYear: 39999 },
}

/** INR base: Full prices by Mobile / Desktop / Combo */
const PLAN_FULL_PRICES_INR: Record<PlanKeyForDisplay, { mobile: { mo: number; yr: number; threeYr: number }; desktop: { mo: number; yr: number; threeYr: number }; combo: { mo: number; yr: number; threeYr: number } }> = {
  starter:  { mobile: { mo: 55,   yr: 649,   threeYr: 1499 },  desktop: { mo: 249,  yr: 2988,  threeYr: 6499 },  combo: { mo: 299,  yr: 3588,  threeYr: 7999 } },
  basic:    { mobile: { mo: 99,   yr: 1188,  threeYr: 2499 },  desktop: { mo: 399,  yr: 4788,  threeYr: 9999 },  combo: { mo: 499,  yr: 5988,  threeYr: 12999 } },
  standard: { mobile: { mo: 149,  yr: 1788,  threeYr: 3999 },  desktop: { mo: 499,  yr: 5988,  threeYr: 12999 }, combo: { mo: 649,  yr: 7788,  threeYr: 16999 } },
  premium:  { mobile: { mo: 249,  yr: 2988,  threeYr: 6499 },  desktop: { mo: 749,  yr: 8988,  threeYr: 19999 }, combo: { mo: 999,  yr: 11988, threeYr: 26999 } },
  premium_plus: { mobile: { mo: 349, yr: 4188, threeYr: 9249 }, desktop: { mo: 949, yr: 11388, threeYr: 24999 }, combo: { mo: 1249, yr: 14988, threeYr: 32999 } },
  premium_plus_plus: { mobile: { mo: 449, yr: 5388, threeYr: 11999 }, desktop: { mo: 1099, yr: 13188, threeYr: 29999 }, combo: { mo: 1499, yr: 17988, threeYr: 39999 } },
}

const INR_BASE_YEARLY = 6000 // India Basic combo yearly (reference)

function roundPrice(n: number): number {
  if (n >= 1000) return Math.round(n / 100) * 100
  if (n >= 100) return Math.round(n / 10) * 10
  return Math.round(n)
}

function scalePrices<T>(obj: T, factor: number): T {
  if (typeof obj === 'number') return roundPrice(obj * factor) as T
  if (Array.isArray(obj)) return obj.map((item) => scalePrices(item, factor)) as T
  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = scalePrices(v, factor)
    }
    return out as T
  }
  return obj
}

/**
 * Get plan display and full prices for a country (scaled from INR by country yearly price ratio).
 */
export function getPlanPricesForCountry(countryCode: string): {
  displayPrices: Record<PlanKeyForDisplay, { name: string; monthly: number; yearly: number; threeYear: number }>
  fullPrices: Record<PlanKeyForDisplay, { mobile: { mo: number; yr: number; threeYr: number }; desktop: { mo: number; yr: number; threeYr: number }; combo: { mo: number; yr: number; threeYr: number } }>
} {
  const cp = getCountryPricing(countryCode)
  const factor = cp.yearlyPrice / INR_BASE_YEARLY
  return {
    displayPrices: scalePrices(PLAN_DISPLAY_PRICES_INR, factor) as typeof PLAN_DISPLAY_PRICES_INR,
    fullPrices: scalePrices(PLAN_FULL_PRICES_INR, factor) as typeof PLAN_FULL_PRICES_INR,
  }
}


