/**
 * CA / Accounts Reports – Tally-style reports for Chartered Accountant
 * Sales Register, Purchase Register, GST Summary, Stock Summary
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { LoadingState } from '../components/LoadingState'
import { useToast } from '../context/ToastContext'
import { saleService } from '../services/saleService'
import { purchaseService } from '../services/purchaseService'
import { productService } from '../services/productService'
import { reportService } from '../services/reportService'
import type { Sale } from '../types/sale'
import type { Purchase, GSTPurchase, SimplePurchase } from '../types/purchase'
import type { Product } from '../services/productService'
import {
  exportToExcel,
  exportDataToPDF,
  exportGSTR1PortalExcel,
  exportGSTR2PortalExcel,
  exportGSTR3BExcel,
} from '../utils/exportUtils'
import { Home, FileSpreadsheet, FileText, Calendar, Download } from 'lucide-react'

type ReportTab = 'gstr' | 'sales' | 'purchase' | 'gst' | 'stock' | 'hsn' | 'period'
type TimePeriod = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'

const CAReports = () => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ReportTab>('gstr')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('thisMonth')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const { startDate, endDate } = reportService.getDateRange(
    timePeriod as any,
    customStart || undefined,
    customEnd || undefined
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const companyId = getCurrentCompanyId()
      try {
        const [salesData, purchasesData, productsData] = await Promise.all([
          saleService.getAll(true, companyId ?? undefined),
          purchaseService.getAll(undefined, companyId ?? undefined),
          productService.getAll(true, companyId ?? undefined),
        ])
        setSales(salesData)
        setPurchases(purchasesData)
        setProducts(productsData)
      } catch (e) {
        console.error('CA Reports load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getCurrentCompanyId])

  const filterByDate = <T extends { sale_date?: string; purchase_date?: string }>(
    list: T[],
    dateKey: 'sale_date' | 'purchase_date'
  ): T[] => {
    if (!startDate && !endDate) return list
    return list.filter(item => {
      const d = (item[dateKey] || '') as string
      if (!d) return false
      const t = new Date(d).getTime()
      if (startDate && t < new Date(startDate).getTime()) return false
      if (endDate && t > new Date(endDate + 'T23:59:59').getTime()) return false
      return true
    })
  }

  const filteredSales = useMemo(() => filterByDate(sales, 'sale_date'), [sales, startDate, endDate])
  const filteredPurchases = useMemo(() => filterByDate(purchases, 'purchase_date'), [purchases, startDate, endDate])

  // Sales Register (GSTR-1 style): Date, Invoice No., Customer, HSN, Taxable value, CGST, SGST/IGST, Discount, Round-off, Total
  const salesRegisterRows = useMemo(() => {
    const productMap = new Map(products.map(p => [p.id, p]))
    const rows: any[][] = []
    filteredSales.forEach(sale => {
      const taxAmt = sale.tax_amount || 0
      const discountAmt = sale.discount || 0
      const subtotal = sale.subtotal ?? 0
      const roundOff = (sale.grand_total ?? 0) - (subtotal - discountAmt + taxAmt)
      // CGST/SGST split 50-50 when no split stored (intra-state); else use IGST
      const cgst = Math.round((taxAmt / 2) * 100) / 100
      const sgst = taxAmt - cgst
      const igst = 0
      sale.items.forEach((item, idx) => {
        const product = productMap.get(item.product_id)
        const hsn = product?.hsn_code || ''
        const taxableValue = item.total
        const taxThisRow = idx === 0 ? taxAmt : 0
        const cgstRow = idx === 0 ? cgst : 0
        const sgstRow = idx === 0 ? sgst : 0
        const igstRow = idx === 0 ? igst : 0
        const discountRow = idx === 0 ? discountAmt : 0
        const roundOffRow = idx === 0 ? roundOff : 0
        const totalRow = item.total + (idx === 0 ? taxAmt + roundOff : 0)
        rows.push([
          new Date(sale.sale_date).toLocaleDateString('en-IN'),
          sale.invoice_number,
          sale.customer_name || 'Walk-in',
          (sale as any).customer_gstin || '',
          hsn,
          parseFloat((taxableValue).toFixed(2)),
          parseFloat((cgstRow).toFixed(2)),
          parseFloat((sgstRow).toFixed(2)),
          parseFloat((igstRow).toFixed(2)),
          parseFloat((discountRow).toFixed(2)),
          parseFloat((roundOffRow).toFixed(2)),
          parseFloat((totalRow).toFixed(2)),
        ])
      })
    })
    return rows
  }, [filteredSales, products])

  // Purchase Register (GSTR-2 style): Inward supplies / input credit — Date, Bill No., Supplier, HSN, Taxable value, CGST, SGST, IGST, Total
  const purchaseRegisterRows = useMemo(() => {
    const rows: any[][] = []
    filteredPurchases.forEach(p => {
      const isGst = p.type === 'gst'
      const gstP = p as GSTPurchase
      const simpleP = p as SimplePurchase
      const billNo = isGst ? gstP.invoice_number : (simpleP.invoice_number || `#${p.id}`)
      const supplierName = isGst ? gstP.supplier_name : simpleP.supplier_name
      const supplierGstin = isGst ? gstP.supplier_gstin : ''
      const grandTotal = isGst ? (gstP.grand_total ?? 0) : (simpleP.total_amount ?? 0)
      const cgstBill = isGst ? (gstP.cgst_amount ?? 0) : 0
      const sgstBill = isGst ? (gstP.sgst_amount ?? 0) : 0
      const igstBill = isGst ? (gstP.igst_amount ?? 0) : 0
      p.items.forEach(item => {
        const itemTotal = item.total ?? 0
        const taxable = itemTotal - (item.tax_amount ?? 0)
        const ratio = grandTotal > 0 ? itemTotal / grandTotal : 0
        const cgstRow = cgstBill * ratio
        const sgstRow = sgstBill * ratio
        const igstRow = igstBill * ratio
        const totalAmt = itemTotal
        rows.push([
          new Date(p.purchase_date).toLocaleDateString('en-IN'),
          billNo,
          supplierName || 'N/A',
          supplierGstin,
          isGst ? 'GST' : 'Simple',
          item.hsn_code || '',
          parseFloat((taxable).toFixed(2)),
          parseFloat((cgstRow).toFixed(2)),
          parseFloat((sgstRow).toFixed(2)),
          parseFloat((igstRow).toFixed(2)),
          parseFloat((totalAmt).toFixed(2)),
        ])
      })
    })
    return rows
  }, [filteredPurchases])

  // GST Summary: outward (sales) and inward (purchases) by rate
  const gstSummaryRows = useMemo(() => {
    let outwardTaxable = 0
    let outwardTax = 0
    filteredSales.forEach(s => {
      outwardTaxable += s.subtotal ?? 0
      outwardTax += s.tax_amount ?? 0
    })
    let inwardTaxable = 0
    let inwardTax = 0
    filteredPurchases.forEach(p => {
      if (p.type === 'gst') {
        const g = p as GSTPurchase
        inwardTaxable += g.subtotal ?? 0
        inwardTax += g.total_tax ?? 0
      }
    })
    return [
      ['Outward supplies (Sales)', 'Taxable Value', parseFloat(outwardTaxable.toFixed(2)), 'Tax', parseFloat(outwardTax.toFixed(2))],
      ['Inward supplies (Purchases)', 'Taxable Value', parseFloat(inwardTaxable.toFixed(2)), 'ITC', parseFloat(inwardTax.toFixed(2))],
    ]
  }, [filteredSales, filteredPurchases])

  // Stock Summary: product-wise purchases qty, sales qty, closing (from product.stock_quantity)
  const stockSummaryRows = useMemo(() => {
    const purchaseQty: Record<number, number> = {}
    const saleQty: Record<number, number> = {}
    filteredPurchases.forEach(p => {
      p.items.forEach(item => {
        const id = item.product_id
        purchaseQty[id] = (purchaseQty[id] || 0) + (item.quantity ?? 0)
      })
    })
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        const id = item.product_id
        saleQty[id] = (saleQty[id] || 0) + (item.quantity ?? 0)
      })
    })
    return products.map(prod => {
      const purchased = purchaseQty[prod.id] || 0
      const sold = saleQty[prod.id] || 0
      const closing = prod.stock_quantity ?? 0
      const opening = Math.max(0, closing - purchased + sold)
      return [
        prod.name,
        prod.hsn_code || '',
        prod.unit || 'pcs',
        opening,
        purchased,
        sold,
        closing,
      ]
    })
  }, [filteredSales, filteredPurchases, products])

  const salesRegisterHeaders = ['Date', 'Invoice No.', 'Customer', 'GSTIN', 'HSN', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Discount', 'Round Off', 'Total']
  const purchaseRegisterHeaders = ['Date', 'Bill No.', 'Supplier', 'GSTIN', 'Type', 'HSN', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total']
  const gstSummaryHeaders = ['Description', 'Label', 'Amount', 'Label 2', 'Amount 2']
  const stockSummaryHeaders = ['Product', 'HSN', 'Unit', 'Opening', 'Purchases', 'Sales', 'Closing']

  // GSTR-1 portal upload format: one row per invoice (B2B)
  const gstr1PortalRows = useMemo(() => {
    const productMap = new Map(products.map(p => [p.id, p]))
    return filteredSales.map(sale => {
      const taxAmt = sale.tax_amount || 0
      const cgst = Math.round((taxAmt / 2) * 100) / 100
      const sgst = taxAmt - cgst
      const invDate = sale.sale_date.split('T')[0]
      return [
        (sale as any).customer_gstin || '',
        sale.customer_name || 'Walk-in',
        sale.invoice_number,
        invDate,
        parseFloat((sale.grand_total ?? 0).toFixed(2)),
        '', // Place of Supply (State Code) - user can fill
        parseFloat((sale.subtotal ?? 0).toFixed(2)),
        '', // CGST Rate %
        parseFloat(cgst.toFixed(2)),
        '', // SGST Rate %
        parseFloat(sgst.toFixed(2)),
        '', // IGST Rate %
        0,
        0, // Cess
        parseFloat((sale.grand_total ?? 0).toFixed(2)),
      ]
    })
  }, [filteredSales, products])

  // GSTR-2 portal upload format: one row per purchase (inward B2B)
  const gstr2PortalRows = useMemo(() => {
    return filteredPurchases
      .filter(p => p.type === 'gst')
      .map(p => {
        const g = p as GSTPurchase
        return [
          g.supplier_gstin || '',
          g.supplier_name || 'N/A',
          g.invoice_number || '',
          g.purchase_date.split('T')[0],
          parseFloat((g.grand_total ?? 0).toFixed(2)),
          parseFloat((g.subtotal ?? 0).toFixed(2)),
          parseFloat((g.cgst_amount ?? 0).toFixed(2)),
          parseFloat((g.sgst_amount ?? 0).toFixed(2)),
          parseFloat((g.igst_amount ?? 0).toFixed(2)),
          parseFloat((g.grand_total ?? 0).toFixed(2)),
        ]
      })
  }, [filteredPurchases])

  // HSN Summary: HSN-wise outward (sales) and inward (purchases) taxable value and tax
  const hsnSummaryRows = useMemo(() => {
    const outwardByHsn: Record<string, { taxable: number; tax: number }> = {}
    const productMap = new Map(products.map(p => [p.id, p]))
    filteredSales.forEach(sale => {
      const taxAmt = sale.tax_amount || 0
      const itemCount = sale.items.length
      const taxPerItem = itemCount > 0 ? taxAmt / itemCount : 0
      sale.items.forEach((item, idx) => {
        const product = productMap.get(item.product_id)
        const hsn = product?.hsn_code || 'N/A'
        if (!outwardByHsn[hsn]) outwardByHsn[hsn] = { taxable: 0, tax: 0 }
        outwardByHsn[hsn].taxable += item.total ?? 0
        outwardByHsn[hsn].tax += idx === 0 ? taxAmt : 0 // allocate full tax to first row for simplicity; or split
      })
      // Simpler: allocate total sale tax to first item's HSN for summary
      const firstHsn = sale.items[0] && productMap.get(sale.items[0].product_id)?.hsn_code || 'N/A'
      if (!outwardByHsn[firstHsn]) outwardByHsn[firstHsn] = { taxable: 0, tax: 0 }
      outwardByHsn[firstHsn].tax += taxAmt
      sale.items.forEach(item => {
        const product = productMap.get(item.product_id)
        const hsn = product?.hsn_code || 'N/A'
        if (!outwardByHsn[hsn]) outwardByHsn[hsn] = { taxable: 0, tax: 0 }
        outwardByHsn[hsn].taxable += item.total ?? 0
      })
    })
    // Fix: we double-counted; do clean HSN aggregation per item
    const outwardClean: Record<string, { taxable: number; tax: number }> = {}
    filteredSales.forEach(sale => {
      const taxAmt = sale.tax_amount || 0
      const totalTaxable = sale.items.reduce((s, i) => s + (i.total ?? 0), 0)
      sale.items.forEach(item => {
        const product = productMap.get(item.product_id)
        const hsn = product?.hsn_code || 'N/A'
        if (!outwardClean[hsn]) outwardClean[hsn] = { taxable: 0, tax: 0 }
        outwardClean[hsn].taxable += item.total ?? 0
        if (totalTaxable > 0) outwardClean[hsn].tax += (taxAmt * (item.total ?? 0)) / totalTaxable
      })
    })
    const inwardClean: Record<string, { taxable: number; tax: number }> = {}
    filteredPurchases.forEach(p => {
      if (p.type !== 'gst') return
      const g = p as GSTPurchase
      const totalTaxable = g.items.reduce((s, i) => s + ((i.total ?? 0) - (i.tax_amount ?? 0)), 0)
      const totalTax = g.total_tax ?? 0
      g.items.forEach(item => {
        const hsn = item.hsn_code || 'N/A'
        if (!inwardClean[hsn]) inwardClean[hsn] = { taxable: 0, tax: 0 }
        const taxable = (item.total ?? 0) - (item.tax_amount ?? 0)
        inwardClean[hsn].taxable += taxable
        if (totalTaxable > 0) inwardClean[hsn].tax += (totalTax * taxable) / totalTaxable
      })
    })
    const allHsns = new Set([...Object.keys(outwardClean), ...Object.keys(inwardClean)])
    return Array.from(allHsns).sort().map(hsn => [
      hsn,
      parseFloat((outwardClean[hsn]?.taxable ?? 0).toFixed(2)),
      parseFloat((outwardClean[hsn]?.tax ?? 0).toFixed(2)),
      parseFloat((inwardClean[hsn]?.taxable ?? 0).toFixed(2)),
      parseFloat((inwardClean[hsn]?.tax ?? 0).toFixed(2)),
    ])
  }, [filteredSales, filteredPurchases, products])

  const hsnSummaryHeaders = ['HSN', 'Outward Taxable Value', 'Outward Tax', 'Inward Taxable Value', 'Inward Tax (ITC)']

  // Period summary: by month or quarter
  const [periodGroupBy, setPeriodGroupBy] = useState<'month' | 'quarter'>('month')
  const periodSummaryRows = useMemo(() => {
    const byKey: Record<string, { outwardTaxable: number; outwardTax: number; inwardTaxable: number; inwardTax: number }> = {}
    const getKey = (dateStr: string) => {
      const d = new Date(dateStr)
      if (periodGroupBy === 'quarter') {
        const q = Math.floor(d.getMonth() / 3) + 1
        return `${d.getFullYear()}-Q${q}`
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    filteredSales.forEach(s => {
      const k = getKey(s.sale_date)
      if (!byKey[k]) byKey[k] = { outwardTaxable: 0, outwardTax: 0, inwardTaxable: 0, inwardTax: 0 }
      byKey[k].outwardTaxable += s.subtotal ?? 0
      byKey[k].outwardTax += s.tax_amount ?? 0
    })
    filteredPurchases.forEach(p => {
      if (p.type !== 'gst') return
      const g = p as GSTPurchase
      const k = getKey(p.purchase_date)
      if (!byKey[k]) byKey[k] = { outwardTaxable: 0, outwardTax: 0, inwardTaxable: 0, inwardTax: 0 }
      byKey[k].inwardTaxable += g.subtotal ?? 0
      byKey[k].inwardTax += g.total_tax ?? 0
    })
    return Object.entries(byKey)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => [
        period,
        parseFloat(v.outwardTaxable.toFixed(2)),
        parseFloat(v.outwardTax.toFixed(2)),
        parseFloat(v.inwardTaxable.toFixed(2)),
        parseFloat(v.inwardTax.toFixed(2)),
      ])
  }, [filteredSales, filteredPurchases, periodGroupBy])

  const periodSummaryHeaders = ['Period', 'Outward Taxable', 'Outward Tax', 'Inward Taxable', 'Inward Tax (ITC)']

  // GSTR-3B style: one row per period with Net Tax Payable (Outward Tax - ITC)
  const gstr3bRows = useMemo(() => {
    return periodSummaryRows.map(row => {
      const period = row[0]
      const outwardTax = Number(row[2]) || 0
      const inwardTax = Number(row[4]) || 0
      const netTaxPayable = Math.max(0, outwardTax - inwardTax)
      return [
        period,
        row[1],
        row[2],
        row[3],
        row[4],
        parseFloat(netTaxPayable.toFixed(2)),
      ]
    })
  }, [periodSummaryRows])

  const exportSalesRegister = () => {
    const filename = `CA_Sales_Register_${startDate || 'all'}_${endDate || 'all'}`
    exportToExcel(salesRegisterRows, salesRegisterHeaders, filename, 'Sales Register')
    toast.success('Sales register exported to Excel')
  }
  const exportPurchaseRegister = () => {
    const filename = `CA_Purchase_Register_${startDate || 'all'}_${endDate || 'all'}`
    exportToExcel(purchaseRegisterRows, purchaseRegisterHeaders, filename, 'Purchase Register')
    toast.success('Purchase register exported to Excel')
  }
  const exportGstSummary = () => {
    const filename = `CA_GST_Summary_${startDate || 'all'}_${endDate || 'all'}`
    exportToExcel(gstSummaryRows, gstSummaryHeaders, filename, 'GST Summary')
    toast.success('GST summary exported to Excel')
  }
  const exportStockSummary = () => {
    const filename = `CA_Stock_Summary_${startDate || 'all'}_${endDate || 'all'}`
    exportToExcel(stockSummaryRows, stockSummaryHeaders, filename, 'Stock Summary')
    toast.success('Stock summary exported to Excel')
  }

  const exportGSTR1 = () => {
    const filename = `GSTR1_B2B_${startDate || 'all'}_${endDate || 'all'}`
    exportGSTR1PortalExcel(gstr1PortalRows, filename)
    toast.success('GSTR-1 B2B export downloaded (GST portal format)')
  }
  const exportGSTR2 = () => {
    const filename = `GSTR2_B2B_${startDate || 'all'}_${endDate || 'all'}`
    exportGSTR2PortalExcel(gstr2PortalRows, filename)
    toast.success('GSTR-2 B2B export downloaded (GST portal format)')
  }
  const exportGSTR3B = () => {
    const filename = `GSTR3B_Summary_${startDate || 'all'}_${endDate || 'all'}`
    exportGSTR3BExcel(gstr3bRows, filename)
    toast.success('GSTR-3B summary export downloaded')
  }

  const exportSalesPDF = () => {
    const filename = `CA_Sales_Register_${startDate || 'all'}_${endDate || 'all'}.pdf`
    exportDataToPDF(salesRegisterRows, salesRegisterHeaders, filename, 'Sales Register', { orientation: 'landscape' })
    toast.success('Sales register PDF downloaded')
  }
  const exportPurchasePDF = () => {
    const filename = `CA_Purchase_Register_${startDate || 'all'}_${endDate || 'all'}.pdf`
    exportDataToPDF(purchaseRegisterRows, purchaseRegisterHeaders, filename, 'Purchase Register', { orientation: 'landscape' })
    toast.success('Purchase register PDF downloaded')
  }
  const exportGstSummaryPDF = () => {
    const filename = `CA_GST_Summary_${startDate || 'all'}_${endDate || 'all'}.pdf`
    exportDataToPDF(gstSummaryRows, gstSummaryHeaders, filename, 'GST Summary')
    toast.success('GST summary PDF downloaded')
  }

  const exportHsnSummary = () => {
    const filename = `CA_HSN_Summary_${startDate || 'all'}_${endDate || 'all'}`
    exportToExcel(hsnSummaryRows, hsnSummaryHeaders, filename, 'HSN Summary')
    toast.success('HSN summary exported to Excel')
  }
  const exportHsnSummaryPDF = () => {
    const filename = `CA_HSN_Summary_${startDate || 'all'}_${endDate || 'all'}.pdf`
    exportDataToPDF(hsnSummaryRows, hsnSummaryHeaders, filename, 'HSN Summary', { orientation: 'landscape' })
    toast.success('HSN summary PDF downloaded')
  }

  const exportPeriodSummary = () => {
    const filename = `CA_Period_Summary_${startDate || 'all'}_${endDate || 'all'}`
    exportToExcel(periodSummaryRows, periodSummaryHeaders, filename, 'Period Summary')
    toast.success('Period summary exported to Excel')
  }
  const exportPeriodSummaryPDF = () => {
    const filename = `CA_Period_Summary_${startDate || 'all'}_${endDate || 'all'}.pdf`
    exportDataToPDF(periodSummaryRows, periodSummaryHeaders, filename, 'Period Summary (Month/Quarter)', { orientation: 'landscape' })
    toast.success('Period summary PDF downloaded')
  }

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'gstr', label: 'GSTR-1 / GSTR-2 / GSTR-3B' },
    { id: 'sales', label: 'Sales Register' },
    { id: 'purchase', label: 'Purchase Register' },
    { id: 'gst', label: 'GST Summary' },
    { id: 'stock', label: 'Stock Summary' },
    { id: 'hsn', label: 'HSN Summary' },
    { id: 'period', label: 'Period Summary' },
  ]

  return (
    <ProtectedRoute requiredPermission="reports:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Back to Dashboard"
                >
                  <Home className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">CA / Accounts Reports</h1>
                  <p className="text-sm text-gray-600">GSTR-1, GSTR-2, GSTR-3B & Tally-style reports for Chartered Accountant</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Date range */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Period</span>
              </div>
              <select
                value={timePeriod}
                onChange={e => {
                  setTimePeriod(e.target.value as TimePeriod)
                  if (e.target.value !== 'custom') {
                    setCustomStart('')
                    setCustomEnd('')
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="thisWeek">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="custom">Custom</option>
              </select>
              {timePeriod === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </>
              )}
              <span className="text-sm text-gray-500">
                {startDate && endDate ? `${startDate} to ${endDate}` : 'All dates'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <LoadingState message="Loading reports..." />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* GSTR Reports — GSTR-1, GSTR-2, GSTR-3B for CA / GST filing */}
              {activeTab === 'gstr' && (
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">GSTR Reports for CA / GST Filing</h2>
                  <p className="text-sm text-gray-600 mb-4">Export outward supplies (GSTR-1), inward supplies (GSTR-2), and monthly summary (GSTR-3B) in GST portal–friendly format.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/50">
                      <h3 className="font-semibold text-indigo-900 mb-1">GSTR-1 (Outward Supplies)</h3>
                      <p className="text-xs text-gray-600 mb-3">B2B outward supplies — GSTIN, Customer, Invoice No., Date, Taxable value, CGST/SGST/IGST. Use for GST portal upload.</p>
                      <button
                        type="button"
                        onClick={exportGSTR1}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm w-full justify-center"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export GSTR-1
                      </button>
                    </div>
                    <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50">
                      <h3 className="font-semibold text-emerald-900 mb-1">GSTR-2 (Inward Supplies)</h3>
                      <p className="text-xs text-gray-600 mb-3">B2B inward supplies / input credit — Supplier GSTIN, Bill No., Date, Taxable value, CGST/SGST/IGST. Use for GST portal.</p>
                      <button
                        type="button"
                        onClick={exportGSTR2}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm w-full justify-center"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export GSTR-2
                      </button>
                    </div>
                    <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/50">
                      <h3 className="font-semibold text-amber-900 mb-1">GSTR-3B (Monthly Summary)</h3>
                      <p className="text-xs text-gray-600 mb-3">Period-wise outward taxable, outward tax, inward taxable, ITC, net tax payable. For CA review and monthly filing.</p>
                      <button
                        type="button"
                        onClick={exportGSTR3B}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm w-full justify-center"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export GSTR-3B
                      </button>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <p className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 border-b">GSTR-3B Summary (preview)</p>
                    <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200">Period</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border border-gray-200">Outward Taxable</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border border-gray-200">Outward Tax</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border border-gray-200">Inward Taxable</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border border-gray-200">ITC</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700 border border-gray-200">Net Tax Payable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gstr3bRows.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-4 text-center text-gray-500">No data in selected period</td>
                            </tr>
                          ) : (
                            gstr3bRows.map((row, i) => (
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 border border-gray-100">{row[0]}</td>
                                <td className="px-3 py-2 border border-gray-100 text-right">{row[1]}</td>
                                <td className="px-3 py-2 border border-gray-100 text-right">{row[2]}</td>
                                <td className="px-3 py-2 border border-gray-100 text-right">{row[3]}</td>
                                <td className="px-3 py-2 border border-gray-100 text-right">{row[4]}</td>
                                <td className="px-3 py-2 border border-gray-100 text-right font-medium">{row[5]}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Register — Outward supplies / GSTR-1 style */}
              {activeTab === 'sales' && (
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Sales Register</h2>
                      <p className="text-sm text-indigo-600 font-medium mt-0.5">Outward supplies for CA / GSTR-1 style — Date, Invoice No., Customer, HSN, Taxable value, CGST, SGST/IGST, Discount, Round-off, Total</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={exportSalesRegister}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Export Excel
                      </button>
                      <button
                        type="button"
                        onClick={exportGSTR1}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                        title="GST portal upload format"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export for GSTR-1
                      </button>
                      <button
                        type="button"
                        onClick={exportSalesPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {salesRegisterHeaders.map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {salesRegisterRows.length === 0 ? (
                          <tr>
                            <td colSpan={salesRegisterHeaders.length} className="px-3 py-6 text-center text-gray-500">
                              No sales in selected period
                            </td>
                          </tr>
                        ) : (
                          salesRegisterRows.map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 border border-gray-100">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Purchase Register — Inward supplies / GSTR-2 style */}
              {activeTab === 'purchase' && (
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Purchase Register</h2>
                      <p className="text-sm text-emerald-600 font-medium mt-0.5">Inward supplies / input credit / GSTR-2 style — Date, Bill No., Supplier, HSN, Taxable value, CGST, SGST, IGST, Total</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={exportPurchaseRegister}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Export Excel
                      </button>
                      <button
                        type="button"
                        onClick={exportGSTR2}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                        title="GST portal upload format"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export for GSTR-2
                      </button>
                      <button
                        type="button"
                        onClick={exportPurchasePDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {purchaseRegisterHeaders.map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRegisterRows.length === 0 ? (
                          <tr>
                            <td colSpan={purchaseRegisterHeaders.length} className="px-3 py-6 text-center text-gray-500">
                              No purchases in selected period
                            </td>
                          </tr>
                        ) : (
                          purchaseRegisterRows.map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 border border-gray-100">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* GST Summary */}
              {activeTab === 'gst' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">GST Summary</h2>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={exportGstSummary}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Export Excel
                      </button>
                      <button
                        type="button"
                        onClick={exportGstSummaryPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse max-w-xl">
                      <thead className="bg-gray-100">
                        <tr>
                          {gstSummaryHeaders.map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gstSummaryRows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 border border-gray-100">
                                {typeof cell === 'number' ? (cell as number).toFixed(2) : cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stock Summary */}
              {activeTab === 'stock' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Stock Summary</h2>
                    <button
                      type="button"
                      onClick={exportStockSummary}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Export Excel
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {stockSummaryHeaders.map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stockSummaryRows.length === 0 ? (
                          <tr>
                            <td colSpan={stockSummaryHeaders.length} className="px-3 py-6 text-center text-gray-500">
                              No products
                            </td>
                          </tr>
                        ) : (
                          stockSummaryRows.map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 border border-gray-100">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* HSN Summary — HSN-wise outward/inward value and tax (GSTR-1 B2B support) */}
              {activeTab === 'hsn' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">HSN Summary</h2>
                    <p className="text-sm text-gray-600 w-full">HSN-wise outward (sales) and inward (purchases) taxable value and tax — for GSTR-1 B2B filing</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={exportHsnSummary}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Export Excel
                      </button>
                      <button
                        type="button"
                        onClick={exportHsnSummaryPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {hsnSummaryHeaders.map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hsnSummaryRows.length === 0 ? (
                          <tr>
                            <td colSpan={hsnSummaryHeaders.length} className="px-3 py-6 text-center text-gray-500">
                              No HSN data in selected period
                            </td>
                          </tr>
                        ) : (
                          hsnSummaryRows.map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 border border-gray-100">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Period Summary — by month or quarter (financial year / audit) */}
              {activeTab === 'period' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Period Summary</h2>
                    <p className="text-sm text-gray-600 w-full">Outward and inward taxable value and tax by month or quarter — for periodic review and audits</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Group by:</span>
                        <select
                          value={periodGroupBy}
                          onChange={e => setPeriodGroupBy(e.target.value as 'month' | 'quarter')}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="month">Month</option>
                          <option value="quarter">Quarter</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={exportPeriodSummary}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Export Excel
                        </button>
                        <button
                          type="button"
                          onClick={exportPeriodSummaryPDF}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          <FileText className="w-4 h-4" />
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {periodSummaryHeaders.map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periodSummaryRows.length === 0 ? (
                          <tr>
                            <td colSpan={periodSummaryHeaders.length} className="px-3 py-6 text-center text-gray-500">
                              No data in selected period
                            </td>
                          </tr>
                        ) : (
                          periodSummaryRows.map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 border border-gray-100">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default CAReports
