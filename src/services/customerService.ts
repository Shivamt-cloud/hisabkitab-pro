// Customer Management Service using IndexedDB

import { Customer, CustomerSummary } from '../types/customer'
import { saleService } from './saleService'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

// Initialize with sample data if empty
async function initializeData(): Promise<void> {
  const customers = await getAll<Customer>(STORES.CUSTOMERS)
  if (customers.length === 0) {
    const sampleCustomer: Customer = {
      id: 1,
      name: 'Walk-in Customer',
      is_active: true,
      created_at: new Date().toISOString(),
    }
    await put(STORES.CUSTOMERS, sampleCustomer)
  }
}

export const customerService = {
  getAll: async (includeInactive: boolean = false, companyId?: number): Promise<Customer[]> => {
    await initializeData()
    let customers: Customer[]
    
    if (companyId !== undefined) {
      customers = await getByIndex<Customer>(STORES.CUSTOMERS, 'company_id', companyId)
    } else {
      customers = await getAll<Customer>(STORES.CUSTOMERS)
    }
    
    if (!includeInactive) {
      customers = customers.filter(c => c.is_active)
    }
    
    return customers.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
  },

  getById: async (id: number): Promise<Customer | null> => {
    const customer = await getById<Customer>(STORES.CUSTOMERS, id)
    return customer || null
  },

  create: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const customers = await customerService.getAll(true)
    
    // Check for duplicate email if provided
    if (customer.email && customer.email.trim()) {
      const existing = customers.find(c => c.email && c.email.toLowerCase() === customer.email!.toLowerCase())
      if (existing) {
        throw new Error('Customer with this email already exists')
      }
    }
    
    // Check for duplicate phone if provided
    if (customer.phone && customer.phone.trim()) {
      const existing = customers.find(c => c.phone === customer.phone)
      if (existing) {
        throw new Error('Customer with this phone number already exists')
      }
    }

    const newCustomer: Customer = {
      ...customer,
      id: Date.now(),
      outstanding_amount: customer.outstanding_amount || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    await put(STORES.CUSTOMERS, newCustomer)
    return newCustomer
  },

  update: async (id: number, customer: Partial<Customer>): Promise<Customer | null> => {
    const existing = await getById<Customer>(STORES.CUSTOMERS, id)
    if (!existing) return null

    // Check for duplicate email if provided and different from current
    if (customer.email && customer.email.trim()) {
      const customers = await customerService.getAll(true)
      const duplicate = customers.find(c => c.email && c.email.toLowerCase() === customer.email!.toLowerCase() && c.id !== id)
      if (duplicate) {
        throw new Error('Customer with this email already exists')
      }
    }
    
    // Check for duplicate phone if provided and different from current
    if (customer.phone && customer.phone.trim()) {
      const customers = await customerService.getAll(true)
      const duplicate = customers.find(c => c.phone === customer.phone && c.id !== id)
      if (duplicate) {
        throw new Error('Customer with this phone number already exists')
      }
    }

    const updatedCustomer: Customer = {
      ...existing,
      ...customer,
      id: existing.id, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    }
    
    await put(STORES.CUSTOMERS, updatedCustomer)
    return updatedCustomer
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.CUSTOMERS, id)
      return true
    } catch (error) {
      return false
    }
  },

  search: async (query: string): Promise<Customer[]> => {
    const customers = await customerService.getAll()
    const lowerQuery = query.toLowerCase()
    
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(lowerQuery) ||
      customer.email?.toLowerCase().includes(lowerQuery) ||
      customer.phone?.includes(query) ||
      customer.gstin?.toLowerCase().includes(lowerQuery) ||
      customer.city?.toLowerCase().includes(lowerQuery)
    )
  },

  getSummary: async (customerId: number): Promise<CustomerSummary | null> => {
    const customer = await customerService.getById(customerId)
    if (!customer) return null

    const allSales = await saleService.getAll(true)
    const customerSales = allSales.filter(s => s.customer_id === customerId)
    
    const totalSales = customerSales.reduce((sum, s) => sum + s.grand_total, 0)
    const saleCount = customerSales.length
    const lastSale = customerSales.length > 0 
      ? customerSales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())[0]
      : null

    return {
      id: customer.id,
      name: customer.name,
      total_sales: totalSales,
      total_purchases: 0, // Purchases are not linked to customers in this system
      outstanding_amount: customer.outstanding_amount || 0,
      last_sale_date: lastSale?.sale_date,
      sale_count: saleCount,
    }
  },

  updateOutstandingAmount: async (customerId: number, amount: number): Promise<boolean> => {
    const customer = await customerService.getById(customerId)
    if (!customer) return false

    await customerService.update(customerId, {
      outstanding_amount: (customer.outstanding_amount || 0) + amount
    })
    return true
  },
}
