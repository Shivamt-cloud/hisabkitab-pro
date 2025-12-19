import { saleService } from './saleService'
import { productService, categoryService } from './productService'
import {
  SalesByProductReport,
  SalesByCategoryReport,
  SalesByCustomerReport,
  SalesBySalesPersonReport,
  ProductPerformanceReport,
  ProfitAnalysisReport,
  CategoryProfitReport,
  ReportTimePeriod,
  DateRange,
} from '../types/reports'
import { Sale } from '../types/sale'

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
  getSalesByProduct: async (startDate?: string, endDate?: string): Promise<SalesByProductReport[]> => {
    const allSales = await saleService.getAll(true)
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
  getSalesByCategory: async (startDate?: string, endDate?: string): Promise<SalesByCategoryReport[]> => {
    const [allSales, products] = await Promise.all([
      saleService.getAll(true),
      productService.getAll(false)
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
  getSalesByCustomer: async (startDate?: string, endDate?: string): Promise<SalesByCustomerReport[]> => {
    const allSales = await saleService.getAll(true)
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
  getSalesBySalesPerson: async (startDate?: string, endDate?: string): Promise<SalesBySalesPersonReport[]> => {
    const allSales = await saleService.getAll(true)
    const filteredSales = reportService.filterSalesByDate(allSales, startDate, endDate)
    const salesPersonMap = new Map<string, SalesBySalesPersonReport>()

    filteredSales.forEach(sale => {
      const salesPersonName = sale.sales_person_name || 'Not Assigned'
      const salesPersonId = sale.sales_person_id

      const existing = salesPersonMap.get(salesPersonName) || {
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
          existing.commission_amount += (item as any).commission_amount || 0
        }
      })

      existing.sale_count += 1
      salesPersonMap.set(salesPersonName, existing)
    })

    const reports = Array.from(salesPersonMap.values()).map(report => ({
      ...report,
      profit_margin: report.total_revenue > 0 ? (report.total_profit / report.total_revenue) * 100 : 0,
    }))

    return reports.sort((a, b) => b.total_revenue - a.total_revenue)
  },

  // Product Performance
  getProductPerformance: async (startDate?: string, endDate?: string): Promise<ProductPerformanceReport[]> => {
    const [allSales, products] = await Promise.all([
      saleService.getAll(true),
      productService.getAll(false)
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
  getProfitAnalysis: async (groupBy: 'day' | 'week' | 'month' | 'year', startDate?: string, endDate?: string): Promise<ProfitAnalysisReport[]> => {
    const allSales = await saleService.getAll(true)
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
  getCategoryProfit: async (startDate?: string, endDate?: string): Promise<CategoryProfitReport[]> => {
    const categoryReports = await reportService.getSalesByCategory(startDate, endDate)
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
}
