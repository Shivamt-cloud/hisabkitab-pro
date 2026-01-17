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

export const COUNTRY_PRICING: Record<string, CountryPricing> = {
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    yearlyPrice: 6000,
    originalPrice: 7059,
    discount: 15,
    discountText: '15% OFF',
    period: 'year',
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    yearlyPrice: 720, // $60/month = $720/year
    originalPrice: 840,
    discount: 15,
    discountText: '15% OFF',
    period: 'year',
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    yearlyPrice: 600, // £50/month = £600/year
    originalPrice: 705,
    discount: 15,
    discountText: '15% OFF',
    period: 'year',
  },
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    yearlyPrice: 1020, // A$85/month = A$1020/year
    originalPrice: 1200,
    discount: 15,
    discountText: '15% OFF',
    period: 'year',
  },
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    yearlyPrice: 960, // C$80/month = C$960/year
    originalPrice: 1128,
    discount: 15,
    discountText: '15% OFF',
    period: 'year',
  },
  EU: {
    countryCode: 'EU',
    countryName: 'Europe',
    currency: 'EUR',
    currencySymbol: '€',
    yearlyPrice: 660, // €55/month = €660/year
    originalPrice: 780,
    discount: 15,
    discountText: '15% OFF',
    period: 'year',
  },
  AE: {
    countryCode: 'AE',
    countryName: 'UAE',
    currency: 'AED',
    currencySymbol: 'AED',
    yearlyPrice: 2640, // AED 220/month = AED 2640/year
    originalPrice: 3105,
    discount: 15,
    discountText: '15% OFF',
    period: 'year',
  },
  SG: {
    countryCode: 'SG',
    countryName: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    yearlyPrice: 960, // S$80/month = S$960/year
    originalPrice: 1128,
    discount: 15,
    discountText: '15% OFF',
    period: 'year',
  },
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


