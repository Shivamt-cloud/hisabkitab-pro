import { SystemSettings, CompanySettings, InvoiceSettings, TaxSettings, GeneralSettings, ReceiptPrinterSettings, BarcodeLabelSettings } from '../types/settings'
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
    invoice_template: 'detailed',
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
    sales_target_daily: undefined,
    sales_target_monthly: undefined,
  },
  barcode_label: {
    label_size: 'standard', // 1.46" x 1.02"
    custom_width: 1.46,
    custom_height: 1.02,
    print_layout: 'single', // single or double
    show_product_name: true,
    show_article_code: true,
    show_barcode: true,
    show_purchase_price: false,
    show_mrp: true,
    show_sale_price: true,
    show_size: true,
    show_color: true,
    show_purchase_date: false,
    show_company_name: true,
    product_name_font_size: 10,
    barcode_font_size: 8,
    detail_font_size: 8,
    barcode_height: 40, // mm
    barcode_width: 0, // 0 = auto
    show_barcode_text: true,
    printer_type: 'GENERIC',
    printer_device_name: '',
    silent_print: false,
  },
  receipt_printer: {
    paper_width_mm: 80,
    printer_type: 'GENERIC',
    printer_device_name: '',
    silent_print: false,
    show_company_name: true,
    show_company_address: true,
    show_company_phone: true,
    show_company_gstin: true,
    show_invoice_number: true,
    show_date: true,
    show_time: true,
    show_payment_status: true,
    show_customer_name: true,
    show_customer_phone: true,
    show_customer_gstin: true,
    show_items: true,
    show_item_discount: true,
    show_item_mrp: true,
    show_subtotal: true,
    show_discount: true,
    show_tax: true,
    show_credit_applied: true,
    show_return_amount: true,
    show_credit_balance: true,
    show_footer: true,
    whatsapp_number: '',
    instagram_handle: '',
    facebook_page: '',
    custom_footer_line: '',
  },
}

interface SettingsRecord {
  key: string
  settings: SystemSettings
}

let settingsRecordCache: SettingsRecord | null = null
const SETTINGS_CACHE_KEY = SETTINGS_KEY

function invalidateSettingsCache(): void {
  settingsRecordCache = null
}

async function getSettingsRecord(): Promise<SettingsRecord> {
  if (settingsRecordCache) {
    return settingsRecordCache
  }
  try {
    const raw = await getById<Record<string, unknown>>(STORES.SETTINGS, SETTINGS_CACHE_KEY)
    if (raw && typeof raw === 'object') {
      // Support both nested { key, settings } and flat { key, company, invoice, barcode_label, ... } (e.g. from migration)
      const normalized: SettingsRecord =
        raw.settings != null && typeof raw.settings === 'object'
          ? { key: SETTINGS_KEY, settings: raw.settings as SystemSettings }
          : {
              key: SETTINGS_KEY,
              settings: {
                company: { ...defaultSettings.company, ...(raw.company as object) },
                invoice: { ...defaultSettings.invoice, ...(raw.invoice as object) },
                tax: { ...defaultSettings.tax, ...(raw.tax as object) },
                general: { ...defaultSettings.general, ...(raw.general as object) },
                barcode_label: raw.barcode_label
                  ? { ...defaultSettings.barcode_label!, ...(raw.barcode_label as object) }
                  : defaultSettings.barcode_label,
                receipt_printer: raw.receipt_printer
                  ? { ...defaultSettings.receipt_printer!, ...(raw.receipt_printer as object) }
                  : defaultSettings.receipt_printer,
                updated_at: raw.updated_at as string | undefined,
                updated_by: raw.updated_by as number | undefined,
              },
            }
      settingsRecordCache = normalized
      return normalized
    }
  } catch (error) {
    console.error('Error getting settings record:', error)
  }
  const fallback: SettingsRecord = { key: SETTINGS_KEY, settings: defaultSettings }
  return fallback
}

export const settingsService = {
  // Get all settings
  getAll: async (): Promise<SystemSettings> => {
    try {
      const record = await getSettingsRecord()
      const stored = record.settings
      if (stored) {
        // Merge with defaults to ensure all fields exist
        const invoice = { ...defaultSettings.invoice, ...stored.invoice }
        // Normalize legacy invoice_template values for new layout options
        const legacyTemplate = (invoice as any).invoice_template as string | undefined
        if (legacyTemplate === 'standard') invoice.invoice_template = 'detailed'
        else if (legacyTemplate === 'minimal') invoice.invoice_template = 'compact'
        return {
          company: { ...defaultSettings.company, ...stored.company },
          invoice,
          tax: { ...defaultSettings.tax, ...stored.tax },
          general: { ...defaultSettings.general, ...stored.general },
          barcode_label: stored.barcode_label ? { ...defaultSettings.barcode_label!, ...stored.barcode_label } : defaultSettings.barcode_label,
          receipt_printer: stored.receipt_printer
            ? { ...defaultSettings.receipt_printer!, ...stored.receipt_printer }
            : defaultSettings.receipt_printer,
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
    invalidateSettingsCache()
    const current = await settingsService.getAll()
    const updated: SystemSettings = {
      company: newSettings.company ? { ...current.company, ...newSettings.company } : current.company,
      invoice: newSettings.invoice ? { ...current.invoice, ...newSettings.invoice } : current.invoice,
      tax: newSettings.tax ? { ...current.tax, ...newSettings.tax } : current.tax,
      general: newSettings.general ? { ...current.general, ...newSettings.general } : current.general,
      barcode_label: newSettings.barcode_label ? { ...(current.barcode_label || defaultSettings.barcode_label!), ...newSettings.barcode_label } : current.barcode_label,
      receipt_printer: newSettings.receipt_printer
        ? { ...(current.receipt_printer || defaultSettings.receipt_printer!), ...newSettings.receipt_printer }
        : current.receipt_printer,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }
    await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings: updated })
    settingsRecordCache = { key: SETTINGS_KEY, settings: updated }
    return updated
  },

  // Alias for updateAll (for convenience)
  update: async (newSettings: Partial<SystemSettings>, userId?: number): Promise<SystemSettings> => {
    return await settingsService.updateAll(newSettings, userId)
  },

  // Update only barcode_label; use full current settings so we never overwrite with partial (fixes flat vs nested record)
  updateBarcodeLabel: async (barcodeLabel: BarcodeLabelSettings, userId?: number): Promise<SystemSettings> => {
    invalidateSettingsCache()
    const current = await settingsService.getAll()
    const updated: SystemSettings = {
      ...current,
      barcode_label: { ...(defaultSettings.barcode_label!), ...current.barcode_label, ...barcodeLabel },
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }
    await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings: updated })
    settingsRecordCache = { key: SETTINGS_KEY, settings: updated }
    return updated
  },

  // Reset to defaults
  resetToDefaults: async (userId?: number): Promise<SystemSettings> => {
    invalidateSettingsCache()
    const reset: SystemSettings = {
      ...defaultSettings,
      barcode_label: defaultSettings.barcode_label,
      receipt_printer: defaultSettings.receipt_printer,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }
    await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings: reset })
    settingsRecordCache = { key: SETTINGS_KEY, settings: reset }
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
      invalidateSettingsCache()
      const imported = JSON.parse(jsonString)
      const merged = {
        company: { ...defaultSettings.company, ...imported.company },
        invoice: { ...defaultSettings.invoice, ...imported.invoice },
        tax: { ...defaultSettings.tax, ...imported.tax },
        general: { ...defaultSettings.general, ...imported.general },
        barcode_label: imported.barcode_label ? { ...defaultSettings.barcode_label, ...imported.barcode_label } : defaultSettings.barcode_label,
        receipt_printer: imported.receipt_printer
          ? { ...defaultSettings.receipt_printer!, ...imported.receipt_printer as ReceiptPrinterSettings }
          : defaultSettings.receipt_printer,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }
      await put(STORES.SETTINGS, { key: SETTINGS_KEY, settings: merged })
      settingsRecordCache = { key: SETTINGS_KEY, settings: merged }
      return merged
    } catch (error) {
      throw new Error('Invalid settings format')
    }
  },
}
