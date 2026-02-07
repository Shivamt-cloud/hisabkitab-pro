// Cloud Product Service - Handles product operations with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { Product } from './productService'
import { categoryService } from './productService'
import { getAll, put, getById, deleteById, STORES } from '../database/db'

/**
 * Cloud Product Service
 * Handles product operations with Supabase cloud storage
 * Falls back to IndexedDB if Supabase is not available or offline
 */
export const cloudProductService = {
  /**
   * Get all products from cloud
   */
  getAll: async (includeArchived: boolean = false, companyId?: number | null): Promise<Product[]> => {
    const effectiveId = companyId ?? undefined
    if (!isSupabaseAvailable() || !isOnline()) {
      let products = await getAll<Product>(STORES.PRODUCTS)
      if (effectiveId !== undefined) {
        products = products.filter(p => p.company_id === effectiveId || p.company_id === null || p.company_id === undefined)
      }
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
    }

    try {
      let query = supabase!.from('products').select('*')
      if (effectiveId !== undefined) {
        query = query.eq('company_id', effectiveId)
      }

      if (!includeArchived) {
        query = query.eq('status', 'active')
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching products from cloud:', error)
        let products = await getAll<Product>(STORES.PRODUCTS)
        if (effectiveId !== undefined) {
          products = products.filter(p => p.company_id === effectiveId || p.company_id === null || p.company_id === undefined)
        }
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
      }

      // Sync to local storage in background (don't block UI)
      if (data && data.length > 0) {
        void Promise.all((data as Product[]).map((p) => put(STORES.PRODUCTS, p))).catch((e) =>
          console.warn('[cloudProductService] Background sync failed:', e)
        )
      }

      // Join with categories
      const categories = await categoryService.getAll()
      return (data as Product[]).map(p => ({
        ...p,
        category_name: p.category_id ? categories.find(c => c.id === p.category_id)?.name : undefined,
        status: p.status || 'active',
        barcode_status: p.barcode_status || (p.barcode ? 'active' : 'inactive'),
      })) || []
    } catch (error) {
      console.error('Error in cloudProductService.getAll:', error)
      let products = await getAll<Product>(STORES.PRODUCTS)
      if (effectiveId !== undefined) {
        products = products.filter(p => p.company_id === effectiveId || p.company_id === null || p.company_id === undefined)
      }
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
    }
  },

  /**
   * Get product by SKU from cloud
   */
  getBySku: async (sku: string, companyId?: number | null): Promise<Product | undefined> => {
    if (!sku) return undefined
    
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
      const products = await getAll<Product>(STORES.PRODUCTS)
      const product = products.find(p => p.sku === sku && (!companyId || p.company_id === companyId))
      if (!product) return undefined
      // Join with category
      const categories = await categoryService.getAll()
      return {
        ...product,
        category_name: product.category_id ? categories.find(c => c.id === product.category_id)?.name : undefined,
        status: product.status || 'active',
        barcode_status: product.barcode_status || (product.barcode ? 'active' : 'inactive'),
      }
    }

    try {
      let query = supabase!.from('products').select('*').eq('sku', sku)
      
      if (companyId !== undefined && companyId !== null) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        console.error('Error fetching product by SKU from cloud:', error)
        // Fallback to local storage
        const products = await getAll<Product>(STORES.PRODUCTS)
        const product = products.find(p => p.sku === sku && (!companyId || p.company_id === companyId))
        if (!product) return undefined
        // Join with category
        const categories = await categoryService.getAll()
        return {
          ...product,
          category_name: product.category_id ? categories.find(c => c.id === product.category_id)?.name : undefined,
          status: product.status || 'active',
          barcode_status: product.barcode_status || (product.barcode ? 'active' : 'inactive'),
        }
      }

      // If no data found, return undefined (not an error)
      if (!data) {
        return undefined
      }

      // Sync to local storage
      await put(STORES.PRODUCTS, data as Product)

      // Join with category
      const categories = await categoryService.getAll()
      return {
        ...(data as Product),
        category_name: data.category_id ? categories.find(c => c.id === data.category_id)?.name : undefined,
        status: data.status || 'active',
        barcode_status: data.barcode_status || (data.barcode ? 'active' : 'inactive'),
      }
    } catch (error) {
      console.error('Error in cloudProductService.getBySku:', error)
      // Fallback to local storage
      const products = await getAll<Product>(STORES.PRODUCTS)
      const product = products.find(p => p.sku === sku && (!companyId || p.company_id === companyId))
      if (!product) return undefined
      // Join with category
      const categories = await categoryService.getAll()
      return {
        ...product,
        category_name: product.category_id ? categories.find(c => c.id === product.category_id)?.name : undefined,
        status: product.status || 'active',
        barcode_status: product.barcode_status || (product.barcode ? 'active' : 'inactive'),
      }
    }
  },

  /**
   * Get product by ID from cloud
   */
  getById: async (id: number, includeArchived: boolean = false): Promise<Product | undefined> => {
    // If Supabase not available or offline, use local storage
    if (!isSupabaseAvailable() || !isOnline()) {
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
    }

    try {
      let query = supabase!.from('products').select('*').eq('id', id)
      if (!includeArchived) {
        query = query.eq('status', 'active')
      }
      const { data, error } = await query.maybeSingle()

      if (error) {
        console.error('Error fetching product from cloud:', error)
        // Fallback to local storage
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
      }

      // If no data found, return undefined (not an error)
      if (!data) {
        return undefined
      }

      // Sync to local storage
      if (data) {
        await put(STORES.PRODUCTS, data as Product)
      }

      // Join with category
      const categories = await categoryService.getAll()
      return {
        ...(data as Product),
        category_name: data.category_id ? categories.find(c => c.id === data.category_id)?.name : undefined,
        status: data.status || 'active',
        barcode_status: data.barcode_status || (data.barcode ? 'active' : 'inactive'),
      }
    } catch (error) {
      console.error('Error in cloudProductService.getById:', error)
      // Fallback to local storage
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
    }
  },

  /**
   * Create product in cloud
   */
  create: async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category_name'> & { custom_sku?: string }): Promise<Product> => {
    // If Supabase available and online, create in cloud first to get ID
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { data, error } = await supabase!
          .from('products')
          .insert([{
            name: productData.name,
            sku: productData.sku || null,
            barcode: productData.barcode || null,
            category_id: productData.category_id || null,
            description: productData.description || null,
            company_id: productData.company_id || null,
            purchase_price: productData.purchase_price || null,
            selling_price: productData.selling_price || null,
            stock_quantity: productData.stock_quantity || 0,
            min_stock_level: productData.min_stock_level || null,
            unit: productData.unit || 'pcs',
            image_url: productData.image_url || null,
            is_active: productData.is_active !== undefined ? productData.is_active : true,
            hsn_code: productData.hsn_code || null,
            gst_rate: productData.gst_rate || 0,
            tax_type: (productData.tax_type === 'inclusive' || productData.tax_type === 'exclusive') 
              ? productData.tax_type 
              : 'exclusive',
            cgst_rate: productData.cgst_rate || null,
            sgst_rate: productData.sgst_rate || null,
            igst_rate: productData.igst_rate || null,
            status: productData.status || 'active',
            barcode_status: productData.barcode ? 'active' : 'inactive',
            sold_date: productData.sold_date || null,
            sale_id: productData.sale_id || null,
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating product in cloud:', error)
          throw error
        }

        if (data) {
          // Save to local storage
          await put(STORES.PRODUCTS, data as Product)
          // Join with category
          const categories = await categoryService.getAll()
          return {
            ...(data as Product),
            category_name: data.category_id ? categories.find(c => c.id === data.category_id)?.name : undefined,
          }
        }
      } catch (error) {
        console.error('Error in cloudProductService.create:', error)
        // Fall through to local creation
      }
    }

    // Fallback to local creation
    const newProduct: Product = {
      ...productData,
      id: Date.now(),
      stock_quantity: productData.stock_quantity || 0,
      unit: productData.unit || 'pcs',
      is_active: productData.is_active !== undefined ? productData.is_active : true,
      gst_rate: productData.gst_rate || 0,
      tax_type: (productData.tax_type === 'inclusive' || productData.tax_type === 'exclusive') 
        ? productData.tax_type 
        : 'exclusive',
      status: 'active',
      barcode_status: productData.barcode ? 'active' : 'inactive',
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

  /**
   * Update product in cloud
   */
  update: async (id: number, productData: Partial<Product>): Promise<Product | null> => {
    // Get existing product
    const existing = await getById<Product>(STORES.PRODUCTS, id)
    if (!existing) return null

    const { category_name, ...updateData } = productData
    const updated: Product = {
      ...existing,
      ...updateData,
      updated_at: new Date().toISOString(),
    }

    // Always update local storage first
    await put(STORES.PRODUCTS, updated)

    // If Supabase available and online, sync to cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const updatePayload: any = {
          name: updated.name,
          sku: updated.sku || null,
          barcode: updated.barcode || null,
          category_id: updated.category_id || null,
          description: updated.description || null,
          company_id: updated.company_id || null,
          purchase_price: updated.purchase_price || null,
          selling_price: updated.selling_price || null,
          stock_quantity: updated.stock_quantity || 0,
          min_stock_level: updated.min_stock_level || null,
          unit: updated.unit || 'pcs',
          image_url: updated.image_url || null,
          is_active: updated.is_active !== undefined ? updated.is_active : true,
          hsn_code: updated.hsn_code || null,
          gst_rate: updated.gst_rate || 0,
          tax_type: (updated.tax_type === 'inclusive' || updated.tax_type === 'exclusive') 
            ? updated.tax_type 
            : 'exclusive',
          cgst_rate: updated.cgst_rate || null,
          sgst_rate: updated.sgst_rate || null,
          igst_rate: updated.igst_rate || null,
          status: updated.status || 'active',
          barcode_status: updated.barcode_status || (updated.barcode ? 'active' : 'inactive'),
          sold_date: updated.sold_date || null,
          sale_id: updated.sale_id || null,
          updated_at: updated.updated_at,
        }

        const { data, error } = await supabase!
          .from('products')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .maybeSingle()

        if (error) {
          console.error('Error updating product in cloud:', error)
          // Product is already updated locally, so we continue
          // Return the locally updated product
          const categories = await categoryService.getAll()
          const localProduct = await getById<Product>(STORES.PRODUCTS, id)
          if (localProduct) {
            return {
              ...localProduct,
              category_name: localProduct.category_id ? categories.find(c => c.id === localProduct.category_id)?.name : undefined,
            }
          }
          return null
        } else if (data) {
          // Update local with cloud data
          await put(STORES.PRODUCTS, data as Product)
          // Join with category
          const categories = await categoryService.getAll()
          return {
            ...(data as Product),
            category_name: data.category_id ? categories.find(c => c.id === data.category_id)?.name : undefined,
          }
        } else {
          // No data returned - product might not exist in Supabase
          // Return the locally updated product
          const categories = await categoryService.getAll()
          const localProduct = await getById<Product>(STORES.PRODUCTS, id)
          if (localProduct) {
            return {
              ...localProduct,
              category_name: localProduct.category_id ? categories.find(c => c.id === localProduct.category_id)?.name : undefined,
            }
          }
          return null
        }
      } catch (error) {
        console.error('Error in cloudProductService.update:', error)
        // Product is already updated locally, so we continue
      }
    }

    // Return with category name
    const categories = await categoryService.getAll()
    return {
      ...updated,
      category_name: updated.category_id ? categories.find(c => c.id === updated.category_id)?.name : undefined,
    }
  },

  /**
   * Delete product from cloud
   */
  delete: async (id: number): Promise<boolean> => {
    // Delete from local storage first
    try {
      await deleteById(STORES.PRODUCTS, id)
    } catch (error) {
      console.error('Error deleting product from local storage:', error)
      return false
    }

    // If Supabase available and online, delete from cloud
    if (isSupabaseAvailable() && isOnline()) {
      try {
        const { error } = await supabase!
          .from('products')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Error deleting product from cloud:', error)
          // Product is already deleted locally, so we continue
        }
      } catch (error) {
        console.error('Error in cloudProductService.delete:', error)
        // Product is already deleted locally, so we continue
      }
    }

    return true
  },
}
