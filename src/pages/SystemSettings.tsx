import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { settingsService } from '../services/settingsService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { CompanySettings, InvoiceSettings, TaxSettings, GeneralSettings } from '../types/settings'
import { Home, Save, Building2, FileText, Percent, Settings, RotateCcw, Download, Upload } from 'lucide-react'

type SettingsTab = 'company' | 'invoice' | 'tax' | 'general'

const SystemSettings = () => {
  const { hasPermission, user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<SettingsTab>('company')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [company, setCompany] = useState<CompanySettings>({
    company_name: '',
    valid_from: '',
    valid_to: '',
  })
  const [invoice, setInvoice] = useState<InvoiceSettings>({
    invoice_prefix: 'INV',
    invoice_number_format: 'INV-{YYYY}-{NNNN}',
    invoice_footer_text: '',
    invoice_terms_and_conditions: '',
    show_tax_breakdown: true,
    show_payment_instructions: false,
    payment_instructions_text: '',
    invoice_template: 'standard',
  })
  const [tax, setTax] = useState<TaxSettings>({
    default_gst_rate: 18,
    default_tax_type: 'exclusive',
    enable_cgst_sgst: false,
    default_cgst_rate: 9,
    default_sgst_rate: 9,
    default_igst_rate: 18,
    tax_exempt_categories: [],
  })
  const [general, setGeneral] = useState<GeneralSettings>({
    currency_symbol: '₹',
    currency_code: 'INR',
    date_format: 'DD-MMM-YYYY',
    time_format: '12h',
    default_unit: 'pcs',
    low_stock_threshold_percentage: 20,
    auto_archive_products_after_sale: true,
    enable_barcode_generation: true,
    default_barcode_format: 'EAN13',
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [companySettings, invoiceSettings, taxSettings, generalSettings] = await Promise.all([
          settingsService.getCompany(),
          settingsService.getInvoice(),
          settingsService.getTax(),
          settingsService.getGeneral(),
        ])
        setCompany(companySettings)
        setInvoice(invoiceSettings)
        setTax(taxSettings)
        setGeneral(generalSettings)
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  const handleSaveCompany = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Validate validity dates
      if (company.valid_from && company.valid_to) {
        const fromDate = new Date(company.valid_from)
        const toDate = new Date(company.valid_to)
        if (toDate < fromDate) {
          alert('Validity end date must be after start date')
          setLoading(false)
          return
        }
      }
      await settingsService.updateCompany(company, user?.id ? parseInt(user.id) : undefined)
      setSaved(true)
      // Reload company settings after save
      const updatedCompany = await settingsService.getCompany()
      setCompany(updatedCompany)
    } catch (error) {
      alert('Failed to save company settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveInvoice = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      settingsService.updateInvoice(invoice, user?.id ? parseInt(user.id) : undefined)
      setSaved(true)
    } catch (error) {
      alert('Failed to save invoice settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTax = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      settingsService.updateTax(tax, user?.id ? parseInt(user.id) : undefined)
      setSaved(true)
    } catch (error) {
      alert('Failed to save tax settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGeneral = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      settingsService.updateGeneral(general, user?.id ? parseInt(user.id) : undefined)
      setSaved(true)
    } catch (error) {
      alert('Failed to save general settings')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      settingsService.resetToDefaults(user?.id ? parseInt(user.id) : undefined)
      setCompany(settingsService.getCompany())
      setInvoice(settingsService.getInvoice())
      setTax(settingsService.getTax())
      setGeneral(settingsService.getGeneral())
      setSaved(true)
    }
  }

  const handleExport = () => {
    const settingsJson = settingsService.export()
    const blob = new Blob([settingsJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hisabkitab_settings_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const json = event.target?.result as string
            await settingsService.import(json, user?.id ? parseInt(user.id) : undefined)
            const [companySettings, invoiceSettings, taxSettings, generalSettings] = await Promise.all([
              settingsService.getCompany(),
              settingsService.getInvoice(),
              settingsService.getTax(),
              settingsService.getGeneral(),
            ])
            setCompany(companySettings)
            setInvoice(invoiceSettings)
            setTax(taxSettings)
            setGeneral(generalSettings)
            setSaved(true)
            alert('Settings imported successfully!')
          } catch (error) {
            alert('Failed to import settings. Please check the file format.')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <ProtectedRoute requiredPermission="settings:update">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                  title="Back to Dashboard"
                >
                  <Home className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                  <p className="text-sm text-gray-600 mt-1">Configure company information, invoices, taxes, and general settings</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Export Settings"
                >
                  <Download className="w-5 h-5" />
                  Export
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Import Settings"
                >
                  <Upload className="w-5 h-5" />
                  Import
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Reset to Defaults"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {saved && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <Save className="w-5 h-5" />
              Settings saved successfully!
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 mb-8 border border-white/50">
            <div className="flex gap-4 border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('company')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'company' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Company Info
                {activeTab === 'company' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('invoice')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'invoice' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Invoice Settings
                {activeTab === 'invoice' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('tax')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'tax' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Percent className="w-4 h-4" />
                Tax Settings
                {activeTab === 'tax' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                  activeTab === 'general' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                General
                {activeTab === 'general' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
              </button>
            </div>

            {/* Company Settings */}
            {activeTab === 'company' && (
              <form onSubmit={handleSaveCompany} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={company.company_name}
                      onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={company.company_gstin || ''}
                      onChange={(e) => setCompany({ ...company, company_gstin: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="29ABCDE1234F1Z5"
                      maxLength={15}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      value={company.company_address || ''}
                      onChange={(e) => setCompany({ ...company, company_address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={company.company_city || ''}
                      onChange={(e) => setCompany({ ...company, company_city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={company.company_state || ''}
                      onChange={(e) => setCompany({ ...company, company_state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={company.company_pincode || ''}
                      onChange={(e) => setCompany({ ...company, company_pincode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={company.company_country || ''}
                      onChange={(e) => setCompany({ ...company, company_country: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={company.company_phone || ''}
                      onChange={(e) => setCompany({ ...company, company_phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={company.company_email || ''}
                      onChange={(e) => setCompany({ ...company, company_email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={company.company_website || ''}
                      onChange={(e) => setCompany({ ...company, company_website: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      PAN
                    </label>
                    <input
                      type="text"
                      value={company.company_pan || ''}
                      onChange={(e) => setCompany({ ...company, company_pan: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      maxLength={10}
                      placeholder="ABCDE1234F"
                    />
                  </div>
                </div>

                {/* License Validity Section */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">License Validity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Valid From <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={company.valid_from || ''}
                        onChange={(e) => setCompany({ ...company, valid_from: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">License validity start date</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Valid To <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={company.valid_to || ''}
                        onChange={(e) => setCompany({ ...company, valid_to: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                        min={company.valid_from || undefined}
                      />
                      <p className="text-xs text-gray-500 mt-1">License validity end date</p>
                    </div>
                  </div>
                  {company.valid_from && company.valid_to && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>License Period:</strong> {new Date(company.valid_from).toLocaleDateString()} to {new Date(company.valid_to).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Company Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* Invoice Settings */}
            {activeTab === 'invoice' && (
              <form onSubmit={handleSaveInvoice} className="space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Invoice Prefix <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={invoice.invoice_prefix}
                        onChange={(e) => setInvoice({ ...invoice, invoice_prefix: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Invoice Template
                      </label>
                      <select
                        value={invoice.invoice_template}
                        onChange={(e) => setInvoice({ ...invoice, invoice_template: e.target.value as any })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="standard">Standard</option>
                        <option value="detailed">Detailed</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={invoice.invoice_footer_text || ''}
                      onChange={(e) => setInvoice({ ...invoice, invoice_footer_text: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Thank you for your business!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={invoice.invoice_terms_and_conditions || ''}
                      onChange={(e) => setInvoice({ ...invoice, invoice_terms_and_conditions: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter terms and conditions to be displayed on invoices..."
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="show_tax_breakdown"
                        checked={invoice.show_tax_breakdown}
                        onChange={(e) => setInvoice({ ...invoice, show_tax_breakdown: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="show_tax_breakdown" className="ml-2 text-sm font-medium text-gray-700">
                        Show Tax Breakdown on Invoices
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="show_payment_instructions"
                        checked={invoice.show_payment_instructions}
                        onChange={(e) => setInvoice({ ...invoice, show_payment_instructions: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="show_payment_instructions" className="ml-2 text-sm font-medium text-gray-700">
                        Show Payment Instructions on Invoices
                      </label>
                    </div>
                  </div>

                  {invoice.show_payment_instructions && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Payment Instructions Text
                      </label>
                      <textarea
                        value={invoice.payment_instructions_text || ''}
                        onChange={(e) => setInvoice({ ...invoice, payment_instructions_text: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Enter payment instructions..."
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Invoice Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* Tax Settings */}
            {activeTab === 'tax' && (
              <form onSubmit={handleSaveTax} className="space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Default GST Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={tax.default_gst_rate}
                        onChange={(e) => setTax({ ...tax, default_gst_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Default Tax Type
                      </label>
                      <select
                        value={tax.default_tax_type}
                        onChange={(e) => setTax({ ...tax, default_tax_type: e.target.value as 'inclusive' | 'exclusive' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="exclusive">Exclusive (Tax added on top)</option>
                        <option value="inclusive">Inclusive (Tax included in price)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enable_cgst_sgst"
                      checked={tax.enable_cgst_sgst}
                      onChange={(e) => setTax({ ...tax, enable_cgst_sgst: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="enable_cgst_sgst" className="ml-2 text-sm font-medium text-gray-700">
                      Enable Split GST (CGST + SGST)
                    </label>
                  </div>

                  {tax.enable_cgst_sgst && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Default CGST Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={tax.default_cgst_rate || 0}
                          onChange={(e) => setTax({ ...tax, default_cgst_rate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Default SGST Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={tax.default_sgst_rate || 0}
                          onChange={(e) => setTax({ ...tax, default_sgst_rate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Default IGST Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={tax.default_igst_rate || 0}
                          onChange={(e) => setTax({ ...tax, default_igst_rate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Tax Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* General Settings */}
            {activeTab === 'general' && (
              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={general.currency_symbol}
                        onChange={(e) => setGeneral({ ...general, currency_symbol: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        maxLength={5}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Currency Code
                      </label>
                      <input
                        type="text"
                        value={general.currency_code}
                        onChange={(e) => setGeneral({ ...general, currency_code: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        maxLength={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select
                        value={general.date_format}
                        onChange={(e) => setGeneral({ ...general, date_format: e.target.value as any })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Time Format
                      </label>
                      <select
                        value={general.time_format}
                        onChange={(e) => setGeneral({ ...general, time_format: e.target.value as '12h' | '24h' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="12h">12 Hour (AM/PM)</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Default Unit
                      </label>
                      <input
                        type="text"
                        value={general.default_unit}
                        onChange={(e) => setGeneral({ ...general, default_unit: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="pcs, kg, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Low Stock Threshold (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={general.low_stock_threshold_percentage}
                        onChange={(e) => setGeneral({ ...general, low_stock_threshold_percentage: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Percentage of min stock level to show warning</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto_archive"
                        checked={general.auto_archive_products_after_sale}
                        onChange={(e) => setGeneral({ ...general, auto_archive_products_after_sale: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="auto_archive" className="ml-2 text-sm font-medium text-gray-700">
                        Auto Archive Products After Sale
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enable_barcode"
                        checked={general.enable_barcode_generation}
                        onChange={(e) => setGeneral({ ...general, enable_barcode_generation: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="enable_barcode" className="ml-2 text-sm font-medium text-gray-700">
                        Enable Barcode Generation
                      </label>
                    </div>

                    {general.enable_barcode_generation && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Default Barcode Format
                        </label>
                        <select
                          value={general.default_barcode_format}
                          onChange={(e) => setGeneral({ ...general, default_barcode_format: e.target.value as any })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="EAN13">EAN-13</option>
                          <option value="CODE128">Code 128</option>
                          <option value="UPCA">UPC-A</option>
                          <option value="CODE39">Code 39</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save General Settings'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default SystemSettings

