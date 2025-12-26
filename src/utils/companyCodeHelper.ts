/**
 * Company Code Helper Functions
 * Utilities for generating formatted identifiers using company codes
 */

/**
 * Get company code by company ID
 */
export async function getCompanyCodeById(companyId: number | undefined | null): Promise<string | null> {
  if (!companyId) return null
  const { companyService } = await import('../services/companyService')
  return await companyService.getCompanyCode(companyId)
}

/**
 * Generate invoice number with company code
 * Format: {COMP_CODE}-INV-{YYYY}-{NNNN}
 */
export async function generateInvoiceNumber(
  companyId: number | undefined | null,
  existingInvoiceNumbers: string[] = []
): Promise<string> {
  const companyCode = await getCompanyCodeById(companyId)
  const prefix = companyCode ? `${companyCode}-INV` : 'INV'
  const year = new Date().getFullYear()
  
  // Find next sequential number for this year and company
  const yearPrefix = `${prefix}-${year}-`
  const existingNumbers = existingInvoiceNumbers
    .filter(inv => inv.startsWith(yearPrefix))
    .map(inv => {
      const parts = inv.split('-')
      const numPart = parts[parts.length - 1]
      return parseInt(numPart) || 0
    })
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${yearPrefix}${String(nextNumber).padStart(4, '0')}`
}

/**
 * Generate purchase invoice number with company code
 * Format: {COMP_CODE}-PUR-{YYYY}-{NNNN}
 */
export async function generatePurchaseInvoiceNumber(
  companyId: number | undefined | null,
  existingInvoiceNumbers: string[] = []
): Promise<string> {
  const companyCode = await getCompanyCodeById(companyId)
  const prefix = companyCode ? `${companyCode}-PUR` : 'PUR'
  const year = new Date().getFullYear()
  
  // Find next sequential number for this year and company
  const yearPrefix = `${prefix}-${year}-`
  const existingNumbers = existingInvoiceNumbers
    .filter(inv => inv.startsWith(yearPrefix))
    .map(inv => {
      const parts = inv.split('-')
      const numPart = parts[parts.length - 1]
      return parseInt(numPart) || 0
    })
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${yearPrefix}${String(nextNumber).padStart(4, '0')}`
}

/**
 * Generate product SKU with company code
 * Format: {COMP_CODE}-PROD-{NNNN} or {COMP_CODE}-{CUSTOM_SKU}
 */
export async function generateProductSKU(
  companyId: number | undefined | null,
  customSku?: string,
  existingSkus: string[] = []
): Promise<string> {
  const companyCode = await getCompanyCodeById(companyId)
  
  if (customSku && customSku.trim()) {
    // Use custom SKU with company code prefix
    const customSkuFormatted = customSku.trim().toUpperCase()
    return companyCode ? `${companyCode}-${customSkuFormatted}` : customSkuFormatted
  }
  
  // Auto-generate: {COMP_CODE}-PROD-{NNNN}
  const prefix = companyCode ? `${companyCode}-PROD-` : 'PROD-'
  const existingNumbers = existingSkus
    .filter(sku => sku.startsWith(prefix))
    .map(sku => {
      const numPart = sku.replace(prefix, '')
      return parseInt(numPart) || 0
    })
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${prefix}${String(nextNumber).padStart(4, '0')}`
}

/**
 * Format username with company code
 * Format: {username}@{company_code}
 */
export async function formatUsernameWithCompanyCode(
  username: string,
  companyId: number | undefined | null
): Promise<string> {
  const companyCode = await getCompanyCodeById(companyId)
  if (!companyCode) return username
  return `${username}@${companyCode}`
}

/**
 * Generate customer code with company code
 * Format: {COMP_CODE}-CUST-{NNNN}
 */
export async function generateCustomerCode(
  companyId: number | undefined | null,
  existingCodes: string[] = []
): Promise<string> {
  const companyCode = await getCompanyCodeById(companyId)
  const prefix = companyCode ? `${companyCode}-CUST-` : 'CUST-'
  
  const existingNumbers = existingCodes
    .filter(code => code.startsWith(prefix))
    .map(code => {
      const numPart = code.replace(prefix, '')
      return parseInt(numPart) || 0
    })
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${prefix}${String(nextNumber).padStart(4, '0')}`
}

/**
 * Generate supplier code with company code
 * Format: {COMP_CODE}-SUP-{NNNN}
 */
export async function generateSupplierCode(
  companyId: number | undefined | null,
  existingCodes: string[] = []
): Promise<string> {
  const companyCode = await getCompanyCodeById(companyId)
  const prefix = companyCode ? `${companyCode}-SUP-` : 'SUP-'
  
  const existingNumbers = existingCodes
    .filter(code => code.startsWith(prefix))
    .map(code => {
      const numPart = code.replace(prefix, '')
      return parseInt(numPart) || 0
    })
  
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
  return `${prefix}${String(nextNumber).padStart(4, '0')}`
}



