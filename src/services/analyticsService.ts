import { saleService } from './saleService'
import { purchaseService } from './purchaseService'
import { productService } from './productService'
import { customerService } from './customerService'

export interface SalesTrendData {
  date: string
  sales: number
  purchases: number
  profit: number
  salesCount: number
}

export interface ProductPerformanceData {
  productId: number
  productName: string
  quantitySold: number
  revenue: number
  profit: number
  profitMargin: number
}

export interface RevenueData {
  period: string
  revenue: number
  cost: number
  profit: number
  profitMargin: number
}

export interface TopCustomerData {
  customerId: number | undefined
  customerName: string
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
}

export const analyticsService = {
  // Get sales trends for a date range
  getSalesTrends: async (days: number = 30, companyId?: number | null): Promise<SalesTrendData[]> => {
    const [allSales, allPurchases] = await Promise.all([
      saleService.getAll(true, companyId),
      purchaseService.getAll(undefined, companyId)
    ])
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - days)

    // Initialize date map
    const dateMap = new Map<string, SalesTrendData>()
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dateMap.set(dateStr, {
        date: dateStr,
        sales: 0,
        purchases: 0,
        profit: 0,
        salesCount: 0,
      })
    }

    // Aggregate sales
    allSales.forEach(sale => {
      const saleDate = new Date(sale.sale_date).toISOString().split('T')[0]
      if (dateMap.has(saleDate)) {
        const data = dateMap.get(saleDate)!
        data.sales += sale.grand_total
        data.salesCount += 1
        
        // Calculate profit for this sale
        sale.items.forEach(item => {
          if (item.sale_type === 'sale' && item.purchase_price) {
            const itemProfit = (item.unit_price - item.purchase_price) * item.quantity
            data.profit += itemProfit
          }
        })
      }
    })

    // Aggregate purchases
    allPurchases.forEach(purchase => {
      const purchaseDate = new Date(purchase.purchase_date).toISOString().split('T')[0]
      if (dateMap.has(purchaseDate)) {
        const data = dateMap.get(purchaseDate)!
        const totalAmount = purchase.type === 'gst' 
          ? (purchase as any).grand_total 
          : (purchase as any).total_amount
        data.purchases += totalAmount
      }
    })

    return Array.from(dateMap.values())
  },

  // Get top performing products
  getTopProducts: async (limit: number = 10, companyId?: number | null): Promise<ProductPerformanceData[]> => {
    const allSales = await saleService.getAll(true, companyId)
    const productMap = new Map<number, {
      productName: string
      quantitySold: number
      revenue: number
      cost: number
    }>()

    allSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const existing = productMap.get(item.product_id)
          const purchasePrice = item.purchase_price || 0
          const revenue = item.total
          const cost = purchasePrice * item.quantity

          if (existing) {
            existing.quantitySold += item.quantity
            existing.revenue += revenue
            existing.cost += cost
          } else {
            productMap.set(item.product_id, {
              productName: item.product_name,
              quantitySold: item.quantity,
              revenue,
              cost,
            })
          }
        }
      })
    })

    return Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.productName,
        quantitySold: data.quantitySold,
        revenue: data.revenue,
        profit: data.revenue - data.cost,
        profitMargin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
  },

  // Get revenue by period (daily, weekly, monthly)
  getRevenueByPeriod: async (period: 'daily' | 'weekly' | 'monthly' = 'monthly', months: number = 12, companyId?: number | null): Promise<RevenueData[]> => {
    const allSales = await saleService.getAll(true, companyId)
    const periodMap = new Map<string, { revenue: number; cost: number }>()

    allSales.forEach(sale => {
      const saleDate = new Date(sale.sale_date)
      let periodKey = ''

      if (period === 'daily') {
        periodKey = saleDate.toISOString().split('T')[0]
      } else if (period === 'weekly') {
        const weekStart = new Date(saleDate)
        weekStart.setDate(saleDate.getDate() - saleDate.getDay())
        periodKey = `Week ${weekStart.toISOString().split('T')[0]}`
      } else {
        const month = saleDate.getMonth() + 1
        periodKey = `${saleDate.getFullYear()}-${month < 10 ? '0' : ''}${month}`
      }

      const existing = periodMap.get(periodKey) || { revenue: 0, cost: 0 }
      existing.revenue += sale.grand_total

      sale.items.forEach(item => {
        if (item.sale_type === 'sale' && item.purchase_price) {
          existing.cost += item.purchase_price * item.quantity
        }
      })

      periodMap.set(periodKey, existing)
    })

    return Array.from(periodMap.entries())
      .map(([periodKey, data]) => ({
        period: periodKey,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        profitMargin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-months)
  },

  // Get top customers
  getTopCustomers: async (limit: number = 10, companyId?: number | null): Promise<TopCustomerData[]> => {
    const allSales = await saleService.getAll(true, companyId)
    const customerMap = new Map<number | undefined, {
      customerName: string
      totalOrders: number
      totalRevenue: number
    }>()

    allSales.forEach(sale => {
      const customerId = sale.customer_id
      const customerName = sale.customer_name || 'Walk-in Customer'
      const existing = customerMap.get(customerId)

      if (existing) {
        existing.totalOrders += 1
        existing.totalRevenue += sale.grand_total
      } else {
        customerMap.set(customerId, {
          customerName,
          totalOrders: 1,
          totalRevenue: sale.grand_total,
        })
      }
    })

    return Array.from(customerMap.entries())
      .map(([customerId, data]) => ({
        customerId,
        customerName: data.customerName,
        totalOrders: data.totalOrders,
        totalRevenue: data.totalRevenue,
        averageOrderValue: data.totalRevenue / data.totalOrders,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
  },

  // Get category-wise sales
  getCategorySales: async (companyId?: number | null) => {
    const [allSales, allProducts] = await Promise.all([
      saleService.getAll(true, companyId),
      productService.getAll(true, companyId)
    ])
    const categoryMap = new Map<number, {
      categoryName: string
      revenue: number
      quantity: number
    }>()

    allSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.sale_type === 'sale') {
          const product = allProducts.find(p => p.id === item.product_id)
          if (product && product.category_id) {
            const existing = categoryMap.get(product.category_id)
            if (existing) {
              existing.revenue += item.total
              existing.quantity += item.quantity
            } else {
              categoryMap.set(product.category_id, {
                categoryName: product.category_name || 'Uncategorized',
                revenue: item.total,
                quantity: item.quantity,
              })
            }
          }
        }
      })
    })

    return Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.categoryName,
        revenue: data.revenue,
        quantity: data.quantity,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  },
}
