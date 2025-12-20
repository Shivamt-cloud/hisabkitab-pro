// License Validation Utility
import { settingsService } from '../services/settingsService'

export interface LicenseStatus {
  isValid: boolean
  isExpired: boolean
  daysRemaining: number
  validFrom: string | null
  validTo: string | null
  message: string
}

/**
 * Check if the license is valid
 */
export async function checkLicenseValidity(): Promise<LicenseStatus> {
  try {
    const companySettings = await settingsService.getCompany()
    
    // If no validity dates set, license is valid (unrestricted)
    if (!companySettings.valid_from || !companySettings.valid_to) {
      return {
        isValid: true,
        isExpired: false,
        daysRemaining: Infinity,
        validFrom: companySettings.valid_from || null,
        validTo: companySettings.valid_to || null,
        message: 'License validity not set',
      }
    }

    const now = new Date()
    const validFrom = new Date(companySettings.valid_from)
    const validTo = new Date(companySettings.valid_to)
    
    // Set time to start of day for accurate comparison
    now.setHours(0, 0, 0, 0)
    validFrom.setHours(0, 0, 0, 0)
    validTo.setHours(23, 59, 59, 999)

    // Check if license has started
    if (now < validFrom) {
      const daysUntil = Math.ceil((validFrom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        isValid: false,
        isExpired: false,
        daysRemaining: daysUntil,
        validFrom: companySettings.valid_from,
        validTo: companySettings.valid_to,
        message: `License not yet active. Valid from ${validFrom.toLocaleDateString()}`,
      }
    }

    // Check if license has expired
    if (now > validTo) {
      const daysExpired = Math.ceil((now.getTime() - validTo.getTime()) / (1000 * 60 * 60 * 24))
      return {
        isValid: false,
        isExpired: true,
        daysRemaining: -daysExpired,
        validFrom: companySettings.valid_from,
        validTo: companySettings.valid_to,
        message: `License expired ${daysExpired} day(s) ago on ${validTo.toLocaleDateString()}`,
      }
    }

    // License is valid - calculate days remaining
    const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      isValid: true,
      isExpired: false,
      daysRemaining,
      validFrom: companySettings.valid_from,
      validTo: companySettings.valid_to,
      message: daysRemaining <= 30 
        ? `License expires in ${daysRemaining} day(s)` 
        : `License valid until ${validTo.toLocaleDateString()}`,
    }
  } catch (error) {
    console.error('Error checking license validity:', error)
    // On error, allow access (fail open)
    return {
      isValid: true,
      isExpired: false,
      daysRemaining: Infinity,
      validFrom: null,
      validTo: null,
      message: 'Unable to verify license',
    }
  }
}


