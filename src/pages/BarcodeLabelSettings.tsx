import { useState, useEffect, FormEvent, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { settingsService } from '../services/settingsService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { BarcodeLabelSettings } from '../types/settings'
import { Home, Save, Barcode, Eye } from 'lucide-react'
import { companyService } from '../services/companyService'

const BarcodeLabelSettingsPage = () => {
  const { user, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [barcodeLabel, setBarcodeLabel] = useState<BarcodeLabelSettings>({
    label_size: 'standard',
    custom_width: 1.46,
    custom_height: 1.02,
    print_layout: 'single',
    show_product_name: true,
    show_article_code: true,
    show_barcode: true,
    show_purchase_price: false,
    show_mrp: true,
    show_sale_price: true,
    show_size: true,
    show_color: true,
    show_purchase_date: false,
    show_company_name: false,
    product_name_font_size: 10,
    barcode_font_size: 8,
    detail_font_size: 8,
    barcode_height: 40,
    barcode_width: 0,
    show_barcode_text: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const barcodePreviewRef = useRef<SVGSVGElement>(null)
  const [currentCompanyName, setCurrentCompanyName] = useState<string>('')
  const [availablePrinters, setAvailablePrinters] = useState<Array<{ name: string; displayName?: string; isDefault?: boolean }>>([])
  const [testPrinting, setTestPrinting] = useState(false)
  const [testPrintResult, setTestPrintResult] = useState<string>('')
  const [lastAutoPresetPrinter, setLastAutoPresetPrinter] = useState<string>('')
  const [autoPresetMessage, setAutoPresetMessage] = useState<string>('')
  const [isLayoutAuto, setIsLayoutAuto] = useState<boolean>(true)
  // Use a known-valid EAN-13 sample; invalid check digits will not render in JsBarcode
  const [previewBarcodeValue] = useState<string>('5901234123457')
  const mmToPx = (mm: number) => Math.max(1, Math.round(mm * 3.7795275591)) // 96dpi
  const ptToMm = (pt: number) => pt * 0.3527777778

  const getLabelHeightMm = (s: BarcodeLabelSettings) => {
    if (s.label_size === 'custom') return s.custom_height * 25.4
    if (s.label_size === '4x6') return 152.4
    if (s.label_size === 'a4') return 297
    return 25.908 // standard 1.02"
  }

  const estimateRequiredNonBarcodeMm = (s: BarcodeLabelSettings) => {
    // Keep these consistent with preview/test-print CSS (approximation)
    const paddingTopBottomMm = 4 // 2mm top + 2mm bottom
    const productBlockMm = s.show_product_name ? (ptToMm(s.product_name_font_size) * 1.15 + 1) : 0 // +1mm spacing

    const barcodeTextBlockMm =
      s.show_barcode && s.show_barcode_text ? (ptToMm(s.barcode_font_size) * 1.15 + 1) : 0 // +1mm margin

    const detailRows =
      Number(!!s.show_article_code) +
      Number(!!s.show_size) +
      Number(!!s.show_color) +
      Number(!!s.show_mrp) +
      Number(!!s.show_sale_price) +
      Number(!!s.show_purchase_price) +
      Number(!!s.show_purchase_date)

    const detailsLineMm = ptToMm(s.detail_font_size) * 1.15
    const detailsGapsMm = Math.max(0, detailRows - 1) * 0.5
    const detailsBlockMm = detailRows > 0 ? detailRows * detailsLineMm + detailsGapsMm : 0

    const companyBlockMm = s.show_company_name ? (ptToMm(Math.max(6, s.detail_font_size - 1)) * 1.15 + 1) : 0

    // barcode container vertical margins: 2mm top + 2mm bottom
    const barcodeContainerMarginsMm = s.show_barcode ? 4 : 0

    return (
      paddingTopBottomMm +
      productBlockMm +
      (s.show_barcode ? barcodeContainerMarginsMm : 0) +
      barcodeTextBlockMm +
      detailsBlockMm +
      companyBlockMm
    )
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    loadCurrentCompanyName()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.company_id, getCurrentCompanyId])

  useEffect(() => {
    loadPrinters()
  }, [])

  useEffect(() => {
    // Auto-apply recommended layout based on detected/selected printer (best-effort).
    // Applied once per selected printer name to avoid overriding manual tweaks.
    const device = (barcodeLabel.printer_device_name || '').trim()
    if (!device) return
    if (device === lastAutoPresetPrinter) return

    const normalized = device.toLowerCase()
    const isTsc =
      normalized.includes('tsc') ||
      normalized.includes('te244') ||
      normalized.includes('te-244') ||
      normalized.includes('te 244')
    const isZebra = normalized.includes('zebra') || normalized.includes('zpl')

    if (isTsc) {
      // Common TE244 roll: 40mm x 25mm (custom). User can adjust for their roll.
      setBarcodeLabel(prev => ({
        ...prev,
        printer_type: 'TSC_TSPL',
        label_size: 'custom',
        custom_width: 40 / 25.4,  // inches
        custom_height: 25 / 25.4, // inches
        print_layout: 'single',
        // Keep barcode readable on small labels
        barcode_height: Math.min(Math.max(prev.barcode_height, 18), 30),
        detail_font_size: Math.min(prev.detail_font_size, 8),
        product_name_font_size: Math.min(prev.product_name_font_size, 10),
        barcode_font_size: Math.min(prev.barcode_font_size, 8),
      }))
      setAutoPresetMessage(
        'Detected TSC/TE244 printer — applied recommended 40×25mm label preset. Adjust label size/layout if your roll differs.'
      )
    } else if (isZebra) {
      setBarcodeLabel(prev => ({
        ...prev,
        printer_type: 'ZEBRA_ZPL',
        print_layout: 'single',
      }))
      setAutoPresetMessage(
        'Detected Zebra printer — applied recommended single-label layout. Set your exact label size as per your roll.'
      )
    } else {
      setAutoPresetMessage('')
    }

    setLastAutoPresetPrinter(device)
    if (isTsc || isZebra) {
      setTimeout(() => setAutoPresetMessage(''), 7000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeLabel.printer_device_name])

  useEffect(() => {
    // Keep layout valid for the selected printer/label size.
    const isTsc = (barcodeLabel.printer_type || 'GENERIC') === 'TSC_TSPL'
    const labelWidthMm =
      barcodeLabel.label_size === 'custom'
        ? barcodeLabel.custom_width * 25.4
        : barcodeLabel.label_size === '4x6'
          ? 101.6
          : barcodeLabel.label_size === 'a4'
            ? 210
            : 37.084

    const isSmallLabel = labelWidthMm < 60 // very narrow rolls like TE244 stickers

    // If user has manually chosen a layout, don't override – allow manual selection
    const userOverrodeLayout = !isLayoutAuto

    // Note: We no longer force single layout for small TSC labels - we allow manual override
    // but show warnings in the UI instead

    if (userOverrodeLayout) {
      return // Respect user's manual choice
    }

    // Auto-recommend: enable Double on wide labels for non-TSC printers
    const isWideLabel = labelWidthMm >= 80
    const canUseDouble = !isTsc && isWideLabel
    const recommendedLayout = canUseDouble ? 'double' : 'single'

    if (barcodeLabel.print_layout !== recommendedLayout) {
      setBarcodeLabel(prev => ({ ...prev, print_layout: recommendedLayout }))
    }
  }, [barcodeLabel.printer_type, barcodeLabel.label_size, barcodeLabel.print_layout, isLayoutAuto])

  useEffect(() => {
    // Fully automatic barcode height: shrink/grow barcode so details remain readable.
    // We only adjust barcode_height (not fonts) to avoid unexpected typography changes.
    if (!barcodeLabel.show_barcode) return

    const labelHeightMm = getLabelHeightMm(barcodeLabel)
    const requiredNonBarcodeMm = estimateRequiredNonBarcodeMm(barcodeLabel)
    const remainingForBarcodeMm = Math.floor(labelHeightMm - requiredNonBarcodeMm)

    // Safe scannable range: keep at least ~20mm bars; cap to avoid dominating label
    const minBarcodeMm = 20
    const maxBarcodeMm = Math.min(60, Math.floor(labelHeightMm * 0.65))
    const next = Math.max(minBarcodeMm, Math.min(maxBarcodeMm, remainingForBarcodeMm))

    if (Number.isFinite(next) && next > 0 && next !== barcodeLabel.barcode_height) {
      setBarcodeLabel(prev => ({ ...prev, barcode_height: next }))
    }

    if (remainingForBarcodeMm < minBarcodeMm) {
      setAutoPresetMessage(
        `Auto-fit: label is tight for selected fields. Barcode height set to ${minBarcodeMm}mm to keep it scannable — consider disabling some fields or increasing label height.`
      )
      setTimeout(() => setAutoPresetMessage(''), 7000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    barcodeLabel.label_size,
    barcodeLabel.custom_height,
    barcodeLabel.show_barcode,
    barcodeLabel.show_barcode_text,
    barcodeLabel.show_product_name,
    barcodeLabel.show_article_code,
    barcodeLabel.show_size,
    barcodeLabel.show_color,
    barcodeLabel.show_mrp,
    barcodeLabel.show_sale_price,
    barcodeLabel.show_purchase_price,
    barcodeLabel.show_purchase_date,
    barcodeLabel.show_company_name,
    barcodeLabel.product_name_font_size,
    barcodeLabel.barcode_font_size,
    barcodeLabel.detail_font_size,
    currentCompanyName,
  ])

  useEffect(() => {
    // Generate barcode preview when settings change
    if (showPreview && barcodePreviewRef.current) {
      generateBarcodePreview()
    }
  }, [barcodeLabel, showPreview])

  const generateBarcodePreview = () => {
    if (!barcodePreviewRef.current) return
    
    // Load JsBarcode from CDN if not already loaded
    if (typeof window !== 'undefined' && (window as any).JsBarcode) {
      try {
        // Keep preview logic aligned with actual printing (print window renders SVG + optional separate text)
        ;(window as any).JsBarcode(barcodePreviewRef.current, previewBarcodeValue, {
          format: "EAN13",
          width: 2,
          // JsBarcode height is in px; our setting is mm
          height: mmToPx(barcodeLabel.barcode_height),
          displayValue: false,
        })
      } catch (error) {
        console.error('Error generating barcode preview:', error)
      }
    } else {
      // Load JsBarcode script if not loaded
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js'
      script.onload = () => {
        if (barcodePreviewRef.current) {
          try {
            ;(window as any).JsBarcode(barcodePreviewRef.current, previewBarcodeValue, {
              format: "EAN13",
              width: 2,
              height: mmToPx(barcodeLabel.barcode_height),
              displayValue: false,
            })
          } catch (error) {
            console.error('Error generating barcode preview:', error)
          }
        }
      }
      document.head.appendChild(script)
    }
  }

  const loadCurrentCompanyName = async () => {
    try {
      const companyId = getCurrentCompanyId?.()
      if (!companyId) {
        setCurrentCompanyName('')
        return
      }
      const company = await companyService.getById(companyId)
      setCurrentCompanyName(company?.name || '')
    } catch (error) {
      console.error('Error loading current company:', error)
      setCurrentCompanyName('')
    }
  }

  const loadPrinters = async () => {
    try {
      if (window.electronAPI?.printers?.list) {
        const printers = await window.electronAPI.printers.list()
        setAvailablePrinters(
          (printers || []).map(p => ({ name: p.name, displayName: p.displayName, isDefault: p.isDefault }))
        )
      }
    } catch (e) {
      console.error('Error loading printers:', e)
      setAvailablePrinters([])
    }
  }

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getAll()
      if (settings.barcode_label) {
        setBarcodeLabel(settings.barcode_label)
      }
    } catch (error) {
      console.error('Error loading barcode label settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await settingsService.update({ barcode_label: barcodeLabel }, user?.id ? parseInt(user.id) : undefined)
      setSaved(true)
      // Show preview after saving
      if (!showPreview) {
        setShowPreview(true)
        setTimeout(() => generateBarcodePreview(), 100)
      } else {
        // Regenerate preview with new settings
        generateBarcodePreview()
      }
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      alert('Failed to save barcode label settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const buildTestPrintHtml = () => {
    const labelSize = barcodeLabel.label_size
    const widthMm =
      labelSize === 'custom'
        ? barcodeLabel.custom_width * 25.4
        : labelSize === '4x6'
          ? 152.4
          : labelSize === 'a4'
            ? 210
            : 37.084
    const heightMm =
      labelSize === 'custom'
        ? barcodeLabel.custom_height * 25.4
        : labelSize === '4x6'
          ? 152.4
          : labelSize === 'a4'
            ? 297
            : 25.908

    // For double-column layout: calculate exact width per column (equal sizes)
    const isDoubleLayout = barcodeLabel.print_layout === 'double'
    const gapMm = 2 // gap between columns
    const singleLabelWidthMm = isDoubleLayout ? (widthMm - gapMm) / 2 : widthMm

    // Generate sample label HTML (helper function)
    const generateSampleLabelHTML = (barcodeId: string) => {
      return `
        ${barcodeLabel.show_product_name ? `<div class="product-name">Sample Product Name</div>` : ''}

        ${barcodeLabel.show_barcode ? `
          <div class="barcode-container">
            <svg id="${barcodeId}" class="barcode-image"></svg>
            ${barcodeLabel.show_barcode_text ? `<div class="barcode-text">${previewBarcodeValue}</div>` : ''}
          </div>
        ` : ''}

        <div class="details">
          ${barcodeLabel.show_article_code ? `<div class="detail-row"><span>Article:</span><span>ART001</span></div>` : ''}
          ${barcodeLabel.show_size ? `<div class="detail-row"><span>Size:</span><span>M</span></div>` : ''}
          ${barcodeLabel.show_color ? `<div class="detail-row"><span>Color:</span><span>Blue</span></div>` : ''}
          ${barcodeLabel.show_mrp ? `<div class="detail-row"><span>MRP:</span><span>₹999.00</span></div>` : ''}
          ${barcodeLabel.show_sale_price ? `<div class="detail-row"><span>Sale Price:</span><span>₹799.00</span></div>` : ''}
          ${barcodeLabel.show_purchase_price ? `<div class="detail-row"><span>Price:</span><span>₹500.00</span></div>` : ''}
          ${barcodeLabel.show_purchase_date ? `<div class="detail-row"><span>Date:</span><span>${new Date().toLocaleDateString('en-IN')}</span></div>` : ''}
        </div>

        ${barcodeLabel.show_company_name ? `<div class="company-name">${(currentCompanyName || 'Company').replace(/</g, '&lt;')}</div>` : ''}
      `
    }

    // Generate labels HTML based on layout
    const labelsHTML = isDoubleLayout
      ? `<div class="label-row">
          <div class="label">${generateSampleLabelHTML('test-barcode-1')}</div>
          <div class="label">${generateSampleLabelHTML('test-barcode-2')}</div>
        </div>`
      : `<div class="label-container">${generateSampleLabelHTML('test-barcode-1')}</div>`

    // A single sample label, same structure as BarcodePrintModal (SVG + optional text below).
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Test Print - Barcode Label</title>
    <style>
      @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; }
      .label-container {
        width: ${widthMm}mm;
        height: ${heightMm}mm;
        padding: 2mm;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .label-row {
        display: flex;
        gap: ${gapMm}mm;
        width: ${widthMm}mm;
        page-break-after: always;
      }
      .label {
        width: ${singleLabelWidthMm}mm;
        height: ${heightMm}mm;
        padding: 2mm;
        border: 1px dashed #ddd;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        box-sizing: border-box;
      }
      .product-name {
        font-size: ${barcodeLabel.product_name_font_size}pt;
        font-weight: bold;
        margin-bottom: 1mm;
        word-wrap: break-word;
      }
      .barcode-container { text-align: center; margin: 2mm 0; }
      .barcode-image {
        max-width: 100%;
        height: ${barcodeLabel.barcode_height}mm;
        ${barcodeLabel.barcode_width > 0 ? `width: ${barcodeLabel.barcode_width}mm;` : ''}
      }
      .barcode-text {
        font-size: ${barcodeLabel.barcode_font_size}pt;
        font-family: 'Courier New', monospace;
        margin-top: 1mm;
      }
      .details {
        font-size: ${barcodeLabel.detail_font_size}pt;
        display: flex;
        flex-direction: column;
        gap: 0.5mm;
        line-height: 1.1;
      }
      .detail-row { display: flex; justify-content: space-between; }
      .company-name {
        font-size: ${Math.max(6, barcodeLabel.detail_font_size - 1)}pt;
        text-align: center;
        margin-top: 1mm;
        color: #666;
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  </head>
  <body>
    ${labelsHTML}

    <script>
      window.onload = function () {
        try {
          if (typeof JsBarcode !== 'undefined') {
            // Generate barcodes for all labels (1 or 2 depending on layout)
            const barcodeIds = ${isDoubleLayout ? '["test-barcode-1", "test-barcode-2"]' : '["test-barcode-1"]'};
            barcodeIds.forEach(function(barcodeId) {
              var el = document.getElementById(barcodeId);
              if (el) {
                // JsBarcode expects height in px; our setting is in mm.
                var heightPx = Math.round(${barcodeLabel.barcode_height} * 3.7795275591); // 96dpi
                JsBarcode(el, "${previewBarcodeValue}", { format: "EAN13", width: 2, height: heightPx, displayValue: false });
              }
            });
          }
        } catch (e) {
          console.error('Test barcode render failed', e);
        }
      };
    </script>
  </body>
</html>`
  }

  const handleTestPrint = async () => {
    setTestPrintResult('')
    const html = buildTestPrintHtml()

    // Electron path (preferred)
    if (window.electronAPI?.print?.html) {
      setTestPrinting(true)
      try {
        const res = await window.electronAPI.print.html({
          html,
          silent: false, // test print should show dialog by default
          deviceName: barcodeLabel.printer_device_name || undefined,
        })
        setTestPrintResult(res.ok ? 'Test print sent successfully.' : `Test print failed: ${res.error || 'Unknown error'}`)
      } finally {
        setTestPrinting(false)
      }
      return
    }

    // Web fallback
    const w = window.open('', '_blank')
    if (!w) {
      alert('Please allow popups to test print')
      return
    }
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 800)
  }

  return (
    <ProtectedRoute>
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
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Barcode className="w-8 h-8 text-blue-600" />
                    Barcode Label Settings
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure barcode label printing format and layout
                    {currentCompanyName ? (
                      <span className="ml-2 text-gray-500">
                        • Current company: <span className="font-semibold text-gray-700">{currentCompanyName}</span>
                      </span>
                    ) : null}
                  </p>
                </div>
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
          {autoPresetMessage && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg">
              {autoPresetMessage}
            </div>
          )}

          {/* Preview Section */}
          {showPreview && (
            <div className="mb-6 bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Label Preview
                </h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Hide Preview
                </button>
              </div>
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div 
                  className="mx-auto"
                  style={{
                    width: barcodeLabel.label_size === 'custom' 
                      ? `${barcodeLabel.custom_width * 25.4}mm` 
                      : barcodeLabel.label_size === '4x6' 
                        ? '152.4mm' 
                        : barcodeLabel.label_size === 'a4'
                          ? '210mm'
                          : '37.084mm', // standard 1.46"
                    minHeight: barcodeLabel.label_size === 'custom'
                      ? `${barcodeLabel.custom_height * 25.4}mm`
                      : barcodeLabel.label_size === '4x6'
                        ? '152.4mm'
                        : barcodeLabel.label_size === 'a4'
                          ? '297mm'
                          : '25.908mm', // standard 1.02"
                    padding: '2mm',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    fontSize: `${barcodeLabel.detail_font_size}pt`,
                  }}
                >
                  {barcodeLabel.show_product_name && (
                    <div 
                      className="font-bold mb-2"
                      style={{ fontSize: `${barcodeLabel.product_name_font_size}pt` }}
                    >
                      Sample Product Name
                    </div>
                  )}
                  
                  {barcodeLabel.show_barcode && (
                    <div className="text-center" style={{ margin: '2mm 0' }}>
                      <svg 
                        ref={barcodePreviewRef}
                        className="mx-auto"
                        style={{
                          height: `${barcodeLabel.barcode_height}mm`,
                          ...(barcodeLabel.barcode_width > 0 ? { width: `${barcodeLabel.barcode_width}mm` } : {}),
                          maxWidth: '100%',
                        }}
                      ></svg>
                      {barcodeLabel.show_barcode_text && (
                        <div 
                          className="mt-1 font-mono"
                          style={{ fontSize: `${barcodeLabel.barcode_font_size}pt` }}
                        >
                          {previewBarcodeValue}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div
                    className="details"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5mm',
                      lineHeight: 1.1,
                    }}
                  >
                    {barcodeLabel.show_article_code && (
                      <div className="flex justify-between">
                        <span>Article:</span>
                        <span>ART001</span>
                      </div>
                    )}
                    {barcodeLabel.show_size && (
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>M</span>
                      </div>
                    )}
                    {barcodeLabel.show_color && (
                      <div className="flex justify-between">
                        <span>Color:</span>
                        <span>Blue</span>
                      </div>
                    )}
                    {barcodeLabel.show_mrp && (
                      <div className="flex justify-between">
                        <span>MRP:</span>
                        <span>₹999.00</span>
                      </div>
                    )}
                    {barcodeLabel.show_sale_price && (
                      <div className="flex justify-between">
                        <span>Sale Price:</span>
                        <span>₹799.00</span>
                      </div>
                    )}
                    {barcodeLabel.show_purchase_price && (
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span>₹500.00</span>
                      </div>
                    )}
                    {barcodeLabel.show_purchase_date && (
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{new Date().toLocaleDateString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                  
                  {barcodeLabel.show_company_name && (
                    <div 
                      className="text-center text-gray-600"
                      style={{ fontSize: `${barcodeLabel.detail_font_size - 1}pt` }}
                    >
                      {currentCompanyName || 'Company'}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                This is a preview of how your labels will look. Actual printed labels may vary slightly based on printer settings.
              </p>
            </div>
          )}

          <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-white/50">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Label Size */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Label Size</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Label Size</label>
                    <select
                      value={barcodeLabel.label_size}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, label_size: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="standard">Standard (1.46" × 1.02")</option>
                      <option value="4x6">4" × 6"</option>
                      <option value="a4">A4 (8.27" × 11.69")</option>
                      <option value="custom">Custom Size</option>
                    </select>
                  </div>
                  {barcodeLabel.label_size === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Width (inches)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.5"
                          max="12"
                          value={barcodeLabel.custom_width}
                          onChange={(e) => setBarcodeLabel({ ...barcodeLabel, custom_width: parseFloat(e.target.value) || 1.46 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Height (inches)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.5"
                          max="12"
                          value={barcodeLabel.custom_height}
                          onChange={(e) => setBarcodeLabel({ ...barcodeLabel, custom_height: parseFloat(e.target.value) || 1.02 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Print Layout */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Print Layout</h3>
                  {!isLayoutAuto && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLayoutAuto(true)
                        // Auto-apply recommended layout
                        const isTsc = (barcodeLabel.printer_type || 'GENERIC') === 'TSC_TSPL'
                        const labelWidthMm =
                          barcodeLabel.label_size === 'custom'
                            ? barcodeLabel.custom_width * 25.4
                            : barcodeLabel.label_size === '4x6'
                              ? 101.6
                              : barcodeLabel.label_size === 'a4'
                                ? 210
                                : 37.084
                        const isWideLabel = labelWidthMm >= 80
                        const canUseDouble = !isTsc && isWideLabel
                        const recommendedLayout = canUseDouble ? 'double' : 'single'
                        setBarcodeLabel(prev => ({ ...prev, print_layout: recommendedLayout }))
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Layout Type</label>
                  <select
                    value={barcodeLabel.print_layout}
                    onChange={(e) =>
                      {
                        setBarcodeLabel({ ...barcodeLabel, print_layout: e.target.value as any })
                        setIsLayoutAuto(false) // user is manually choosing layout
                      }
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="single">Single (1 barcode per label / page)</option>
                    <option value="double">Double (2 barcodes per page – left & right)</option>
                  </select>
                  {(() => {
                    const isTsc = (barcodeLabel.printer_type || 'GENERIC') === 'TSC_TSPL'
                    const labelWidthMm =
                      barcodeLabel.label_size === 'custom'
                        ? barcodeLabel.custom_width * 25.4
                        : barcodeLabel.label_size === '4x6'
                          ? 101.6
                          : barcodeLabel.label_size === 'a4'
                            ? 210
                            : 37.084
                    const isSmallLabel = labelWidthMm < 60
                    const isWideLabel = labelWidthMm >= 80
                    const recommendedLayout = (isTsc && isSmallLabel) ? 'single' : (!isTsc && isWideLabel) ? 'double' : 'single'
                    const isManualOverride = !isLayoutAuto
                    const isIncompatible = barcodeLabel.print_layout === 'double' && isTsc && isSmallLabel
                    const isNotRecommended = barcodeLabel.print_layout !== recommendedLayout && !isIncompatible

                    return (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500">
                          System recommendation:{" "}
                          <span className="font-semibold text-blue-600">
                            {recommendedLayout === 'single' ? 'Single' : 'Double'}
                          </span>
                          {recommendedLayout === 'double' && ' (wide label, non-TSC printer)'}
                          {recommendedLayout === 'single' && isTsc && isSmallLabel && ' (small TE244 roll)'}
                          {recommendedLayout === 'single' && !isTsc && !isWideLabel && ' (narrow label)'}
                        </p>
                        {isManualOverride && isIncompatible && (
                          <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <span>⚠️</span>
                            Warning: Double layout may not work well on small TSC/TE244 labels. Consider using Single layout.
                          </p>
                        )}
                        {isManualOverride && isNotRecommended && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <span>ℹ️</span>
                            Manual override active. You've selected {barcodeLabel.print_layout === 'single' ? 'Single' : 'Double'} layout.
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Fields to Display */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Fields to Display</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_product_name"
                      checked={barcodeLabel.show_product_name}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_product_name: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_product_name" className="ml-2 text-sm font-medium text-gray-700">
                      Product Name
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_article_code"
                      checked={barcodeLabel.show_article_code}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_article_code: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_article_code" className="ml-2 text-sm font-medium text-gray-700">
                      Article Code
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_barcode"
                      checked={barcodeLabel.show_barcode}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_barcode: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_barcode" className="ml-2 text-sm font-medium text-gray-700">
                      Barcode
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_mrp"
                      checked={barcodeLabel.show_mrp}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_mrp: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_mrp" className="ml-2 text-sm font-medium text-gray-700">
                      MRP
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_sale_price"
                      checked={barcodeLabel.show_sale_price}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_sale_price: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_sale_price" className="ml-2 text-sm font-medium text-gray-700">
                      Sale Price
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_purchase_price"
                      checked={barcodeLabel.show_purchase_price}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_purchase_price: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_purchase_price" className="ml-2 text-sm font-medium text-gray-700">
                      Purchase Price
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_size"
                      checked={barcodeLabel.show_size}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_size: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_size" className="ml-2 text-sm font-medium text-gray-700">
                      Size
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_color"
                      checked={barcodeLabel.show_color}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_color: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_color" className="ml-2 text-sm font-medium text-gray-700">
                      Color
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_purchase_date"
                      checked={barcodeLabel.show_purchase_date}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_purchase_date: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_purchase_date" className="ml-2 text-sm font-medium text-gray-700">
                      Purchase Date
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_company_name"
                      checked={barcodeLabel.show_company_name}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_company_name: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_company_name" className="ml-2 text-sm font-medium text-gray-700">
                      Company Name
                    </label>
                  </div>
                </div>
              </div>

              {/* Font Sizes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Font Sizes (in points)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                    <input
                      type="number"
                      min="6"
                      max="24"
                      value={barcodeLabel.product_name_font_size}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, product_name_font_size: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode Text</label>
                    <input
                      type="number"
                      min="6"
                      max="24"
                      value={barcodeLabel.barcode_font_size}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, barcode_font_size: parseInt(e.target.value) || 8 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Details</label>
                    <input
                      type="number"
                      min="6"
                      max="24"
                      value={barcodeLabel.detail_font_size}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, detail_font_size: parseInt(e.target.value) || 8 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Barcode Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Barcode Settings</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode Height (mm)</label>
                    <input
                      type="number"
                      min="20"
                      max="100"
                      value={barcodeLabel.barcode_height}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, barcode_height: parseInt(e.target.value) || 40 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode Width (mm, 0 = auto)</label>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={barcodeLabel.barcode_width}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, barcode_width: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-8">
                    <input
                      type="checkbox"
                      id="show_barcode_text"
                      checked={barcodeLabel.show_barcode_text}
                      onChange={(e) => setBarcodeLabel({ ...barcodeLabel, show_barcode_text: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="show_barcode_text" className="ml-2 text-sm font-medium text-gray-700">
                      Show Barcode Number
                    </label>
                  </div>
                </div>
              </div>

              {/* Printer Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Printer</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Printer Type</label>
                    <select
                      value={barcodeLabel.printer_type || 'GENERIC'}
                      onChange={(e) =>
                        setBarcodeLabel({ ...barcodeLabel, printer_type: e.target.value as any })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="GENERIC">Generic (Windows/macOS Print)</option>
                      <option value="TSC_TSPL">TSC / TE244 (Driver)</option>
                      <option value="ZEBRA_ZPL">Zebra (Driver)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      For TE244, install the printer driver (USB/LAN) and select it below.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Printer Device</label>
                    <select
                      value={barcodeLabel.printer_device_name || ''}
                      onChange={(e) =>
                        setBarcodeLabel({ ...barcodeLabel, printer_device_name: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      disabled={!window.electronAPI?.printers?.list}
                    >
                      <option value="">
                        {window.electronAPI?.printers?.list ? 'Select printer (optional)' : 'Available in Electron app only'}
                      </option>
                      {availablePrinters.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.displayName || p.name}{p.isDefault ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={loadPrinters}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        disabled={!window.electronAPI?.printers?.list}
                      >
                        Refresh list
                      </button>
                      <button
                        type="button"
                        onClick={handleTestPrint}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={testPrinting}
                      >
                        {testPrinting ? 'Testing...' : 'Test Print'}
                      </button>
                    </div>
                    {testPrintResult ? (
                      <p className="text-xs mt-2 text-gray-600">{testPrintResult}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 pt-8">
                    <input
                      type="checkbox"
                      id="silent_print"
                      checked={!!barcodeLabel.silent_print}
                      onChange={(e) =>
                        setBarcodeLabel({ ...barcodeLabel, silent_print: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={!window.electronAPI?.print?.html}
                    />
                    <label htmlFor="silent_print" className="text-sm font-medium text-gray-700">
                      Silent print (Electron)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowPreview(!showPreview)
                    if (!showPreview) {
                      setTimeout(() => generateBarcodePreview(), 100)
                    }
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Barcode Label Settings'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default BarcodeLabelSettingsPage
