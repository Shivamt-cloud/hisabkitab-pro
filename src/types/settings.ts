export interface CompanySettings {
  company_name: string
  company_address?: string
  company_city?: string
  company_state?: string
  company_pincode?: string
  company_country?: string
  company_phone?: string
  company_email?: string
  company_website?: string
  company_gstin?: string
  company_pan?: string
  company_logo?: string // URL or base64
}

export interface InvoiceSettings {
  invoice_prefix: string // e.g., "INV"
  invoice_number_format: string // e.g., "INV-{YYYY}-{NNNN}"
  invoice_footer_text?: string
  invoice_terms_and_conditions?: string
  show_tax_breakdown: boolean
  show_payment_instructions: boolean
  payment_instructions_text?: string
  invoice_template: 'standard' | 'detailed' | 'minimal'
}

export interface TaxSettings {
  default_gst_rate: number // Default GST rate (0-100)
  default_tax_type: 'inclusive' | 'exclusive'
  enable_cgst_sgst: boolean // Enable split GST (CGST + SGST)
  default_cgst_rate?: number
  default_sgst_rate?: number
  default_igst_rate?: number
  tax_exempt_categories?: string[] // Category IDs or names that are tax exempt
}

export interface GeneralSettings {
  currency_symbol: string
  currency_code: string
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MMM-YYYY'
  time_format: '12h' | '24h'
  default_unit: string // Default unit for products (e.g., "pcs", "kg")
  low_stock_threshold_percentage: number // Percentage of min_stock_level to show warning
  auto_archive_products_after_sale: boolean
  enable_barcode_generation: boolean
  default_barcode_format: 'EAN13' | 'CODE128' | 'UPCA' | 'CODE39'
}

export interface SystemSettings {
  company: CompanySettings
  invoice: InvoiceSettings
  tax: TaxSettings
  general: GeneralSettings
  updated_at?: string
  updated_by?: number
}

