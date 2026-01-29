import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { saleService } from '../services/saleService'
import { purchaseService } from '../services/purchaseService'
import { expenseService } from '../services/expenseService'
import { salesPersonService } from '../services/salespersonService'
import { userService } from '../services/userService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  DollarSign,
  FileText,
  User,
  Home,
  Download,
  Printer,
  MessageCircle
} from 'lucide-react'
import { Sale } from '../types/sale'
import { Purchase } from '../types/purchase'
import { Expense } from '../types/expense'
import { SalesPerson } from '../types/salesperson'

const DailyReport = () => {
  const { getCurrentCompanyId, hasPermission } = useAuth()
  const companyId = getCurrentCompanyId()
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [sales, setSales] = useState<Sale[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]) // Store all purchases for profit calculation
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedDate, companyId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load all data - we need all purchases to calculate item-wise profit
      const [allSales, allPurchases, allExpenses, allSalesPersons, allUsers] = await Promise.all([
        saleService.getAll(true, companyId),
        purchaseService.getAll(undefined, companyId), // Load all purchases to lookup purchase items
        expenseService.getAll(companyId),
        salesPersonService.getAll(false),
        userService.getAll()
      ])

      setSalesPersons(allSalesPersons)
      // Create user map for device/user tracking
      setUsers(allUsers.map(u => ({ id: u.id, name: u.name })))

      // Filter by selected date
      const dateStart = new Date(selectedDate).getTime()
      const dateEnd = dateStart + 86400000 // Add 24 hours

      const filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.sale_date).getTime()
        return saleDate >= dateStart && saleDate < dateEnd
      })

      // Filter purchases by date for display, but keep all purchases for profit calculation
      const filteredPurchases = allPurchases.filter(purchase => {
        const purchaseDate = new Date(purchase.purchase_date).getTime()
        return purchaseDate >= dateStart && purchaseDate < dateEnd
      })

      const filteredExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.expense_date).getTime()
        return expenseDate >= dateStart && expenseDate < dateEnd
      })

      setSales(filteredSales)
      setPurchases(filteredPurchases) // Display only purchases from selected date
      setAllPurchases(allPurchases) // Store all purchases for profit calculation
      setExpenses(filteredExpenses)
    } catch (error) {
      console.error('Error loading daily report data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate sales by sales person
  const salesBySalesPerson = useMemo(() => {
    const map = new Map<number, { name: string; sales: Sale[]; total: number }>()
    
    sales.forEach(sale => {
      if (sale.sales_person_id) {
        const existing = map.get(sale.sales_person_id)
        const salesPerson = salesPersons.find(sp => sp.id === sale.sales_person_id)
        const name = salesPerson?.name || sale.sales_person_name || 'Unknown'
        
        if (existing) {
          existing.sales.push(sale)
          existing.total += sale.grand_total
        } else {
          map.set(sale.sales_person_id, {
            name,
            sales: [sale],
            total: sale.grand_total
          })
        }
      }
    })
    
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [sales, salesPersons])

  // Calculate expenses by sales person (detailed)
  const expensesBySalesPerson = useMemo(() => {
    const map = new Map<number, { name: string; expenses: Expense[]; total: number }>()
    
    // Include all expenses (not just those with sales_person_id)
    expenses.forEach(expense => {
      // Skip opening/closing from this calculation
      if (expense.expense_type === 'opening' || expense.expense_type === 'closing') return
      
      if (expense.sales_person_id) {
        const existing = map.get(expense.sales_person_id)
        const name = expense.sales_person_name || 'Unknown'
        
        if (existing) {
          existing.expenses.push(expense)
          existing.total += expense.amount
        } else {
          map.set(expense.sales_person_id, {
            name,
            expenses: [expense],
            total: expense.amount
          })
        }
      } else {
        // Expenses without sales person - add to "General" category
        const generalKey = 0
        const existing = map.get(generalKey)
        if (existing) {
          existing.expenses.push(expense)
          existing.total += expense.amount
        } else {
          map.set(generalKey, {
            name: 'General Expenses',
            expenses: [expense],
            total: expense.amount
          })
        }
      }
    })
    
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [expenses])

  // All expenses (excluding opening/closing) for detailed view
  const allExpensesDetailed = useMemo(() => {
    return expenses.filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing')
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
  }, [expenses])

  // Get opening and closing balances
  // Handle multiple entries from different devices - use the latest one (most recent created_at)
  const openingClosing = useMemo(() => {
    const openingExpenses = expenses.filter(e => e.expense_type === 'opening')
    const closingExpenses = expenses.filter(e => e.expense_type === 'closing')
    
    // Get the latest opening balance (most recent created_at)
    const opening = openingExpenses.length > 0 
      ? openingExpenses.sort((a, b) => 
          new Date(b.created_at || b.expense_date).getTime() - 
          new Date(a.created_at || a.expense_date).getTime()
        )[0]
      : undefined
    
    // Get the latest closing balance (most recent created_at)
    // If multiple closing balances exist, use the latest one
    const closing = closingExpenses.length > 0
      ? closingExpenses.sort((a, b) => 
          new Date(b.created_at || b.expense_date).getTime() - 
          new Date(a.created_at || a.expense_date).getTime()
        )[0]
      : undefined
    
    // Track if there are multiple entries (for display purposes)
    const hasMultipleOpening = openingExpenses.length > 1
    const hasMultipleClosing = closingExpenses.length > 1
    
    return { opening, closing, hasMultipleOpening, hasMultipleClosing, 
             allOpening: openingExpenses, allClosing: closingExpenses }
  }, [expenses])

  // Calculate sales by payment method
  const salesByPaymentMethod = useMemo(() => {
    const methodMap = new Map<string, number>()
    
    sales.forEach(sale => {
      // Handle new payment_methods array
      if (sale.payment_methods && sale.payment_methods.length > 0) {
        sale.payment_methods.forEach(pm => {
          const existing = methodMap.get(pm.method) || 0
          methodMap.set(pm.method, existing + pm.amount)
        })
      } else {
        // Fallback to legacy payment_method
        const method = sale.payment_method || 'cash'
        const existing = methodMap.get(method) || 0
        methodMap.set(method, existing + sale.grand_total)
      }
    })
    
    return Array.from(methodMap.entries()).map(([method, amount]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      amount
    })).sort((a, b) => b.amount - a.amount)
  }, [sales])

  // Calculate comprehensive cash flow and accounting
  const cashFlow = useMemo(() => {
    const openingAmount = openingClosing.opening?.amount || 0
    const closingAmount = openingClosing.closing?.amount || 0
    
    // Sales collections by payment method
    const cashSales = salesByPaymentMethod.find(pm => pm.method.toLowerCase() === 'cash')?.amount || 0
    const upiSales = salesByPaymentMethod.find(pm => pm.method.toLowerCase() === 'upi')?.amount || 0
    const cardSales = salesByPaymentMethod.find(pm => pm.method.toLowerCase().includes('card'))?.amount || 0
    const otherSales = salesByPaymentMethod
      .filter(pm => !['cash', 'upi'].includes(pm.method.toLowerCase()) && !pm.method.toLowerCase().includes('card'))
      .reduce((sum, pm) => sum + pm.amount, 0)
    
    const totalCollections = cashSales + upiSales + cardSales + otherSales
    
    // Expenses by payment method
    const cashExpenses = expenses
      .filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing' && e.payment_method === 'cash')
      .reduce((sum, e) => sum + e.amount, 0)
    
    const upiExpenses = expenses
      .filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing' && e.payment_method === 'upi')
      .reduce((sum, e) => sum + e.amount, 0)
    
    const cardExpenses = expenses
      .filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing' && e.payment_method === 'card')
      .reduce((sum, e) => sum + e.amount, 0)
    
    const otherExpenses = expenses
      .filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing' && !['cash', 'upi', 'card'].includes(e.payment_method))
      .reduce((sum, e) => sum + e.amount, 0)
    
    // Net cash flow
    const netCashFlow = cashSales - cashExpenses
    const expectedClosing = openingAmount + netCashFlow
    const difference = closingAmount > 0 ? closingAmount - expectedClosing : 0
    
    return {
      openingAmount,
      closingAmount,
      cashSales,
      upiSales,
      cardSales,
      otherSales,
      totalCollections,
      cashExpenses,
      upiExpenses,
      cardExpenses,
      otherExpenses,
      netCashFlow,
      expectedClosing,
      difference
    }
  }, [openingClosing, salesByPaymentMethod, expenses])

  // Get user name helper - handles both string and number IDs
  const getUserName = (userId: number | string | undefined): string => {
    if (!userId) return 'Unknown Device/User'
    const userIdStr = userId.toString()
    const user = users.find(u => u.id === userIdStr || u.id === String(userId))
    return user?.name || `Device/User ${userIdStr}`
  }

  // Device/User-wise breakdown
  const deviceWiseBreakdown = useMemo(() => {
    const deviceMap = new Map<string, {
      userName: string
      sales: Sale[]
      salesCount: number
      salesTotal: number
      salesByPaymentMethod: Map<string, number> // Payment method breakdown for sales
      expenses: Expense[]
      expensesCount: number
      expensesTotal: number
      expensesByPaymentMethod: Map<string, number> // Payment method breakdown for expenses
      purchases: Purchase[]
      purchasesCount: number
      purchasesTotal: number
      openingBalance?: Expense // Opening balance entered by this device
      closingBalance?: Expense // Closing balance entered by this device
    }>()

    // Process sales by user
    sales.forEach(sale => {
      const userId = sale.created_by?.toString() || 'unknown'
      const userName = getUserName(sale.created_by)
      
      if (!deviceMap.has(userId)) {
        deviceMap.set(userId, {
          userName,
          sales: [],
          salesCount: 0,
          salesTotal: 0,
          salesByPaymentMethod: new Map(),
          expenses: [],
          expensesCount: 0,
          expensesTotal: 0,
          expensesByPaymentMethod: new Map(),
          purchases: [],
          purchasesCount: 0,
          purchasesTotal: 0,
        })
      }
      
      const device = deviceMap.get(userId)!
      device.sales.push(sale)
      device.salesCount++
      device.salesTotal += sale.grand_total
      
      // Track sales by payment method
      if (sale.payment_methods && sale.payment_methods.length > 0) {
        sale.payment_methods.forEach(pm => {
          const existing = device.salesByPaymentMethod.get(pm.method) || 0
          device.salesByPaymentMethod.set(pm.method, existing + pm.amount)
        })
      } else if (sale.payment_method) {
        const existing = device.salesByPaymentMethod.get(sale.payment_method) || 0
        device.salesByPaymentMethod.set(sale.payment_method, existing + sale.grand_total)
      }
    })

    // Process expenses by user (excluding opening/closing)
    expenses.forEach(expense => {
      if (expense.expense_type === 'opening' || expense.expense_type === 'closing') return
      
      const userId = expense.created_by?.toString() || 'unknown'
      const userName = getUserName(expense.created_by)
      
      if (!deviceMap.has(userId)) {
        deviceMap.set(userId, {
          userName,
          sales: [],
          salesCount: 0,
          salesTotal: 0,
          salesByPaymentMethod: new Map(),
          expenses: [],
          expensesCount: 0,
          expensesTotal: 0,
          expensesByPaymentMethod: new Map(),
          purchases: [],
          purchasesCount: 0,
          purchasesTotal: 0,
        })
      }
      
      const device = deviceMap.get(userId)!
      device.expenses.push(expense)
      device.expensesCount++
      device.expensesTotal += expense.amount
      
      // Track expenses by payment method
      const existing = device.expensesByPaymentMethod.get(expense.payment_method) || 0
      device.expensesByPaymentMethod.set(expense.payment_method, existing + expense.amount)
    })

    // Process purchases by user
    purchases.forEach(purchase => {
      const userId = purchase.created_by?.toString() || 'unknown'
      const userName = getUserName(purchase.created_by)
      
      if (!deviceMap.has(userId)) {
        deviceMap.set(userId, {
          userName,
          sales: [],
          salesCount: 0,
          salesTotal: 0,
          salesByPaymentMethod: new Map(),
          expenses: [],
          expensesCount: 0,
          expensesTotal: 0,
          expensesByPaymentMethod: new Map(),
          purchases: [],
          purchasesCount: 0,
          purchasesTotal: 0,
        })
      }
      
      const device = deviceMap.get(userId)!
      device.purchases.push(purchase)
      device.purchasesCount++
      const purchaseTotal = purchase.type === 'gst' 
        ? (purchase as any).grand_total 
        : (purchase as any).total_amount
      device.purchasesTotal += purchaseTotal || 0
    })

    // Process opening and closing balances by device
    expenses.forEach(expense => {
      if (expense.expense_type === 'opening' || expense.expense_type === 'closing') {
        const userId = expense.created_by?.toString() || 'unknown'
        const userName = getUserName(expense.created_by)
        
        if (!deviceMap.has(userId)) {
          deviceMap.set(userId, {
            userName,
            sales: [],
            salesCount: 0,
            salesTotal: 0,
            salesByPaymentMethod: new Map(),
            expenses: [],
            expensesCount: 0,
            expensesTotal: 0,
            expensesByPaymentMethod: new Map(),
            purchases: [],
            purchasesCount: 0,
            purchasesTotal: 0,
          })
        }
        
        const device = deviceMap.get(userId)!
        if (expense.expense_type === 'opening') {
          device.openingBalance = expense
        } else if (expense.expense_type === 'closing') {
          device.closingBalance = expense
        }
      }
    })

    // Convert to array and sort by total activity (sales + expenses)
    return Array.from(deviceMap.values())
      .map(device => ({
        ...device,
        totalActivity: device.salesTotal + device.expensesTotal + device.purchasesTotal,
        totalTransactions: device.salesCount + device.expensesCount + device.purchasesCount,
      }))
      .sort((a, b) => b.totalActivity - a.totalActivity)
  }, [sales, expenses, purchases, users])

  // Calculate totals with item-wise profit calculation
  const totals = useMemo(() => {
    const totalSales = sales.reduce((sum, s) => sum + s.grand_total, 0)
    const totalPurchases = purchases.reduce((sum, p) => {
      if (p.type === 'gst') {
        return sum + ((p as any).grand_total || 0)
      } else {
        return sum + ((p as any).total_amount || 0)
      }
    }, 0)
    const totalExpenses = expenses
      .filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing')
      .reduce((sum, e) => sum + e.amount, 0)
    
    // Item-wise profit calculation: Calculate profit based on actual items sold
    let totalCosting = 0 // Total cost of items that were actually sold
    let totalItemProfit = 0 // Total profit from items sold
    
    // Create a map of purchase items for quick lookup (use allPurchases, not just filtered)
    const purchaseItemMap = new Map<string, any>()
    allPurchases.forEach(purchase => {
      purchase.items.forEach(item => {
        if (item.id && purchase.id) {
          const key = `P${purchase.id}-I${item.id}`
          purchaseItemMap.set(key, { ...item, purchase_id: purchase.id })
        }
      })
    })
    
    // Calculate profit for each sale item
    sales.forEach(sale => {
      sale.items.forEach(saleItem => {
        // Skip returns (they reduce profit)
        if (saleItem.sale_type === 'return') {
          // For returns, we need to reverse the profit calculation
          const returnQty = saleItem.quantity
          const returnSalePrice = saleItem.unit_price
          
          // Find the purchase item for this return
          let purchaseItem = null
          if (saleItem.purchase_id && saleItem.purchase_item_id) {
            const key = `P${saleItem.purchase_id}-I${saleItem.purchase_item_id}`
            purchaseItem = purchaseItemMap.get(key)
          }
          
          if (purchaseItem) {
            const purchasePrice = purchaseItem.unit_price || 0
            const cost = purchasePrice * returnQty
            const saleAmount = returnSalePrice * returnQty
            totalCosting -= cost // Subtract cost for returns
            totalItemProfit -= (saleAmount - cost) // Subtract profit for returns
          }
        } else {
          // Regular sale
          const saleQty = saleItem.quantity
          const salePrice = saleItem.unit_price
          
          // Find the purchase item for this sale item
          let purchaseItem = null
          if (saleItem.purchase_id && saleItem.purchase_item_id) {
            const key = `P${saleItem.purchase_id}-I${saleItem.purchase_item_id}`
            purchaseItem = purchaseItemMap.get(key)
          }
          
          // If we have purchase item, use its price; otherwise use stored purchase_price or 0
          const purchasePrice = purchaseItem?.unit_price || saleItem.purchase_price || 0
          const cost = purchasePrice * saleQty
          const saleAmount = salePrice * saleQty
          
          totalCosting += cost
          totalItemProfit += (saleAmount - cost)
        }
      })
    })
    
    // Net profit = item profit - expenses
    const totalProfit = totalItemProfit - totalExpenses
    const profitMargin = totalCosting > 0 ? (totalItemProfit / totalCosting) * 100 : 0
    const netProfitMargin = totalCosting > 0 ? (totalProfit / totalCosting) * 100 : 0

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      totalCosting, // New: Total cost of items actually sold
      totalItemProfit, // New: Profit from items (before expenses)
      totalProfit, // Net profit after expenses
      profitMargin, // Profit margin on items (%)
      netProfitMargin, // Net profit margin after expenses (%)
      salesCount: sales.length,
      purchasesCount: purchases.length,
      expensesCount: expenses.length
    }
  }, [sales, purchases, allPurchases, expenses])

  const handlePrint = () => {
    window.print()
  }

  const generateReportHTML = () => {
    const reportDate = new Date(selectedDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const formatCurrency = (amount: number) => {
      return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    }

    const expenseTypeLabels: Record<string, string> = {
      opening: 'Opening Balance',
      closing: 'Closing Balance',
      sales_person_payment: 'Sales Person Payment',
      purchase: 'Purchase',
      transport: 'Transport',
      office: 'Office',
      utility: 'Utility',
      maintenance: 'Maintenance',
      marketing: 'Marketing',
      other: 'Other',
    }

    let html = `
      <div class="report-container">
        <div class="report-header">
          <div class="company-info">
            <h1>Daily Business Report</h1>
            <p class="report-date">${reportDate}</p>
          </div>
        </div>

        <div class="summary-section">
          <h2>Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total Sales</h3>
              <p class="amount">${formatCurrency(totals.totalSales)}</p>
              <p class="count">${totals.salesCount} sale${totals.salesCount !== 1 ? 's' : ''}</p>
            </div>
            <div class="summary-card">
              <h3>Total Costing</h3>
              <p class="amount">${formatCurrency(totals.totalCosting)}</p>
            </div>
            <div class="summary-card">
              <h3>Gross Profit</h3>
              <p class="amount ${totals.totalItemProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(totals.totalItemProfit)}</p>
              <p class="margin">${totals.profitMargin >= 0 ? '+' : ''}${totals.profitMargin.toFixed(2)}%</p>
            </div>
            <div class="summary-card">
              <h3>Total Expenses</h3>
              <p class="amount">${formatCurrency(totals.totalExpenses)}</p>
              <p class="count">${totals.expensesCount} expense${totals.expensesCount !== 1 ? 's' : ''}</p>
            </div>
            <div class="summary-card">
              <h3>Net ${totals.totalProfit >= 0 ? 'Profit' : 'Loss'}</h3>
              <p class="amount ${totals.totalProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(totals.totalProfit))}</p>
              <p class="margin">${totals.netProfitMargin >= 0 ? '+' : ''}${totals.netProfitMargin.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        ${cashFlow.openingAmount > 0 || cashFlow.closingAmount > 0 ? `
        <div class="cash-section">
          <h2>Cash Management</h2>
          <div class="cash-grid">
            <div class="cash-card">
              <h3>Opening Balance</h3>
              <p class="amount">${formatCurrency(cashFlow.openingAmount)}</p>
            </div>
            <div class="cash-card">
              <h3>Closing Balance</h3>
              <p class="amount">${formatCurrency(cashFlow.closingAmount)}</p>
            </div>
            <div class="cash-card">
              <h3>Expected Closing</h3>
              <p class="amount">${formatCurrency(cashFlow.expectedClosing)}</p>
            </div>
            <div class="cash-card">
              <h3>Difference</h3>
              <p class="amount ${cashFlow.difference === 0 ? 'positive' : 'negative'}">${formatCurrency(cashFlow.difference)}</p>
            </div>
          </div>
        </div>
        ` : ''}

        ${salesByPaymentMethod.length > 0 ? `
        <div class="payment-section">
          <h2>Sales by Payment Method</h2>
          <table>
            <thead>
              <tr>
                <th>Payment Method</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${salesByPaymentMethod.map(pm => `
                <tr>
                  <td>${pm.method}</td>
                  <td class="text-right">${formatCurrency(pm.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${salesBySalesPerson.length > 0 ? `
        <div class="salesperson-section">
          <h2>Sales by Sales Person</h2>
          <table>
            <thead>
              <tr>
                <th>Sales Person</th>
                <th class="text-right">Sales Count</th>
                <th class="text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${salesBySalesPerson.map(sp => `
                <tr>
                  <td>${sp.name}</td>
                  <td class="text-right">${sp.sales.length}</td>
                  <td class="text-right">${formatCurrency(sp.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${expensesBySalesPerson.length > 0 ? `
        <div class="expenses-section">
          <h2>Expenses by Sales Person</h2>
          <table>
            <thead>
              <tr>
                <th>Sales Person</th>
                <th class="text-right">Expense Count</th>
                <th class="text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${expensesBySalesPerson.map(ep => `
                <tr>
                  <td>${ep.name}</td>
                  <td class="text-right">${ep.expenses.length}</td>
                  <td class="text-right">${formatCurrency(ep.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${allExpensesDetailed.length > 0 ? `
        <div class="expenses-detail-section">
          <h2>All Expenses (Detailed)</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Sales Person</th>
                <th>Payment Method</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${allExpensesDetailed.map(expense => `
                <tr>
                  <td>${new Date(expense.expense_date).toLocaleDateString('en-IN')}</td>
                  <td>${expenseTypeLabels[expense.expense_type] || expense.expense_type}</td>
                  <td>${expense.description}</td>
                  <td>${expense.sales_person_name || 'N/A'}</td>
                  <td>${expense.payment_method.charAt(0).toUpperCase() + expense.payment_method.slice(1)}</td>
                  <td class="text-right">${formatCurrency(expense.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${deviceWiseBreakdown.length > 0 ? `
        <div class="device-breakdown-section">
          <h2>Device/User-wise Activity Breakdown</h2>
          <p class="subtitle">See which device/user contributed how much to today's business</p>
          <table>
            <thead>
              <tr>
                <th>Device/User</th>
                <th class="text-right">Sales</th>
                <th class="text-right">Sales Count</th>
                <th class="text-right">Expenses</th>
                <th class="text-right">Expense Count</th>
                <th class="text-right">Purchases</th>
                <th class="text-right">Purchase Count</th>
                <th class="text-right">Total Activity</th>
              </tr>
            </thead>
            <tbody>
              ${deviceWiseBreakdown.map((device, idx) => `
                <tr ${idx === 0 && device.totalActivity > 0 ? 'class="top-performer"' : ''}>
                  <td>
                    ${device.userName}
                    ${idx === 0 && device.totalActivity > 0 ? '<span class="badge">🏆 Top Performer</span>' : ''}
                  </td>
                  <td class="text-right">${formatCurrency(device.salesTotal)}</td>
                  <td class="text-right">${device.salesCount}</td>
                  <td class="text-right">${formatCurrency(device.expensesTotal)}</td>
                  <td class="text-right">${device.expensesCount}</td>
                  <td class="text-right">${device.purchasesCount > 0 ? formatCurrency(device.purchasesTotal) : '—'}</td>
                  <td class="text-right">${device.purchasesCount > 0 ? device.purchasesCount : '—'}</td>
                  <td class="text-right"><strong>${formatCurrency(device.totalActivity)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td class="text-right"><strong>${formatCurrency(deviceWiseBreakdown.reduce((sum, d) => sum + d.salesTotal, 0))}</strong></td>
                <td class="text-right"><strong>${deviceWiseBreakdown.reduce((sum, d) => sum + d.salesCount, 0)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(deviceWiseBreakdown.reduce((sum, d) => sum + d.expensesTotal, 0))}</strong></td>
                <td class="text-right"><strong>${deviceWiseBreakdown.reduce((sum, d) => sum + d.expensesCount, 0)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(deviceWiseBreakdown.reduce((sum, d) => sum + d.purchasesTotal, 0))}</strong></td>
                <td class="text-right"><strong>${deviceWiseBreakdown.reduce((sum, d) => sum + d.purchasesCount, 0)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(deviceWiseBreakdown.reduce((sum, d) => sum + d.totalActivity, 0))}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
          <p>HisabKitab-Pro - Daily Business Report</p>
        </div>
      </div>
    `

    return html
  }

  const handleDownload = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Report - ${selectedDate}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              background: #fff;
            }
            .report-container {
              max-width: 1000px;
              margin: 0 auto;
              background: white;
              padding: 40px;
            }
            .report-header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #1f2937;
              padding-bottom: 20px;
            }
            .report-header h1 {
              font-size: 32px;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .report-date {
              font-size: 18px;
              color: #6b7280;
            }
            .summary-section, .cash-section, .payment-section, .salesperson-section, .expenses-section, .expenses-detail-section, .device-breakdown-section {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            .summary-section h2, .cash-section h2, .payment-section h2, .salesperson-section h2, .expenses-section h2, .expenses-detail-section h2, .device-breakdown-section h2 {
              font-size: 24px;
              color: #1f2937;
              margin-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
            }
            .device-breakdown-section .subtitle {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 20px;
            }
            .device-breakdown-section table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .device-breakdown-section table th {
              background: #f3f4f6;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #e5e7eb;
            }
            .device-breakdown-section table td {
              padding: 10px 12px;
              border: 1px solid #e5e7eb;
            }
            .device-breakdown-section table tr.top-performer {
              background: #fef3c7;
            }
            .device-breakdown-section .badge {
              background: #fbbf24;
              color: #78350f;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: bold;
              margin-left: 8px;
            }
            .device-breakdown-section table tfoot {
              background: #f9fafb;
              font-weight: bold;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .summary-card {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .summary-card h3 {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .summary-card .amount {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .summary-card .amount.positive {
              color: #059669;
            }
            .summary-card .amount.negative {
              color: #dc2626;
            }
            .summary-card .count {
              font-size: 12px;
              color: #6b7280;
            }
            .summary-card .margin {
              font-size: 14px;
              color: #6b7280;
            }
            .cash-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
            }
            .cash-card {
              background: #f0f9ff;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #bae6fd;
            }
            .cash-card h3 {
              font-size: 14px;
              color: #0369a1;
              margin-bottom: 10px;
            }
            .cash-card .amount {
              font-size: 20px;
              font-weight: bold;
              color: #0369a1;
            }
            .cash-card .amount.positive {
              color: #059669;
            }
            .cash-card .amount.negative {
              color: #dc2626;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            thead {
              background: #f3f4f6;
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              border-bottom: 2px solid #e5e7eb;
              font-weight: 600;
            }
            th.text-right {
              text-align: right;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              color: #1f2937;
              font-size: 14px;
            }
            td.text-right {
              text-align: right;
            }
            tbody tr:hover {
              background: #f9fafb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
            }
            @media print {
              .summary-grid, .cash-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          </style>
        </head>
        <body>
          ${generateReportHTML()}
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handleWhatsAppShare = () => {
    const reportDate = new Date(selectedDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Format sales by payment method
    const paymentMethodText = salesByPaymentMethod.length > 0
      ? salesByPaymentMethod.map(pm => `  • ${pm.method}: ₹${pm.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`).join('\n')
      : '  • No sales recorded'

    // Format sales by sales person
    const salesPersonText = salesBySalesPerson.length > 0
      ? salesBySalesPerson.map(sp => `  • ${sp.name}: ₹${sp.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${sp.sales.length} sales)`).join('\n')
      : '  • No sales recorded'

    // Format expenses by sales person
    const expensesPersonText = expensesBySalesPerson.length > 0
      ? expensesBySalesPerson.map(ep => `  • ${ep.name}: ₹${ep.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${ep.expenses.length} expenses)`).join('\n')
      : '  • No expenses recorded'

    const message = `📊 *Daily Business Report*
📅 *Date:* ${reportDate}

💰 *Summary*
• Total Sales: ₹${totals.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
• Total Costing: ₹${totals.totalCosting.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
• Gross Profit: ₹${totals.totalItemProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${totals.profitMargin >= 0 ? '+' : ''}${totals.profitMargin.toFixed(2)}%)
• Total Expenses: ₹${totals.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
• Net ${totals.totalProfit >= 0 ? 'Profit' : 'Loss'}: ₹${Math.abs(totals.totalProfit).toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${totals.netProfitMargin >= 0 ? '+' : ''}${totals.netProfitMargin.toFixed(2)}%)

💵 *Cash Management*
• Opening Balance: ₹${cashFlow.openingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
• Closing Balance: ₹${cashFlow.closingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
• Expected Closing: ₹${cashFlow.expectedClosing.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
• Difference: ₹${cashFlow.difference.toLocaleString('en-IN', { maximumFractionDigits: 2 })}

💳 *Sales by Payment Method*
${paymentMethodText}

👥 *Sales by Sales Person*
${salesPersonText}

📝 *Expenses by Sales Person*
${expensesPersonText}

📈 *Counts*
• Sales: ${totals.salesCount}
• Purchases: ${totals.purchasesCount}
• Expenses: ${totals.expensesCount}

---
Generated by HisabKitab-Pro`

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  if (loading) {
    return (
      <ProtectedRoute requiredPermission="expenses:read">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading daily report...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="expenses:read">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200 bg-white"
                  title="Back"
                >
                  <Home className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Daily Report</h1>
                  <p className="text-sm text-gray-600 mt-1">Comprehensive daily business summary</p>
                  <p className="text-xs text-blue-600 mt-1 font-semibold flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Aggregated from all devices - Real-time sync
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handlePrint}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Print"
                >
                  <Printer className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                  title="Share on WhatsApp"
                >
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.15.148.225.247.373.099.149.198.297.298.446.099.149.198.298.148.496-.05.198-.099.297-.198.446-.099.149-.198.297-.297.446-.099.15-.173.223-.347.372-.173.149-.347.297-.149.595.198.297.882 1.403 1.89 2.27 1.312 1.082 2.433 1.416 2.826 1.571.39.156.62.128.843-.05.223-.178.955-.88 1.214-1.18.26-.298.52-.223.882-.075.363.15 2.3 1.08 2.694 1.28.39.198.66.297.76.462.099.165.099.925-.05 1.18-.149.248-.595.496-1.19.843-.595.347-1.19.595-1.636.644-.446.05-.793.074-1.19-.05-.396-.124-1.488-.595-2.09-1.08-.595-.496-1.04-1.08-1.488-1.78-.446-.694-.99-1.48-.99-1.78 0-.298.05-.149.273-.297.223-.149.496-.347.67-.496.173-.149.248-.223.347-.372.099-.149.05-.297.05-.496 0-.198-.05-.347-.149-.496-.099-.149-.198-.297-.297-.446-.099-.149-.198-.297-.148-.496.05-.198.099-.297.198-.446.099-.149.198-.297.297-.446.099-.149.173-.223.347-.372.173-.149.347-.297.149-.595-.198-.297-.882-1.403-1.89-2.27-1.312-1.082-2.433-1.416-2.826-1.571-.39-.156-.62-.128-.843.05-.223.178-.955.88-1.214 1.18-.26.298-.52.223-.882-.075-.363-.15-2.3-1.08-2.694-1.28-.39-.198-.66-.297-.76-.462-.099-.165-.099-.925.05-1.18.149-.248.595-.496 1.19-.843.595-.347 1.19-.595 1.636-.644.446-.05.793-.074 1.19.05.396.124 1.488.595 2.09 1.08.595.496 1.04 1.08 1.488 1.78.446.694.99 1.48.99 1.78 0 .298-.05.149-.273.297-.223.149-.496.347-.67.496-.173.149-.248.223-.347.372-.099.149-.05.297-.05.496 0 .198.05.347.149.496.099.149.198.297.297.446.099.149.198.297.148.496-.05.198-.099.297-.198.446-.099.149-.198.297-.297.446-.099.149-.173.223-.347.372-.173.149-.347.297-.149.595.198.297.882 1.403 1.89 2.27 1.312 1.082 2.433 1.416 2.826 1.571.39.156.62.128.843-.05.223-.178.955-.88 1.214-1.18.26-.298.52-.223.882-.075.363.15 2.3 1.08 2.694 1.28.39.198.66.297.76.462.099.165.099.925-.05 1.18z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Sales */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-green-100 text-sm mb-1">Total Sales</p>
                  <p className="text-3xl font-bold">₹{totals.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-green-100 text-xs mt-1">{totals.salesCount} sale{totals.salesCount !== 1 ? 's' : ''}</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-80" />
              </div>
            </div>

            {/* Total Purchases */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Total Purchases</p>
                  <p className="text-3xl font-bold">₹{totals.totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-blue-100 text-xs mt-1">{totals.purchasesCount} purchase{totals.purchasesCount !== 1 ? 's' : ''}</p>
                </div>
                <ShoppingCart className="w-10 h-10 opacity-80" />
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-red-100 text-sm mb-1">Total Expenses</p>
                  <p className="text-3xl font-bold">₹{totals.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-red-100 text-xs mt-1">{totals.expensesCount} expense{totals.expensesCount !== 1 ? 's' : ''}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>

            {/* Net Profit/Loss */}
            <div className={`bg-gradient-to-br rounded-2xl shadow-xl p-6 text-white ${
              totals.totalProfit >= 0 
                ? 'from-purple-500 to-indigo-600' 
                : 'from-orange-500 to-red-600'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/80 text-sm mb-1">{totals.totalProfit >= 0 ? 'Net Profit' : 'Net Loss'}</p>
                  <p className="text-3xl font-bold">₹{Math.abs(totals.totalProfit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  <p className="text-white/80 text-xs mt-1">
                    {totals.netProfitMargin >= 0 ? '+' : ''}{totals.netProfitMargin.toFixed(1)}% margin
                  </p>
                </div>
                {totals.totalProfit >= 0 ? (
                  <TrendingUp className="w-10 h-10 opacity-80" />
                ) : (
                  <TrendingDown className="w-10 h-10 opacity-80" />
                )}
              </div>
            </div>
          </div>

          {/* Sales by Sales Person */}
          {salesBySalesPerson.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Sales by Sales Person
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales Person</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales Count</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {salesBySalesPerson.map((sp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{sp.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sp.sales.length}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">
                          ₹{sp.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comprehensive Cash Flow & Accounting Statement */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Daily Cash Flow & Accounting Statement
            </h2>
            
            <div className="space-y-6">
              {/* Opening Balance */}
              {openingClosing.opening && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Opening Balance (Morning)
                    </h3>
                    {openingClosing.hasMultipleOpening && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                        {openingClosing.allOpening.length} entries - showing latest
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Opening Cash</p>
                      <p className="text-3xl font-bold text-green-600">
                        ₹{cashFlow.openingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    {openingClosing.opening.cash_denominations && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Cash Breakdown:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(openingClosing.opening.cash_denominations)
                            .filter(([_, count]) => count && count > 0)
                            .map(([key, count]) => {
                              const value = key.includes('notes') 
                                ? parseInt(key.replace('notes_', ''))
                                : parseInt(key.replace('coins_', ''))
                              const label = key.includes('notes') ? `₹${value} notes` : `₹${value} coins`
                              return (
                                <div key={key} className="flex justify-between bg-white px-2 py-1 rounded">
                                  <span>{label}:</span>
                                  <span className="font-semibold">{count}</span>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sales Collections */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Today's Sales Collections
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Cash</p>
                    <p className="text-xl font-bold text-green-600">
                      ₹{cashFlow.cashSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">UPI</p>
                    <p className="text-xl font-bold text-purple-600">
                      ₹{cashFlow.upiSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Card</p>
                    <p className="text-xl font-bold text-indigo-600">
                      ₹{cashFlow.cardSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Other</p>
                    <p className="text-xl font-bold text-gray-600">
                      ₹{cashFlow.otherSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Total Collections:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{cashFlow.totalCollections.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-5 border-2 border-red-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Today's Expenses
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">Cash Expenses</p>
                    <p className="text-xl font-bold text-red-600">
                      ₹{cashFlow.cashExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">UPI Expenses</p>
                    <p className="text-xl font-bold text-red-600">
                      ₹{cashFlow.upiExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">Card Expenses</p>
                    <p className="text-xl font-bold text-red-600">
                      ₹{cashFlow.cardExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-gray-600 mb-1">Other Expenses</p>
                    <p className="text-xl font-bold text-red-600">
                      ₹{cashFlow.otherExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border-2 border-red-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Total Expenses:</span>
                    <span className="text-2xl font-bold text-red-600">
                      ₹{totals.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Expenses by Sales Person */}
              {expensesBySalesPerson.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    Detailed Expenses by Sales Person
                  </h3>
                  <div className="space-y-4">
                    {expensesBySalesPerson.map((sp, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-gray-900">{sp.name}</h4>
                          <span className="text-lg font-bold text-red-600">
                            Total: ₹{sp.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {sp.expenses.map((expense, expIdx) => (
                            <div key={expIdx} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{expense.description}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(expense.expense_date).toLocaleDateString('en-IN')} • 
                                  {expense.expense_type.replace('_', ' ')} • 
                                  {expense.payment_method}
                                </p>
                              </div>
                              <span className="font-semibold text-red-600 ml-4">
                                ₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Expenses (General) */}
              {allExpensesDetailed.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">All Expenses (Detailed List)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Sales Person</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Payment</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {allExpensesDetailed.map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-600">
                              {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                {expense.expense_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-900">{expense.description}</td>
                            <td className="px-3 py-2 text-gray-600">{expense.sales_person_name || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 capitalize">{expense.payment_method}</td>
                            <td className="px-3 py-2 text-right font-semibold text-red-600">
                              ₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Profit & Loss Calculation */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Profit & Loss Calculation
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-purple-200">
                    <span className="text-gray-700">Total Sales:</span>
                    <span className="font-bold text-gray-900">₹{totals.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-purple-200">
                    <span className="text-gray-700">Total Costing (Items Sold):</span>
                    <span className="font-bold text-red-600">-₹{totals.totalCosting.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b-2 border-purple-300">
                    <span className="font-semibold text-gray-900">Gross Profit (Items):</span>
                    <span className={`text-xl font-bold ${totals.totalItemProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totals.totalItemProfit >= 0 ? '+' : ''}₹{totals.totalItemProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-purple-200">
                    <span className="text-gray-700">Total Expenses:</span>
                    <span className="font-bold text-red-600">-₹{totals.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-white rounded-lg px-4 border-2 border-purple-400">
                    <span className="text-lg font-bold text-gray-900">Net Profit / Loss:</span>
                    <span className={`text-2xl font-bold ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totals.totalProfit >= 0 ? '+' : ''}₹{Math.abs(totals.totalProfit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    Profit Margin: {totals.profitMargin >= 0 ? '+' : ''}{totals.profitMargin.toFixed(2)}% | 
                    Net Margin: {totals.netProfitMargin >= 0 ? '+' : ''}{totals.netProfitMargin.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Cash Reconciliation */}
              {openingClosing.opening && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border-2 border-indigo-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    Cash Reconciliation
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 bg-white rounded-lg px-4">
                      <span className="text-gray-700">Opening Cash Balance:</span>
                      <span className="font-bold text-green-600">+₹{cashFlow.openingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-white rounded-lg px-4">
                      <span className="text-gray-700">Cash Sales Received:</span>
                      <span className="font-bold text-green-600">+₹{cashFlow.cashSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-white rounded-lg px-4">
                      <span className="text-gray-700">Cash Expenses Paid:</span>
                      <span className="font-bold text-red-600">-₹{cashFlow.cashExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-indigo-100 rounded-lg px-4 border-2 border-indigo-300">
                      <span className="font-semibold text-gray-900">Expected Closing Cash:</span>
                      <span className="text-xl font-bold text-indigo-600">
                        ₹{cashFlow.expectedClosing.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {openingClosing.closing && (
                      <>
                        <div className="flex justify-between items-center py-2 bg-white rounded-lg px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">Actual Closing Cash:</span>
                            {openingClosing.hasMultipleClosing && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                {openingClosing.allClosing.length} entries - showing latest
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-blue-600">₹{cashFlow.closingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className={`flex justify-between items-center py-3 rounded-lg px-4 border-2 ${
                          Math.abs(cashFlow.difference) < 0.01 
                            ? 'bg-green-100 border-green-300' 
                            : 'bg-red-100 border-red-300'
                        }`}>
                          <span className="font-semibold text-gray-900">Difference:</span>
                          <span className={`text-xl font-bold ${
                            Math.abs(cashFlow.difference) < 0.01 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {cashFlow.difference >= 0 ? '+' : ''}₹{cashFlow.difference.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        {openingClosing.closing.cash_denominations && (
                          <div className="mt-3 bg-white rounded-lg p-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Closing Cash Breakdown:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(openingClosing.closing.cash_denominations)
                                .filter(([_, count]) => count && count > 0)
                                .map(([key, count]) => {
                                  const value = key.includes('notes') 
                                    ? parseInt(key.replace('notes_', ''))
                                    : parseInt(key.replace('coins_', ''))
                                  const label = key.includes('notes') ? `₹${value} notes` : `₹${value} coins`
                                  return (
                                    <div key={key} className="flex justify-between bg-gray-50 px-2 py-1 rounded">
                                      <span>{label}:</span>
                                      <span className="font-semibold">{count}</span>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Device/User-wise Breakdown */}
          {deviceWiseBreakdown.length > 0 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-purple-600" />
                Device/User-wise Activity Breakdown
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                See which device/user contributed how much to today's business
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deviceWiseBreakdown.map((device, index) => (
                  <div 
                    key={index} 
                    className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200 shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-yellow-400' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-400' : 
                          'bg-blue-400'
                        }`}></div>
                        {device.userName}
                      </h3>
                      {index === 0 && device.totalActivity > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">
                          🏆 Top Performer
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {/* Opening Balance */}
                      {device.openingBalance && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-green-800">Opening Balance:</span>
                            <span className="text-lg font-bold text-green-700">
                              ₹{device.openingBalance.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {device.openingBalance.cash_denominations && (
                            <div className="mt-2 pt-2 border-t border-green-200">
                              <p className="text-xs font-semibold text-green-700 mb-1">Cash Breakdown:</p>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                {Object.entries(device.openingBalance.cash_denominations)
                                  .filter(([_, count]) => count && count > 0)
                                  .map(([key, count]) => {
                                    const value = key.includes('notes') 
                                      ? parseInt(key.replace('notes_', ''))
                                      : parseInt(key.replace('coins_', ''))
                                    const label = key.includes('notes') ? `₹${value} notes` : `₹${value} coins`
                                    return (
                                      <div key={key} className="flex justify-between bg-white px-2 py-0.5 rounded text-green-800">
                                        <span>{label}:</span>
                                        <span className="font-semibold">{count}</span>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Closing Balance */}
                      {device.closingBalance && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border-2 border-blue-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-blue-800">Closing Balance:</span>
                            <span className="text-lg font-bold text-blue-700">
                              ₹{device.closingBalance.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {device.closingBalance.cash_denominations && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              <p className="text-xs font-semibold text-blue-700 mb-1">Cash Breakdown:</p>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                {Object.entries(device.closingBalance.cash_denominations)
                                  .filter(([_, count]) => count && count > 0)
                                  .map(([key, count]) => {
                                    const value = key.includes('notes') 
                                      ? parseInt(key.replace('notes_', ''))
                                      : parseInt(key.replace('coins_', ''))
                                    const label = key.includes('notes') ? `₹${value} notes` : `₹${value} coins`
                                    return (
                                      <div key={key} className="flex justify-between bg-white px-2 py-0.5 rounded text-blue-800">
                                        <span>{label}:</span>
                                        <span className="font-semibold">{count}</span>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sales */}
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-gray-700">Sales:</span>
                          <span className="text-lg font-bold text-blue-600">
                            ₹{device.salesTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {device.salesCount} transaction{device.salesCount !== 1 ? 's' : ''}
                        </div>
                        {/* Sales by Payment Method */}
                        {device.salesByPaymentMethod.size > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-1">By Payment Method:</p>
                            <div className="space-y-1">
                              {Array.from(device.salesByPaymentMethod.entries())
                                .sort((a, b) => b[1] - a[1])
                                .map(([method, amount]) => (
                                  <div key={method} className="flex justify-between text-xs">
                                    <span className="text-gray-600 capitalize">{method}:</span>
                                    <span className="font-semibold text-blue-600">
                                      ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Expenses */}
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-gray-700">Expenses:</span>
                          <span className="text-lg font-bold text-red-600">
                            ₹{device.expensesTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {device.expensesCount} expense{device.expensesCount !== 1 ? 's' : ''}
                        </div>
                        {/* Expenses by Payment Method */}
                        {device.expensesByPaymentMethod.size > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-1">By Payment Method:</p>
                            <div className="space-y-1">
                              {Array.from(device.expensesByPaymentMethod.entries())
                                .sort((a, b) => b[1] - a[1])
                                .map(([method, amount]) => (
                                  <div key={method} className="flex justify-between text-xs">
                                    <span className="text-gray-600 capitalize">{method}:</span>
                                    <span className="font-semibold text-red-600">
                                      ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Purchases */}
                      {device.purchasesCount > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold text-gray-700">Purchases:</span>
                            <span className="text-lg font-bold text-green-600">
                              ₹{device.purchasesTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {device.purchasesCount} purchase{device.purchasesCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                      
                      {/* Total Activity */}
                      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 border-2 border-purple-300 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-900">Total Activity:</span>
                          <span className="text-xl font-bold text-purple-700">
                            ₹{device.totalActivity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {device.totalTransactions} total transaction{device.totalTransactions !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Summary Stats */}
              <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Devices/Users</p>
                    <p className="text-2xl font-bold text-gray-900">{deviceWiseBreakdown.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Sales</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{deviceWiseBreakdown.reduce((sum, d) => sum + d.salesTotal, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{deviceWiseBreakdown.reduce((sum, d) => sum + d.expensesTotal, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {deviceWiseBreakdown.reduce((sum, d) => sum + d.totalTransactions, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Summary */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-8 border border-white/50 text-white">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Final Summary (All Devices) - {new Date(selectedDate).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {openingClosing.opening && (
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-indigo-100">Opening Balance:</span>
                    <span className="text-xl font-bold text-green-200">₹{cashFlow.openingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-indigo-100">Total Sales:</span>
                  <span className="text-xl font-bold">₹{totals.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                {salesByPaymentMethod.length > 0 && (
                  <div className="pb-3 border-b border-white/20">
                    <p className="text-indigo-100 text-sm mb-2">Sales by Payment Method:</p>
                    {salesByPaymentMethod.map((pm, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm mb-1">
                        <span className="text-indigo-200">{pm.method}:</span>
                        <span className="font-semibold">₹{pm.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-indigo-100">Total Costing:</span>
                  <span className="text-xl font-bold">₹{totals.totalCosting.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-indigo-100">Item Profit:</span>
                  <span className={`text-xl font-bold ${totals.totalItemProfit >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    ₹{totals.totalItemProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-indigo-100">Total Expenses:</span>
                  <span className="text-xl font-bold">₹{totals.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                {openingClosing.closing && (
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-indigo-100">Closing Balance:</span>
                    <span className="text-xl font-bold text-blue-200">₹{cashFlow.closingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-indigo-100">Sales Count:</span>
                  <span className="text-xl font-bold">{totals.salesCount}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-indigo-100">Purchases Count:</span>
                  <span className="text-xl font-bold">{totals.purchasesCount}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-indigo-100">Expenses Count:</span>
                  <span className="text-xl font-bold">{totals.expensesCount}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/20">
                  <span className="text-indigo-100">Profit Margin (Items):</span>
                  <span className={`text-xl font-bold ${totals.profitMargin >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {totals.profitMargin >= 0 ? '+' : ''}{totals.profitMargin.toFixed(2)}%
                  </span>
                </div>
                {cashFlow.expectedClosing > 0 && (
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-indigo-100">Expected Closing:</span>
                    <span className="text-xl font-bold text-yellow-200">₹{cashFlow.expectedClosing.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {openingClosing.closing && Math.abs(cashFlow.difference) >= 0.01 && (
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-indigo-100">Difference:</span>
                    <span className={`text-xl font-bold ${Math.abs(cashFlow.difference) < 0.01 ? 'text-green-200' : 'text-red-200'}`}>
                      {cashFlow.difference >= 0 ? '+' : ''}₹{cashFlow.difference.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t-2 border-white/30">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{totals.totalProfit >= 0 ? 'Net Profit' : 'Net Loss'}:</span>
                <span className="text-4xl font-bold">
                  ₹{Math.abs(totals.totalProfit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-2 text-indigo-100">
                Net Profit Margin: {totals.netProfitMargin >= 0 ? '+' : ''}{totals.netProfitMargin.toFixed(2)}%
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default DailyReport

