import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { productService, Product } from '../services/productService'
import { saleService } from '../services/saleService'
import { salesPersonService } from '../services/salespersonService'
import { customerService } from '../services/customerService'
import { purchaseService } from '../services/purchaseService'
import { SalesPerson } from '../types/salesperson'
import { Customer } from '../types/customer'
import { X, Plus, Trash2, Search, ShoppingCart, Home, User } from 'lucide-react'
import { SaleItem } from '../types/sale'
import { Purchase, PurchaseItem } from '../types/purchase'

const SaleForm = () => {
  const navigate = useNavigate()
  const { hasPermission, user, getCurrentCompanyId } = useAuth()
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([]) // Store purchases for purchase item lookup
  const [searchQuery, setSearchQuery] = useState('')
  const [productArticleMap, setProductArticleMap] = useState<Map<number, string[]>>(new Map())
  const [productBarcodeMap, setProductBarcodeMap] = useState<Map<number, string[]>>(new Map())
  const [barcodeToPurchaseItemMap, setBarcodeToPurchaseItemMap] = useState<Map<string, any>>(new Map())
  const [articleToPurchaseItemMap, setArticleToPurchaseItemMap] = useState<Map<string, any>>(new Map())
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [salesPersonId, setSalesPersonId] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'other'>('cash') // Legacy support
  const [paymentMethods, setPaymentMethods] = useState<Array<{ method: 'cash' | 'card' | 'upi' | 'other'; amount: number }>>([
    { method: 'cash', amount: 0 }
  ])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const companyId = getCurrentCompanyId()
        console.log('Loading products for sale, companyId:', companyId)
        
        // Load all active products (include those with 0 stock for returns)
        const allProducts = await productService.getAll(false, companyId)
        const products = allProducts.filter(p => p.status === 'active')
        console.log('Loaded products for sale:', products.length, products)
        
        // Load purchase history to map article codes and barcodes to products
        // Also ensure all products from purchases are included
        try {
          const allPurchases = await purchaseService.getAll(undefined, companyId)
          setPurchases(allPurchases) // Store purchases in state
          const purchases = allPurchases
          const articleMap = new Map<number, string[]>()
          const barcodeMap = new Map<number, string[]>()
          const barcodeToItemMap = new Map<string, PurchaseItem & { purchase_date?: string }>()
          const articleToItemMap = new Map<string, PurchaseItem & { purchase_date?: string }>()
          const productIdsFromPurchases = new Set<number>()
          
          purchases.forEach(purchase => {
            purchase.items.forEach(item => {
              if (item.product_id) {
                productIdsFromPurchases.add(item.product_id)
                
                // Map article codes
                if (item.article) {
                  const articleStr = String(item.article).trim()
                  if (articleStr) {
                    const existingArticles = articleMap.get(item.product_id) || []
                    if (!existingArticles.includes(articleStr)) {
                      articleMap.set(item.product_id, [...existingArticles, articleStr])
                    }
                    // Map article to purchase item (store the most recent purchase item for this article)
                    // This allows us to get MRP, sale_price, etc. from the purchase when searching by article
                    if (!articleToItemMap.has(articleStr) || 
                        (purchase.purchase_date && 
                         articleToItemMap.get(articleStr)?.purchase_date && 
                         new Date(purchase.purchase_date) > new Date(articleToItemMap.get(articleStr)!.purchase_date!))) {
                      articleToItemMap.set(articleStr, {
                        ...item,
                        purchase_date: purchase.purchase_date
                      })
                    }
                  }
                }
                // Map barcodes from purchase items
                if (item.barcode) {
                  const barcodeStr = String(item.barcode).trim()
                  if (barcodeStr) {
                    const existingBarcodes = barcodeMap.get(item.product_id) || []
                    if (!existingBarcodes.includes(barcodeStr)) {
                      barcodeMap.set(item.product_id, [...existingBarcodes, barcodeStr])
                    }
                    // Map barcode to purchase item (store the most recent purchase item for this barcode)
                    // This allows us to get MRP, sale_price, etc. from the purchase
                    if (!barcodeToItemMap.has(barcodeStr) || 
                        (purchase.purchase_date && 
                         barcodeToItemMap.get(barcodeStr)?.purchase_date && 
                         new Date(purchase.purchase_date) > new Date(barcodeToItemMap.get(barcodeStr)!.purchase_date!))) {
                      barcodeToItemMap.set(barcodeStr, {
                        ...item,
                        purchase_date: purchase.purchase_date
                      })
                    }
                    // Debug: log if we find specific barcodes
                    if (barcodeStr === '8904201446686' || barcodeStr.includes('8904201446686') || 
                        barcodeStr === '8905005506422' || barcodeStr.includes('8905005506422')) {
                      console.log(`🎯 Found barcode ${barcodeStr} in purchase ${purchase.id} for product ${item.product_id}:`, {
                        barcode: barcodeStr,
                        item: item,
                        mrp: item.mrp,
                        sale_price: item.sale_price,
                        quantity: item.quantity,
                        article: item.article,
                        purchase_date: purchase.purchase_date
                      })
                    }
                  }
                }
              }
            })
          })
          
          console.log('Product article map:', articleMap)
          console.log('Product barcode map:', barcodeMap)
          console.log('Total products with barcodes from purchases:', barcodeMap.size)
          console.log('Product IDs from purchases:', Array.from(productIdsFromPurchases))
          
          // Debug: Check for the specific barcode
          barcodeMap.forEach((barcodes, productId) => {
            if (barcodes.some(b => b === '8904201446686' || b.includes('8904201446686'))) {
              console.log(`✅ Found barcode 8904201446686 for product ID ${productId}:`, barcodes)
              const product = products.find(p => p.id === productId)
              console.log(`   Product details:`, product)
            }
          })
          
          // Also check all purchase items directly
          console.log('Checking all purchase items for barcode 8904201446686:')
          purchases.forEach(purchase => {
            purchase.items.forEach(item => {
              if (item.barcode && (item.barcode === '8904201446686' || item.barcode.includes('8904201446686'))) {
                console.log(`   Found in purchase ${purchase.id}, item:`, item)
              }
            })
          })
          
          // Check if any products from purchases are missing
          const missingProductIds = Array.from(productIdsFromPurchases).filter(id => 
            !products.find(p => p.id === id)
          )
          if (missingProductIds.length > 0) {
            console.warn('Products in purchases but not in products list:', missingProductIds)
            // Try to load these products with includeArchived=true
            for (const productId of missingProductIds) {
              try {
                const product = await productService.getById(productId, true)
                if (product && product.status === 'active') {
                  products.push(product)
                  console.log('Added missing product:', product)
                }
              } catch (err) {
                console.error(`Error loading product ${productId}:`, err)
              }
            }
          }
          
          setProductArticleMap(articleMap)
          setProductBarcodeMap(barcodeMap)
          setBarcodeToPurchaseItemMap(barcodeToItemMap)
          setArticleToPurchaseItemMap(articleToItemMap)
        setAvailableProducts(products)
          
          console.log('Barcode to purchase item map size:', barcodeToItemMap.size)
          console.log('Article to purchase item map size:', articleToItemMap.size)
          if (barcodeToItemMap.has('8904201446686')) {
            console.log('✅ Purchase item for barcode 8904201446686:', barcodeToItemMap.get('8904201446686'))
          }
          // Debug: Check for article "money"
          articleToItemMap.forEach((item, article) => {
            if (article.toLowerCase().includes('money')) {
              console.log(`✅ Purchase item for article "${article}":`, item)
            }
          })
        } catch (err) {
          console.error('Error loading purchase history for article codes and barcodes:', err)
          setAvailableProducts(products)
        }
        
        // Load active sales persons
        const activeSalesPersons = await salesPersonService.getAll(false)
        setSalesPersons(activeSalesPersons)
        
        // Load active customers
        const activeCustomers = await customerService.getAll(false, companyId)
        setCustomers(activeCustomers)
        
        // Set default "Walk-in Customer" if available
        const walkInCustomer = activeCustomers.find(c => c.name.toLowerCase().includes('walk-in'))
        if (walkInCustomer) {
          setCustomerId(walkInCustomer.id)
        }
      } catch (error) {
        console.error('Error loading sale form data:', error)
        alert('Error loading products. Please refresh the page.')
      }
    }
    loadData()
  }, [])

  const filteredProducts = availableProducts.filter(product => {
    // Show nothing by default - only show products when searching
    if (!searchQuery.trim()) {
      return false
    }
    
    const query = searchQuery.trim() // Keep original case for barcode matching
    const queryLower = query.toLowerCase()
    
    // Search by product name (most common)
    const nameMatch = product.name.toLowerCase().includes(queryLower)
    
    // Search by SKU
    const skuMatch = product.sku?.toLowerCase().includes(queryLower) || false
    
    // Search by category
    const categoryMatch = product.category_name?.toLowerCase().includes(queryLower) || false
    
    // Search by HSN code
    const hsnMatch = product.hsn_code?.toLowerCase().includes(queryLower) || false
    
    // Search by barcode from product itself (exact match or partial)
    const productBarcode = product.barcode || ''
    const barcodeMatch = productBarcode === query || productBarcode.toLowerCase().includes(queryLower)
    
    // Search by barcode from purchase history (exact match or partial) - keep original case
    const purchaseBarcodes = productBarcodeMap.get(product.id) || []
    const purchaseBarcodeMatch = purchaseBarcodes.some(barcode => {
      // Exact match (case sensitive for barcodes)
      if (barcode === query) return true
      // Partial match (case insensitive)
      return barcode.toLowerCase().includes(queryLower)
    })
    
    // Also check if the query is a barcode that maps to this product
    const barcodePurchaseItem = barcodeToPurchaseItemMap.get(query)
    const barcodeMatchesProduct = barcodePurchaseItem && barcodePurchaseItem.product_id === product.id
    
    // Search by article code from purchase history (exact match or partial)
    const productArticles = productArticleMap.get(product.id) || []
    const articleMatch = productArticles.some(article => {
      const articleLower = article.toLowerCase()
      return articleLower === queryLower || articleLower.includes(queryLower)
    })
    
    // Also check if the query is an article that maps to this product
    let articleItemMatch = false
    let matchingArticleItem: PurchaseItem | null = null
    articleToPurchaseItemMap.forEach((item, article) => {
      if (item.product_id === product.id) {
        const articleLower = article.toLowerCase()
        if (articleLower === queryLower || articleLower.includes(queryLower)) {
          articleItemMatch = true
          const itemWithDate = item as PurchaseItem & { purchase_date?: string }
          const matchingWithDate = matchingArticleItem as PurchaseItem & { purchase_date?: string }
          if (!matchingArticleItem || (itemWithDate.purchase_date && matchingWithDate.purchase_date && 
              new Date(itemWithDate.purchase_date) > new Date(matchingWithDate.purchase_date))) {
            matchingArticleItem = item
          }
        }
      }
    })
    
    const matches = nameMatch || barcodeMatch || purchaseBarcodeMatch || barcodeMatchesProduct || skuMatch || categoryMatch || hsnMatch || articleMatch || articleItemMatch || articleItemMatch
    
    // Debug logging for all searches
    if (matches) {
      console.log(`✅ Match found for "${query}" in product ${product.id} (${product.name}):`, {
        productBarcode,
        purchaseBarcodes,
        productArticles,
        nameMatch,
        barcodeMatch,
        purchaseBarcodeMatch,
        articleMatch,
        skuMatch,
        categoryMatch,
        hsnMatch
      })
    }
    
    // Extra debug for the specific barcode
    if (query === '8904201446686' || query.includes('8904201446686')) {
      console.log(`🔍 Checking product ${product.id} (${product.name}) for barcode "${query}":`, {
        productBarcode,
        purchaseBarcodes,
        barcodeMatch,
        purchaseBarcodeMatch,
        matches
      })
    }
    
    return matches
  })
  
  // Debug: Log filtered results for the specific barcode
  useEffect(() => {
    if (searchQuery === '8904201446686' || searchQuery.includes('8904201446686')) {
      console.log(`🔍 Search query: "${searchQuery}"`)
      console.log(`📦 Total available products: ${availableProducts.length}`)
      console.log(`✅ Filtered products: ${filteredProducts.length}`)
      console.log(`📋 Filtered product IDs:`, filteredProducts.map(p => ({ id: p.id, name: p.name })))
      console.log(`🗺️ Barcode map size: ${productBarcodeMap.size}`)
      console.log(`🗺️ Article map size: ${productArticleMap.size}`)
    }
  }, [searchQuery, availableProducts.length, filteredProducts.length, productBarcodeMap.size, productArticleMap.size])

  const addProductToSale = (product: Product, searchQuery?: string) => {
    // First, determine the article and purchase item details for this product
    // searchQuery can be either a barcode or an article
    let purchaseItemArticle: string | undefined
    let purchaseItemId: number | undefined
    
    if (!searchQuery) {
      // No search query, use default product info
    } else {
      // Check if searchQuery is a barcode first
      const isBarcode = barcodeToPurchaseItemMap.has(searchQuery)
      
      if (isBarcode) {
        // If searching by barcode, get article from purchase item
        const purchaseItem = barcodeToPurchaseItemMap.get(searchQuery)!
        if (purchaseItem.product_id === product.id) {
          purchaseItemArticle = purchaseItem.article
          // Find the purchase item ID
          const purchase = purchases.find(p => p.items.some(pi => pi.barcode === searchQuery && pi.product_id === product.id))
          if (purchase) {
            const item = purchase.items.find(pi => pi.barcode === searchQuery && pi.product_id === product.id)
            if (item) {
              purchaseItemId = item.id
            }
          }
        }
      } else {
        // If not a barcode, try searching by article
        const articleItem = getPurchaseItemForArticle(searchQuery)
        if (articleItem && articleItem.product_id === product.id) {
          purchaseItemArticle = articleItem.article
          // Find the purchase item ID
          const purchase = purchases.find(p => p.items.some(pi => pi.article === articleItem.article && pi.product_id === product.id))
          if (purchase) {
            const item = purchase.items.find(pi => pi.article === articleItem.article && pi.product_id === product.id)
            if (item) {
              purchaseItemId = item.id
            }
          }
        }
      }
    }
    
    // Check if the same product with the same article is already in cart
    // Different articles should be treated as separate items
    const existingItem = saleItems.find(item => {
      // Match by product_id AND (purchase_item_id OR purchase_item_article)
      if (item.product_id !== product.id) return false
      
      // If both have purchase_item_id, they must match
      if (purchaseItemId && item.purchase_item_id) {
        return item.purchase_item_id === purchaseItemId
      }
      
      // If both have purchase_item_article, they must match
      if (purchaseItemArticle && item.purchase_item_article) {
        return item.purchase_item_article.toLowerCase() === purchaseItemArticle.toLowerCase()
      }
      
      // If neither has article/purchase_item_id, treat as same item (legacy behavior)
      if (!purchaseItemArticle && !purchaseItemId && !item.purchase_item_article && !item.purchase_item_id) {
        return true
      }
      
      // Otherwise, they're different items
      return false
    })
    
    if (existingItem) {
      // Increase quantity if the same product with the same article is already in cart
      // Get remaining stock for this item
      const remainingStock = getRemainingStockForItem(existingItem)
      
      // For returns, allow adding even if stock is 0
      if (existingItem.sale_type === 'return' || existingItem.quantity < remainingStock) {
        updateItemQuantity(existingItem, existingItem.quantity + 1)
      } else {
        alert(`Only ${remainingStock} units remaining in stock${existingItem.purchase_item_article ? ` for article "${existingItem.purchase_item_article}"` : ''}`)
      }
    } else {
      // Use the purchase item details we already found above (from purchaseItemId and purchaseItemArticle)
      // If we didn't find them, use default product values
      let mrp = product.selling_price || 0
      let unitPrice = product.selling_price || 0
      let purchasePrice = product.purchase_price || 0
      let barcode = product.barcode || ''
      let purchaseId: number | undefined
      let purchaseItemBarcode: string | undefined
      
      // If we found purchase item details above, use them
      if (purchaseItemId && searchQuery) {
        // Check if searchQuery is a barcode
        const isBarcode = barcodeToPurchaseItemMap.has(searchQuery)
        
        if (isBarcode) {
          const purchaseItem = barcodeToPurchaseItemMap.get(searchQuery)!
          if (purchaseItem.product_id === product.id) {
            mrp = purchaseItem.mrp || purchaseItem.sale_price || product.selling_price || 0
            unitPrice = purchaseItem.sale_price || purchaseItem.mrp || product.selling_price || 0
            purchasePrice = purchaseItem.unit_price || product.purchase_price || 0
            barcode = searchQuery
            purchaseItemBarcode = purchaseItem.barcode
            // Find the purchase that contains this item
            const purchase = purchases.find(p => p.items.some(pi => pi.barcode === searchQuery && pi.product_id === product.id))
            if (purchase) {
              purchaseId = purchase.id
            }
          }
        } else {
          // Not a barcode, try as article
          const articleItem = getPurchaseItemForArticle(searchQuery)
          if (articleItem && articleItem.product_id === product.id) {
            mrp = articleItem.mrp || articleItem.sale_price || product.selling_price || 0
            unitPrice = articleItem.sale_price || articleItem.mrp || product.selling_price || 0
            purchasePrice = articleItem.unit_price || product.purchase_price || 0
            barcode = articleItem.barcode || product.barcode || ''
            purchaseItemBarcode = articleItem.barcode
            // Find the purchase that contains this item
            const purchase = purchases.find(p => p.items.some(pi => pi.article === articleItem.article && pi.product_id === product.id))
            if (purchase) {
              purchaseId = purchase.id
            }
          }
        }
      }
      
      // Calculate remaining stock for this item
      let remainingStock = product.stock_quantity
      if (purchaseItemId && purchaseId) {
        const purchase = purchases.find(p => p.id === purchaseId)
        if (purchase) {
          const purchaseItem = purchase.items.find(pi => pi.id === purchaseItemId)
          if (purchaseItem) {
            const soldQty = purchaseItem.sold_quantity || 0
            remainingStock = purchaseItem.quantity - soldQty
          }
        }
      }
      
      // Use article name as product_name if available (prioritize article over product name)
      const displayName = purchaseItemArticle || product.name
      
        const newItem: SaleItem = {
          product_id: product.id,
        product_name: displayName, // Use article name if available, otherwise product name
          quantity: 1,
          mrp: mrp,
          unit_price: unitPrice,
        purchase_price: purchasePrice, // Store purchase price for profit calculation
          discount: 0,
          discount_percentage: 0,
          sale_type: 'sale', // Default to sale
          total: unitPrice,
        barcode: barcode,
        // Store purchase item info for accurate inventory tracking
        purchase_id: purchaseId,
        purchase_item_id: purchaseItemId,
        purchase_item_article: purchaseItemArticle,
        purchase_item_barcode: purchaseItemBarcode
        }
        setSaleItems([...saleItems, newItem])
      
      // Only warn if stock is 0 and it's a sale (not a return)
      if (product.stock_quantity === 0) {
        // Don't alert, just allow it - user can change to return if needed
      }
    }
    setSearchQuery('')
  }

  // Get purchase item details for a product when searched by barcode
  const getPurchaseItemForBarcode = (barcode: string): PurchaseItem | null => {
    return barcodeToPurchaseItemMap.get(barcode) || null
  }
  
  // Get purchase item details for a product when searched by article
  const getPurchaseItemForArticle = (article: string): PurchaseItem | null => {
    // Try exact match first
    let item = articleToPurchaseItemMap.get(article)
    if (item) return item
    
    // Try case-insensitive match
    const articleLower = article.toLowerCase()
    for (const [key, value] of articleToPurchaseItemMap.entries()) {
      if (key.toLowerCase() === articleLower) {
        return value
      }
    }
    return null
  }
  
  // Get display price info for a product (use purchase item if available)
  const getProductDisplayInfo = (product: Product, searchQuery: string) => {
    const query = searchQuery.trim()
    const queryLower = query.toLowerCase()
    
    // Check if search query is a barcode that matches this product
    const barcodePurchaseItem = getPurchaseItemForBarcode(query)
    
    // Check if search query is an article that matches this product
    const articlePurchaseItem = getPurchaseItemForArticle(query)
    
    // Also check if this product has this barcode in purchase history
    const productBarcodes = productBarcodeMap.get(product.id) || []
    const productArticles = productArticleMap.get(product.id) || []
    
    // Check if query matches any article for this product (case-insensitive)
    let matchingArticle = ''
    productArticles.forEach(article => {
      if (article.toLowerCase() === queryLower || article.toLowerCase().includes(queryLower)) {
        matchingArticle = article
      }
    })
    
    const isBarcodeSearch = barcodePurchaseItem !== null || productBarcodes.includes(query)
    const isArticleSearch = articlePurchaseItem !== null || matchingArticle !== ''
    
    // Debug logging
    if (query.toLowerCase() === 'money' || query.toLowerCase().includes('money')) {
      console.log('🔍 Getting display info for article "money":', {
        productId: product.id,
        productName: product.name,
        articlePurchaseItem: articlePurchaseItem,
        articlePurchaseItemProductId: articlePurchaseItem?.product_id,
        matchingArticle,
        matches: articlePurchaseItem && articlePurchaseItem.product_id === product.id
      })
    }
    
    // Priority: barcode match > article match
    if (isBarcodeSearch && barcodePurchaseItem && barcodePurchaseItem.product_id === product.id) {
      // We found a purchase item for this barcode and it matches this product
      const mrp = barcodePurchaseItem.mrp || 0
      const salePrice = barcodePurchaseItem.sale_price || barcodePurchaseItem.mrp || 0
      
      // Calculate remaining stock (quantity - sold_quantity)
      const soldQty = barcodePurchaseItem.sold_quantity || 0
      const remainingStock = barcodePurchaseItem.quantity - soldQty
      
      return {
        mrp: mrp,
        salePrice: salePrice,
        purchasePrice: barcodePurchaseItem.unit_price || product.purchase_price || 0,
        barcode: query, // Use the searched barcode
        article: barcodePurchaseItem.article || '',
        quantity: remainingStock, // Return remaining stock instead of total quantity
        remainingStock: remainingStock, // Explicit remaining stock
        fromPurchase: true,
        purchaseItem: barcodePurchaseItem
      }
    }
    
    // Check if article search matches this product
    if (isArticleSearch && articlePurchaseItem && articlePurchaseItem.product_id === product.id) {
      // We found a purchase item for this article and it matches this product
      const mrp = articlePurchaseItem.mrp || 0
      const salePrice = articlePurchaseItem.sale_price || articlePurchaseItem.mrp || 0
      
      if (query.toLowerCase() === 'money' || query.toLowerCase().includes('money')) {
        console.log('✅ Using purchase item data for article:', {
          mrp,
          salePrice,
          purchasePrice: articlePurchaseItem.unit_price,
          article: articlePurchaseItem.article,
          quantity: articlePurchaseItem.quantity,
          barcode: articlePurchaseItem.barcode
        })
      }
      
      // Calculate remaining stock (quantity - sold_quantity)
      const soldQty = articlePurchaseItem.sold_quantity || 0
      const remainingStock = articlePurchaseItem.quantity - soldQty
      
      return {
        mrp: mrp,
        salePrice: salePrice,
        purchasePrice: articlePurchaseItem.unit_price || product.purchase_price || 0,
        barcode: articlePurchaseItem.barcode || product.barcode || '',
        article: articlePurchaseItem.article || query, // Use the searched article
        quantity: remainingStock, // Return remaining stock instead of total quantity
        remainingStock: remainingStock, // Explicit remaining stock
        fromPurchase: true,
        purchaseItem: articlePurchaseItem
      }
    }
    
    // If searching by barcode but no purchase item found, still show the searched barcode
    if (isBarcodeSearch) {
      return {
        mrp: product.selling_price || 0,
        salePrice: product.selling_price || 0,
        purchasePrice: product.purchase_price || 0,
        barcode: query, // Use the searched barcode
        article: '',
        quantity: product.stock_quantity,
        remainingStock: product.stock_quantity,
        fromPurchase: false,
        purchaseItem: null
      }
    }
    
    // If searching by article but no purchase item found, show the article
    if (isArticleSearch && matchingArticle) {
      return {
        mrp: product.selling_price || 0,
        salePrice: product.selling_price || 0,
        purchasePrice: product.purchase_price || 0,
        barcode: product.barcode || '',
        article: matchingArticle,
        quantity: product.stock_quantity,
        remainingStock: product.stock_quantity,
        fromPurchase: false,
        purchaseItem: null
      }
    }
    
    // Regular search (not by barcode or article)
    return {
      mrp: product.selling_price || 0,
      salePrice: product.selling_price || 0,
      purchasePrice: product.purchase_price || 0,
      barcode: product.barcode || '',
      article: '',
      quantity: product.stock_quantity,
      remainingStock: product.stock_quantity,
      fromPurchase: false,
      purchaseItem: null
    }
  }

  // Get remaining stock for a sale item (from purchase items if available)
  const getRemainingStockForItem = (item: SaleItem): number => {
    // If we have purchase item info, get remaining stock from that purchase item
    if (item.purchase_id && item.purchase_item_id) {
      const purchase = purchases.find(p => p.id === item.purchase_id)
      if (purchase) {
        const purchaseItem = purchase.items.find(pi => pi.id === item.purchase_item_id)
        if (purchaseItem) {
          const soldQty = purchaseItem.sold_quantity || 0
          return purchaseItem.quantity - soldQty
        }
      }
    }
    
    // Otherwise, check all purchase items for this product/article combination
    if (item.purchase_item_article) {
      for (const purchase of purchases) {
        const purchaseItem = purchase.items.find(pi => 
          pi.product_id === item.product_id && 
          pi.article && pi.article.toLowerCase() === item.purchase_item_article?.toLowerCase()
        )
        if (purchaseItem) {
          const soldQty = purchaseItem.sold_quantity || 0
          return purchaseItem.quantity - soldQty
        }
      }
    }
    
    // Fallback to product stock
    const product = availableProducts.find(p => p.id === item.product_id)
    return product?.stock_quantity || 0
  }

  const updateItemQuantity = (saleItem: SaleItem, quantity: number) => {
    // Get remaining stock for this specific item
    const remainingStock = getRemainingStockForItem(saleItem)
    
    if (quantity > remainingStock) {
      alert(`Only ${remainingStock} units remaining in stock${saleItem.purchase_item_article ? ` for article "${saleItem.purchase_item_article}"` : ''}`)
      return
    }

    setSaleItems(saleItems.map(item => {
      // Match by product_id AND (purchase_item_id OR purchase_item_article)
      const isMatch = item.product_id === saleItem.product_id &&
        ((saleItem.purchase_item_id && item.purchase_item_id && item.purchase_item_id === saleItem.purchase_item_id) ||
         (saleItem.purchase_item_article && item.purchase_item_article && 
          item.purchase_item_article.toLowerCase() === saleItem.purchase_item_article.toLowerCase()) ||
         (!saleItem.purchase_item_id && !saleItem.purchase_item_article && 
          !item.purchase_item_id && !item.purchase_item_article))
      
      if (isMatch) {
        const newQuantity = Math.max(1, Math.min(quantity, remainingStock))
        return {
          ...item,
          quantity: newQuantity,
          total: item.unit_price * newQuantity
        }
      }
      return item
    }))
  }

  const removeItem = (itemToRemove: SaleItem) => {
    setSaleItems(saleItems.filter(item => {
      // Match by product_id AND (purchase_item_id OR purchase_item_article)
      if (item.product_id !== itemToRemove.product_id) return true
      
      // If both have purchase_item_id, they must match
      if (itemToRemove.purchase_item_id && item.purchase_item_id) {
        return item.purchase_item_id !== itemToRemove.purchase_item_id
      }
      
      // If both have purchase_item_article, they must match
      if (itemToRemove.purchase_item_article && item.purchase_item_article) {
        return item.purchase_item_article.toLowerCase() !== itemToRemove.purchase_item_article.toLowerCase()
      }
      
      // If neither has article/purchase_item_id, treat as same item (legacy behavior)
      if (!itemToRemove.purchase_item_article && !itemToRemove.purchase_item_id && 
          !item.purchase_item_article && !item.purchase_item_id) {
        return false // Remove this item
      }
      
      // Otherwise, keep both items
      return true
    }))
  }

  const getSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (saleItems.length === 0) {
      setErrors({ items: 'Please add at least one item to the sale' })
      return
    }
    
    // Validate payment methods total equals grand total
    const grandTotal = getSubtotal()
    const paymentTotal = paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0)
    if (Math.abs(grandTotal - paymentTotal) >= 0.01) {
      setErrors({ payment: `Payment total (₹${paymentTotal.toFixed(2)}) must equal grand total (₹${grandTotal.toFixed(2)})` })
      return
    }
    setErrors({}) // Clear errors if validation passes

    // Check stock availability (only for sale items, not returns)
    for (const item of saleItems) {
      if (item.sale_type === 'sale') {
        const product = availableProducts.find(p => p.id === item.product_id)
        if (!product || product.stock_quantity < item.quantity) {
          alert(`Insufficient stock for ${item.product_name}`)
          return
        }
      }
    }

    const subtotal = getSubtotal()
    const taxAmount = 0 // No tax for simple sales
    // grandTotal is already declared above for payment validation

    const selectedSalesPerson = salesPersonId ? salesPersons.find(sp => sp.id === salesPersonId) : null

    const selectedCustomer = customerId ? customers.find(c => c.id === customerId) : null

    const sale = {
      customer_id: customerId ? customerId as number : undefined,
      customer_name: selectedCustomer?.name || 'Walk-in Customer',
      sales_person_id: salesPersonId ? salesPersonId as number : undefined,
      sales_person_name: selectedSalesPerson?.name,
      invoice_number: '', // Will be auto-generated by service
      items: saleItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        barcode: item.barcode || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        purchase_price: item.purchase_price, // Include purchase price for profit calculation
        sale_type: item.sale_type,
        mrp: item.mrp,
        discount: item.discount,
        discount_percentage: item.discount_percentage,
        total: item.total,
        // Include purchase item info for accurate inventory tracking
        purchase_id: item.purchase_id,
        purchase_item_id: item.purchase_item_id,
        purchase_item_article: item.purchase_item_article,
        purchase_item_barcode: item.purchase_item_barcode
      })),
      subtotal: subtotal,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      payment_status: 'paid' as const,
      payment_method: paymentMethods.length > 0 ? paymentMethods[0].method : paymentMethod, // Legacy support
      payment_methods: paymentMethods.map(p => ({ method: p.method, amount: p.amount })), // Multiple payment methods
      sale_date: new Date().toISOString(),
      company_id: getCurrentCompanyId() || undefined,
      created_by: parseInt(user?.id || '1')
    }

    const handleSubmitAsync = async () => {
      try {
        const createdSale = await saleService.create(sale)
        // Navigate to invoice view after successful sale
        navigate(`/invoice/${createdSale.id}`)
      } catch (error) {
        alert('Error creating sale: ' + (error as Error).message)
      }
    }
    handleSubmitAsync()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                title="Back to Dashboard"
              >
                <Home className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">New Sale</h1>
                <p className="text-sm text-gray-600 mt-1">Create a new sales transaction</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Product Search & Cart */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Search */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add Products</h2>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, barcode, SKU, article, category, or HSN code..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                {/* Product List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {!searchQuery.trim() ? (
                    <div className="text-center py-12">
                      <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2 font-medium">Search for products to add to sale</p>
                      <p className="text-xs text-gray-400">Search by name, barcode, SKU, article, category, or HSN code</p>
                    </div>
                  ) : availableProducts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No products available. Please add products first.</p>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">No products found matching "{searchQuery}"</p>
                      <p className="text-xs text-gray-400">Try searching by name, barcode, SKU, article, category, or HSN code</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Available products: {availableProducts.length} | 
                        Barcode map entries: {productBarcodeMap.size} | 
                        Article map entries: {productArticleMap.size}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-2">
                        Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} matching "{searchQuery}"
                      </p>
                      {filteredProducts.map(product => {
                        const displayInfo = getProductDisplayInfo(product, searchQuery)
                        const purchaseItem = displayInfo.purchaseItem
                        
                        return (
                      <div
                        key={product.id}
                            onClick={() => addProductToSale(product, searchQuery.trim())}
                            className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors border ${
                              product.stock_quantity > 0
                                ? 'bg-gray-50 hover:bg-blue-50 border-transparent hover:border-blue-200'
                                : 'bg-orange-50 hover:bg-orange-100 border-orange-200'
                            }`}
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                                {displayInfo.fromPurchase && displayInfo.remainingStock !== undefined ? (
                                  <span className={displayInfo.remainingStock > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                    Remaining Stock: {displayInfo.remainingStock} {product.unit}
                                  </span>
                                ) : (
                                  <span className={product.stock_quantity > 0 ? '' : 'text-orange-600 font-semibold'}>
                                    Remaining Stock: {product.stock_quantity} {product.unit}
                                    {product.stock_quantity === 0 && ' (Out of Stock - Use for Returns)'}
                                  </span>
                                )}
                                {displayInfo.barcode && (
                                  <span className="font-medium">
                                    Barcode: <span className="font-bold text-blue-600">{displayInfo.barcode}</span>
                                    {displayInfo.fromPurchase && <span className="text-green-600 ml-1">(from purchase)</span>}
                                  </span>
                                )}
                                {product.sku && <span>SKU: {product.sku}</span>}
                                {displayInfo.article && (
                                  <span className="text-blue-600 font-medium">
                                    Article: {displayInfo.article}
                                  </span>
                                )}
                                {!displayInfo.article && productArticleMap.get(product.id) && productArticleMap.get(product.id)!.length > 0 && (
                                  <span className="text-gray-500 text-xs">
                                    Other Articles: {productArticleMap.get(product.id)!.join(', ')}
                                  </span>
                                )}
                          </div>
                              {purchaseItem && (
                                <div className="mt-2 text-xs bg-green-50 p-2 rounded border border-green-200">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-gray-600">MRP:</span>
                                      <span className="font-semibold text-gray-900 ml-1">₹{displayInfo.mrp.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Sale Price:</span>
                                      <span className="font-semibold text-blue-600 ml-1">₹{displayInfo.salePrice.toFixed(2)}</span>
                                    </div>
                                    {displayInfo.remainingStock !== undefined && (
                                      <div>
                                        <span className="text-gray-600">Remaining Stock:</span>
                                        <span className={`font-medium ml-1 ${displayInfo.remainingStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {displayInfo.remainingStock} {product.unit}
                                        </span>
                                      </div>
                                    )}
                                    {displayInfo.article && (
                                      <div className={displayInfo.quantity > 0 ? '' : 'col-span-2'}>
                                        <span className="text-gray-600">Article:</span>
                                        <span className="font-medium ml-1">{displayInfo.article}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                        </div>
                        <div className="text-right">
                              {purchaseItem ? (
                                <>
                                  {displayInfo.mrp > displayInfo.salePrice && (
                                    <div className="text-xs text-gray-500 line-through">MRP: ₹{displayInfo.mrp.toFixed(2)}</div>
                                  )}
                                  <div className="font-bold text-blue-600">₹{displayInfo.salePrice.toFixed(2)}</div>
                                </>
                              ) : (
                                <div className="font-bold text-blue-600">₹{displayInfo.salePrice.toFixed(2)}</div>
                              )}
                          <button
                            type="button"
                            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Sale Items Cart */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6" />
                  Cart ({saleItems.length} items)
                </h2>
                {errors.items && <p className="text-red-600 text-sm mb-4">{errors.items}</p>}
                
                {saleItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No items in cart</p>
                ) : (
                  <div className="space-y-3">
                    {saleItems.map(item => {
                      const product = availableProducts.find(p => p.id === item.product_id)
                      const mrpTotal = (item.mrp || item.unit_price) * item.quantity
                      const totalSavings = mrpTotal - item.total
                      const discountPercent = item.mrp && item.mrp > 0 
                        ? ((item.mrp - item.unit_price) / item.mrp * 100).toFixed(1)
                        : '0'
                      
                      return (
                        <div key={item.product_id} className={`p-4 rounded-lg space-y-3 border-2 ${
                          item.sale_type === 'return' 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{item.product_name}</h3>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                  item.sale_type === 'return'
                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                    : 'bg-green-100 text-green-700 border border-green-300'
                                }`}>
                                  {item.sale_type === 'return' ? 'RETURN' : 'SALE'}
                                </span>
                              </div>
                              {(() => {
                                const remainingStock = getRemainingStockForItem(item)
                                return (
                                  <div className={`text-xs mt-1 ${remainingStock > 0 ? 'text-gray-500' : 'text-red-600 font-semibold'}`}>
                                    Remaining Stock: {remainingStock} {product?.unit || 'pcs'}
                                    {item.purchase_item_article && ` (Article: ${item.purchase_item_article})`}
                                </div>
                                )
                              })()}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          
                          {/* Sale/Return Toggle */}
                          <div className="flex items-center gap-3 p-2 bg-white rounded border border-gray-300">
                            <span className="text-xs font-semibold text-gray-700">Type:</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSaleItems(saleItems.map(i => {
                                    // Match by product_id AND (purchase_item_id OR purchase_item_article)
                                    const isMatch = i.product_id === item.product_id &&
                                      ((item.purchase_item_id && i.purchase_item_id && i.purchase_item_id === item.purchase_item_id) ||
                                       (item.purchase_item_article && i.purchase_item_article && 
                                        i.purchase_item_article.toLowerCase() === item.purchase_item_article.toLowerCase()) ||
                                       (!item.purchase_item_id && !item.purchase_item_article && 
                                        !i.purchase_item_id && !i.purchase_item_article))
                                    return isMatch ? { ...i, sale_type: 'sale' } : i
                                  }))
                                }}
                                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                                  item.sale_type === 'sale'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                Sale
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSaleItems(saleItems.map(i => {
                                    // Match by product_id AND (purchase_item_id OR purchase_item_article)
                                    const isMatch = i.product_id === item.product_id &&
                                      ((item.purchase_item_id && i.purchase_item_id && i.purchase_item_id === item.purchase_item_id) ||
                                       (item.purchase_item_article && i.purchase_item_article && 
                                        i.purchase_item_article.toLowerCase() === item.purchase_item_article.toLowerCase()) ||
                                       (!item.purchase_item_id && !item.purchase_item_article && 
                                        !i.purchase_item_id && !i.purchase_item_article))
                                    return isMatch ? { ...i, sale_type: 'return' } : i
                                  }))
                                }}
                                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                                  item.sale_type === 'return'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                Return
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">MRP per unit</label>
                              <input
                                type="number"
                                value={item.mrp || item.unit_price}
                                onChange={(e) => {
                                  const newMrp = parseFloat(e.target.value) || 0
                                  const currentPrice = item.unit_price
                                  const discount = newMrp > currentPrice ? newMrp - currentPrice : 0
                                  const discountPct = newMrp > 0 ? (discount / newMrp * 100) : 0
                                  setSaleItems(saleItems.map(i => {
                                    // Match by product_id AND (purchase_item_id OR purchase_item_article)
                                    const isMatch = i.product_id === item.product_id &&
                                      ((item.purchase_item_id && i.purchase_item_id && i.purchase_item_id === item.purchase_item_id) ||
                                       (item.purchase_item_article && i.purchase_item_article && 
                                        i.purchase_item_article.toLowerCase() === item.purchase_item_article.toLowerCase()) ||
                                       (!item.purchase_item_id && !item.purchase_item_article && 
                                        !i.purchase_item_id && !i.purchase_item_article))
                                    return isMatch ? { ...i, mrp: newMrp, discount, discount_percentage: discountPct } : i
                                  }))
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Selling Price per unit</label>
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0
                                  const mrp = item.mrp || newPrice
                                  const discount = mrp > newPrice ? mrp - newPrice : 0
                                  const discountPct = mrp > 0 ? (discount / mrp * 100) : 0
                                  setSaleItems(saleItems.map(i => {
                                    // Match by product_id AND (purchase_item_id OR purchase_item_article)
                                    const isMatch = i.product_id === item.product_id &&
                                      ((item.purchase_item_id && i.purchase_item_id && i.purchase_item_id === item.purchase_item_id) ||
                                       (item.purchase_item_article && i.purchase_item_article && 
                                        i.purchase_item_article.toLowerCase() === item.purchase_item_article.toLowerCase()) ||
                                       (!item.purchase_item_id && !item.purchase_item_article && 
                                        !i.purchase_item_id && !i.purchase_item_article))
                                    return isMatch ? { 
                                          ...i, 
                                          unit_price: newPrice, 
                                          discount, 
                                          discount_percentage: discountPct,
                                          total: newPrice * i.quantity
                                    } : i
                                  }))
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Qty:</span>
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(item, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(item, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                                >
                                  +
                                </button>
                              </div>
                              {item.mrp && item.mrp > item.unit_price && (
                                <div className="text-xs text-green-600 font-medium">
                                  {discountPercent}% OFF
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              {item.mrp && item.mrp > item.unit_price && (
                                <div className="text-xs text-gray-500 line-through">
                                  MRP: ₹{mrpTotal.toFixed(2)}
                                </div>
                              )}
                              <div className="font-bold text-gray-900">₹{item.total.toFixed(2)}</div>
                              {totalSavings > 0 && (
                                <div className="text-xs text-green-600 font-medium">
                                  You save: ₹{totalSavings.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Customer & Payment Details */}
            <div className="space-y-6">
              {/* Customer Details */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Customer</label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          onFocus={() => setCustomerSearchQuery('')}
                          placeholder="Search customer..."
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Select Customer</option>
                        {customers
                          .filter(c => 
                            !customerSearchQuery || 
                            c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                            c.phone?.includes(customerSearchQuery) ||
                            c.email?.toLowerCase().includes(customerSearchQuery.toLowerCase())
                          )
                          .map(customer => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                            </option>
                          ))}
                      </select>
                      {customerId && (() => {
                        const selected = customers.find(c => c.id === customerId)
                        return selected && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {selected.email && <div>Email: {selected.email}</div>}
                            {selected.gstin && <div>GSTIN: {selected.gstin}</div>}
                          </div>
                        )
                      })()}
                      <button
                        type="button"
                        onClick={() => navigate('/customers/new?returnTo=sale')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add New Customer
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Sales Person (Optional)
                    </label>
                    <select
                      value={salesPersonId || ''}
                      onChange={(e) => setSalesPersonId(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                    >
                      <option value="">Select Sales Person</option>
                      {salesPersons.map(person => (
                        <option key={person.id} value={person.id}>
                          {person.name} {person.commission_rate && `(${person.commission_rate}% default)`}
                        </option>
                      ))}
                    </select>
                    {salesPersons.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500">No active sales persons available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Details</h2>
                <div className="space-y-4">
                  {paymentMethods.map((payment, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Method {index + 1}
                        </label>
                    <select
                          value={payment.method}
                          onChange={(e) => {
                            const updated = [...paymentMethods]
                            updated[index].method = e.target.value as 'cash' | 'card' | 'upi' | 'other'
                            setPaymentMethods(updated)
                            // Update legacy paymentMethod for backward compatibility
                            if (updated.length === 1) {
                              setPaymentMethod(updated[0].method)
                            }
                          }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                        <input
                          type="number"
                          value={payment.amount || ''}
                          onChange={(e) => {
                            const updated = [...paymentMethods]
                            updated[index].amount = parseFloat(e.target.value) || 0
                            setPaymentMethods(updated)
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                </div>
                      {paymentMethods.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = paymentMethods.filter((_, i) => i !== index)
                            setPaymentMethods(updated)
                          }}
                          className="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                          title="Remove payment method"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      const grandTotal = getSubtotal()
                      const currentTotal = paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0)
                      const remaining = Math.max(0, grandTotal - currentTotal)
                      
                      // Add new payment method with remaining amount or 0
                      setPaymentMethods([
                        ...paymentMethods,
                        { method: 'cash', amount: remaining }
                      ])
                    }}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    + Add Payment Method
                  </button>
                  
                  {paymentMethods.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const grandTotal = getSubtotal()
                        // Auto-fill remaining amount in the last payment method
                        const otherTotal = paymentMethods.slice(0, -1).reduce((sum, p) => sum + (p.amount || 0), 0)
                        const remaining = Math.max(0, grandTotal - otherTotal)
                        const updated = [...paymentMethods]
                        updated[updated.length - 1] = { ...updated[updated.length - 1], amount: remaining }
                        setPaymentMethods(updated)
                      }}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      Auto-fill Remaining Amount
                    </button>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Total Paid:</span>
                      <span className={`text-lg font-bold ${
                        Math.abs(getSubtotal() - paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0)) < 0.01
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        ₹{paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Grand Total:</span>
                      <span className="text-lg font-bold text-gray-900">₹{getSubtotal().toFixed(2)}</span>
                    </div>
                    {Math.abs(getSubtotal() - paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0)) >= 0.01 && (
                      <p className="text-xs text-red-600 mt-2">
                        Payment amount must equal grand total
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal:</span>
                    <span className="font-bold">₹{getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/30 pt-3 flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span>₹{getSubtotal().toFixed(2)}</span>
                  </div>
                </div>
                {errors.payment && (
                  <p className="text-red-200 text-sm mt-2 bg-red-500/20 p-2 rounded">{errors.payment}</p>
                )}
                <button
                  type="submit"
                  disabled={saleItems.length === 0 || Math.abs(getSubtotal() - paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0)) >= 0.01}
                  className="w-full mt-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

export default SaleForm

