import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
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
  const location = useLocation()
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'other' | 'credit'>('cash') // Legacy support
  const [paymentMethods, setPaymentMethods] = useState<Array<{ method: 'cash' | 'card' | 'upi' | 'other' | 'credit'; amount: number }>>([
    { method: 'cash', amount: 0 }
  ])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [customerCreditBalance, setCustomerCreditBalance] = useState<number>(0)
  const [creditApplied, setCreditApplied] = useState<number>(0) // Amount of credit applied to this sale

  // Separate function to load customers (can be called independently)
  const loadCustomers = async () => {
    try {
      const companyId = getCurrentCompanyId()
      const activeCustomers = await customerService.getAll(false, companyId)
      setCustomers(activeCustomers)
      
      // Set default "Walk-in Customer" if available and no customer is selected
      const walkInCustomer = activeCustomers.find(c => c.name.toLowerCase().includes('walk-in'))
      if (walkInCustomer && !customerId) {
        setCustomerId(walkInCustomer.id)
      }
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  // Separate function to load products and purchase data (can be called independently)
  const loadProductsAndPurchases = async () => {
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
        
        console.log(`📊 [DEBUG] Processing ${purchases.length} purchases for article/barcode mapping`)
        
        purchases.forEach(purchase => {
          purchase.items.forEach(item => {
              // Handle items with product_id 0 or missing - try to find product by name
              let actualProductId = item.product_id
              if (!actualProductId || actualProductId === 0) {
                if (item.product_name) {
                  // Try to find product by name
                  const foundProduct = products.find(p => p.name.toLowerCase() === (item.product_name || '').toLowerCase())
                  if (foundProduct) {
                    actualProductId = foundProduct.id
                    console.log(`⚠️ [DEBUG] Purchase item ${item.id} has product_id 0, found product by name "${item.product_name}": ${actualProductId}`)
                  } else {
                    console.warn(`⚠️ [DEBUG] Purchase item ${item.id} has product_id 0 and product_name "${item.product_name}" - product not found, skipping article/barcode mapping`)
                    // Still continue to process, but we can't map to a product
                  }
                } else {
                  console.warn(`⚠️ [DEBUG] Purchase item ${item.id} has no product_id and no product_name - skipping article/barcode mapping`)
                }
              }
              
              if (actualProductId && actualProductId > 0) {
                productIdsFromPurchases.add(actualProductId)
                
                // Debug: log items with SUIT article or 99000000298 barcode
                if ((item.article && String(item.article).toLowerCase().includes('suit')) ||
                    (item.barcode && String(item.barcode).includes('99000000298'))) {
                  console.log(`🔍 [DEBUG] Found relevant item in purchase ${purchase.id}:`, {
                    item_id: item.id,
                    product_id: item.product_id,
                    actualProductId: actualProductId,
                    product_name: item.product_name,
                    article: item.article,
                    articleType: typeof item.article,
                    barcode: item.barcode,
                    barcodeType: typeof item.barcode
                  })
                }
                
                // Map article codes - use actualProductId instead of item.product_id
                // Handle both string and number types, and explicitly check for empty strings
                const articleValue = item.article
                if (articleValue !== null && articleValue !== undefined && articleValue !== '') {
                  const articleStr = String(articleValue).trim()
                  if (articleStr && articleStr !== 'null' && articleStr !== 'undefined') {
                    const existingArticles = articleMap.get(actualProductId) || []
                    if (!existingArticles.includes(articleStr)) {
                      articleMap.set(actualProductId, [...existingArticles, articleStr])
                    }
                    // Map article to purchase item - store for quick lookup
                    // Note: We'll search purchases directly when needed to get the correct one
                    // This map is just for quick reference, actual lookup happens in getPurchaseItemForArticle
                    const articleKey = articleStr
                    if (!articleToItemMap.has(articleKey) || 
                        (purchase.purchase_date && 
                         articleToItemMap.get(articleKey)?.purchase_date && 
                         new Date(purchase.purchase_date) > new Date(articleToItemMap.get(articleKey)!.purchase_date!))) {
                      articleToItemMap.set(articleKey, {
                        ...item,
                        purchase_date: purchase.purchase_date
                      })
                    }
                  }
                }
                // Map barcodes from purchase items - use actualProductId instead of item.product_id
                // Handle both string and number types, and explicitly check for empty strings
                const barcodeValue = item.barcode
                if (barcodeValue !== null && barcodeValue !== undefined && barcodeValue !== '') {
                  const barcodeStr = String(barcodeValue).trim()
                  if (barcodeStr && barcodeStr !== 'null' && barcodeStr !== 'undefined') {
                    const existingBarcodes = barcodeMap.get(actualProductId) || []
                    if (!existingBarcodes.includes(barcodeStr)) {
                      barcodeMap.set(actualProductId, [...existingBarcodes, barcodeStr])
                    }
                    // Map barcode to purchase item (store the most recent purchase item for this barcode)
                    // This allows us to get MRP, sale_price, etc. from the purchase
                    // Note: Barcodes should be unique, so we can store the most recent one
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
                        barcodeStr === '8905005506422' || barcodeStr.includes('8905005506422') ||
                        barcodeStr === '99000000298' || barcodeStr.includes('99000000298')) {
                      console.log(`🎯 Found barcode ${barcodeStr} in purchase ${purchase.id} for product ${item.product_id}:`, {
                        barcode: barcodeStr,
                        barcodeOriginal: item.barcode,
                        barcodeType: typeof item.barcode,
                        item: item,
                        mrp: item.mrp,
                        sale_price: item.sale_price,
                        quantity: item.quantity,
                        article: item.article,
                        purchase_date: purchase.purchase_date
                      })
                    }
                    // Debug for 99000000298
                    if (barcodeStr === '99000000298') {
                      console.log(`✅ [DEBUG] Found barcode "99000000298" in purchase ${purchase.id}, item ${item.id}, product ${item.product_id}:`, {
                        barcode: barcodeStr,
                        barcodeOriginal: item.barcode,
                        barcodeType: typeof item.barcode,
                        item: item
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
          console.log('Article to purchase item map keys:', Array.from(articleToItemMap.keys()))
          console.log('Article to purchase item map entries:', Array.from(articleToItemMap.entries()).map(([key, item]) => ({ article: key, product_id: item.product_id })))
          
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
          console.log('📋 [DEBUG] All articles in articleToItemMap:', Array.from(articleToItemMap.keys()))
          console.log('📋 [DEBUG] Article to product mappings:', Array.from(articleToItemMap.entries()).map(([article, item]) => ({ article, product_id: item.product_id })))
          console.log('📋 [DEBUG] Product article map entries:', Array.from(articleMap.entries()).map(([productId, articles]) => ({ product_id: productId, articles })))
          if (barcodeToItemMap.has('8904201446686')) {
            console.log('✅ Purchase item for barcode 8904201446686:', barcodeToItemMap.get('8904201446686'))
          }
          // Check for SUIT article
          const suitArticles = Array.from(articleToItemMap.keys()).filter(k => k.toLowerCase().includes('suit'))
          if (suitArticles.length > 0) {
            console.log('✅ [DEBUG] Found SUIT articles in map:', suitArticles)
            suitArticles.forEach(article => {
              const item = articleToItemMap.get(article)
              console.log(`  - Article "${article}" maps to product_id: ${item?.product_id}`)
            })
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
      } catch (error) {
        console.error('Error loading products and purchases:', error)
      }
    }

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load products and purchases
        await loadProductsAndPurchases()
        
        // Load active sales persons
        const activeSalesPersons = await salesPersonService.getAll(false)
        setSalesPersons(activeSalesPersons)
        
        // Load active customers
        await loadCustomers()
      } catch (error) {
        console.error('Error loading sale form data:', error)
        alert('Error loading products. Please refresh the page.')
      }
    }
    loadData()
  }, [])

  // Reload customers when location changes (e.g., when returning from customer creation)
  useEffect(() => {
    if (location.pathname === '/sales/new') {
      loadCustomers()
    }
  }, [location.pathname])

  // Reload customers and purchase data when page becomes visible (helps with data freshness after imports)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/sales/new') {
        loadCustomers()
        loadProductsAndPurchases() // Reload purchase data to refresh article/barcode maps after imports
      }
    }

    const handleFocus = () => {
      if (location.pathname === '/sales/new') {
        loadCustomers()
        loadProductsAndPurchases() // Reload purchase data to refresh article/barcode maps after imports
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [location.pathname])

  // Load customer credit balance when customer is selected
  useEffect(() => {
    const loadCustomerCredit = async () => {
      if (customerId) {
        const customer = await customerService.getById(customerId as number)
        if (customer) {
          setCustomerCreditBalance(customer.credit_balance || 0)
        } else {
          setCustomerCreditBalance(0)
        }
      } else {
        setCustomerCreditBalance(0)
        setCreditApplied(0)
      }
    }
    loadCustomerCredit()
    // Reset credit applied when customer changes
    setCreditApplied(0)
  }, [customerId])

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
    // Try exact match first, then case-insensitive match
    let barcodePurchaseItem = barcodeToPurchaseItemMap.get(query)
    if (!barcodePurchaseItem) {
      // Try case-insensitive lookup by iterating through the map
      barcodeToPurchaseItemMap.forEach((item, barcode) => {
        if (barcode.toLowerCase() === queryLower && item.product_id === product.id) {
          barcodePurchaseItem = item
        }
      })
    }
    const barcodeMatchesProduct = barcodePurchaseItem && barcodePurchaseItem.product_id === product.id
    
    // Search by article code from purchase history (exact match or partial)
    const productArticles = productArticleMap.get(product.id) || []
    const articleMatch = productArticles.some(article => {
      const articleNormalized = String(article).trim()
      const articleLower = articleNormalized.toLowerCase()
      return articleLower === queryLower || articleNormalized === query || articleLower.includes(queryLower) || articleNormalized.includes(query)
    })
    
    // Also check if the query is an article that maps to this product (check articleToPurchaseItemMap)
    // This checks if ANY article in the map matches the query AND belongs to this product
    let articleItemMatch = false
    let matchingArticleItem: PurchaseItem | null = null
    
    // Search through all articles in the map (not just for this product)
    articleToPurchaseItemMap.forEach((item, article) => {
      // Check if the article matches the query
      const articleNormalized = String(article).trim()
      const articleLower = articleNormalized.toLowerCase()
      const articleMatchesQuery = articleLower === queryLower || articleNormalized === query || articleLower.includes(queryLower) || articleNormalized.includes(query)
      
      // If article matches AND it belongs to this product, mark it as a match
      if (articleMatchesQuery && item.product_id === product.id) {
        articleItemMatch = true
        const itemWithDate = item as PurchaseItem & { purchase_date?: string }
        const matchingWithDate = matchingArticleItem as PurchaseItem & { purchase_date?: string }
        if (!matchingArticleItem || (itemWithDate.purchase_date && matchingWithDate.purchase_date && 
            new Date(itemWithDate.purchase_date) > new Date(matchingWithDate.purchase_date))) {
          matchingArticleItem = item
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
    
    // Debug for SUIT article and 99000000298 barcode
    if (query === 'SUIT' || query.toLowerCase() === 'suit' || query === '99000000298') {
      console.log(`🔍 [DEBUG] Checking product ${product.id} (${product.name}) for "${query}":`, {
        productBarcode,
        purchaseBarcodes,
        productArticles,
        barcodeMatch,
        purchaseBarcodeMatch,
        barcodeMatchesProduct,
        articleMatch,
        articleItemMatch,
        matches,
        barcodeToPurchaseItemMap: barcodeToPurchaseItemMap.has(query) || barcodeToPurchaseItemMap.has(queryLower) ? 'Found in map' : 'Not in map',
        articleToPurchaseItemMap: Array.from(articleToPurchaseItemMap.keys()).filter(k => k.toLowerCase().includes('suit') || k === 'SUIT')
      })
    }
    
    return matches
  })
  
  // Debug: Log filtered results for the specific barcode
  useEffect(() => {
    const query = searchQuery.trim()
    if (query === '8904201446686' || query.includes('8904201446686') || 
        query === 'SUIT' || query.toLowerCase() === 'suit' || 
        query === '99000000298') {
      console.log(`🔍 [DEBUG] Search query: "${searchQuery}"`)
      console.log(`📦 Total available products: ${availableProducts.length}`)
      console.log(`✅ Filtered products: ${filteredProducts.length}`)
      console.log(`📋 Filtered product IDs:`, filteredProducts.map(p => ({ id: p.id, name: p.name })))
      console.log(`🗺️ Barcode map size: ${productBarcodeMap.size}`)
      console.log(`🗺️ Article map size: ${productArticleMap.size}`)
      console.log(`🗺️ Barcode to purchase item map size: ${barcodeToPurchaseItemMap.size}`)
      console.log(`🗺️ Article to purchase item map size: ${articleToPurchaseItemMap.size}`)
      
      // Check specifically for 99000000298
      if (query === '99000000298' || query.includes('99000000298')) {
        console.log(`🔍 [DEBUG] Looking for barcode 99000000298 in maps:`)
        console.log(`  - In barcodeToPurchaseItemMap (exact):`, barcodeToPurchaseItemMap.has('99000000298'))
        productBarcodeMap.forEach((barcodes, productId) => {
          const foundBarcodes = barcodes.filter(b => String(b).includes('99000000298'))
          if (foundBarcodes.length > 0) {
            console.log(`  - Found in productBarcodeMap for product ${productId}:`, foundBarcodes)
          }
        })
        // Check all purchases directly
        console.log(`  - Checking all purchases for barcode 99000000298:`)
        purchases.forEach(purchase => {
          purchase.items.forEach(item => {
            if (item.barcode && String(item.barcode).includes('99000000298')) {
              console.log(`    Found in Purchase ${purchase.id}, Item ${item.id}:`, item)
            }
          })
        })
      }
      
      // Check specifically for SUIT
      if (query === 'SUIT' || query.toLowerCase() === 'suit') {
        console.log(`🔍 [DEBUG] Looking for article SUIT in maps:`)
        console.log(`  - In articleToPurchaseItemMap (exact):`, articleToPurchaseItemMap.has('SUIT') || articleToPurchaseItemMap.has('suit'))
        productArticleMap.forEach((articles, productId) => {
          const foundArticles = articles.filter(a => String(a).toLowerCase().includes('suit'))
          if (foundArticles.length > 0) {
            console.log(`  - Found in productArticleMap for product ${productId}:`, foundArticles)
          }
        })
        // Check all purchases directly
        console.log(`  - Checking all purchases for article SUIT:`)
        purchases.forEach(purchase => {
          purchase.items.forEach(item => {
            if (item.article && String(item.article).toLowerCase().includes('suit')) {
              console.log(`    Found in Purchase ${purchase.id}, Item ${item.id}:`, item)
            }
          })
        })
      }
    }
  }, [searchQuery, availableProducts.length, filteredProducts.length, productBarcodeMap.size, productArticleMap.size, barcodeToPurchaseItemMap, articleToPurchaseItemMap, purchases])

  // Generate unique key for a purchase item
  // Format: "P{purchase_id}-I{purchase_item_id}" or "PROD-{product_id}" if no purchase item
  // This ensures each purchase item is treated uniquely, even if same product+article
  const getPurchaseItemUniqueKey = (purchaseId?: number, purchaseItemId?: number, productId?: number): string => {
    if (purchaseId && purchaseItemId) {
      return `P${purchaseId}-I${purchaseItemId}`
    }
    if (productId) {
      return `PROD-${productId}`
    }
    return `UNKNOWN-${Date.now()}`
  }

  const addProductToSale = (product: Product, searchQuery?: string) => {
    // First, determine the article and purchase item details for this product
    // searchQuery can be either a barcode, an article, product name, or "PURCHASE-{id}-ITEM-{id}"
    let purchaseItemArticle: string | undefined
    let purchaseItemId: number | undefined
    let purchaseId: number | undefined
    let purchaseItemBarcode: string | undefined
    
    console.log(`🔍 addProductToSale: product="${product.name}" (ID: ${product.id}), searchQuery="${searchQuery}"`)
    
    // Check if searchQuery is a specific purchase item identifier (from multiple purchase items display)
    if (searchQuery && searchQuery.startsWith('PURCHASE-')) {
      const match = searchQuery.match(/PURCHASE-(\d+)-ITEM-(\d+)/)
      if (match) {
        purchaseId = parseInt(match[1])
        purchaseItemId = parseInt(match[2])
        console.log(`  → Using specific purchase item: Purchase ${purchaseId}, Item ${purchaseItemId}`)
        
        // Get the purchase item details
        const purchase = purchases.find(p => p.id === purchaseId)
        if (purchase) {
          const purchaseItem = purchase.items.find(pi => pi.id === purchaseItemId)
          if (purchaseItem && purchaseItem.product_id === product.id) {
            purchaseItemArticle = purchaseItem.article
            purchaseItemBarcode = purchaseItem.barcode
            // Skip FIFO logic and go directly to creating sale item
    } else {
            console.warn(`  ⚠️ Purchase item ${purchaseItemId} not found or doesn't match product ${product.id}`)
          }
        } else {
          console.warn(`  ⚠️ Purchase ${purchaseId} not found`)
        }
      }
    }
    
    // Check if searchQuery is just the product name (not a barcode or article)
    // If it matches product name, treat it as if there's no searchQuery (use FIFO)
    const isProductNameSearch = searchQuery && 
      !searchQuery.startsWith('PURCHASE-') &&
      (searchQuery.toLowerCase() === product.name.toLowerCase() || 
       searchQuery.toLowerCase().includes(product.name.toLowerCase()) ||
       product.name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Only do FIFO if we don't already have purchase_id and purchase_item_id from PURCHASE-{id}-ITEM-{id}
    if ((!purchaseId || !purchaseItemId) && (!searchQuery || isProductNameSearch)) {
      // No search query - user searched by product name only
      // Find purchase items for this product (FIFO - First In First Out)
      // Prioritize items with available stock, then by purchase date (oldest first)
      console.log(`  → Product name search detected (searchQuery: "${searchQuery}"), finding purchase items for product (FIFO)`)
      
      let purchaseItemBarcode: string | undefined
      
      // Find all purchase items for this product that have available stock
      const availablePurchaseItems: Array<{purchase: Purchase, item: PurchaseItem}> = []
      for (const purchase of purchases) {
        for (const item of purchase.items) {
          if (item.product_id === product.id) {
            const soldQty = item.sold_quantity || 0
            const availableStock = item.quantity - soldQty
            console.log(`    Checking Purchase ${purchase.id}, Item ${item.id}: Qty=${item.quantity}, Sold=${soldQty}, Available=${availableStock}`)
            if (availableStock > 0) {
              availablePurchaseItems.push({ purchase, item })
            }
          }
        }
      }
      
      console.log(`  → Found ${availablePurchaseItems.length} purchase items with available stock`)
      
      // Sort by purchase date (oldest first) for FIFO
      availablePurchaseItems.sort((a, b) => {
        const dateA = new Date(a.purchase.purchase_date).getTime()
        const dateB = new Date(b.purchase.purchase_date).getTime()
        return dateA - dateB
      })
      
      // Use the first available purchase item (FIFO)
      if (availablePurchaseItems.length > 0) {
        const firstItem = availablePurchaseItems[0]
        purchaseItemId = firstItem.item.id
        purchaseId = firstItem.purchase.id
        purchaseItemArticle = firstItem.item.article // May be undefined, that's OK
        purchaseItemBarcode = firstItem.item.barcode
        const stock = firstItem.item.quantity - (firstItem.item.sold_quantity || 0)
        console.log(`  ✅ Selected purchase item (FIFO): Purchase ${purchaseId}, Item ${purchaseItemId}, Stock: ${stock}, MRP: ${firstItem.item.mrp}, Sale: ${firstItem.item.sale_price}`)
      } else {
        // No available stock, but still try to find any purchase item for this product
        console.log(`  → No items with available stock, finding any purchase item...`)
        for (const purchase of purchases) {
          const item = purchase.items.find(pi => pi.product_id === product.id)
          if (item) {
            purchaseItemId = item.id
            purchaseId = purchase.id
            purchaseItemArticle = item.article
            purchaseItemBarcode = item.barcode
            console.log(`  ✅ Found purchase item (no stock): Purchase ${purchaseId}, Item ${purchaseItemId}`)
            break
          }
        }
      }
    } else if (searchQuery) {
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
          // If not a barcode, try searching by article (with product_id to ensure correct match)
          console.log(`  → Searching by article: "${searchQuery}"`)
          const articleItem = getPurchaseItemForArticle(searchQuery, product.id)
          console.log(`  → Article search result:`, articleItem ? {
            id: articleItem.id,
            article: articleItem.article,
            product_id: articleItem.product_id,
            quantity: articleItem.quantity,
            sold_quantity: articleItem.sold_quantity,
            available: (articleItem.quantity || 0) - (articleItem.sold_quantity || 0)
          } : 'Not found')
          
        if (articleItem && articleItem.product_id === product.id) {
          purchaseItemArticle = articleItem.article
            console.log(`  → Found article "${articleItem.article}" for product ${product.id}`)
            
            // Find the purchase that contains this item to get purchase_id and purchase_item_id
            // Search purchases to find the exact purchase item - use the articleItem we found
            for (const purchase of purchases) {
              // First try to match by ID if articleItem has an id (most reliable)
              let item = articleItem.id ? purchase.items.find(pi => pi.id === articleItem.id) : null
              
              // If no ID match, try matching by product_id + article (case-insensitive)
              if (!item) {
                item = purchase.items.find(pi => 
                  pi.product_id === product.id && 
                  pi.article && 
                  (pi.article.toLowerCase() === searchQuery.toLowerCase() || 
                   pi.article.toLowerCase() === articleItem.article?.toLowerCase() ||
                   pi.article === searchQuery ||
                   pi.article === articleItem.article)
                )
              }
              
            if (item) {
              purchaseItemId = item.id
                purchaseId = purchase.id
                const stock = item.quantity - (item.sold_quantity || 0)
                console.log(`✅ Found purchase item: Purchase ${purchase.id}, Item ${item.id}, Article "${item.article}", Stock: ${stock}`)
                break // Found the matching item, stop searching
              }
            }
            
            // If we still didn't find purchase_item_id, but we have articleItem with ID, use it
            if (!purchaseItemId && articleItem.id) {
              console.log(`  → Using articleItem.id: ${articleItem.id}`)
              purchaseItemId = articleItem.id
              // Try to find the purchase that contains this item
              for (const purchase of purchases) {
                if (purchase.items.some(pi => pi.id === articleItem.id)) {
                  purchaseId = purchase.id
                  console.log(`  → Found purchase ${purchase.id} containing item ${articleItem.id}`)
                  break
                }
              }
            }
            
            if (!purchaseItemId) {
              console.warn(`⚠️ Could not find purchase_item_id for article "${searchQuery}"`)
            }
          } else {
            console.log(`  → Article "${searchQuery}" not found for product ${product.id}`)
          }
        }
    }
    
    // Generate unique key for this purchase item
    const uniqueKey = getPurchaseItemUniqueKey(purchaseId, purchaseItemId, product.id)
    
    // Check if the same purchase item (by unique key) is already in cart
    // Each purchase item is treated separately, even if same product+article
    const existingItem = saleItems.find(item => {
      // Match by unique key first (most accurate)
      if (item.purchase_item_unique_key && uniqueKey) {
        return item.purchase_item_unique_key === uniqueKey
      }
      
      // Fallback: Match by product_id AND purchase_item_id (if both have it)
      if (purchaseItemId && item.purchase_item_id && purchaseId && item.purchase_id) {
        return item.product_id === product.id && 
               item.purchase_item_id === purchaseItemId && 
               item.purchase_id === purchaseId
      }
      
      // Fallback: Match by product_id AND article (if both have it and no purchase_item_id)
      if (purchaseItemArticle && item.purchase_item_article && 
          !purchaseItemId && !item.purchase_item_id) {
        return item.product_id === product.id && 
               item.purchase_item_article.toLowerCase() === purchaseItemArticle.toLowerCase()
      }
      
      // Fallback: If neither has purchase item info, treat as same item (legacy behavior)
      if (!purchaseItemArticle && !purchaseItemId && !item.purchase_item_article && !item.purchase_item_id) {
        return item.product_id === product.id
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
      let purchaseItemBarcode: string | undefined
      
      // If we found purchase item details above (from FIFO or article/barcode search), use them
      if (purchaseItemId && purchaseId) {
        // Get the purchase item to extract MRP, sale_price, etc.
        const purchase = purchases.find(p => p.id === purchaseId)
        if (purchase) {
          const purchaseItem = purchase.items.find(pi => pi.id === purchaseItemId)
          if (purchaseItem && purchaseItem.product_id === product.id) {
            // MRP should be from purchase item's mrp, fallback to product selling_price
            mrp = purchaseItem.mrp || product.selling_price || 0
            // Sale price should be from purchase item's sale_price, fallback to mrp, then product selling_price
            unitPrice = purchaseItem.sale_price || (purchaseItem.mrp || product.selling_price || 0)
            purchasePrice = purchaseItem.unit_price || product.purchase_price || 0
            barcode = purchaseItem.barcode || product.barcode || ''
            purchaseItemBarcode = purchaseItem.barcode
            if (purchaseItem.article) {
              purchaseItemArticle = purchaseItem.article // Set article if available
            }
            console.log(`  → Using purchase item prices: MRP=${mrp}, Sale=${unitPrice}, Purchase=${purchasePrice}`)
          }
        }
      } else if (searchQuery) {
        // If we don't have purchase_item_id yet, try to find it by barcode or article
        // Check if searchQuery is a barcode
        const isBarcode = barcodeToPurchaseItemMap.has(searchQuery)
        
        if (isBarcode) {
          const purchaseItem = barcodeToPurchaseItemMap.get(searchQuery)!
          if (purchaseItem.product_id === product.id) {
            // MRP should be from purchase item's mrp, fallback to product selling_price
            mrp = purchaseItem.mrp || product.selling_price || 0
            // Sale price should be from purchase item's sale_price, fallback to mrp, then product selling_price
            unitPrice = purchaseItem.sale_price || (purchaseItem.mrp || product.selling_price || 0)
            purchasePrice = purchaseItem.unit_price || product.purchase_price || 0
            barcode = searchQuery
            purchaseItemBarcode = purchaseItem.barcode
            // Find the purchase that contains this item - search directly to get exact match
            for (const purchase of purchases) {
              const item = purchase.items.find(pi => pi.barcode === searchQuery && pi.product_id === product.id)
              if (item) {
              purchaseId = purchase.id
                purchaseItemId = item.id
                break
              }
            }
          }
        } else {
          // Not a barcode, try as article (with product_id to ensure correct match)
          const articleItem = getPurchaseItemForArticle(searchQuery, product.id)
          if (articleItem && articleItem.product_id === product.id) {
            // MRP should be from purchase item's mrp, fallback to product selling_price
            mrp = articleItem.mrp || product.selling_price || 0
            // Sale price should be from purchase item's sale_price, fallback to mrp, then product selling_price
            unitPrice = articleItem.sale_price || (articleItem.mrp || product.selling_price || 0)
            purchasePrice = articleItem.unit_price || product.purchase_price || 0
            barcode = articleItem.barcode || product.barcode || ''
            purchaseItemBarcode = articleItem.barcode
            purchaseItemArticle = articleItem.article
            // Find the purchase that contains this item - search directly to get exact match
            // Use the articleItem we found (which has the best stock match)
            for (const purchase of purchases) {
              const item = purchase.items.find(pi => 
                pi.id === articleItem.id || // Match by ID if available
                (pi.product_id === product.id && 
                 pi.article && 
                 (pi.article.toLowerCase() === searchQuery.toLowerCase() || pi.article === searchQuery) &&
                 pi.quantity === articleItem.quantity && // Match quantity
                 pi.unit_price === articleItem.unit_price) // Match price
              )
              if (item) {
              purchaseId = purchase.id
                purchaseItemId = item.id
                break
              }
            }
          }
        }
      }
      
      // Calculate remaining stock for this item
      // If we have purchase item info, use that specific purchase item's stock
      // Otherwise, use product's general stock
      let remainingStock = product.stock_quantity
      console.log(`  → Initial stock (product): ${remainingStock}`)
      console.log(`  → purchaseItemId: ${purchaseItemId}, purchaseId: ${purchaseId}`)
      
      if (purchaseItemId && purchaseId) {
        const purchase = purchases.find(p => p.id === purchaseId)
        if (purchase) {
          const purchaseItem = purchase.items.find(pi => pi.id === purchaseItemId)
          if (purchaseItem && purchaseItem.product_id === product.id) {
            const soldQty = purchaseItem.sold_quantity || 0
            remainingStock = purchaseItem.quantity - soldQty
            console.log(`  ✅ Stock from purchase item: ${purchaseItem.quantity} - ${soldQty} = ${remainingStock}`)
          } else {
            console.warn(`  ⚠️ Purchase item not found: Purchase ${purchaseId}, Item ${purchaseItemId}`)
          }
        } else {
          console.warn(`  ⚠️ Purchase not found: ${purchaseId}`)
        }
      } else if (purchaseItemArticle && purchaseItemArticle.trim()) {
        // If we have article but no purchaseItemId, find the purchase item by product_id + article
        const articleToFind = purchaseItemArticle.trim()
        for (const purchase of purchases) {
          const purchaseItem = purchase.items.find(pi => 
            pi.product_id === product.id && 
            pi.article && 
            (pi.article.toLowerCase() === articleToFind.toLowerCase() || pi.article === articleToFind)
          )
          if (purchaseItem) {
            const soldQty = purchaseItem.sold_quantity || 0
            remainingStock = purchaseItem.quantity - soldQty
            // Also set purchaseItemId and purchaseId for future reference
            purchaseItemId = purchaseItem.id
            purchaseId = purchase.id
            console.log(`  → Found by article, stock: ${remainingStock}`)
            break
          }
        }
      } else {
        // No purchase item found - use product stock (aggregated)
        console.log(`  → Using product stock (aggregated): ${remainingStock}`)
      }
      
      // Always use the actual product name (article is stored separately in purchase_item_article)
      const displayName = product.name
      
        const newItem: SaleItem = {
          product_id: product.id,
        product_name: displayName, // Always use product name
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
        purchase_item_barcode: purchaseItemBarcode,
        purchase_item_unique_key: uniqueKey // Unique identifier for this purchase item
        }
        
        // Debug logging
        console.log('📦 Adding item to cart:', {
          product_id: product.id,
          product_name: displayName,
          article: purchaseItemArticle,
          purchase_id: purchaseId,
          purchase_item_id: purchaseItemId,
          unique_key: uniqueKey,
          remainingStock: remainingStock,
          mrp,
          unitPrice
        })
        
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
  // IMPORTANT: This should be called with product_id to ensure correct matching
  // Returns the purchase item with the most available stock for this product+article combination
  const getPurchaseItemForArticle = (article: string, productId?: number): PurchaseItem | null => {
    if (productId === undefined) {
      // If no productId, try to find any purchase item with this article
    const articleLower = article.toLowerCase()
      for (const purchase of purchases) {
        for (const item of purchase.items) {
          if (item.article && 
              (item.article.toLowerCase() === articleLower || item.article === article)) {
            return item
          }
      }
    }
    return null
    }
    
    // Search purchases directly to find the best matching purchase item
    // Priority: Most available stock > Most recent purchase
    const articleLower = article.toLowerCase()
    let bestMatch: PurchaseItem | null = null
    let bestStock = -1
    let bestPurchaseDate: string | null = null
    
    for (const purchase of purchases) {
      for (const item of purchase.items) {
        if (item.product_id === productId && 
            item.article && 
            (item.article.toLowerCase() === articleLower || item.article === article)) {
          const availableStock = (item.quantity || 0) - (item.sold_quantity || 0)
          
          // Prefer item with more available stock
          // If stock is same, prefer more recent purchase
          if (availableStock > bestStock || 
              (availableStock === bestStock && 
               purchase.purchase_date && 
               bestPurchaseDate &&
               new Date(purchase.purchase_date) > new Date(bestPurchaseDate))) {
            bestMatch = item
            bestStock = availableStock
            bestPurchaseDate = purchase.purchase_date || null
          }
        }
      }
    }
    
    return bestMatch
  }
  
  // Get display price info for a product (use purchase item if available)
  const getProductDisplayInfo = (product: Product, searchQuery: string) => {
    const query = searchQuery.trim()
    const queryLower = query.toLowerCase()
    
    // Check if search query is a barcode that matches this product
    const barcodePurchaseItem = getPurchaseItemForBarcode(query)
    
    // Check if search query is an article that matches THIS SPECIFIC PRODUCT
    // IMPORTANT: Pass product.id to ensure we get the correct purchase item for this product
    const articlePurchaseItemForProduct = getPurchaseItemForArticle(query, product.id)
    
    // Also check if this product has this barcode in purchase history
    const productBarcodes = productBarcodeMap.get(product.id) || []
    const productArticles = productArticleMap.get(product.id) || []
    
    // Check if query matches any article for this product (case-insensitive)
    // Also search purchases directly to find articles for this product
    let matchingArticle = ''
    productArticles.forEach(article => {
      if (article.toLowerCase() === queryLower || article.toLowerCase().includes(queryLower)) {
        matchingArticle = article
      }
    })
    
    // Also check purchases directly for this product + article combination
    if (!matchingArticle) {
      for (const purchase of purchases) {
        for (const item of purchase.items) {
          if (item.product_id === product.id && 
              item.article && 
              (item.article.toLowerCase() === queryLower || item.article.toLowerCase().includes(queryLower))) {
            matchingArticle = item.article
            break
          }
        }
        if (matchingArticle) break
      }
    }
    
    const isBarcodeSearch = (barcodePurchaseItem !== null && barcodePurchaseItem.product_id === product.id) || productBarcodes.includes(query)
    const isArticleSearch = (articlePurchaseItemForProduct !== null && articlePurchaseItemForProduct.product_id === product.id) || matchingArticle !== ''
    
    // Debug logging
    if (query.toLowerCase() === 'money' || query.toLowerCase().includes('money')) {
      console.log('🔍 Getting display info for article "money":', {
        productId: product.id,
        productName: product.name,
        articlePurchaseItemForProduct: articlePurchaseItemForProduct,
        articlePurchaseItemProductId: articlePurchaseItemForProduct?.product_id,
        matchingArticle,
        matches: articlePurchaseItemForProduct && articlePurchaseItemForProduct.product_id === product.id
      })
    }
    
    // Priority: barcode match > article match
    if (isBarcodeSearch && barcodePurchaseItem && barcodePurchaseItem.product_id === product.id) {
      // We found a purchase item for this barcode and it matches this product
      // MRP should be from purchase item's mrp, fallback to 0
      const mrp = barcodePurchaseItem.mrp || 0
      // Sale price should be from purchase item's sale_price, fallback to mrp, then 0
      const salePrice = barcodePurchaseItem.sale_price || (barcodePurchaseItem.mrp || 0)
      
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
    // We already have articlePurchaseItemForProduct from above, which is filtered by product.id
    if (isArticleSearch && articlePurchaseItemForProduct && articlePurchaseItemForProduct.product_id === product.id) {
      // We found a purchase item for this article and it matches this product
      // MRP should be from purchase item's mrp, fallback to 0
      const mrp = articlePurchaseItemForProduct.mrp || 0
      // Sale price should be from purchase item's sale_price, fallback to mrp, then 0
      const salePrice = articlePurchaseItemForProduct.sale_price || (articlePurchaseItemForProduct.mrp || 0)
      
      if (query.toLowerCase() === 'money' || query.toLowerCase().includes('money')) {
        console.log('✅ Using purchase item data for article:', {
          mrp,
          salePrice,
          purchasePrice: articlePurchaseItemForProduct.unit_price,
          article: articlePurchaseItemForProduct.article,
          quantity: articlePurchaseItemForProduct.quantity,
          barcode: articlePurchaseItemForProduct.barcode
        })
      }
      
      // Calculate remaining stock (quantity - sold_quantity)
      const soldQty = articlePurchaseItemForProduct.sold_quantity || 0
      const remainingStock = articlePurchaseItemForProduct.quantity - soldQty
      
      return {
        mrp: mrp,
        salePrice: salePrice,
        purchasePrice: articlePurchaseItemForProduct.unit_price || product.purchase_price || 0,
        barcode: articlePurchaseItemForProduct.barcode || product.barcode || '',
        article: articlePurchaseItemForProduct.article || query, // Use the searched article
        quantity: remainingStock, // Return remaining stock instead of total quantity
        remainingStock: remainingStock, // Explicit remaining stock
        fromPurchase: true,
        purchaseItem: articlePurchaseItemForProduct
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
    
    // If searching by product name (not barcode or article), use FIFO to find purchase item
    // Check if query matches product name
    const isProductNameSearch = query && 
      (query.toLowerCase() === product.name.toLowerCase() || 
       query.toLowerCase().includes(product.name.toLowerCase()) ||
       product.name.toLowerCase().includes(query.toLowerCase()))
    
    if (isProductNameSearch && !isBarcodeSearch && !isArticleSearch) {
      // Find purchase items for this product using FIFO
      const availablePurchaseItems: Array<{purchase: Purchase, item: PurchaseItem}> = []
      for (const purchase of purchases) {
        for (const item of purchase.items) {
          if (item.product_id === product.id) {
            const soldQty = item.sold_quantity || 0
            const availableStock = item.quantity - soldQty
            if (availableStock > 0) {
              availablePurchaseItems.push({ purchase, item })
            }
          }
        }
      }
      
      // Sort by purchase date (oldest first) for FIFO
      availablePurchaseItems.sort((a, b) => {
        const dateA = new Date(a.purchase.purchase_date).getTime()
        const dateB = new Date(b.purchase.purchase_date).getTime()
        return dateA - dateB
      })
      
      // Use the first available purchase item (FIFO)
      if (availablePurchaseItems.length > 0) {
        const firstItem = availablePurchaseItems[0]
        const purchaseItem = firstItem.item
        const soldQty = purchaseItem.sold_quantity || 0
        const remainingStock = purchaseItem.quantity - soldQty
        
        // MRP should be from purchase item's mrp, fallback to product selling_price
        const mrp = purchaseItem.mrp || product.selling_price || 0
        // Sale price should be from purchase item's sale_price, fallback to mrp, then product selling_price
        const salePrice = purchaseItem.sale_price || (purchaseItem.mrp || product.selling_price || 0)
        
        console.log(`[getProductDisplayInfo] Product name search - Using FIFO: Purchase ${firstItem.purchase.id}, Item ${purchaseItem.id}, Stock: ${remainingStock}`)
        
        return {
          mrp: mrp,
          salePrice: salePrice,
          purchasePrice: purchaseItem.unit_price || product.purchase_price || 0,
          barcode: purchaseItem.barcode || product.barcode || '',
          article: purchaseItem.article || '',
          quantity: remainingStock,
          remainingStock: remainingStock,
          fromPurchase: true,
          purchaseItem: purchaseItem
        }
      }
    }
    
    // Regular search (not by barcode or article) - return aggregated product stock
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
    // Priority 1: If we have unique key, use it to find the exact purchase item
    if (item.purchase_item_unique_key) {
      const [purchaseIdStr, itemIdStr] = item.purchase_item_unique_key.split('-I')
      if (purchaseIdStr && itemIdStr) {
        const purchaseId = parseInt(purchaseIdStr.replace('P', ''))
        const purchaseItemId = parseInt(itemIdStr)
        const purchase = purchases.find(p => p.id === purchaseId)
        if (purchase) {
          const purchaseItem = purchase.items.find(pi => pi.id === purchaseItemId)
          if (purchaseItem && purchaseItem.product_id === item.product_id) {
            const soldQty = purchaseItem.sold_quantity || 0
            const stock = purchaseItem.quantity - soldQty
            console.log(`[getRemainingStockForItem] Using unique_key ${item.purchase_item_unique_key}: Stock = ${purchaseItem.quantity} - ${soldQty} = ${stock}`)
            return stock
          }
        }
      }
    }
    
    // Priority 2: If we have purchase_item_id, use that (most accurate)
    if (item.purchase_id && item.purchase_item_id) {
      const purchase = purchases.find(p => p.id === item.purchase_id)
      if (purchase) {
        const purchaseItem = purchase.items.find(pi => pi.id === item.purchase_item_id)
        if (purchaseItem && purchaseItem.product_id === item.product_id) {
          const soldQty = purchaseItem.sold_quantity || 0
          const stock = purchaseItem.quantity - soldQty
          console.log(`[getRemainingStockForItem] Using purchase_item_id ${item.purchase_item_id}: Stock = ${purchaseItem.quantity} - ${soldQty} = ${stock}`)
          return stock
        }
      }
    }
    
    // Priority 2: If we have article, find the purchase item by product_id + article
    // Find the one with most available stock (in case multiple purchases have same article)
    if (item.purchase_item_article) {
      let bestStock = -1
      let bestPurchaseItem: PurchaseItem | null = null
      
      for (const purchase of purchases) {
        for (const purchaseItem of purchase.items) {
          if (purchaseItem.product_id === item.product_id && 
              purchaseItem.article && 
              purchaseItem.article.toLowerCase() === item.purchase_item_article?.toLowerCase()) {
          const soldQty = purchaseItem.sold_quantity || 0
            const availableStock = purchaseItem.quantity - soldQty
            
            // Prefer the one with most available stock
            if (availableStock > bestStock) {
              bestStock = availableStock
              bestPurchaseItem = purchaseItem
            }
          }
        }
      }
      
      if (bestPurchaseItem) {
        console.log(`[getRemainingStockForItem] Using article "${item.purchase_item_article}": Stock = ${bestPurchaseItem.quantity} - ${bestPurchaseItem.sold_quantity || 0} = ${bestStock}`)
        return bestStock
      }
    }
    
    // Priority 3: Fallback to product stock (aggregated)
    const product = availableProducts.find(p => p.id === item.product_id)
    const productStock = product?.stock_quantity || 0
    console.log(`[getRemainingStockForItem] Fallback to product stock: ${productStock}`)
    return productStock
  }

  const updateItemQuantity = (saleItem: SaleItem, quantity: number) => {
    // Get remaining stock for this specific item
    const remainingStock = getRemainingStockForItem(saleItem)
    
    if (quantity > remainingStock) {
      alert(`Only ${remainingStock} units remaining in stock${saleItem.purchase_item_article ? ` for article "${saleItem.purchase_item_article}"` : ''}`)
      return
    }

    setSaleItems(saleItems.map(item => {
      // Match by unique key first (most accurate)
      if (saleItem.purchase_item_unique_key && item.purchase_item_unique_key) {
        if (item.purchase_item_unique_key === saleItem.purchase_item_unique_key) {
          return { ...item, quantity }
        }
        return item
      }
      
      // Fallback: Match by product_id AND (purchase_item_id OR purchase_item_article)
      const isMatch = item.product_id === saleItem.product_id &&
        ((saleItem.purchase_item_id && item.purchase_item_id && item.purchase_item_id === saleItem.purchase_item_id &&
          saleItem.purchase_id && item.purchase_id && item.purchase_id === saleItem.purchase_id) ||
         (saleItem.purchase_item_article && item.purchase_item_article && 
          item.purchase_item_article.toLowerCase() === saleItem.purchase_item_article.toLowerCase() &&
          !saleItem.purchase_item_id && !item.purchase_item_id) ||
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
      // Match by unique key first (most accurate)
      if (itemToRemove.purchase_item_unique_key && item.purchase_item_unique_key) {
        return item.purchase_item_unique_key !== itemToRemove.purchase_item_unique_key
      }
      
      // Fallback: Match by product_id AND purchase_item_id (if both have it)
      if (itemToRemove.purchase_item_id && item.purchase_item_id && 
          itemToRemove.purchase_id && item.purchase_id) {
        return !(item.product_id === itemToRemove.product_id &&
                 item.purchase_item_id === itemToRemove.purchase_item_id &&
                 item.purchase_id === itemToRemove.purchase_id)
      }
      
      // Fallback: Match by product_id AND article
      if (itemToRemove.purchase_item_article && item.purchase_item_article) {
        return !(item.product_id === itemToRemove.product_id &&
                 item.purchase_item_article.toLowerCase() === itemToRemove.purchase_item_article.toLowerCase() &&
                 !itemToRemove.purchase_item_id && !item.purchase_item_id)
      }
      
      // Fallback: Match by product_id only (if no purchase item info)
      if (!itemToRemove.purchase_item_id && !itemToRemove.purchase_item_article &&
          !item.purchase_item_id && !item.purchase_item_article) {
        return item.product_id !== itemToRemove.product_id
      }
      
      // Otherwise, keep the item (they're different)
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
    
    // Calculate return items total (for credit allocation)
    const returnItemsTotal = saleItems
      .filter(item => item.sale_type === 'return')
      .reduce((sum, item) => sum + item.total, 0)
    
    // Calculate payment total and return amount (accounting for credit)
    const subtotalAmount = getSubtotal()
    const grandTotal = subtotalAmount - creditApplied // Deduct credit from grand total
    
    // Separate payment methods: exclude credit from payment total calculation
    const nonCreditPayments = paymentMethods.filter(p => p.method !== 'credit')
    const creditPayments = paymentMethods.filter(p => p.method === 'credit')
    const paymentTotal = nonCreditPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const creditPaymentTotal = creditPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    
    // If there are return items and customer is selected, automatically add credit payment method
    let finalPaymentMethods = [...paymentMethods]
    if (returnItemsTotal > 0 && customerId) {
      // Check if credit payment method already exists for returns
      const existingCreditForReturns = creditPayments.find(p => p.amount === returnItemsTotal)
      if (!existingCreditForReturns) {
        // Remove any existing credit payments (we'll add the correct one)
        finalPaymentMethods = finalPaymentMethods.filter(p => p.method !== 'credit')
        // Add credit payment method for return amount
        finalPaymentMethods.push({ method: 'credit', amount: returnItemsTotal })
      }
    }
    
    const returnAmount = Math.max(0, paymentTotal - grandTotal)
    
    // Validate: payment + credit applied + credit payment should be at least equal to grand total
    const totalCoverage = paymentTotal + creditApplied + creditPaymentTotal
    if (totalCoverage < subtotalAmount - 0.01) {
      setErrors({ payment: `Payment total (₹${paymentTotal.toFixed(2)}) + Credit Applied (₹${creditApplied.toFixed(2)}) + Credit Payment (₹${creditPaymentTotal.toFixed(2)}) is less than grand total (₹${subtotalAmount.toFixed(2)})` })
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
      payment_method: finalPaymentMethods.length > 0 ? finalPaymentMethods[0].method : paymentMethod, // Legacy support
      payment_methods: finalPaymentMethods.map(p => ({ method: p.method, amount: p.amount })), // Multiple payment methods (including credit)
      return_amount: returnAmount > 0 ? returnAmount : undefined, // Store return amount if any
      credit_applied: creditApplied > 0 ? creditApplied : undefined, // Store credit applied if any
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
                      {filteredProducts.flatMap(product => {
                        // Check if this is a product name search (not barcode or article)
                        const query = searchQuery.trim()
                        const queryLower = query.toLowerCase()
                        const isProductNameSearch = 
                          (queryLower === product.name.toLowerCase() || 
                           queryLower.includes(product.name.toLowerCase()) ||
                           product.name.toLowerCase().includes(queryLower)) &&
                          !barcodeToPurchaseItemMap.has(query) &&
                          !getPurchaseItemForArticle(query, product.id) &&
                          query
                        
                        // If product name search, get all purchase items for this product
                        let purchaseItemsToShow: Array<{purchase: Purchase, item: PurchaseItem}> = []
                        
                        if (isProductNameSearch) {
                          // Find all purchase items for this product
                          for (const purchase of purchases) {
                            for (const item of purchase.items) {
                              if (item.product_id === product.id) {
                                const soldQty = item.sold_quantity || 0
                                const availableStock = item.quantity - soldQty
                                purchaseItemsToShow.push({ purchase, item })
                              }
                            }
                          }
                          
                          // Sort by purchase date (oldest first) for FIFO display
                          purchaseItemsToShow.sort((a, b) => {
                            const dateA = new Date(a.purchase.purchase_date).getTime()
                            const dateB = new Date(b.purchase.purchase_date).getTime()
                            return dateA - dateB
                          })
                        }
                        
                        // If we have multiple purchase items, show each separately
                        if (purchaseItemsToShow.length > 1) {
                          return purchaseItemsToShow.map(({ purchase, item }) => {
                            const soldQty = item.sold_quantity || 0
                            const remainingStock = item.quantity - soldQty
                            const mrp = item.mrp || product.selling_price || 0
                            const salePrice = item.sale_price || (item.mrp || product.selling_price || 0)
                            
                            return (
                              <div
                                key={`${product.id}-${purchase.id}-${item.id}`}
                                onClick={() => {
                                  // Create a unique identifier to pass to addProductToSale
                                  // We'll use purchase_id and purchase_item_id
                                  addProductToSale(product, `PURCHASE-${purchase.id}-ITEM-${item.id}`)
                                }}
                                className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors border ${
                                  remainingStock > 0
                                    ? 'bg-gray-50 hover:bg-blue-50 border-transparent hover:border-blue-200'
                                    : 'bg-orange-50 hover:bg-orange-100 border-orange-200'
                                }`}
                              >
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1 flex-wrap">
                                    <span className={remainingStock > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                      Remaining Stock: {remainingStock} {product.unit}
                                    </span>
                                    {item.article && (
                                      <span className="text-blue-600 font-medium">Article: {item.article}</span>
                                    )}
                                    <span className="text-gray-500 text-xs">
                                      Purchase #{purchase.id} • {new Date(purchase.purchase_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {mrp > salePrice && (
                                    <div className="text-xs text-gray-500 line-through">MRP: ₹{mrp.toFixed(2)}</div>
                                  )}
                                  <div className="font-bold text-blue-600">₹{salePrice.toFixed(2)}</div>
                                  <button
                                    type="button"
                                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      addProductToSale(product, `PURCHASE-${purchase.id}-ITEM-${item.id}`)
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        } else {
                          // Single purchase item or no purchase items - show as before
                        const displayInfo = getProductDisplayInfo(product, searchQuery)
                        const purchaseItem = displayInfo.purchaseItem
                        
                          return [(
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
                        )]
                        }
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
                      
                      // Use unique key for React key to ensure items with same product but different purchase items are separate
                      const itemKey = item.purchase_item_unique_key || 
                                     (item.purchase_id && item.purchase_item_id ? `P${item.purchase_id}-I${item.purchase_item_id}` : 
                                     `PROD-${item.product_id}-${item.purchase_item_article || 'no-article'}-${Date.now()}`)
                      
                      return (
                        <div key={itemKey} className={`p-4 rounded-lg space-y-3 border-2 ${
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
                                    // Match by unique key first (most accurate)
                                    if (item.purchase_item_unique_key && i.purchase_item_unique_key) {
                                      return i.purchase_item_unique_key === item.purchase_item_unique_key 
                                        ? { ...i, sale_type: 'sale' } : i
                                    }
                                    
                                    // Fallback: Match by product_id AND purchase_item_id
                                    if (item.purchase_item_id && i.purchase_item_id && 
                                        item.purchase_id && i.purchase_id) {
                                      return (i.product_id === item.product_id &&
                                              i.purchase_item_id === item.purchase_item_id &&
                                              i.purchase_id === item.purchase_id)
                                        ? { ...i, sale_type: 'sale' } : i
                                    }
                                    
                                    // Fallback: Match by product_id AND article
                                    if (item.purchase_item_article && i.purchase_item_article &&
                                        !item.purchase_item_id && !i.purchase_item_id) {
                                      return (i.product_id === item.product_id &&
                                              i.purchase_item_article.toLowerCase() === item.purchase_item_article.toLowerCase())
                                        ? { ...i, sale_type: 'sale' } : i
                                    }
                                    
                                    // Fallback: Match by product_id only
                                    if (!item.purchase_item_id && !item.purchase_item_article &&
                                        !i.purchase_item_id && !i.purchase_item_article) {
                                      return i.product_id === item.product_id 
                                        ? { ...i, sale_type: 'sale' } : i
                                    }
                                    
                                    return i
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
                                    // Match by unique key first (most accurate)
                                    if (item.purchase_item_unique_key && i.purchase_item_unique_key) {
                                      return i.purchase_item_unique_key === item.purchase_item_unique_key 
                                        ? { ...i, sale_type: 'return' } : i
                                    }
                                    
                                    // Fallback: Match by product_id AND purchase_item_id
                                    if (item.purchase_item_id && i.purchase_item_id && 
                                        item.purchase_id && i.purchase_id) {
                                      return (i.product_id === item.product_id &&
                                              i.purchase_item_id === item.purchase_item_id &&
                                              i.purchase_id === item.purchase_id)
                                        ? { ...i, sale_type: 'return' } : i
                                    }
                                    
                                    // Fallback: Match by product_id AND article
                                    if (item.purchase_item_article && i.purchase_item_article &&
                                        !item.purchase_item_id && !i.purchase_item_id) {
                                      return (i.product_id === item.product_id &&
                                              i.purchase_item_article.toLowerCase() === item.purchase_item_article.toLowerCase())
                                        ? { ...i, sale_type: 'return' } : i
                                    }
                                    
                                    // Fallback: Match by product_id only
                                    if (!item.purchase_item_id && !item.purchase_item_article &&
                                        !i.purchase_item_id && !i.purchase_item_article) {
                                      return i.product_id === item.product_id 
                                        ? { ...i, sale_type: 'return' } : i
                                    }
                                    
                                    return i
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
                                    // Match by unique key first (most accurate)
                                    if (item.purchase_item_unique_key && i.purchase_item_unique_key) {
                                      return i.purchase_item_unique_key === item.purchase_item_unique_key 
                                        ? { ...i, mrp: newMrp, discount, discount_percentage: discountPct } : i
                                    }
                                    
                                    // Fallback: Match by product_id AND purchase_item_id
                                    if (item.purchase_item_id && i.purchase_item_id && 
                                        item.purchase_id && i.purchase_id) {
                                      return (i.product_id === item.product_id &&
                                              i.purchase_item_id === item.purchase_item_id &&
                                              i.purchase_id === item.purchase_id)
                                        ? { ...i, mrp: newMrp, discount, discount_percentage: discountPct } : i
                                    }
                                    
                                    // Fallback: Match by product_id AND article
                                    if (item.purchase_item_article && i.purchase_item_article &&
                                        !item.purchase_item_id && !i.purchase_item_id) {
                                      return (i.product_id === item.product_id &&
                                              i.purchase_item_article.toLowerCase() === item.purchase_item_article.toLowerCase())
                                        ? { ...i, mrp: newMrp, discount, discount_percentage: discountPct } : i
                                    }
                                    
                                    // Fallback: Match by product_id only
                                    if (!item.purchase_item_id && !item.purchase_item_article &&
                                        !i.purchase_item_id && !i.purchase_item_article) {
                                      return i.product_id === item.product_id 
                                        ? { ...i, mrp: newMrp, discount, discount_percentage: discountPct } : i
                                    }
                                    
                                    return i
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
                                    // Match by unique key first (most accurate)
                                    if (item.purchase_item_unique_key && i.purchase_item_unique_key) {
                                      return i.purchase_item_unique_key === item.purchase_item_unique_key 
                                        ? { ...i, unit_price: newPrice, discount, discount_percentage: discountPct, total: newPrice * i.quantity } : i
                                    }
                                    
                                    // Fallback: Match by product_id AND purchase_item_id
                                    if (item.purchase_item_id && i.purchase_item_id && 
                                        item.purchase_id && i.purchase_id) {
                                      return (i.product_id === item.product_id &&
                                              i.purchase_item_id === item.purchase_item_id &&
                                              i.purchase_id === item.purchase_id)
                                        ? { ...i, unit_price: newPrice, discount, discount_percentage: discountPct, total: newPrice * i.quantity } : i
                                    }
                                    
                                    // Fallback: Match by product_id AND article
                                    if (item.purchase_item_article && i.purchase_item_article &&
                                        !item.purchase_item_id && !i.purchase_item_id) {
                                      return (i.product_id === item.product_id &&
                                              i.purchase_item_article.toLowerCase() === item.purchase_item_article.toLowerCase())
                                        ? { ...i, unit_price: newPrice, discount, discount_percentage: discountPct, total: newPrice * i.quantity } : i
                                    }
                                    
                                    // Fallback: Match by product_id only
                                    if (!item.purchase_item_id && !item.purchase_item_article &&
                                        !i.purchase_item_id && !i.purchase_item_article) {
                                      return i.product_id === item.product_id 
                                        ? { ...i, unit_price: newPrice, discount, discount_percentage: discountPct, total: newPrice * i.quantity } : i
                                    }
                                    
                                    return i
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
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded space-y-1">
                            {selected.email && <div>Email: {selected.email}</div>}
                            {selected.gstin && <div>GSTIN: {selected.gstin}</div>}
                            <div className={`font-semibold ${customerCreditBalance > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                              Available Credit: ₹{(customerCreditBalance || 0).toFixed(2)}
                            </div>
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
                            updated[index].method = e.target.value as 'cash' | 'card' | 'upi' | 'other' | 'credit'
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
                      <option value="credit">Credit</option>
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
                      // Exclude credit payments from calculation
                      const nonCreditPayments = paymentMethods.filter(p => p.method !== 'credit')
                      const currentTotal = nonCreditPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                      const remaining = Math.max(0, grandTotal - creditApplied - currentTotal)
                      
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
                        // Exclude credit payments and last payment method from calculation
                        const nonCreditPayments = paymentMethods.filter(p => p.method !== 'credit')
                        const otherPayments = nonCreditPayments.slice(0, -1)
                        const otherTotal = otherPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                        const remaining = Math.max(0, grandTotal - creditApplied - otherTotal)
                        const updated = [...paymentMethods]
                        // Find the last non-credit payment method
                        const lastNonCreditIndex = updated.map((p, i) => ({ p, i })).filter(({ p }) => p.method !== 'credit').pop()?.i
                        if (lastNonCreditIndex !== undefined) {
                          updated[lastNonCreditIndex] = { ...updated[lastNonCreditIndex], amount: remaining }
                          setPaymentMethods(updated)
                        }
                      }}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      Auto-fill Remaining Amount
                    </button>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Grand Total:</span>
                      <span className="text-lg font-bold text-gray-900">₹{getSubtotal().toFixed(2)}</span>
                    </div>
                    {customerId && customerCreditBalance > 0 && (
                      <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-green-700">Available Credit:</span>
                          <span className="text-sm font-bold text-green-600">₹{customerCreditBalance.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const grandTotal = getSubtotal()
                              const maxCredit = Math.min(customerCreditBalance, grandTotal)
                              setCreditApplied(maxCredit)
                            }}
                            className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
                          >
                            Apply Full Credit
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreditApplied(0)}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="mt-2">
                          <label className="block text-xs text-green-700 mb-1">Apply Credit Amount:</label>
                          <input
                            type="number"
                            value={creditApplied}
                            onChange={(e) => {
                              const value = Math.max(0, Math.min(parseFloat(e.target.value) || 0, Math.min(customerCreditBalance, getSubtotal())))
                              setCreditApplied(value)
                            }}
                            className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                            min="0"
                            max={Math.min(customerCreditBalance, getSubtotal())}
                            step="0.01"
                            placeholder="0.00"
                          />
                        </div>
                        {creditApplied > 0 && (
                          <div className="mt-2 flex justify-between items-center text-xs">
                            <span className="text-green-700">Credit Applied:</span>
                            <span className="font-bold text-green-600">₹{creditApplied.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {(() => {
                      // Separate credit payments from actual payments
                      const nonCreditPayments = paymentMethods.filter(p => p.method !== 'credit')
                      const creditPayments = paymentMethods.filter(p => p.method === 'credit')
                      const actualPaymentTotal = nonCreditPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                      const creditPaymentTotal = creditPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                      
                      return (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-700">Total Paid:</span>
                            <span className="text-lg font-bold text-blue-600">
                              ₹{actualPaymentTotal.toFixed(2)}
                            </span>
                          </div>
                          {creditPaymentTotal > 0 && (
                            <div className="flex justify-between items-center mb-2 bg-green-50 p-2 rounded">
                              <span className="text-sm font-semibold text-green-700">Credit Allocated:</span>
                              <span className="text-sm font-bold text-green-600">+₹{creditPaymentTotal.toFixed(2)}</span>
                            </div>
                          )}
                          {creditApplied > 0 && (
                            <div className="flex justify-between items-center mb-2 bg-green-50 p-2 rounded">
                              <span className="text-sm font-semibold text-green-700">Credit Applied:</span>
                              <span className="text-sm font-bold text-green-600">-₹{creditApplied.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-700">Amount Due:</span>
                            <span className="text-lg font-bold text-gray-900">
                              ₹{Math.max(0, getSubtotal() - creditApplied - actualPaymentTotal).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )
                    })()}
                    {(() => {
                      // Separate credit payments from actual payments
                      const nonCreditPayments = paymentMethods.filter(p => p.method !== 'credit')
                      const paymentTotal = nonCreditPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                      const totalWithCredit = getSubtotal() - creditApplied
                      const returnAmount = Math.max(0, paymentTotal - totalWithCredit)
                      
                      if (returnAmount > 0) {
                        return (
                          <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-200">
                            <span className="text-sm font-semibold text-green-700">Return to Customer:</span>
                            <span className="text-lg font-bold text-green-600">₹{returnAmount.toFixed(2)}</span>
                          </div>
                        )
                      } else if (paymentTotal < totalWithCredit - 0.01) {
                        return (
                          <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-200">
                            <span className="text-sm font-semibold text-red-700">Balance Due:</span>
                            <span className="text-lg font-bold text-red-600">₹{(totalWithCredit - paymentTotal).toFixed(2)}</span>
                          </div>
                        )
                      }
                      return null
                    })()}
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
                  disabled={(() => {
                    if (saleItems.length === 0) return true
                    const paymentTotal = paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0)
                    const grandTotal = getSubtotal()
                    const totalWithCredit = grandTotal - creditApplied
                    // Allow overpayment (for return), but require minimum payment equal to grand total (after credit)
                    return paymentTotal < totalWithCredit - 0.01
                  })()}
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


