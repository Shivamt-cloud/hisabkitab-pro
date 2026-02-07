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
  valid_from?: string // License validity start date (ISO format)
  valid_to?: string // License validity end date (ISO format)
}

export interface InvoiceSettings {
  invoice_prefix: string // e.g., "INV"
  invoice_number_format: string // e.g., "INV-{YYYY}-{NNNN}"
  invoice_footer_text?: string
  invoice_terms_and_conditions?: string
  show_tax_breakdown: boolean
  show_payment_instructions: boolean
  payment_instructions_text?: string
  /** compact = minimal layout; detailed = full layout; with_logo = detailed + prominent company logo */
  invoice_template: 'compact' | 'detailed' | 'with_logo'
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
  /** Optional daily sales target (₹) – shown on dashboard as progress */
  sales_target_daily?: number
  /** Optional monthly sales target (₹) – shown on dashboard as progress */
  sales_target_monthly?: number
}

export interface BarcodeLabelSettings {
  // Label size
  label_size: 'standard' | '4x6' | 'a4' | 'custom' // standard = 1.46" x 1.02"
  custom_width: number // in inches (for custom size)
  custom_height: number // in inches (for custom size)
  
  // Print layout
  print_layout: 'single' | 'double' // Single barcode per page or 2 side by side
  
  // Fields to display on label
  show_product_name: boolean
  show_article_code: boolean
  show_barcode: boolean
  show_purchase_price: boolean
  show_mrp: boolean
  show_sale_price: boolean
  show_size: boolean
  show_color: boolean
  show_purchase_date: boolean
  show_company_name: boolean
  
  // Font sizes
  product_name_font_size: number // in points
  barcode_font_size: number // in points
  detail_font_size: number // in points
  
  // Barcode settings
  barcode_height: number // in mm
  barcode_width: number // in mm (0 = auto)
  show_barcode_text: boolean // Show barcode number below barcode

  // Printer preferences (Electron)
  // Generic: use browser/OS print dialog
  // TSC_TSPL: optimized defaults for TSC/TE244 class printers (still via OS driver unless direct TSPL added)
  printer_type?: 'GENERIC' | 'TSC_TSPL' | 'ZEBRA_ZPL'
  printer_device_name?: string // OS printer name (Electron deviceName)
  silent_print?: boolean // attempt silent print (Electron only)
}

export interface ReceiptPrinterSettings {
  // Target paper width in millimeters (common: 58mm, 80mm)
  paper_width_mm: 58 | 80
  // Printer type / language family (for future specialization)
  printer_type?: 'GENERIC' | 'ESC_POS' | 'STAR'
  // OS printer name (Electron deviceName)
  printer_device_name?: string
  // Attempt silent print via Electron where supported
  silent_print?: boolean

  // Fields to display
  show_company_name?: boolean
  show_company_address?: boolean
  show_company_phone?: boolean
  show_company_email?: boolean
  show_company_gstin?: boolean

  show_invoice_number?: boolean
  show_date?: boolean
  show_time?: boolean
  show_payment_status?: boolean

  show_customer_name?: boolean
  show_customer_phone?: boolean
  show_customer_address?: boolean
  show_customer_gstin?: boolean
  show_sales_person?: boolean
  show_notes?: boolean

  show_items?: boolean
  show_item_discount?: boolean
  show_item_mrp?: boolean

  show_subtotal?: boolean
  show_discount?: boolean
  show_tax?: boolean
  show_credit_applied?: boolean
  show_return_amount?: boolean
  show_credit_balance?: boolean

  show_footer?: boolean

  // Social / contact footer
  whatsapp_number?: string
  instagram_handle?: string
  facebook_page?: string
  custom_footer_line?: string
}

export interface SystemSettings {
  company: CompanySettings
  invoice: InvoiceSettings
  tax: TaxSettings
  general: GeneralSettings
  barcode_label?: BarcodeLabelSettings
  receipt_printer?: ReceiptPrinterSettings
  updated_at?: string
  updated_by?: number
}

