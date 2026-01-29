import { useState, useEffect, useRef } from 'react'
import { X, Printer, Settings, CheckSquare, Square } from 'lucide-react'
import { PurchaseItem } from '../types/purchase'
import { BarcodeLabelSettings } from '../types/settings'
import { settingsService } from '../services/settingsService'

interface BarcodePrintModalProps {
  isOpen: boolean
  onClose: () => void
  items: PurchaseItem[]
  purchaseDate: string
  companyName?: string
}

// Standard label sizes in inches
const LABEL_SIZES = {
  standard: { width: 1.46, height: 1.02, name: 'Standard (1.46" × 1.02")' },
  '4x6': { width: 4, height: 6, name: '4" × 6"' },
  a4: { width: 8.27, height: 11.69, name: 'A4 (8.27" × 11.69")' },
  custom: { width: 0, height: 0, name: 'Custom' },
}

const BarcodePrintModal = ({ isOpen, onClose, items, purchaseDate, companyName }: BarcodePrintModalProps) => {
  const [labelSettings, setLabelSettings] = useState<BarcodeLabelSettings | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      // Select all items by default
      setSelectedItems(new Set(items.map((_, index) => index)))
    }
  }, [isOpen, items])

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getAll()
      setLabelSettings(settings.barcode_label || null)
    } catch (error) {
      console.error('Error loading barcode label settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (index: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedItems(new Set(items.map((_, index) => index)))
  }

  const deselectAll = () => {
    setSelectedItems(new Set())
  }

  const generateSingleLabelHTML = (
    item: PurchaseItem,
    settings: BarcodeLabelSettings,
    index: number,
    companyName?: string,
    purchaseDate?: string
  ): string => {
    const barcodeId = `barcode-${index}-${item.barcode || item.product_id || 'item'}`
    
    return `
      <div class="label">
        ${settings.show_product_name && item.product_name ? `<div class="product-name">${escapeHtml(item.product_name)}</div>` : ''}
        
        ${settings.show_barcode && item.barcode ? `
          <div class="barcode-container">
            <svg id="${barcodeId}" class="barcode-image"></svg>
            ${settings.show_barcode_text ? `<div class="barcode-text">${item.barcode}</div>` : ''}
          </div>
        ` : ''}
        
        <div class="details">
          ${settings.show_article_code && item.article ? `<div class="detail-row"><span>Article:</span><span>${escapeHtml(item.article)}</span></div>` : ''}
          ${settings.show_size && item.size ? `<div class="detail-row"><span>Size:</span><span>${escapeHtml(item.size)}</span></div>` : ''}
          ${settings.show_color && item.color ? `<div class="detail-row"><span>Color:</span><span>${escapeHtml(item.color)}</span></div>` : ''}
          ${settings.show_mrp && item.mrp ? `<div class="detail-row"><span>MRP:</span><span>₹${item.mrp.toFixed(2)}</span></div>` : ''}
          ${settings.show_sale_price && item.sale_price ? `<div class="detail-row"><span>Sale Price:</span><span>₹${item.sale_price.toFixed(2)}</span></div>` : ''}
          ${settings.show_purchase_price && item.unit_price ? `<div class="detail-row"><span>Price:</span><span>₹${item.unit_price.toFixed(2)}</span></div>` : ''}
          ${settings.show_purchase_date && purchaseDate ? `<div class="detail-row"><span>Date:</span><span>${new Date(purchaseDate).toLocaleDateString('en-IN')}</span></div>` : ''}
        </div>
        
        ${settings.show_company_name && companyName ? `<div class="company-name">${escapeHtml(companyName)}</div>` : ''}
      </div>
    `
  }

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  const buildPrintHtml = (settings: BarcodeLabelSettings) => {
    const labelSize = LABEL_SIZES[settings.label_size]
    const width = settings.label_size === 'custom' ? settings.custom_width : labelSize.width
    const height = settings.label_size === 'custom' ? settings.custom_height : labelSize.height
    
    // Convert inches to mm for CSS
    const widthMm = width * 25.4
    const heightMm = height * 25.4

    const selectedItemsList = items.filter((_, index) => selectedItems.has(index))
    
    // For double-column layout: calculate exact width per column (equal sizes)
    const isDoubleLayout = settings.print_layout === 'double'
    const gapMm = 2 // gap between columns
    const singleLabelWidthMm = isDoubleLayout ? (widthMm - gapMm) / 2 : widthMm
    
    // Generate labels HTML
    let labelsHTML = ''
    if (isDoubleLayout) {
      // Two labels per row - ensure both use the same standard size
      for (let i = 0; i < selectedItemsList.length; i += 2) {
        const row = selectedItemsList.slice(i, i + 2)
        labelsHTML += `
          <div class="label-row">
            ${generateSingleLabelHTML(row[0], settings, i, companyName, purchaseDate)}
            ${row[1] ? generateSingleLabelHTML(row[1], settings, i + 1, companyName, purchaseDate) : '<div class="label" style="visibility: hidden;"></div>'}
          </div>
        `
      }
    } else {
      // Single label per page
      selectedItemsList.forEach((item, idx) => {
        labelsHTML += `
          <div class="label-container">
            ${generateSingleLabelHTML(item, settings, idx, companyName, purchaseDate)}
          </div>
        `
      })
    }

    // Generate barcode scripts - need to match the IDs used in labels
    const barcodeScripts = selectedItemsList
      .filter(item => item.barcode && settings.show_barcode)
      .map((item, idx) => {
        const barcodeId = `barcode-${idx}-${item.barcode || item.product_id || 'item'}`
        // Escape barcode for use in script
        const barcodeValue = (item.barcode || '').replace(/"/g, '\\"')
        return `
          try {
            if (typeof JsBarcode !== 'undefined') {
              const element = document.getElementById("${barcodeId}");
              if (element) {
                // JsBarcode expects height in px; settings.barcode_height is in mm.
                const heightPx = Math.round(${settings.barcode_height} * 3.7795275591); // 96dpi
                JsBarcode(element, "${barcodeValue}", {
                  format: "EAN13",
                  width: 2,
                  height: heightPx,
                  displayValue: false
                });
              }
            }
          } catch(e) {
            console.error('Barcode generation error for ${barcodeId}:', e);
          }
        `
      }).join('')
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: ${widthMm}mm ${heightMm}mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .label-container {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              padding: 2mm;
              border: 1px solid #ccc;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
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
              justify-content: space-between;
              box-sizing: border-box;
            }
            .product-name {
              font-size: ${settings.product_name_font_size}pt;
              font-weight: bold;
              margin-bottom: 1mm;
              word-wrap: break-word;
            }
            .barcode-container {
              text-align: center;
              margin: 2mm 0;
            }
            .barcode-image {
              max-width: 100%;
              height: ${settings.barcode_height}mm;
              ${settings.barcode_width > 0 ? `width: ${settings.barcode_width}mm;` : ''}
            }
            .barcode-text {
              font-size: ${settings.barcode_font_size}pt;
              font-family: 'Courier New', monospace;
              margin-top: 1mm;
            }
            .details {
              font-size: ${settings.detail_font_size}pt;
              display: flex;
              flex-direction: column;
              gap: 0.5mm;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
            }
            .company-name {
              font-size: ${settings.detail_font_size - 1}pt;
              text-align: center;
              margin-top: 1mm;
              color: #666;
            }
            @media print {
              .label-container {
                border: none;
              }
              .label {
                border: none;
              }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          ${labelsHTML}
          <script>
            window.onload = function() {
              ${barcodeScripts}
              // If printed via browser, user can print manually; if printed via Electron, main process will trigger print.
            };
          </script>
        </body>
      </html>
    `
  }

  const handlePrint = async () => {
    const settings = labelSettings!
    const html = buildPrintHtml(settings)

    // Prefer Electron printing when available (supports selecting deviceName + silent print)
    if (window.electronAPI?.print?.html) {
      const result = await window.electronAPI.print.html({
        html,
        silent: !!settings.silent_print,
        deviceName: settings.printer_device_name || undefined,
      })
      if (!result.ok) {
        alert(`Print failed: ${result.error || 'Unknown error'}`)
      }
      return
    }

    // Web fallback (requires popup)
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print barcodes')
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
  }

  if (!isOpen) return null

  if (loading || !labelSettings) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6">
          <p className="text-gray-600">Loading barcode settings...</p>
        </div>
      </div>
    )
  }

  const selectedCount = selectedItems.size
  const totalItems = items.length

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Print Barcode Labels</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select items to print barcode labels ({selectedCount} of {totalItems} selected)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selection Controls */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Deselect All
              </button>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{selectedCount}</span> item{selectedCount !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedItems.has(index)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleItem(index)}
              >
                <div className="flex-shrink-0">
                  {selectedItems.has(index) ? (
                    <CheckSquare className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {item.product_name || `Item ${index + 1}`}
                  </div>
                  <div className="text-sm text-gray-600 space-x-4 mt-1">
                    {item.article && <span>Article: {item.article}</span>}
                    {item.barcode && <span>Barcode: {item.barcode}</span>}
                    {item.size && <span>Size: {item.size}</span>}
                    {item.color && <span>Color: {item.color}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">Qty: {item.quantity}</div>
                  {item.mrp && (
                    <div className="text-sm text-gray-600">MRP: ₹{item.mrp.toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Print Settings Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Print Settings:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div>
                <span className="font-medium">Label Size:</span> {LABEL_SIZES[labelSettings.label_size].name}
              </div>
              <div>
                <span className="font-medium">Layout:</span> {labelSettings.print_layout === 'single' ? 'Single' : 'Double (2 per page)'}
              </div>
              <div>
                <span className="font-medium">Barcode Height:</span> {labelSettings.barcode_height}mm
              </div>
              <div>
                <span className="font-medium">Fields:</span> {
                  [
                    labelSettings.show_product_name && 'Product Name',
                    labelSettings.show_article_code && 'Article',
                    labelSettings.show_mrp && 'MRP',
                    labelSettings.show_sale_price && 'Sale Price',
                    labelSettings.show_size && 'Size',
                    labelSettings.show_color && 'Color',
                  ].filter(Boolean).join(', ') || 'None'
                }
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              To customize these settings, go to System Settings → Barcode Label Settings
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Open barcode label settings page
                const settingsUrl = window.location.origin + '/settings/barcode-label'
                window.open(settingsUrl, '_blank')
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedCount === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Print {selectedCount > 0 ? `(${selectedCount})` : ''}
            </button>
          </div>
        </div>

        {/* Hidden print container */}
        <div ref={printRef} className="hidden"></div>
      </div>
    </div>
  )
}

export default BarcodePrintModal
