/**
 * GST & Tax Calculation Utilities
 * Handles tax calculations for products
 */

export interface TaxBreakdown {
  basePrice: number
  gstRate: number
  gstAmount: number
  cgstRate?: number
  cgstAmount?: number
  sgstRate?: number
  sgstAmount?: number
  igstRate?: number
  igstAmount?: number
  totalPrice: number
  taxType: 'inclusive' | 'exclusive'
}

/**
 * Calculate tax breakdown for a product
 */
export function calculateTax(
  price: number,
  gstRate: number,
  taxType: 'inclusive' | 'exclusive',
  options?: {
    cgstRate?: number
    sgstRate?: number
    igstRate?: number
  }
): TaxBreakdown {
  if (taxType === 'inclusive') {
    // GST is already included in price
    const basePrice = (price * 100) / (100 + gstRate)
    const gstAmount = price - basePrice

    // Split GST (CGST + SGST) - for intrastate
    if (options?.cgstRate && options?.sgstRate) {
      const cgstAmount = (basePrice * options.cgstRate) / 100
      const sgstAmount = (basePrice * options.sgstRate) / 100
      return {
        basePrice,
        gstRate,
        gstAmount,
        cgstRate: options.cgstRate,
        cgstAmount,
        sgstRate: options.sgstRate,
        sgstAmount,
        totalPrice: price,
        taxType: 'inclusive',
      }
    }

    // IGST - for interstate
    if (options?.igstRate) {
      const igstAmount = (basePrice * options.igstRate) / 100
      return {
        basePrice,
        gstRate,
        gstAmount,
        igstRate: options.igstRate,
        igstAmount,
        totalPrice: price,
        taxType: 'inclusive',
      }
    }

    return {
      basePrice,
      gstRate,
      gstAmount,
      totalPrice: price,
      taxType: 'inclusive',
    }
  } else {
    // GST is exclusive - added on top of price
    const basePrice = price
    const gstAmount = (basePrice * gstRate) / 100
    const totalPrice = basePrice + gstAmount

    // Split GST
    if (options?.cgstRate && options?.sgstRate) {
      const cgstAmount = (basePrice * options.cgstRate) / 100
      const sgstAmount = (basePrice * options.sgstRate) / 100
      return {
        basePrice,
        gstRate,
        gstAmount,
        cgstRate: options.cgstRate,
        cgstAmount,
        sgstRate: options.sgstRate,
        sgstAmount,
        totalPrice,
        taxType: 'exclusive',
      }
    }

    // IGST
    if (options?.igstRate) {
      const igstAmount = (basePrice * options.igstRate) / 100
      return {
        basePrice,
        gstRate,
        gstAmount,
        igstRate: options.igstRate,
        igstAmount,
        totalPrice,
        taxType: 'exclusive',
      }
    }

    return {
      basePrice,
      gstRate,
      gstAmount,
      totalPrice,
      taxType: 'exclusive',
    }
  }
}

/**
 * Common GST rates in India
 */
export const GST_RATES = [
  { value: 0, label: '0% - Exempt' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
]

/**
 * Get split GST rates (CGST + SGST = GST)
 */
export function getSplitGSTRates(gstRate: number): { cgst: number; sgst: number } {
  return {
    cgst: gstRate / 2,
    sgst: gstRate / 2,
  }
}

/**
 * Validate HSN code format (4, 6, or 8 digits)
 */
export function validateHSNCode(hsn: string): { valid: boolean; message?: string } {
  if (!hsn) return { valid: true } // Optional field

  const hsnRegex = /^\d{4,8}$/
  if (!hsnRegex.test(hsn)) {
    return { valid: false, message: 'HSN code must be 4, 6, or 8 digits' }
  }

  return { valid: true }
}

