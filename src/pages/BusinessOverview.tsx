import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { userService } from '../services/userService'
import { saleService } from '../services/saleService'
import { purchaseService } from '../services/purchaseService'
import { expenseService } from '../services/expenseService'
import { ExpenseType, Expense } from '../types/expense'
import { Sale } from '../types/sale'
import { User } from '../types/auth'
import jsPDF from 'jspdf'
import {
  Home,
  Users,
  Wallet,
  TrendingUp,
  ShoppingBag,
  Package,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Download,
  FileText,
  Percent,
  FileDown,
  X,
  Copy,
} from 'lucide-react'

type DetailView = 'employees' | 'salary' | 'expenses' | 'sales' | 'purchases' | 'cogs' | 'expenseType' | null

type TimePeriod = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  salary: 'Employee Salary',
  sales_person_payment: 'Sales Person Payment',
  purchase: 'Purchase',
  transport: 'Transport',
  office: 'Office',
  utility: 'Utility',
  maintenance: 'Maintenance',
  marketing: 'Marketing',
  other: 'Other',
  opening: 'Opening Balance',
  closing: 'Closing Balance',
}

const BusinessOverview = () => {
  const { getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('thisMonth')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [periodLabel, setPeriodLabel] = useState('')
  const [detailView, setDetailView] = useState<DetailView>(null)
  const [detailExpenseType, setDetailExpenseType] = useState<string | null>(null)
  const [detailRecords, setDetailRecords] = useState<{
    employees: User[]
    sales: Sale[]
    purchases: Array<{ id: number; purchase_date: string; invoice_number: string; supplier_name?: string; grand_total?: number; total_amount?: number; type: string }>
    expenses: Expense[]
  }>({ employees: [], sales: [], purchases: [], expenses: [] })
  const [metrics, setMetrics] = useState({
    employeeCount: 0,
    totalSalaryPayments: 0,
    totalExpenses: 0,
    totalSales: 0,
    totalPurchases: 0,
    costOfGoodsSold: 0,
    profitLoss: 0,
    grossProfit: 0,
    saleCount: 0,
    purchaseCount: 0,
    expenseCount: 0,
    expenseByType: {} as Record<ExpenseType, number>,
    prevTotalSales: 0,
    prevTotalExpenses: 0,
    prevProfitLoss: 0,
  })

  const getDateRange = (): {
    startDate: string | undefined
    endDate: string | undefined
    prevStartDate: string | undefined
    prevEndDate: string | undefined
  } => {
    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined
    let prevStartDate: string | undefined
    let prevEndDate: string | undefined

    switch (timePeriod) {
      case 'today': {
        startDate = endDate = now.toISOString().split('T')[0]
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        prevStartDate = prevEndDate = yesterday.toISOString().split('T')[0]
        break
      }
      case 'thisWeek': {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        const prevWeekEnd = new Date(weekStart)
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)
        const prevWeekStart = new Date(prevWeekEnd)
        prevWeekStart.setDate(prevWeekStart.getDate() - 6)
        prevStartDate = prevWeekStart.toISOString().split('T')[0]
        prevEndDate = prevWeekEnd.toISOString().split('T')[0]
        break
      }
      case 'thisMonth': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
        break
      }
      case 'thisYear': {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]
        prevEndDate = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
        break
      }
      case 'custom':
        startDate = customStart || undefined
        endDate = customEnd || undefined
        break
      default:
        startDate = endDate = undefined
    }
    return { startDate, endDate, prevStartDate, prevEndDate }
  }

  const formatPeriodLabel = (start?: string, end?: string) => {
    if (!start && !end) return 'All time'
    if (start && end && start === end) return new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    if (start && end) return `${new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    return start || end ? new Date(start || end!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'All time'
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const companyId = getCurrentCompanyId()
      const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange()

      setPeriodLabel(formatPeriodLabel(startDate, endDate))

      const [allUsers, allSales, allPurchases, allExpenses] = await Promise.all([
        userService.getAll(),
        saleService.getAll(true, companyId),
        purchaseService.getAll(undefined, companyId),
        expenseService.getAll(companyId),
      ])

      const filterByDate = (dateStr: string, from?: string, to?: string) => {
        const s = from ?? startDate
        const e = to ?? endDate
        if (!s && !e) return true
        const t = new Date(dateStr).getTime()
        if (s && t < new Date(s).getTime()) return false
        if (e && t > new Date(e).getTime() + 86400000) return false
        return true
      }

      const filteredSales = allSales.filter(s => filterByDate(s.sale_date))
      const filteredPurchases = allPurchases.filter(p => filterByDate(p.purchase_date))
      const filteredExpenses = allExpenses.filter(e => filterByDate(e.expense_date))

      const totalSales = filteredSales.reduce((sum, s) => sum + s.grand_total, 0)
      const totalPurchases = filteredPurchases.reduce((sum, p) => {
        return sum + (p.type === 'gst' ? (p as any).grand_total || 0 : (p as any).total_amount || 0)
      }, 0)

      const costOfGoodsSold = filteredSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          if (item.sale_type === 'sale' && item.purchase_price != null) {
            return itemSum + item.purchase_price * item.quantity
          }
          return itemSum
        }, 0)
      }, 0)

      const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
      const totalSalaryPayments = filteredExpenses
        .filter(e => e.expense_type === 'salary' || e.expense_type === 'sales_person_payment')
        .reduce((sum, e) => sum + e.amount, 0)

      const expenseByType = {} as Record<ExpenseType, number>
      filteredExpenses.forEach(e => {
        if (e.expense_type !== 'opening' && e.expense_type !== 'closing') {
          expenseByType[e.expense_type] = (expenseByType[e.expense_type] || 0) + e.amount
        }
      })

      const employeeCount = companyId != null
        ? allUsers.filter(u => u.company_id === companyId).length
        : allUsers.filter(u => u.role !== 'admin').length

      const grossProfit = totalSales - costOfGoodsSold
      const profitLoss = totalSales - costOfGoodsSold - totalExpenses

      let prevTotalSales = 0
      let prevTotalExpenses = 0
      let prevProfitLoss = 0
      if (prevStartDate && prevEndDate) {
        const prevSales = allSales.filter(s => filterByDate(s.sale_date, prevStartDate, prevEndDate))
        const prevPurchases = allPurchases.filter(p => filterByDate(p.purchase_date, prevStartDate, prevEndDate))
        const prevExpenses = allExpenses.filter(e => filterByDate(e.expense_date, prevStartDate, prevEndDate))
        prevTotalSales = prevSales.reduce((sum, s) => sum + s.grand_total, 0)
        const prevCOGS = prevSales.reduce((sum, sale) => {
          return sum + sale.items.reduce((itemSum, item) => {
            if (item.sale_type === 'sale' && item.purchase_price != null) return itemSum + item.purchase_price * item.quantity
            return itemSum
          }, 0)
        }, 0)
        prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + e.amount, 0)
        prevProfitLoss = prevTotalSales - prevCOGS - prevTotalExpenses
      }

      const employeeList = companyId != null
        ? allUsers.filter(u => u.company_id === companyId)
        : allUsers.filter(u => u.role !== 'admin')

      setDetailRecords({
        employees: employeeList,
        sales: filteredSales,
        purchases: filteredPurchases.map(p => ({
          id: p.id,
          purchase_date: p.purchase_date,
          invoice_number: p.type === 'gst' ? (p as any).invoice_number : (p as any).invoice_number,
          supplier_name: (p as any).supplier_name,
          grand_total: p.type === 'gst' ? (p as any).grand_total : undefined,
          total_amount: p.type === 'simple' ? (p as any).total_amount : undefined,
          type: p.type,
        })),
        expenses: filteredExpenses,
      })
      setMetrics({
        employeeCount,
        totalSalaryPayments,
        totalExpenses,
        totalSales,
        totalPurchases,
        costOfGoodsSold,
        profitLoss,
        grossProfit,
        saleCount: filteredSales.length,
        purchaseCount: filteredPurchases.length,
        expenseCount: filteredExpenses.length,
        expenseByType,
        prevTotalSales,
        prevTotalExpenses,
        prevProfitLoss,
      })
      setLoading(false)
    }
    load()
  }, [timePeriod, customStart, customEnd, getCurrentCompanyId])

  const formatMoney = (n: number) =>
    `₹${Math.round(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const profitMarginPct = metrics.totalSales > 0 ? (metrics.profitLoss / metrics.totalSales) * 100 : 0
  const expenseRatioPct = metrics.totalSales > 0 ? (metrics.totalExpenses / metrics.totalSales) * 100 : 0
  const salesChange = metrics.prevTotalSales > 0 ? ((metrics.totalSales - metrics.prevTotalSales) / metrics.prevTotalSales) * 100 : null
  const expensesChange = metrics.prevTotalExpenses > 0 ? ((metrics.totalExpenses - metrics.prevTotalExpenses) / metrics.prevTotalExpenses) * 100 : null
  const plChange = metrics.prevProfitLoss !== 0 ? (metrics.profitLoss - metrics.prevProfitLoss) : null

  const handleExport = () => {
    const lines = [
      `Business Overview – ${periodLabel}`,
      '',
      `Employees: ${metrics.employeeCount}`,
      `Salary / Payments: ${formatMoney(metrics.totalSalaryPayments)}`,
      `Day-by-day Expenses: ${formatMoney(metrics.totalExpenses)}`,
      `Total Sales: ${formatMoney(metrics.totalSales)} (${metrics.saleCount} transactions)`,
      `Total Purchase: ${formatMoney(metrics.totalPurchases)} (${metrics.purchaseCount} transactions)`,
      `Cost of Goods Sold: ${formatMoney(metrics.costOfGoodsSold)}`,
      `Gross Profit: ${formatMoney(metrics.grossProfit)}`,
      `Profit / Loss: ${formatMoney(metrics.profitLoss)}`,
      `Profit Margin: ${profitMarginPct.toFixed(1)}%`,
      '',
      'Expense breakdown:',
      ...Object.entries(metrics.expenseByType)
        .filter(([, amt]) => amt > 0)
        .map(([type, amt]) => `  ${EXPENSE_TYPE_LABELS[type] || type}: ${formatMoney(amt)}`),
    ]
    const text = lines.join('\n')
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => alert('Summary copied to clipboard. Paste into a document to save.'))
    } else {
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(`<pre style="font-family:monospace; padding:1rem;">${text.replace(/</g, '&lt;')}</pre>`)
        w.document.close()
        w.print()
      }
    }
  }

  const addPdfLine = (pdf: jsPDF, margin: number, y: number, text: string, fontSize = 10, bold = false): number => {
    const pageH = pdf.internal.pageSize.height
    if (y > pageH - 25) {
      pdf.addPage()
      y = margin
    }
    pdf.setFontSize(fontSize)
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.text(text, margin, y)
    return y + (fontSize * 0.5 + 2)
  }

  const addPdfRow = (pdf: jsPDF, margin: number, pageWidth: number, y: number, label: string, value: string, bold = false): number => {
    const pageH = pdf.internal.pageSize.height
    if (y > pageH - 25) {
      pdf.addPage()
      y = margin
    }
    pdf.setFontSize(10)
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.text(label, margin, y)
    pdf.text(value, pageWidth - margin, y, { align: 'right' })
    return y + 6
  }

  const handleDownloadPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const margin = 20
    const pageWidth = pdf.internal.pageSize.width
    let y = margin

    // Header
    pdf.setFillColor(245, 158, 11) // amber
    pdf.rect(0, 0, pageWidth, 32, 'F')
    pdf.setTextColor(30, 41, 59) // slate-800
    pdf.setFontSize(22)
    pdf.setFont('helvetica', 'bold')
    pdf.text('BUSINESS OVERVIEW', margin, 20)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Period: ${periodLabel}`, margin, 27)
    pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, 27, { align: 'right' })
    pdf.setTextColor(0, 0, 0)
    y = 40

    // Section 1: Overview metrics (label-value table)
    y = addPdfLine(pdf, margin, y, '1. OVERVIEW METRICS', 12, true) + 2
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6
    y = addPdfRow(pdf, margin, pageWidth, y, 'Employees', String(metrics.employeeCount)) + 1
    y = addPdfRow(pdf, margin, pageWidth, y, 'Salary / Payments', formatMoney(metrics.totalSalaryPayments)) + 1
    y = addPdfRow(pdf, margin, pageWidth, y, 'Day-by-day Expenses', `${formatMoney(metrics.totalExpenses)} (${metrics.expenseCount} entries)`) + 1
    y = addPdfRow(pdf, margin, pageWidth, y, 'Total Sales', `${formatMoney(metrics.totalSales)} (${metrics.saleCount} txn)`) + 1
    y = addPdfRow(pdf, margin, pageWidth, y, 'Total Purchase', `${formatMoney(metrics.totalPurchases)} (${metrics.purchaseCount} txn)`) + 8

    // Section 2: Cost & profit (formula and summary)
    y = addPdfLine(pdf, margin, y, '2. COST & PROFIT SUMMARY', 12, true) + 2
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6
    y = addPdfRow(pdf, margin, pageWidth, y, 'Total Sales', formatMoney(metrics.totalSales)) + 1
    y = addPdfRow(pdf, margin, pageWidth, y, 'Less: Cost of Goods Sold', formatMoney(metrics.costOfGoodsSold)) + 1
    y = addPdfRow(pdf, margin, pageWidth, y, 'Gross Profit', formatMoney(metrics.grossProfit), true) + 2
    y = addPdfRow(pdf, margin, pageWidth, y, 'Less: Total Expenses', formatMoney(metrics.totalExpenses)) + 1
    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.4)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6
    y = addPdfRow(pdf, margin, pageWidth, y, 'Profit / Loss', formatMoney(metrics.profitLoss), true) + 2
    y = addPdfRow(pdf, margin, pageWidth, y, 'Profit Margin', `${profitMarginPct.toFixed(1)}%`) + 2
    y = addPdfRow(pdf, margin, pageWidth, y, 'Expense ratio (of sales)', `${expenseRatioPct.toFixed(1)}%`) + 8

    // Section 3: Expense breakdown by type (table)
    const expenseEntries = Object.entries(metrics.expenseByType)
      .filter(([, amt]) => amt > 0)
      .sort(([, a], [, b]) => b - a)
    if (expenseEntries.length > 0) {
      y = addPdfLine(pdf, margin, y, '3. EXPENSE BREAKDOWN BY TYPE', 12, true) + 2
      pdf.line(margin, y, pageWidth - margin, y)
      y += 6
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text('Type', margin, y)
      pdf.text('Amount', pageWidth - margin, y, { align: 'right' })
      y += 5
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      expenseEntries.forEach(([type, amt]) => {
        y = addPdfRow(pdf, margin, pageWidth, y, EXPENSE_TYPE_LABELS[type] || type, formatMoney(amt))
      })
      y += 6
    }

    // Footer
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Business Overview – HisabKitab Pro', margin, y)
    pdf.text(`Period: ${periodLabel}`, pageWidth - margin, y, { align: 'right' })
    const pageHeight = pdf.internal.pageSize.height
    pdf.text('Powered by HisabKitab Pro · hisabkitabpro.com', pageWidth / 2, pageHeight - 10, { align: 'center' })

    const safeLabel = periodLabel.replace(/[^a-zA-Z0-9\-]/g, '-').slice(0, 50)
    pdf.save(`Business-Overview-${safeLabel || 'report'}.pdf`)
  }

  const getDetailTitle = () => {
    if (detailView === 'expenseType' && detailExpenseType) return EXPENSE_TYPE_LABELS[detailExpenseType] || detailExpenseType
    if (detailView === 'employees') return 'Employees'
    if (detailView === 'salary') return 'Salary / Payments'
    if (detailView === 'expenses') return 'Day-by-day Expenses'
    if (detailView === 'sales') return 'Sales'
    if (detailView === 'purchases') return 'Purchases'
    if (detailView === 'cogs') return 'Cost of Goods Sold'
    return 'Details'
  }

  const handleDetailCopy = () => {
    const title = getDetailTitle()
    let lines: string[] = [`${title} – ${periodLabel}`, '', `Generated: ${new Date().toLocaleString('en-IN')}`, '']
    if (detailView === 'employees') {
      lines.push('Name\tEmail\tRole')
      detailRecords.employees.forEach(u => lines.push(`${u.name}\t${u.email}\t${u.role}`))
    } else if (detailView === 'salary') {
      const list = detailRecords.expenses.filter(e => e.expense_type === 'salary' || e.expense_type === 'sales_person_payment')
      lines.push('Date\tType\tAmount\tDescription\tSales Person')
      list.forEach(e => lines.push(`${new Date(e.expense_date).toLocaleDateString('en-IN')}\t${EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type}\t${formatMoney(e.amount)}\t${e.description || '—'}\t${e.sales_person_name || '—'}`))
    } else if (detailView === 'expenses') {
      lines.push('Date\tType\tAmount\tDescription')
      detailRecords.expenses.forEach(e => lines.push(`${new Date(e.expense_date).toLocaleDateString('en-IN')}\t${EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type}\t${formatMoney(e.amount)}\t${e.description || '—'}`))
    } else if (detailView === 'sales') {
      lines.push('Date\tInvoice\tCustomer\tAmount')
      detailRecords.sales.forEach(s => lines.push(`${new Date(s.sale_date).toLocaleDateString('en-IN')}\t${s.invoice_number}\t${s.customer_name || 'Walk-in'}\t${formatMoney(s.grand_total)}`))
    } else if (detailView === 'purchases') {
      lines.push('Date\tInvoice\tSupplier\tAmount')
      detailRecords.purchases.forEach(p => lines.push(`${new Date(p.purchase_date).toLocaleDateString('en-IN')}\t${p.invoice_number}\t${p.supplier_name || '—'}\t${formatMoney(p.grand_total ?? p.total_amount ?? 0)}`))
    } else if (detailView === 'cogs') {
      const rows = detailRecords.sales.flatMap(s =>
        s.items.filter(item => item.sale_type === 'sale' && item.purchase_price != null).map(item => ({ sale: s, item }))
      )
      lines.push('Date\tInvoice\tProduct\tQty\tUnit cost\tTotal cost')
      rows.forEach(({ sale, item }) => lines.push(`${new Date(sale.sale_date).toLocaleDateString('en-IN')}\t${sale.invoice_number}\t${item.product_name}\t${item.quantity}\t${formatMoney(item.purchase_price!)}\t${formatMoney(item.purchase_price! * item.quantity)}`))
    } else if (detailView === 'expenseType' && detailExpenseType) {
      const list = detailRecords.expenses.filter(e => e.expense_type === detailExpenseType)
      lines.push('Date\tAmount\tDescription')
      list.forEach(e => lines.push(`${new Date(e.expense_date).toLocaleDateString('en-IN')}\t${formatMoney(e.amount)}\t${e.description || '—'}`))
    }
    const text = lines.join('\n')
    navigator.clipboard?.writeText(text).then(() => alert('Detail copied to clipboard.'))
  }

  const handleDetailPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const margin = 20
    const pageWidth = pdf.internal.pageSize.width
    const pageH = pdf.internal.pageSize.height
    let y = margin

    const title = getDetailTitle()
    // Header block
    pdf.setFillColor(245, 158, 11)
    pdf.rect(0, 0, pageWidth, 28, 'F')
    pdf.setTextColor(30, 41, 59)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title.toUpperCase(), margin, 16)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Period: ${periodLabel}`, margin, 23)
    pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, 23, { align: 'right' })
    pdf.setTextColor(0, 0, 0)
    y = 36

    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 8

    const colCount = detailView === 'employees' ? 3 : detailView === 'salary' ? 5 : detailView === 'expenses' ? 4 : detailView === 'sales' || detailView === 'purchases' ? 4 : detailView === 'cogs' ? 5 : 3
    const colW = (pageWidth - 2 * margin) / colCount
    const addTableRow = (cols: string[], bold = false) => {
      if (y > pageH - 22) {
        pdf.addPage()
        y = margin
      }
      pdf.setFontSize(9)
      pdf.setFont('helvetica', bold ? 'bold' : 'normal')
      let x = margin
      cols.forEach((c, i) => {
        const w = i === cols.length - 1 ? pageWidth - margin - x : colW
        pdf.text(c.length > 24 ? c.substring(0, 21) + '...' : c, x, y, { maxWidth: w - 2 })
        x += w
      })
      y += 6
    }

    if (detailView === 'employees') {
      addTableRow(['Name', 'Email', 'Role'], true)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
      detailRecords.employees.forEach(u => addTableRow([u.name, u.email, u.role]))
    } else if (detailView === 'salary') {
      const list = detailRecords.expenses.filter(e => e.expense_type === 'salary' || e.expense_type === 'sales_person_payment')
      addTableRow(['Date', 'Type', 'Amount', 'Description', 'Sales Person'], true)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
      list.forEach(e => addTableRow([new Date(e.expense_date).toLocaleDateString('en-IN'), EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type, formatMoney(e.amount), (e.description || '—').substring(0, 22), (e.sales_person_name || '—').substring(0, 15)]))
    } else if (detailView === 'expenses') {
      addTableRow(['Date', 'Type', 'Amount', 'Description'], true)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
      detailRecords.expenses.forEach(e => addTableRow([new Date(e.expense_date).toLocaleDateString('en-IN'), EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type, formatMoney(e.amount), (e.description || '—').substring(0, 32)]))
    } else if (detailView === 'sales') {
      addTableRow(['Date', 'Invoice', 'Customer', 'Amount'], true)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
      detailRecords.sales.forEach(s => addTableRow([new Date(s.sale_date).toLocaleDateString('en-IN'), s.invoice_number, (s.customer_name || 'Walk-in').substring(0, 18), formatMoney(s.grand_total)]))
    } else if (detailView === 'purchases') {
      addTableRow(['Date', 'Invoice', 'Supplier', 'Amount'], true)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
      detailRecords.purchases.forEach(p => addTableRow([new Date(p.purchase_date).toLocaleDateString('en-IN'), p.invoice_number, (p.supplier_name || '—').substring(0, 18), formatMoney(p.grand_total ?? p.total_amount ?? 0)]))
    } else if (detailView === 'cogs') {
      const rows = detailRecords.sales.flatMap(s =>
        s.items.filter(item => item.sale_type === 'sale' && item.purchase_price != null).map(item => ({ sale: s, item }))
      )
      addTableRow(['Date', 'Invoice', 'Product', 'Qty', 'Total cost'], true)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
      rows.forEach(({ sale, item }) => addTableRow([new Date(sale.sale_date).toLocaleDateString('en-IN'), sale.invoice_number, item.product_name.substring(0, 20), String(item.quantity), formatMoney(item.purchase_price! * item.quantity)]))
    } else if (detailView === 'expenseType' && detailExpenseType) {
      const list = detailRecords.expenses.filter(e => e.expense_type === detailExpenseType)
      addTableRow(['Date', 'Amount', 'Description'], true)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 5
      list.forEach(e => addTableRow([new Date(e.expense_date).toLocaleDateString('en-IN'), formatMoney(e.amount), (e.description || '—').substring(0, 42)]))
    }

    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('Powered by HisabKitab Pro · hisabkitabpro.com', pageWidth / 2, pageH - 10, { align: 'center' })

    const safeTitle = title.replace(/[^a-zA-Z0-9\-]/g, '-').slice(0, 40)
    pdf.save(`${safeTitle}-${periodLabel.replace(/[^a-zA-Z0-9\-]/g, '-').slice(0, 20)}.pdf`)
  }

  return (
    <ProtectedRoute requiredPermission="business_overview:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Back to Dashboard"
                >
                  <Home className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-400/30">
                    <BarChart3 className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Business Overview</h1>
                    <p className="text-sm text-white/70">Employees, expenses, sales, cost & profit at a glance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Time period */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <Calendar className="w-5 h-5 text-white/60" />
            {(['today', 'thisWeek', 'thisMonth', 'thisYear', 'all', 'custom'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setTimePeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timePeriod === p
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-white/10 text-white/90 hover:bg-white/20'
                }`}
              >
                {p === 'all' ? 'All Time' : p === 'custom' ? 'Custom' : p.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
            {timePeriod === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                />
                <span className="text-white/60">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                />
              </div>
            )}
            <div className="w-full mt-2 text-sm text-white/60 font-medium">
              Showing: <span className="text-amber-300/90">{periodLabel}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-amber-500/50 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Hero P&L */}
              <div className="relative overflow-hidden rounded-2xl mb-8 p-8 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-400/20">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/10 to-transparent" />
                <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                  <div>
                    <p className="text-sm font-medium text-amber-300/90 uppercase tracking-wider mb-1">Profit / Loss</p>
                    <p className={`text-4xl sm:text-5xl font-extrabold flex items-center gap-2 ${
                      metrics.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {metrics.profitLoss >= 0 ? <ArrowUpRight className="w-10 h-10" /> : <ArrowDownRight className="w-10 h-10" />}
                      {formatMoney(metrics.profitLoss)}
                    </p>
                    <p className="text-white/60 text-sm mt-2">After cost of goods and expenses</p>
                    {plChange != null && (
                      <p className={`text-sm font-semibold mt-2 ${plChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {plChange >= 0 ? '+' : ''}{formatMoney(plChange)} vs previous period
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <IndianRupee className="w-4 h-4" />
                      <span>Sales − COGS − Expenses</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-white/70">
                        <Percent className="w-4 h-4" />
                        Margin: <span className={profitMarginPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>{profitMarginPct.toFixed(1)}%</span>
                      </span>
                      <span className="text-white/50">|</span>
                      <span className="text-white/70">Expense ratio: {expenseRatioPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric cards - clickable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div
                  onClick={() => setDetailView('employees')}
                  className="rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-blue-500/20">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">{metrics.employeeCount}</span>
                  </div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Employees</p>
                  <p className="text-xs text-white/50 mt-1">Users in this company · Click for list</p>
                </div>

                <div
                  onClick={() => setDetailView('salary')}
                  className="rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-violet-500/20">
                      <Wallet className="w-6 h-6 text-violet-400" />
                    </div>
                    <span className="text-xl font-bold text-white">{formatMoney(metrics.totalSalaryPayments)}</span>
                  </div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Salary / Payments</p>
                  <p className="text-xs text-white/50 mt-1">Employee salary + sales person · Click for list</p>
                </div>

                <div
                  onClick={() => setDetailView('expenses')}
                  className="rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-rose-500/20">
                      <TrendingUp className="w-6 h-6 text-rose-400" />
                    </div>
                    <span className="text-xl font-bold text-white">{formatMoney(metrics.totalExpenses)}</span>
                  </div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Day-by-day Expenses</p>
                  <p className="text-xs text-white/50 mt-1">{metrics.expenseCount} entries · Click for list</p>
                  {expensesChange != null && (
                    <p className={`text-xs font-medium mt-1 ${expensesChange >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {expensesChange >= 0 ? '+' : ''}{expensesChange.toFixed(1)}% vs prev
                    </p>
                  )}
                </div>

                <div
                  onClick={() => setDetailView('sales')}
                  className="rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-emerald-500/20">
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </div>
                    <span className="text-xl font-bold text-emerald-400">{formatMoney(metrics.totalSales)}</span>
                  </div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Total Sales</p>
                  <p className="text-xs text-white/50 mt-1">{metrics.saleCount} transaction{metrics.saleCount !== 1 ? 's' : ''} · Click for list</p>
                  {salesChange != null && (
                    <p className={`text-xs font-medium mt-1 ${salesChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {salesChange >= 0 ? '+' : ''}{salesChange.toFixed(1)}% vs prev
                    </p>
                  )}
                </div>

                <div
                  onClick={() => setDetailView('purchases')}
                  className="rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-cyan-500/20">
                      <ShoppingBag className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="text-xl font-bold text-cyan-400">{formatMoney(metrics.totalPurchases)}</span>
                  </div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Total Purchase</p>
                  <p className="text-xs text-white/50 mt-1">{metrics.purchaseCount} transaction{metrics.purchaseCount !== 1 ? 's' : ''} · Click for list</p>
                </div>

                <div
                  onClick={() => setDetailView('cogs')}
                  className="rounded-xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-amber-500/20">
                      <Package className="w-6 h-6 text-amber-400" />
                    </div>
                    <span className="text-xl font-bold text-amber-400">{formatMoney(metrics.costOfGoodsSold)}</span>
                  </div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Cost of Goods Sold</p>
                  <p className="text-xs text-white/50 mt-1">Actual cost of sold items · Click for details</p>
                </div>
              </div>

              {/* Expense breakdown by type */}
              {Object.keys(metrics.expenseByType).length > 0 && (
                <div className="mt-8 rounded-xl bg-white/5 border border-white/10 p-6">
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Expense breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(metrics.expenseByType)
                      .filter(([, amt]) => amt > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, amt]) => (
                        <div
                          key={type}
                          onClick={() => { setDetailView('expenseType'); setDetailExpenseType(type) }}
                          className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                        >
                          <span className="text-white/80 text-sm">{EXPENSE_TYPE_LABELS[type] || type}</span>
                          <span className="font-semibold text-white">{formatMoney(amt)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Summary strip + Export */}
              <div className="mt-8 rounded-xl bg-white/5 border border-white/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Summary</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white/90 hover:bg-white/20 border border-white/20 text-sm font-medium transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy summary
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/30 text-sm font-medium transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Sales</span>
                    <span className="font-semibold text-emerald-400">{formatMoney(metrics.totalSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">− COGS</span>
                    <span className="font-semibold text-white/80">{formatMoney(metrics.costOfGoodsSold)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Gross Profit</span>
                    <span className={`font-semibold ${metrics.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatMoney(metrics.grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">− Expenses</span>
                    <span className="font-semibold text-white/80">{formatMoney(metrics.totalExpenses)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-white/60">Profit / Loss</span>
                  <span className={`font-bold text-lg ${metrics.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatMoney(metrics.profitLoss)}
                  </span>
                </div>
              </div>

              {/* Detail modal */}
              {detailView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setDetailView(null); setDetailExpenseType(null) }}>
                  <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-white/10" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-wrap gap-3">
                      <h2 className="text-xl font-bold text-white">
                        {detailView === 'employees' && 'Employees'}
                        {detailView === 'salary' && 'Salary / Payments'}
                        {detailView === 'expenses' && 'Day-by-day Expenses'}
                        {detailView === 'sales' && 'Sales'}
                        {detailView === 'purchases' && 'Purchases'}
                        {detailView === 'cogs' && 'Cost of Goods Sold'}
                        {detailView === 'expenseType' && detailExpenseType && (EXPENSE_TYPE_LABELS[detailExpenseType] || detailExpenseType)}
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDetailCopy}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white/90 hover:bg-white/20 text-sm font-medium transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Copy summary
                        </button>
                        <button
                          onClick={handleDetailPDF}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/30 text-sm font-medium transition-colors"
                        >
                          <FileDown className="w-4 h-4" />
                          Download PDF
                        </button>
                        <button onClick={() => { setDetailView(null); setDetailExpenseType(null) }} className="p-2 rounded-lg hover:bg-white/10 text-white" title="Close">
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6 overflow-auto flex-1">
                      {detailView === 'employees' && (
                        detailRecords.employees.length === 0 ? (
                          <p className="text-white/60 text-center py-8">No employees in this company.</p>
                        ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-white/60 border-b border-white/20">
                              <th className="py-2 pr-4">Name</th>
                              <th className="py-2 pr-4">Email</th>
                              <th className="py-2">Role</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRecords.employees.map(u => (
                              <tr key={u.id} className="border-b border-white/10 text-white/90">
                                <td className="py-3 pr-4">{u.name}</td>
                                <td className="py-3 pr-4">{u.email}</td>
                                <td className="py-3 capitalize">{u.role}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ))}
                      {detailView === 'salary' && (() => {
                        const list = detailRecords.expenses.filter(e => e.expense_type === 'salary' || e.expense_type === 'sales_person_payment')
                        return list.length === 0 ? (
                          <p className="text-white/60 text-center py-8">No salary / payment entries in this period.</p>
                        ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-white/60 border-b border-white/20">
                              <th className="py-2 pr-4">Date</th>
                              <th className="py-2 pr-4">Type</th>
                              <th className="py-2 pr-4">Amount</th>
                              <th className="py-2 pr-4">Description</th>
                              <th className="py-2">Sales Person</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map(e => (
                              <tr key={e.id} className="border-b border-white/10 text-white/90">
                                <td className="py-3 pr-4">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 pr-4">{EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type}</td>
                                <td className="py-3 pr-4 font-semibold">{formatMoney(e.amount)}</td>
                                <td className="py-3 pr-4">{e.description || '—'}</td>
                                <td className="py-3">{e.sales_person_name || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )})()}
                      {detailView === 'expenses' && (
                        detailRecords.expenses.length === 0 ? (
                          <p className="text-white/60 text-center py-8">No expenses in this period.</p>
                        ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-white/60 border-b border-white/20">
                              <th className="py-2 pr-4">Date</th>
                              <th className="py-2 pr-4">Type</th>
                              <th className="py-2 pr-4">Amount</th>
                              <th className="py-2">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRecords.expenses.map(e => (
                              <tr key={e.id} className="border-b border-white/10 text-white/90">
                                <td className="py-3 pr-4">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 pr-4">{EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type}</td>
                                <td className="py-3 pr-4 font-semibold">{formatMoney(e.amount)}</td>
                                <td className="py-3">{e.description || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ))}
                      {detailView === 'sales' && (
                        detailRecords.sales.length === 0 ? (
                          <p className="text-white/60 text-center py-8">No sales in this period.</p>
                        ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-white/60 border-b border-white/20">
                              <th className="py-2 pr-4">Date</th>
                              <th className="py-2 pr-4">Invoice</th>
                              <th className="py-2 pr-4">Customer</th>
                              <th className="py-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRecords.sales.map(s => (
                              <tr key={s.id} className="border-b border-white/10 text-white/90">
                                <td className="py-3 pr-4">{new Date(s.sale_date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 pr-4">{s.invoice_number}</td>
                                <td className="py-3 pr-4">{s.customer_name || 'Walk-in'}</td>
                                <td className="py-3 font-semibold text-emerald-400">{formatMoney(s.grand_total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ))}
                      {detailView === 'purchases' && (
                        detailRecords.purchases.length === 0 ? (
                          <p className="text-white/60 text-center py-8">No purchases in this period.</p>
                        ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-white/60 border-b border-white/20">
                              <th className="py-2 pr-4">Date</th>
                              <th className="py-2 pr-4">Invoice</th>
                              <th className="py-2 pr-4">Supplier</th>
                              <th className="py-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRecords.purchases.map(p => (
                              <tr key={p.id} className="border-b border-white/10 text-white/90">
                                <td className="py-3 pr-4">{new Date(p.purchase_date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 pr-4">{p.invoice_number}</td>
                                <td className="py-3 pr-4">{p.supplier_name || '—'}</td>
                                <td className="py-3 font-semibold text-cyan-400">{formatMoney(p.grand_total ?? p.total_amount ?? 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ))}
                      {detailView === 'cogs' && (() => {
                        const rows = detailRecords.sales.flatMap(s =>
                          s.items
                            .filter(item => item.sale_type === 'sale' && item.purchase_price != null)
                            .map((item, idx) => ({ sale: s, item, key: `${s.id}-${idx}` }))
                        )
                        return rows.length === 0 ? (
                          <p className="text-white/60 text-center py-8">No cost of goods data in this period.</p>
                        ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-white/60 border-b border-white/20">
                              <th className="py-2 pr-4">Date</th>
                              <th className="py-2 pr-4">Invoice</th>
                              <th className="py-2 pr-4">Product</th>
                              <th className="py-2 pr-4">Qty</th>
                              <th className="py-2 pr-4">Unit cost</th>
                              <th className="py-2">Total cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(({ sale, item, key }) => (
                              <tr key={key} className="border-b border-white/10 text-white/90">
                                <td className="py-3 pr-4">{new Date(sale.sale_date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 pr-4">{sale.invoice_number}</td>
                                <td className="py-3 pr-4">{item.product_name}</td>
                                <td className="py-3 pr-4">{item.quantity}</td>
                                <td className="py-3 pr-4">{formatMoney(item.purchase_price!)}</td>
                                <td className="py-3 font-semibold text-amber-400">{formatMoney(item.purchase_price! * item.quantity)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )})()}
                      {detailView === 'expenseType' && detailExpenseType && (() => {
                        const list = detailRecords.expenses.filter(e => e.expense_type === detailExpenseType)
                        return list.length === 0 ? (
                          <p className="text-white/60 text-center py-8">No entries for this expense type in this period.</p>
                        ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-white/60 border-b border-white/20">
                              <th className="py-2 pr-4">Date</th>
                              <th className="py-2 pr-4">Amount</th>
                              <th className="py-2">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map(e => (
                              <tr key={e.id} className="border-b border-white/10 text-white/90">
                                <td className="py-3 pr-4">{new Date(e.expense_date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 pr-4 font-semibold">{formatMoney(e.amount)}</td>
                                <td className="py-3">{e.description || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )})()}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default BusinessOverview
