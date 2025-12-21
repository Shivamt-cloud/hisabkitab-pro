/**
 * Barcode Generation Utilities
 * Provides multiple barcode generation strategies
 * All formats are designed to be scannable by standard barcode readers
 */

export type BarcodeFormat = 'EAN13' | 'CODE128' | 'UPC_A' | 'CODE39' | 'CUSTOM'

export interface BarcodeOptions {
  format: BarcodeFormat
  prefix?: string
  sku?: string
  categoryId?: number
  categoryName?: string
  length?: number
}

/**
 * Generate barcode based on selected format
 * All formats returned are scannable by standard barcode scanners
 */
export function generateBarcode(options: BarcodeOptions): string {
  switch (options.format) {
    case 'EAN13':
      return generateEAN13Barcode(options)
    case 'CODE128':
      return generateCode128Barcode(options)
    case 'UPC_A':
      return generateUPCABarcode(options)
    case 'CODE39':
      return generateCode39Barcode(options)
    case 'CUSTOM':
      return generateCustomBarcode(options)
    default:
      return generateEAN13Barcode(options) // Default to EAN-13 (most widely supported)
  }
}

/**
 * Generate EAN-13 format barcode (13 digits)
 * Format: Country Code (3 digits) + Product Code (9 digits) + Check Digit (1 digit)
 * Country Code 890 = India
 * This is the MOST COMMON and HIGHLY SCANNABLE format for retail products
 */
function generateEAN13Barcode(options: BarcodeOptions): string {
  // Ensure 3-digit country code (India = 890)
  let countryCode = (options.prefix || '890').toString()
  if (countryCode.length !== 3) {
    // If prefix is not 3 digits, use India code or pad/trim to 3 digits
    if (countryCode.length > 3) {
      countryCode = countryCode.slice(0, 3)
    } else {
      countryCode = countryCode.padStart(3, '0').slice(0, 3)
    }
  }
  // Default to India if invalid
  if (!/^\d{3}$/.test(countryCode)) {
    countryCode = '890'
  }
  
  // Generate 9-digit product code (ensuring uniqueness)
  const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const productCode = `${timestamp}${random}`.padStart(9, '0').slice(0, 9)
  
  const codeWithoutCheck = `${countryCode}${productCode}` // Should be exactly 12 digits
  const checkDigit = calculateEAN13CheckDigit(codeWithoutCheck)
  
  return `${codeWithoutCheck}${checkDigit}` // Final 13 digits
}

/**
 * Calculate EAN-13 check digit (Luhn-like algorithm)
 * This ensures the barcode is valid and scannable
 */
function calculateEAN13CheckDigit(code: string): number {
  let sum = 0
  for (let i = 0; i < code.length; i++) {
    const digit = parseInt(code[i])
    // Multiply odd positions (1-indexed) by 1, even by 3
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  const remainder = sum % 10
  return remainder === 0 ? 0 : 10 - remainder
}

/**
 * Generate Code 128 format barcode
 * Format: Alphanumeric, up to 48 characters
 * Highly scannable, supports letters and numbers
 * Best for: Internal tracking, warehouse management
 */
function generateCode128Barcode(options: BarcodeOptions): string {
  const prefix = options.prefix || 'PROD'
  
  // Generate numeric suffix (Code 128 works with numbers better for scanning)
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  // Code 128 format: prefix + 12 digits (optimal length for scanning)
  return `${prefix}${timestamp}${random}`.toUpperCase().slice(0, 16)
}

/**
 * Generate UPC-A format barcode (12 digits)
 * Format: Number System (1) + Manufacturer (5) + Product (5) + Check Digit (1)
 * Widely used in North America, very scannable
 */
function generateUPCABarcode(_options: BarcodeOptions): string {
  // Number system digit (0 = standard)
  const numberSystem = '0'
  
  // Generate manufacturer code (5 digits)
  const manufacturerCode = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  
  // Generate product code (5 digits)
  const timestamp = Date.now().toString().slice(-5)
  const productCode = timestamp.padStart(5, '0')
  
  const codeWithoutCheck = `${numberSystem}${manufacturerCode}${productCode}`
  const checkDigit = calculateUPCCheckDigit(codeWithoutCheck)
  
  return `${codeWithoutCheck}${checkDigit}`
}

/**
 * Calculate UPC-A check digit
 */
function calculateUPCCheckDigit(code: string): number {
  let sum = 0
  for (let i = 0; i < code.length; i++) {
    const digit = parseInt(code[i])
    sum += digit * (i % 2 === 0 ? 3 : 1)
  }
  const remainder = sum % 10
  return remainder === 0 ? 0 : 10 - remainder
}

/**
 * Generate Code 39 format barcode
 * Format: Alphanumeric, starts and ends with *
 * Widely supported but less dense than Code 128
 */
function generateCode39Barcode(options: BarcodeOptions): string {
  const prefix = options.prefix || 'PROD'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  // Code 39 format (uppercase letters and numbers only for better scanning)
  const code = `${prefix}${timestamp}${random}`.toUpperCase().slice(0, 12)
  return `*${code}*` // Code 39 requires asterisks as start/stop characters
}

/**
 * Generate custom numeric barcode (scannable format)
 * 12-14 digits numeric barcode (scannable by most readers)
 */
function generateCustomBarcode(options: BarcodeOptions): string {
  const prefix = options.prefix ? parseInt(options.prefix).toString().slice(0, 3) : '100'
  
  // Generate timestamp-based number
  const timestamp = Date.now().toString().slice(-9)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  // Create 12-digit barcode (optimal for scanning)
  const barcode = `${prefix}${timestamp}${random}`.slice(0, 12)
  
  return barcode.padStart(12, '0') // Ensure 12 digits
}

/**
 * Validate barcode format for scanning compatibility
 */
export function validateBarcode(barcode: string): { valid: boolean; message?: string; scannable?: boolean } {
  if (!barcode || barcode.trim() === '') {
    return { valid: false, message: 'Barcode cannot be empty', scannable: false }
  }

  const cleanBarcode = barcode.trim()

  // Check for EAN-13 (13 digits)
  if (/^\d{13}$/.test(cleanBarcode)) {
    const checkDigit = calculateEAN13CheckDigit(cleanBarcode.slice(0, 12))
    if (checkDigit === parseInt(cleanBarcode[12])) {
      return { valid: true, scannable: true }
    } else {
      return { valid: false, message: 'Invalid EAN-13 check digit', scannable: false }
    }
  }

  // Check for UPC-A (12 digits)
  if (/^\d{12}$/.test(cleanBarcode)) {
    return { valid: true, scannable: true }
  }

  // Check for Code 128 (alphanumeric, but numeric is more reliable)
  if (/^[A-Z0-9]{8,48}$/.test(cleanBarcode)) {
    return { valid: true, scannable: true }
  }

  // Check for Code 39 (with asterisks)
  if (/^\*[A-Z0-9\s$%+\-./]*\*$/.test(cleanBarcode)) {
    return { valid: true, scannable: true }
  }

  // Check for numeric custom format (12-14 digits)
  if (/^\d{12,14}$/.test(cleanBarcode)) {
    return { valid: true, scannable: true }
  }

  // If it contains letters and special characters, might not be scannable
  if (/[a-z-]/.test(cleanBarcode)) {
    return { 
      valid: true, 
      scannable: false, 
      message: 'Warning: This format may not be scannable by standard barcode readers. Use EAN-13, UPC-A, or Code 128 for best compatibility.' 
    }
  }

  if (cleanBarcode.length < 8) {
    return { valid: false, message: 'Barcode must be at least 8 characters for scanning', scannable: false }
  }

  if (cleanBarcode.length > 48) {
    return { valid: false, message: 'Barcode must be less than 48 characters', scannable: false }
  }

  return { valid: true, scannable: false }
}

/**
 * Check if barcode already exists (should be called from product service)
 */
export function isBarcodeUnique(barcode: string, existingBarcodes: string[]): boolean {
  return !existingBarcodes.includes(barcode)
}

/**
 * Get recommended format based on use case
 */
export function getRecommendedFormat(useCase: 'retail' | 'warehouse' | 'internal'): BarcodeFormat {
  switch (useCase) {
    case 'retail':
      return 'EAN13' // Best for retail products (most widely supported)
    case 'warehouse':
      return 'CODE128' // Good for warehouse/logistics
    case 'internal':
      return 'CUSTOM' // Flexible for internal use
    default:
      return 'EAN13'
  }
}

/**
 * Format descriptions for UI
 */
export const BARCODE_FORMAT_INFO = {
  EAN13: {
    label: 'EAN-13 (Recommended)',
    description: '13-digit barcode, most widely used for retail products. Highly scannable.',
    example: '8901234567890',
    scannable: true
  },
  CODE128: {
    label: 'Code 128',
    description: 'Alphanumeric format, good for warehouse and logistics. Highly scannable.',
    example: 'PROD1234567890',
    scannable: true
  },
  UPC_A: {
    label: 'UPC-A',
    description: '12-digit barcode, common in North America. Highly scannable.',
    example: '012345678905',
    scannable: true
  },
  CODE39: {
    label: 'Code 39',
    description: 'Alphanumeric with asterisks, widely supported. Scannable.',
    example: '*PROD123456*',
    scannable: true
  },
  CUSTOM: {
    label: 'Custom Numeric',
    description: '12-digit numeric barcode. Scannable by most readers.',
    example: '100123456789',
    scannable: true
  }
}
