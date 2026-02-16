import { saleService } from './saleService'
import { purchaseService } from './purchaseService'
import { paymentService } from './paymentService'
import { productService, categoryService } from './productService'
import { expenseService } from './expenseService'
import {
  SalesByProductReport,
  SalesByCategoryReport,
  SalesByCustomerReport,
  SalesBySalesPersonReport,
  ProductPerformanceReport,
  ProfitAnalysisReport,
  CategoryProfitReport,
  PurchasesBySupplierReport,
  PurchasesByProductReport,
  PurchasesByCategoryReport,
  ExpensesByCategoryReport,
  ExpensesByPeriodReport,
  ExpenseVsIncomeReport,
  ReportTimePeriod,
  DateRange,
} from '../types/reports'
import { Sale } from '../types/sale'
import { Purchase } from '../types/purchase'
import { Expense } from '../types/expense'

export const reportService = {
  // Get date range based on time period
  getDateRange: (period: ReportTimePeriod, customStart?: string, customEnd?: string): DateRange => {
    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    switch (period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        startDate = today.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        startDate = yesterday.toISOString().split('T')[0]
        endDate = yesterday.toISOString().split('T')[0]
        break
      case 'thisWeek':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'lastWeek':
        const lastWeekEnd = new Date(now)
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
        const lastWeekStart = new Date(lastWeekEnd)
        lastWeekStart.setDate(lastWeekStart.getDate() - 6)
        startDate = lastWeekStart.toISOString().split('T')[0]
        endDate = lastWeekEnd.toISOString().split('T')[0]
        break
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        break
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
        break
      case 'custom':
        startDate = customStart
        endDate = customEnd
        break
      default: // 'all'
        startDate = undefined
        endDate = undefined
    }

    return { startDate, endDate }
  },

  // Filter sales by date range
  filterSalesByDate: (sales: Sale[], startDate?: string, endDate?: string): Sale[] => {
    if (!startDate && !endDate) return sales

    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date).getTime()
      if (startDate && saleDate < new Date(startDate).getTime()) return false
      if (endDate) {
        const endDateTime = new Date(endDate).getTime() + 86400000
        if (saleDate > endDateTime) return false
      }
      return true
    })
  },

  // Sales by Product
  getSalesByProduct: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<SalesByProductReport[]> => {
    const allSales = await saleService.getAll(true, companyId)
    const filteredSales = reportService.filterSalesByDate(allSales, startDate, endDate)
    const productMap = new Map<number, SalesByProductReport>()

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const existing = productMap.get(item.product_id) || {
            product_id: item.product_id,
            product_name: item.product_name,
            total_quantity: 0,
            total_revenue: 0,
            total_cost: 0,
            total_profit: 0,
            profit_margin: 0,
            average_price: 0,
            sale_count: 0,
          }

          const quantity = item.quantity
          const revenue = item.total
          const cost = (item.purchase_price || 0) * quantity
          const profit = revenue - cost

          existing.total_quantity += quantity
          existing.total_revenue += revenue
          existing.total_cost += cost
          existing.total_profit += profit
          existing.sale_count += 1

          productMap.set(item.product_id, existing)
        }
      })
    })

    // Calculate margins and averages
    const reports = Array.from(productMap.values()).map(report => ({
      ...report,
      profit_margin: report.total_revenue > 0 ? (report.total_profit / report.total_revenue) * 100 : 0,
      average_price: report.total_quantity > 0 ? report.total_revenue / report.total_quantity : 0,
    }))

    // Sort by total revenue (descending)
    return reports.sort((a, b) => b.total_revenue - a.total_revenue)
  },

  // Sales by Category
  getSalesByCategory: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<SalesByCategoryReport[]> => {
    const [allSales, products] = await Promise.all([
      saleService.getAll(true, companyId),
      productService.getAll(false, companyId)
    ])
    const filteredSales = reportService.filterSalesByDate(allSales, startDate, endDate)
    const categoryMap = new Map<string, SalesByCategoryReport>()

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const product = products.find(p => p.id === item.product_id)
          const categoryName = product?.category_name || 'Uncategorized'
          const categoryId = product?.category_id

          const existing = categoryMap.get(categoryName) || {
            category_id: categoryId,
            category_name: categoryName,
            total_quantity: 0,
            total_revenue: 0,
            total_cost: 0,
            total_profit: 0,
            profit_margin: 0,
            product_count: 0,
            sale_count: 0,
          }

          const quantity = item.quantity
          const revenue = item.total
          const cost = (item.purchase_price || 0) * quantity
          const profit = revenue - cost

          existing.total_quantity += quantity
          existing.total_revenue += revenue
          existing.total_cost += cost
          existing.total_profit += profit
          existing.sale_count += 1

          categoryMap.set(categoryName, existing)
        }
      })
    })

    // Count unique products per category
    const productCountByCategory = new Map<string, Set<number>>()
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const product = products.find(p => p.id === item.product_id)
          const categoryName = product?.category_name || 'Uncategorized'
          if (!productCountByCategory.has(categoryName)) {
            productCountByCategory.set(categoryName, new Set())
          }
          productCountByCategory.get(categoryName)!.add(item.product_id)
        }
      })
    })

    const reports = Array.from(categoryMap.values()).map(report => {
      const productSet = productCountByCategory.get(report.category_name) || new Set()
      return {
        ...report,
        product_count: productSet.size,
        profit_margin: report.total_revenue > 0 ? (report.total_profit / report.total_revenue) * 100 : 0,
      }
    })

    return reports.sort((a, b) => b.total_revenue - a.total_revenue)
  },

  // Sales by Customer
  getSalesByCustomer: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<SalesByCustomerReport[]> => {
    const allSales = await saleService.getAll(true, companyId)
    const filteredSales = reportService.filterSalesByDate(allSales, startDate, endDate)
    const customerMap = new Map<string, SalesByCustomerReport>()

    filteredSales.forEach(sale => {
      const customerName = sale.customer_name || 'Walk-in Customer'
      const customerId = sale.customer_id

      const existing = customerMap.get(customerName) || {
        customer_id: customerId,
        customer_name: customerName,
        total_quantity: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        profit_margin: 0,
        sale_count: 0,
        average_order_value: 0,
      }

      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const quantity = item.quantity
          const revenue = item.total
          const cost = (item.purchase_price || 0) * quantity
          const profit = revenue - cost

          existing.total_quantity += quantity
          existing.total_revenue += revenue
          existing.total_cost += cost
          existing.total_profit += profit
        }
      })

      existing.sale_count += 1
      customerMap.set(customerName, existing)
    })

    const reports = Array.from(customerMap.values()).map(report => ({
      ...report,
      profit_margin: report.total_revenue > 0 ? (report.total_profit / report.total_revenue) * 100 : 0,
      average_order_value: report.sale_count > 0 ? report.total_revenue / report.sale_count : 0,
    }))

    return reports.sort((a, b) => b.total_revenue - a.total_revenue)
  },

  // Sales by Sales Person
  getSalesBySalesPerson: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<SalesBySalesPersonReport[]> => {
    const allSales = await saleService.getAll(true, companyId)
    const filteredSales = reportService.filterSalesByDate(allSales, startDate, endDate)
    // Key by id (or 'na') + name so we aggregate by person; use per-item salesperson when available
    const salesPersonMap = new Map<string, SalesBySalesPersonReport>()
    const saleIdsByPerson = new Map<string, Set<number>>()

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const salesPersonId = item.sales_person_id ?? sale.sales_person_id
          const salesPersonName = (item.sales_person_name || sale.sales_person_name) || 'Not Assigned'
          const key = `${salesPersonId ?? 'na'}-${salesPersonName}`

          const existing = salesPersonMap.get(key) || {
            sales_person_id: salesPersonId,
            sales_person_name: salesPersonName,
            total_quantity: 0,
            total_revenue: 0,
            total_cost: 0,
            total_profit: 0,
            profit_margin: 0,
            commission_amount: 0,
            sale_count: 0,
          }

          const quantity = item.quantity
          const revenue = item.total
          const cost = (item.purchase_price || 0) * quantity
          const profit = revenue - cost

          existing.total_quantity += quantity
          existing.total_revenue += revenue
          existing.total_cost += cost
          existing.total_profit += profit
          existing.commission_amount += (item as any).commission_amount || 0

          if (!saleIdsByPerson.has(key)) saleIdsByPerson.set(key, new Set())
          saleIdsByPerson.get(key)!.add(sale.id)
          salesPersonMap.set(key, existing)
        }
      })
    })

    // Set sale_count = distinct sale ids per person
    salesPersonMap.forEach((report, key) => {
      report.sale_count = saleIdsByPerson.get(key)?.size ?? 0
    })

    const reports = Array.from(salesPersonMap.values()).map(report => ({
      ...report,
      profit_margin: report.total_revenue > 0 ? (report.total_profit / report.total_revenue) * 100 : 0,
    }))

    return reports.sort((a, b) => b.total_revenue - a.total_revenue)
  },

  // Product Performance
  getProductPerformance: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<ProductPerformanceReport[]> => {
    const [allSales, products] = await Promise.all([
      saleService.getAll(true, companyId),
      productService.getAll(false, companyId)
    ])
    const filteredSales = reportService.filterSalesByDate(allSales, startDate, endDate)
    const productMap = new Map<number, ProductPerformanceReport>()

    // Initialize with all products
    products.forEach(product => {
      productMap.set(product.id, {
        product_id: product.id,
        product_name: product.name,
        category_name: product.category_name,
        current_stock: product.stock_quantity,
        min_stock_level: product.min_stock_level,
        total_sold: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        profit_margin: 0,
        average_selling_price: 0,
        performance: 'normal',
      })
    })

    // Add sales data
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const existing = productMap.get(item.product_id)
          if (existing) {
            const quantity = item.quantity
            const revenue = item.total
            const cost = (item.purchase_price || 0) * quantity
            const profit = revenue - cost

            existing.total_sold += quantity
            existing.total_revenue += revenue
            existing.total_cost += cost
            existing.total_profit += profit
            existing.last_sold_date = sale.sale_date

            productMap.set(item.product_id, existing)
          }
        }
      })
    })

    // Calculate averages and determine performance
    const reports = Array.from(productMap.values()).map(report => {
      const avgPrice = report.total_sold > 0 ? report.total_revenue / report.total_sold : 0
      const margin = report.total_revenue > 0 ? (report.total_profit / report.total_revenue) * 100 : 0

      // Determine performance (simple logic: top 20% = fast, bottom 20% = slow)
      const allRevenues = Array.from(productMap.values()).map(r => r.total_revenue).sort((a, b) => b - a)
      const threshold20 = allRevenues[Math.floor(allRevenues.length * 0.2)] || 0
      const threshold80 = allRevenues[Math.floor(allRevenues.length * 0.8)] || 0

      let performance: 'fast_moving' | 'slow_moving' | 'normal' = 'normal'
      if (report.total_revenue >= threshold20 && report.total_revenue > 0) {
        performance = 'fast_moving'
      } else if (report.total_revenue <= threshold80 && report.total_revenue === 0) {
        performance = 'slow_moving'
      }

      return {
        ...report,
        average_selling_price: avgPrice,
        profit_margin: margin,
        performance,
      }
    })

    return reports.sort((a, b) => b.total_revenue - a.total_revenue)
  },

  // Profit Analysis by Period
  getProfitAnalysis: async (groupBy: 'day' | 'week' | 'month' | 'year', startDate?: string, endDate?: string, companyId?: number | null): Promise<ProfitAnalysisReport[]> => {
    const allSales = await saleService.getAll(true, companyId)
    const filteredSales = reportService.filterSalesByDate(allSales, startDate, endDate)
    const periodMap = new Map<string, ProfitAnalysisReport>()

    filteredSales.forEach(sale => {
      const saleDate = new Date(sale.sale_date)
      let periodKey: string

      switch (groupBy) {
        case 'day':
          periodKey = saleDate.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(saleDate)
          weekStart.setDate(saleDate.getDate() - saleDate.getDay())
          periodKey = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          periodKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`
          break
        case 'year':
          periodKey = String(saleDate.getFullYear())
          break
        default:
          periodKey = saleDate.toISOString().split('T')[0]
      }

      const existing = periodMap.get(periodKey) || {
        period: periodKey,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        profit_margin: 0,
        sale_count: 0,
        return_count: 0,
        return_amount: 0,
      }

      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const revenue = item.total
          const cost = (item.purchase_price || 0) * item.quantity
          const profit = revenue - cost

          existing.total_revenue += revenue
          existing.total_cost += cost
          existing.total_profit += profit
          existing.sale_count += 1
        } else if (item.sale_type === 'return') {
          existing.return_count += 1
          existing.return_amount += item.total
          // Adjust profit for returns
          const cost = (item.purchase_price || 0) * item.quantity
          existing.total_revenue -= item.total
          existing.total_cost -= cost
          existing.total_profit -= (item.total - cost)
        }
      })

      periodMap.set(periodKey, existing)
    })

    const reports = Array.from(periodMap.values()).map(report => ({
      ...report,
      profit_margin: report.total_revenue > 0 ? (report.total_profit / report.total_revenue) * 100 : 0,
    }))

    return reports.sort((a, b) => a.period.localeCompare(b.period))
  },

  // Category Profit Analysis
  getCategoryProfit: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<CategoryProfitReport[]> => {
    const categoryReports = await reportService.getSalesByCategory(startDate, endDate, companyId)
    return categoryReports.map(cat => ({
      category_id: cat.category_id,
      category_name: cat.category_name,
      total_revenue: cat.total_revenue,
      total_cost: cat.total_cost,
      total_profit: cat.total_profit,
      profit_margin: cat.profit_margin,
      product_count: cat.product_count,
      sale_count: cat.sale_count,
    }))
  },

  // --- Purchase Reports ---

  filterPurchasesByDate: (purchases: Purchase[], startDate?: string, endDate?: string): Purchase[] => {
    if (!startDate && !endDate) return purchases
    return purchases.filter(p => {
      const purchaseDate = new Date(p.purchase_date).getTime()
      if (startDate && purchaseDate < new Date(startDate).getTime()) return false
      if (endDate) {
        const endDateTime = new Date(endDate).getTime() + 86400000
        if (purchaseDate > endDateTime) return false
      }
      return true
    })
  },

  getPurchasesBySupplier: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<PurchasesBySupplierReport[]> => {
    const [allPurchases, outstanding] = await Promise.all([
      purchaseService.getAll(undefined, companyId),
      paymentService.getOutstandingPayments('purchase', companyId),
    ])
    const filtered = reportService.filterPurchasesByDate(allPurchases, startDate, endDate)
    const supplierMap = new Map<string | number, PurchasesBySupplierReport>()
    const pendingBySupplierId = new Map<number, number>()
    const pendingBySupplierName = new Map<string, number>()
    outstanding.forEach(o => {
      if (o.supplier_id != null) {
        pendingBySupplierId.set(o.supplier_id, (pendingBySupplierId.get(o.supplier_id) ?? 0) + o.pending_amount)
      } else if (o.supplier_name) {
        pendingBySupplierName.set(o.supplier_name, (pendingBySupplierName.get(o.supplier_name) ?? 0) + o.pending_amount)
      }
    })

    filtered.forEach(p => {
      const supplierId = p.type === 'gst' ? (p as any).supplier_id : undefined
      const supplierName = (p as any).supplier_name || 'Unknown Supplier'
      const key = supplierId ?? `name:${supplierName}`
      const totalAmount = p.type === 'gst' ? (p as any).grand_total : (p as any).total_amount
      const itemQty = p.items.reduce((s, i) => s + (i.purchase_type !== 'return' ? i.quantity : -i.quantity), 0)

      const existing = supplierMap.get(key) || {
        supplier_id: supplierId,
        supplier_name: supplierName,
        total_quantity: 0,
        total_amount: 0,
        purchase_count: 0,
        pending_amount: 0,
        average_order_value: 0,
      }
      existing.total_quantity += Math.max(0, itemQty)
      existing.total_amount += totalAmount
      existing.purchase_count += 1
      supplierMap.set(key, existing)
    })

    const reports = Array.from(supplierMap.values()).map(r => {
      const pending = r.supplier_id != null
        ? (pendingBySupplierId.get(r.supplier_id) ?? 0)
        : (pendingBySupplierName.get(r.supplier_name) ?? 0)
      return {
        ...r,
        pending_amount: pending,
        average_order_value: r.purchase_count > 0 ? r.total_amount / r.purchase_count : 0,
      }
    })
    return reports.sort((a, b) => b.total_amount - a.total_amount)
  },

  getPurchasesByProduct: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<PurchasesByProductReport[]> => {
    const [allPurchases, products] = await Promise.all([
      purchaseService.getAll(undefined, companyId),
      productService.getAll(false, companyId),
    ])
    const filtered = reportService.filterPurchasesByDate(allPurchases, startDate, endDate)
    const productMap = new Map<number, { total_quantity: number; total_amount: number; purchase_count: number; suppliers: Set<string> }>()

    filtered.forEach(p => {
      const supplierName = (p as any).supplier_name || 'Unknown'
      p.items.forEach(item => {
        if (item.purchase_type === 'return') return
        const productId = item.product_id
        const product = products.find(pr => pr.id === productId)
        const categoryName = product?.category_name || 'Uncategorized'
        const qty = item.quantity
        const amt = item.total

        const existing = productMap.get(productId) || {
          total_quantity: 0,
          total_amount: 0,
          purchase_count: 0,
          suppliers: new Set<string>(),
        }
        existing.total_quantity += qty
        existing.total_amount += amt
        existing.purchase_count += 1
        existing.suppliers.add(supplierName)
        productMap.set(productId, existing)
      })
    })

    const reports: PurchasesByProductReport[] = Array.from(productMap.entries()).map(([productId, data]) => {
      const product = products.find(p => p.id === productId)
      return {
        product_id: productId,
        product_name: product?.name || 'Unknown',
        category_name: product?.category_name || 'Uncategorized',
        total_quantity: data.total_quantity,
        total_amount: data.total_amount,
        average_unit_price: data.total_quantity > 0 ? data.total_amount / data.total_quantity : 0,
        purchase_count: data.purchase_count,
        supplier_names: Array.from(data.suppliers),
      }
    })
    return reports.sort((a, b) => b.total_amount - a.total_amount)
  },

  getPurchasesByCategory: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<PurchasesByCategoryReport[]> => {
    const [allPurchases, products] = await Promise.all([
      purchaseService.getAll(undefined, companyId),
      productService.getAll(false, companyId),
    ])
    const filtered = reportService.filterPurchasesByDate(allPurchases, startDate, endDate)
    const categoryMap = new Map<string, PurchasesByCategoryReport & { productIds: Set<number> }>()

    filtered.forEach(p => {
      p.items.forEach(item => {
        if (item.purchase_type === 'return') return
        const product = products.find(pr => pr.id === item.product_id)
        const categoryName = product?.category_name || 'Uncategorized'
        const categoryId = product?.category_id

        const existing = categoryMap.get(categoryName) || {
          category_id: categoryId,
          category_name: categoryName,
          total_quantity: 0,
          total_amount: 0,
          product_count: 0,
          purchase_count: 0,
          productIds: new Set<number>(),
        }
        existing.total_quantity += item.quantity
        existing.total_amount += item.total
        existing.productIds.add(item.product_id)
        categoryMap.set(categoryName, existing)
      })
    })

    const purchaseCountByCategory = new Map<string, number>()
    filtered.forEach(p => {
      const seen = new Set<string>()
      p.items.forEach(item => {
        if (item.purchase_type === 'return') return
        const product = products.find(pr => pr.id === item.product_id)
        const cat = product?.category_name || 'Uncategorized'
        if (!seen.has(cat)) {
          seen.add(cat)
          purchaseCountByCategory.set(cat, (purchaseCountByCategory.get(cat) ?? 0) + 1)
        }
      })
    })

    const reports = Array.from(categoryMap.values()).map(cat => ({
      category_id: cat.category_id,
      category_name: cat.category_name,
      total_quantity: cat.total_quantity,
      total_amount: cat.total_amount,
      product_count: cat.productIds.size,
      purchase_count: purchaseCountByCategory.get(cat.category_name) ?? 0,
    }))
    return reports.sort((a, b) => b.total_amount - a.total_amount)
  },

  // --- Sales velocity for reorder suggestions ---

  /** Sales velocity: units sold per week for each product (last N weeks) */
  getSalesVelocityByProduct: async (weeksLookback: number = 4, companyId?: number | null): Promise<Map<number, { totalSold: number; velocityPerWeek: number }>> => {
    const allSales = await saleService.getAll(true, companyId)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeksLookback * 7)
    const filtered = reportService.filterSalesByDate(
      allSales,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )
    const productMap = new Map<number, { totalSold: number }>()
    filtered.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type === 'sale' && item.product_id) {
          const current = productMap.get(item.product_id) || { totalSold: 0 }
          current.totalSold += item.quantity
          productMap.set(item.product_id, current)
        }
      })
    })
    const result = new Map<number, { totalSold: number; velocityPerWeek: number }>()
    productMap.forEach((v, productId) => {
      result.set(productId, {
        totalSold: v.totalSold,
        velocityPerWeek: weeksLookback > 0 ? v.totalSold / weeksLookback : 0,
      })
    })
    return result
  },

  // --- Expense Reports ---

  filterExpensesByDate: (expenses: Expense[], startDate?: string, endDate?: string): Expense[] => {
    if (!startDate && !endDate) return expenses
    return expenses.filter(e => {
      const d = new Date(e.expense_date).getTime()
      if (startDate && d < new Date(startDate).getTime()) return false
      if (endDate && d > new Date(endDate + 'T23:59:59').getTime()) return false
      return true
    })
  },

  getExpensesByCategory: async (startDate?: string, endDate?: string, companyId?: number | null): Promise<ExpensesByCategoryReport[]> => {
    const all = await expenseService.getAll(companyId)
    const filtered = reportService.filterExpensesByDate(all, startDate, endDate)
    // Exclude opening/closing (balance entries, not operational expenses)
    const operational = filtered.filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing')
    const categoryMap = new Map<string, { total: number; count: number; byPayment: Record<string, number> }>()
    const LABELS: Record<string, string> = {
      salary: 'Employee Salary',
      sales_person_payment: 'Sales Person Payment',
      purchase: 'Purchase',
      transport: 'Transport',
      office: 'Office / Rent',
      utility: 'Utilities',
      maintenance: 'Maintenance',
      marketing: 'Marketing',
      other: 'Other',
    }
    operational.forEach(e => {
      const label = LABELS[e.expense_type] || e.expense_type
      const existing = categoryMap.get(e.expense_type) || { total: 0, count: 0, byPayment: {} }
      existing.total += e.amount
      existing.count += 1
      existing.byPayment[e.payment_method] = (existing.byPayment[e.payment_method] || 0) + e.amount
      categoryMap.set(e.expense_type, existing)
    })
    return Array.from(categoryMap.entries()).map(([expense_type, data]) => ({
      expense_type,
      category_label: LABELS[expense_type] || expense_type,
      total_amount: data.total,
      expense_count: data.count,
      payment_methods: data.byPayment,
    })).sort((a, b) => b.total_amount - a.total_amount)
  },

  getExpensesByPeriod: async (groupBy: 'day' | 'week' | 'month', startDate?: string, endDate?: string, companyId?: number | null): Promise<ExpensesByPeriodReport[]> => {
    const all = await expenseService.getAll(companyId)
    const filtered = reportService.filterExpensesByDate(all, startDate, endDate)
    const operational = filtered.filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing')
    const periodMap = new Map<string, { total: number; count: number }>()
    operational.forEach(e => {
      const d = new Date(e.expense_date)
      let key: string
      if (groupBy === 'day') key = d.toISOString().split('T')[0]
      else if (groupBy === 'week') {
        const w = new Date(d)
        w.setDate(d.getDate() - d.getDay())
        key = w.toISOString().split('T')[0]
      } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const ex = periodMap.get(key) || { total: 0, count: 0 }
      ex.total += e.amount
      ex.count += 1
      periodMap.set(key, ex)
    })
    return Array.from(periodMap.entries()).map(([period, data]) => ({
      period,
      total_amount: data.total,
      expense_count: data.count,
    })).sort((a, b) => a.period.localeCompare(b.period))
  },

  getExpenseVsIncome: async (groupBy: 'day' | 'week' | 'month', startDate?: string, endDate?: string, companyId?: number | null): Promise<ExpenseVsIncomeReport[]> => {
    const [allExpenses, allSales] = await Promise.all([
      expenseService.getAll(companyId),
      saleService.getAll(true, companyId),
    ])
    const expensesFiltered = reportService.filterExpensesByDate(allExpenses, startDate, endDate)
    const salesFiltered = reportService.filterSalesByDate(allSales, startDate, endDate)
    const operationalExpenses = expensesFiltered.filter(e => e.expense_type !== 'opening' && e.expense_type !== 'closing')
    const periodMap = new Map<string, { expense: number; expenseCount: number; income: number; saleCount: number }>()
    const addToPeriod = (key: string, expense: number, inc: number, expCount: number, saleCount: number) => {
      const ex = periodMap.get(key) || { expense: 0, expenseCount: 0, income: 0, saleCount: 0 }
      ex.expense += expense
      ex.expenseCount += expCount
      ex.income += inc
      ex.saleCount += saleCount
      periodMap.set(key, ex)
    }
    operationalExpenses.forEach(e => {
      const d = new Date(e.expense_date)
      let key: string
      if (groupBy === 'day') key = d.toISOString().split('T')[0]
      else if (groupBy === 'week') {
        const w = new Date(d)
        w.setDate(d.getDate() - d.getDay())
        key = w.toISOString().split('T')[0]
      } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      addToPeriod(key, e.amount, 0, 1, 0)
    })
    salesFiltered.forEach(s => {
      const d = new Date(s.sale_date)
      let key: string
      if (groupBy === 'day') key = d.toISOString().split('T')[0]
      else if (groupBy === 'week') {
        const w = new Date(d)
        w.setDate(d.getDate() - d.getDay())
        key = w.toISOString().split('T')[0]
      } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      addToPeriod(key, 0, s.grand_total || 0, 0, 1)
    })
    return Array.from(periodMap.entries()).map(([period, data]) => ({
      period,
      total_expense: data.expense,
      total_income: data.income,
      net: data.income - data.expense,
      expense_count: data.expenseCount,
      sale_count: data.saleCount,
    })).sort((a, b) => a.period.localeCompare(b.period))
  },
}
