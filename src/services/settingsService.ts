import { SystemSettings, CompanySettings, InvoiceSettings, TaxSettings, GeneralSettings } from '../types/settings'
import { getById, put, STORES } from '../database/db'

const SETTINGS_KEY = 'main'

const defaultSettings: SystemSettings = {
  company: {
    company_name: 'HisabKitab',
    company_address: '',
    company_city: '',
    company_state: '',
    company_pincode: '',
    company_country: 'India',
    company_phone: '',
    company_email: '',
    company_website: '',
    company_gstin: '',
    company_pan: '',
    company_logo: '',
  },
  invoice: {
    invoice_prefix: 'INV',
    invoice_number_format: 'INV-{YYYY}-{NNNN}',
    invoice_footer_text: 'Thank you for your business!',
    invoice_terms_and_conditions: '',
    show_tax_breakdown: true,
    show_payment_instructions: false,
    payment_instructions_text: '',
    invoice_template: 'standard',
  },
  tax: {
    default_gst_rate: 18,
    default_tax_type: 'exclusive',
    enable_cgst_sgst: false,
    default_cgst_rate: 9,
    default_sgst_rate: 9,
    default_igst_rate: 18,
    tax_exempt_categories: [],
  },
  general: {
    currency_symbol: '₹',
    currency_code: 'INR',
    date_format: 'DD-MMM-YYYY',
    time_format: '12h',
    default_unit: 'pcs',
    low_stock_threshold_percentage: 20,
    auto_archive_products_after_sale: true,
    enable_barcode_generation: true,
    default_barcode_format: 'EAN13',
  },
}

interface SettingsRecord {
  key: string
  settings: SystemSettings
}

async function getSettingsRecord(): Promise<SettingsRecord> {
  try {
    const record = await getById<SettingsRecord>(STORES.SETTINGS, SETTINGS_KEY)
    if (record) {
      return record
    }
  } catch (error) {
    console.error('Error getting settings record:', error)
  }
  // Return default if not found or on error
  return {
    key: SETTINGS_KEY,
    settings: defaultSettings,
  }
}

export const settingsService = {
  // Get all settings
  getAll: async (): Promise<SystemSettings> => {
    try {
      const record = await getSettingsRecord()
      const stored = record.settings
      if (stored) {
        // Merge with defaults to ensure all fields exist
        return {
          company: { ...defaultSettings.company, ...stored.company },
          invoice: { ...defaultSettings.invoice, ...stored.invoice },
          tax: { ...defaultSettings.tax, ...stored.tax },
          general: { ...defaultSettings.general, ...stored.general },
          updated_at: stored.updated_at,
          updated_by: stored.updated_by,
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
    return defaultSettings
  },

  // Get company settings
  getCompany: async (): Promise<CompanySettings> => {
    const settings = await settingsService.getAll()
    return settings.company
  },

  // Get invoice settings (optionally for a specific company)
  getInvoice: async (companyId?: number): Promise<InvoiceSettings> => {
    if (companyId) {
      // Get company-specific settings
      const key = `company_${companyId}_invoice`
      const record = await getById<SettingsRecord>(STORES.SETTINGS, key)
      if (record?.settings?.invoice) {
        return { ...defaultSettings.invoice, ...record.settings.invoice }
      }
    }
    // Fall back to main settings
    const settings = await settingsService.getAll()
    return settings.invoice
  },

  // Get tax settings (optionally for a specific company)
  getTax: async (companyId?: number): Promise<TaxSettings> => {
    if (companyId) {
      // Get company-specific settings
      const key = `company_${companyId}_tax`
      const record = await getById<SettingsRecord>(STORES.SETTINGS, key)
      if (record?.settings?.tax) {
        return { ...defaultSettings.tax, ...record.settings.tax }
      }
    }
    // Fall back to main settings
    const settings = await settingsService.getAll()
    return settings.tax
  },

  // Get general settings (optionally for a specific company)
  getGeneral: async (companyId?: number): Promise<GeneralSettings> => {
    if (companyId) {
      // Get company-specific settings
      const key = `company_${companyId}_general`
      const record = await getById<SettingsRecord>(STORES.SETTINGS, key)
      if (record?.settings?.general) {
        return { ...defaultSettings.general, ...record.settings.general }
      }
    }
    // Fall back to main settings
    const settings = await settingsService.getAll()
    return settings.general
  },

  // Update company settings
  updateCompany: async (company: Partial<CompanySettings>, userId?: number): Promise<CompanySettings> => {
    const settings = await settingsService.getAll()
    settings.company = { ...settings.company, ...company }
    settings.updated_at = new Date().toISOString()
    settings.updated_by = userId
    await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings })
    return settings.company
  },

  // Update invoice settings (optionally for a specific company)
  updateInvoice: async (invoice: Partial<InvoiceSettings>, userId?: number, companyId?: number): Promise<InvoiceSettings> => {
    if (companyId) {
      // Store company-specific invoice settings
      const key = `company_${companyId}_invoice`
      const existing = await getById<SettingsRecord>(STORES.SETTINGS, key)
      const updatedInvoice = existing?.settings?.invoice 
        ? { ...existing.settings.invoice, ...invoice }
        : { ...defaultSettings.invoice, ...invoice }
      
      await put(STORES.SETTINGS, {
        key,
        settings: {
          invoice: updatedInvoice,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
      })
      return updatedInvoice as InvoiceSettings
    } else {
      // Update main settings
      const settings = await settingsService.getAll()
      settings.invoice = { ...settings.invoice, ...invoice }
      settings.updated_at = new Date().toISOString()
      settings.updated_by = userId
      await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings })
      return settings.invoice
    }
  },

  // Update tax settings (optionally for a specific company)
  updateTax: async (tax: Partial<TaxSettings>, userId?: number, companyId?: number): Promise<TaxSettings> => {
    if (companyId) {
      // Store company-specific tax settings
      const key = `company_${companyId}_tax`
      const existing = await getById<SettingsRecord>(STORES.SETTINGS, key)
      const updatedTax = existing?.settings?.tax
        ? { ...existing.settings.tax, ...tax }
        : { ...defaultSettings.tax, ...tax }
      
      await put(STORES.SETTINGS, {
        key,
        settings: {
          tax: updatedTax,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
      })
      return updatedTax as TaxSettings
    } else {
      // Update main settings
      const settings = await settingsService.getAll()
      settings.tax = { ...settings.tax, ...tax }
      settings.updated_at = new Date().toISOString()
      settings.updated_by = userId
      await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings })
      return settings.tax
    }
  },

  // Update general settings (optionally for a specific company)
  updateGeneral: async (general: Partial<GeneralSettings>, userId?: number, companyId?: number): Promise<GeneralSettings> => {
    if (companyId) {
      // Store company-specific general settings
      const key = `company_${companyId}_general`
      const existing = await getById<SettingsRecord>(STORES.SETTINGS, key)
      const updatedGeneral = existing?.settings?.general
        ? { ...existing.settings.general, ...general }
        : { ...defaultSettings.general, ...general }
      
      await put(STORES.SETTINGS, {
        key,
        settings: {
          general: updatedGeneral,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
      })
      return updatedGeneral as GeneralSettings
    } else {
      // Update main settings
      const settings = await settingsService.getAll()
      settings.general = { ...settings.general, ...general }
      settings.updated_at = new Date().toISOString()
      settings.updated_by = userId
      await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings })
      return settings.general
    }
  },

  // Update all settings
  updateAll: async (newSettings: Partial<SystemSettings>, userId?: number): Promise<SystemSettings> => {
    const current = await settingsService.getAll()
    const updated: SystemSettings = {
      company: newSettings.company ? { ...current.company, ...newSettings.company } : current.company,
      invoice: newSettings.invoice ? { ...current.invoice, ...newSettings.invoice } : current.invoice,
      tax: newSettings.tax ? { ...current.tax, ...newSettings.tax } : current.tax,
      general: newSettings.general ? { ...current.general, ...newSettings.general } : current.general,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }
    await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings: updated })
    return updated
  },

  // Reset to defaults
  resetToDefaults: async (userId?: number): Promise<SystemSettings> => {
    const reset: SystemSettings = {
      ...defaultSettings,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }
    await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings: reset })
    return reset
  },

  // Export settings
  export: async (): Promise<string> => {
    const settings = await settingsService.getAll()
    return JSON.stringify(settings, null, 2)
  },

  // Import settings
  import: async (jsonString: string, userId?: number): Promise<SystemSettings> => {
    try {
      const imported = JSON.parse(jsonString)
      const merged = {
        company: { ...defaultSettings.company, ...imported.company },
        invoice: { ...defaultSettings.invoice, ...imported.invoice },
        tax: { ...defaultSettings.tax, ...imported.tax },
        general: { ...defaultSettings.general, ...imported.general },
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }
      await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings: merged })
      return merged
    } catch (error) {
      throw new Error('Invalid settings format')
    }
  },
}
