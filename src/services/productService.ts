// Product service using IndexedDB

import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

export interface Category {
  id: number
  name: string
  description?: string
  parent_id?: number // For sub-categories
  parent_name?: string // For display
  is_subcategory: boolean
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: number
  name: string
  sku?: string
  barcode?: string
  category_id?: number
  category_name?: string
  description?: string
  // Pricing & Stock managed during purchase entry
  purchase_price?: number // Optional: last known purchase price (for reference only)
  selling_price?: number // Optional: default selling price (can be overridden during purchase)
  stock_quantity: number // Managed automatically via purchases/sales
  min_stock_level?: number // Optional: for low stock alerts
  unit: string
  image_url?: string
  is_active: boolean
  // GST & Tax fields
  hsn_code?: string
  gst_rate: number // GST percentage (0-100)
  tax_type: 'inclusive' | 'exclusive' // Is GST included in selling price?
  cgst_rate?: number // Central GST (for split GST)
  sgst_rate?: number // State GST (for split GST)
  igst_rate?: number // Integrated GST (for interstate)
  // Lifecycle fields
  status: 'active' | 'sold' | 'archived'
  barcode_status: 'active' | 'used' | 'inactive'
  sold_date?: string
  sale_id?: number
  created_at?: string
  updated_at?: string
}

// Initialize default categories if empty
async function initializeDefaultCategories(): Promise<void> {
  const categories = await getAll<Category>(STORES.CATEGORIES)
  if (categories.length === 0) {
    const defaultCategories: Category[] = [
      { id: 1, name: 'Electronics', is_subcategory: false, created_at: new Date().toISOString() },
      { id: 2, name: 'Clothing', is_subcategory: false, created_at: new Date().toISOString() },
      { id: 3, name: 'Food & Beverages', is_subcategory: false, created_at: new Date().toISOString() },
      { id: 4, name: 'Home & Living', is_subcategory: false, created_at: new Date().toISOString() },
    ]
    for (const category of defaultCategories) {
      await put(STORES.CATEGORIES, category)
    }
  }
}

// Categories
export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    await initializeDefaultCategories()
    const categories = await getAll<Category>(STORES.CATEGORIES)
    return categories.map(c => ({
      ...c,
      is_subcategory: c.is_subcategory !== undefined ? c.is_subcategory : (c.parent_id ? true : false),
      parent_id: c.parent_id || undefined,
      parent_name: c.parent_name || undefined,
    }))
  },

  getById: async (id: number): Promise<Category | undefined> => {
    return await getById<Category>(STORES.CATEGORIES, id)
  },

  create: async (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> => {
    const newCategory: Category = {
      ...category,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.CATEGORIES, newCategory)
    return newCategory
  },

  update: async (id: number, category: Partial<Category>): Promise<Category | null> => {
    const existing = await getById<Category>(STORES.CATEGORIES, id)
    if (!existing) return null

    // Update parent_name if parent_id changed
    if (category.parent_id !== undefined) {
      const parent = category.parent_id ? await getById<Category>(STORES.CATEGORIES, category.parent_id) : null
      category.parent_name = parent?.name
      category.is_subcategory = !!category.parent_id
    }

    const updated: Category = {
      ...existing,
      ...category,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.CATEGORIES, updated)
    return updated
  },

  getSubcategories: async (parentId: number): Promise<Category[]> => {
    const allCategories = await categoryService.getAll()
    return allCategories.filter(c => c.parent_id === parentId)
  },

  getMainCategories: async (): Promise<Category[]> => {
    const allCategories = await categoryService.getAll()
    return allCategories.filter(c => !c.is_subcategory)
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.CATEGORIES, id)
      return true
    } catch (error) {
      return false
    }
  },
}

// Products
export const productService = {
  getAll: async (includeArchived: boolean = false): Promise<Product[]> => {
    await initializeDefaultCategories()
    let products = await getAll<Product>(STORES.PRODUCTS)
    
    // Filter by status if needed
    if (!includeArchived) {
      products = products.filter(p => p.status === 'active')
    }
    
    // Join with categories
    const categories = await categoryService.getAll()
    return products.map(p => ({
      ...p,
      category_name: p.category_id ? categories.find(c => c.id === p.category_id)?.name : undefined,
      status: p.status || 'active',
      barcode_status: p.barcode_status || (p.barcode ? 'active' : 'inactive'),
    }))
  },

  getById: async (id: number, includeArchived: boolean = false): Promise<Product | undefined> => {
    const product = await getById<Product>(STORES.PRODUCTS, id)
    if (!product) return undefined
    if (!includeArchived && product.status !== 'active') return undefined
    
    // Join with category
    const categories = await categoryService.getAll()
    return {
      ...product,
      category_name: product.category_id ? categories.find(c => c.id === product.category_id)?.name : undefined,
      status: product.status || 'active',
      barcode_status: product.barcode_status || (product.barcode ? 'active' : 'inactive'),
    }
  },

  getByCategory: async (categoryId: number): Promise<Product[]> => {
    const allProducts = await productService.getAll()
    return allProducts.filter(p => p.category_id === categoryId)
  },

  search: async (query: string): Promise<Product[]> => {
    const products = await productService.getAll()
    const lowerQuery = query.toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.sku?.toLowerCase().includes(lowerQuery) ||
      p.barcode?.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery)
    )
  },

  create: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category_name'>): Promise<Product> => {
    const newProduct: Product = {
      ...product,
      id: Date.now(),
      stock_quantity: product.stock_quantity || 0, // Managed automatically via purchases/sales
      unit: product.unit || 'pcs',
      is_active: product.is_active !== undefined ? product.is_active : true,
      gst_rate: product.gst_rate || 0,
      tax_type: product.tax_type || 'exclusive',
      status: 'active',
      barcode_status: product.barcode ? 'active' : 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.PRODUCTS, newProduct)
    
    // Return with category name
    const categories = await categoryService.getAll()
    return {
      ...newProduct,
      category_name: newProduct.category_id ? categories.find(c => c.id === newProduct.category_id)?.name : undefined,
    }
  },

  update: async (id: number, product: Partial<Product>): Promise<Product | null> => {
    const existing = await getById<Product>(STORES.PRODUCTS, id)
    if (!existing) return null

    const { category_name, ...updateData } = product
    const updated: Product = {
      ...existing,
      ...updateData,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.PRODUCTS, updated)
    
    // Return with category name
    const categories = await categoryService.getAll()
    return {
      ...updated,
      category_name: updated.category_id ? categories.find(c => c.id === updated.category_id)?.name : undefined,
    }
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.PRODUCTS, id)
      return true
    } catch (error) {
      return false
    }
  },

  updateStock: async (id: number, quantity: number, type: 'add' | 'subtract' | 'set'): Promise<Product | null> => {
    const product = await productService.getById(id, true)
    if (!product) return null

    let newQuantity = product.stock_quantity
    if (type === 'add') {
      newQuantity += quantity
    } else if (type === 'subtract') {
      newQuantity = Math.max(0, newQuantity - quantity)
    } else {
      newQuantity = quantity
    }

    return await productService.update(id, { stock_quantity: newQuantity })
  },
}
