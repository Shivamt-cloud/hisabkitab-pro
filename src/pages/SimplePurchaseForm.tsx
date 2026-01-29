import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import { purchaseService, supplierService } from '../services/purchaseService'
import { productService } from '../services/productService'
import { companyService } from '../services/companyService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { SimplePurchase, PurchaseItem, Supplier } from '../types/purchase'
import { Product } from '../services/productService'
import { ArrowLeft, Save, Plus, Trash2, Package, Home, Calculator, RefreshCw, Barcode, Printer } from 'lucide-react'
import { generateBarcode, BarcodeFormat, BARCODE_FORMAT_INFO } from '../utils/barcodeGenerator'
import SupplierModal from '../components/SupplierModal'
import ProductModal from '../components/ProductModal'
import BarcodePrintModal from '../components/BarcodePrintModal'

const SimplePurchaseForm = () => {
  const { hasPermission, user, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [supplierName, setSupplierName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'partial'>('pending')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [returnRemarks, setReturnRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoGenerateBarcode, setAutoGenerateBarcode] = useState(false)
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('EAN13')
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [barcodePrintModalOpen, setBarcodePrintModalOpen] = useState(false)
  const [savedPurchaseItems, setSavedPurchaseItems] = useState<PurchaseItem[]>([])
  const [companyName, setCompanyName] = useState<string>('')

  useEffect(() => {
    loadData()
    loadCompanyName()
    if (isEditing && id) {
      loadPurchaseData(parseInt(id))
    }
  }, [id, isEditing])

  const loadCompanyName = async () => {
    try {
      const companyId = getCurrentCompanyId()
      if (companyId) {
        const company = await companyService.getById(companyId)
        if (company) {
          setCompanyName(company.name)
        }
      }
    } catch (error) {
      console.error('Error loading company name:', error)
    }
  }

  const loadData = async () => {
    try {
      const companyId = getCurrentCompanyId()
      const [suppliersData, productsData] = await Promise.all([
        supplierService.getAll(companyId),
        productService.getAll(true, companyId)
      ])
      console.log('Loaded suppliers:', suppliersData.length, suppliersData)
      console.log('Loaded products:', productsData.length, productsData)
      setSuppliers(suppliersData)
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading data:', error)
      // Fallback: try loading all data without company filter
      try {
        const [allSuppliers, allProducts] = await Promise.all([
          supplierService.getAll(undefined),
          productService.getAll(true, undefined)
        ])
        console.log('Fallback - loaded all suppliers:', allSuppliers.length)
        console.log('Fallback - loaded all products:', allProducts.length)
        setSuppliers(allSuppliers)
        setProducts(allProducts)
      } catch (fallbackError) {
        console.error('Error loading data (fallback):', fallbackError)
      }
    }
  }

  const handleSupplierAdded = async (newSupplier: Supplier) => {
    // Reload suppliers to get the updated list
    await loadData()
    // Select the newly added supplier
    setSupplierId(newSupplier.id)
    setSupplierName(newSupplier.name)
  }

  const handleProductAdded = async (newProduct: Product) => {
    // Reload products to get the updated list
    await loadData()
    // If there's an empty item row, select the new product in it
    const emptyItemIndex = items.findIndex(item => item.product_id === 0)
    if (emptyItemIndex >= 0) {
      updateItem(emptyItemIndex, 'product_id', newProduct.id)
    }
  }

  const loadPurchaseData = async (purchaseId: number) => {
    try {
      const purchase = await purchaseService.getById(purchaseId)
      if (purchase && purchase.type === 'simple') {
        const simplePurchase = purchase as SimplePurchase
        // Load suppliers first to find supplier name
        const companyId = getCurrentCompanyId()
        const allSuppliers = await supplierService.getAll(companyId)
        if (simplePurchase.supplier_id) {
          setSupplierId(simplePurchase.supplier_id)
          const supplier = allSuppliers.find(s => s.id === simplePurchase.supplier_id)
          if (supplier) {
            setSupplierName(supplier.name)
          } else {
            setSupplierName(simplePurchase.supplier_name || '')
          }
        } else {
          setSupplierName(simplePurchase.supplier_name || '')
        }
        setInvoiceNumber(simplePurchase.invoice_number || '')
        setPurchaseDate(simplePurchase.purchase_date)
        setItems(simplePurchase.items.map(item => ({
          ...item,
          purchase_type: item.purchase_type || 'purchase',
          barcode: item.barcode || '',
          mrp: item.mrp || 0,
          sale_price: item.sale_price || 0,
          margin_percentage: item.margin_percentage || 0,
          margin_amount: item.margin_amount || 0,
          min_stock_level: item.min_stock_level,
          sold_quantity: item.sold_quantity || 0, // Ensure sold_quantity is initialized
          color: item.color || '',
          size: item.size || '',
        })))
        setPaymentStatus(simplePurchase.payment_status)
        setPaymentMethod(simplePurchase.payment_method || '')
        setNotes(simplePurchase.notes || '')
        setReturnRemarks(simplePurchase.return_remarks || '')
      }
    } catch (error) {
      console.error('Error loading purchase data:', error)
    }
  }

  const addItem = () => {
    // Only add if last item is empty or all items have products
    if (items.length === 0 || items[items.length - 1].product_id > 0) {
      setItems([...items, {
        product_id: 0,
        purchase_type: 'purchase',
        article: '',
        barcode: '',
        quantity: 1,
        unit_price: 0,
        mrp: 0,
        sale_price: 0,
        margin_percentage: 0,
        margin_amount: 0,
        min_stock_level: undefined,
        color: '',
        size: '',
        total: 0,
      }])
    }
  }

  const generateBarcodeForItem = (item: PurchaseItem, index: number): string => {
    // Use the cached products state instead of fetching
    const existingProducts = products
    const existingBarcodes = existingProducts.map(p => p.barcode).filter(Boolean) as string[]
    const existingItemBarcodes = items.filter((_, idx) => idx !== index).map(i => i.barcode).filter(Boolean) as string[]
    const allExistingBarcodes = [...existingBarcodes, ...existingItemBarcodes]
    
    const product = products.find(p => p.id === item.product_id)
    if (!product) return ''

    // Set appropriate prefix based on format
    let prefix = '890' // Default for EAN-13 (India country code)
    if (barcodeFormat === 'CODE128' || barcodeFormat === 'CODE39') {
      prefix = 'PROD'
    } else if (barcodeFormat === 'UPC_A') {
      prefix = '0'
    } else if (barcodeFormat === 'CUSTOM') {
      prefix = '100'
    }

    let newBarcode = ''
    let attempts = 0
    const maxAttempts = 10

    do {
      newBarcode = generateBarcode({
        format: barcodeFormat,
        sku: product.sku || product.id.toString(),
        categoryId: product.category_id,
        categoryName: product.category_name,
        prefix: prefix,
      })
      attempts++
    } while (allExistingBarcodes.includes(newBarcode) && attempts < maxAttempts)

    return newBarcode
  }

  const handleGenerateAllBarcodes = () => {
    const newItems = items.map((item, index) => {
      if (item.product_id > 0 && !item.barcode) {
        const barcode = generateBarcodeForItem(item, index)
        return { ...item, barcode }
      }
      return item
    })
    setItems(newItems)
  }

  // Auto-generate missing barcodes before save
  const ensureBarcodesGenerated = (itemsToCheck: PurchaseItem[]): PurchaseItem[] => {
    return itemsToCheck.map((item, index) => {
      if (item.product_id > 0 && !item.barcode) {
        const barcode = generateBarcodeForItem(item, index)
        return { ...item, barcode }
      }
      return item
    })
  }

  // Calculate margin based on purchase price and sale price
  const calculateMargin = (purchasePrice: number, salePrice: number) => {
    if (purchasePrice <= 0) return { percentage: 0, amount: 0 }
    const marginAmount = salePrice - purchasePrice
    const marginPercentage = (marginAmount / purchasePrice) * 100
    return {
      percentage: Math.round(marginPercentage * 100) / 100, // Round to 2 decimal places
      amount: Math.round(marginAmount * 100) / 100
    }
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items]
    const item = { ...newItems[index], [field]: value }

    // If product changed, load product details
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value)
      if (product) {
        item.unit_price = product.purchase_price || 0 // Optional field, default to 0
        item.mrp = product.selling_price || 0 // Optional field, default to 0
        item.sale_price = product.selling_price || 0 // Optional field, default to 0
        item.min_stock_level = product.min_stock_level // Load existing min stock level from product
        // Auto-generate barcode if enabled and product doesn't already have one
        if (autoGenerateBarcode && !item.barcode) {
          item.barcode = generateBarcodeForItem(item, index)
        }
        // Calculate initial margin
        const margin = calculateMargin(item.unit_price, item.sale_price)
        item.margin_percentage = margin.percentage
        item.margin_amount = margin.amount
        
        // Auto-add new row if this is the last item and product is selected
        if (index === newItems.length - 1 && !newItems.some((itm, idx) => idx !== index && itm.product_id === 0)) {
          newItems.push({
            product_id: 0,
            article: '',
            barcode: '',
            quantity: 1,
            unit_price: 0,
            mrp: 0,
            sale_price: 0,
            margin_percentage: 0,
            margin_amount: 0,
            min_stock_level: undefined,
            color: '',
            size: '',
            total: 0,
          })
        }
      }
    }

    // Calculate margin when purchase price, MRP, or sale price changes
    if (field === 'unit_price' || field === 'mrp' || field === 'sale_price') {
      const purchasePrice = field === 'unit_price' ? value : item.unit_price
      const salePrice = field === 'sale_price' ? value : (field === 'mrp' ? value : item.sale_price)
      
      // If MRP is changed but sale_price is not set, update sale_price to MRP
      if (field === 'mrp' && (!item.sale_price || item.sale_price === 0)) {
        item.sale_price = value
      }
      
      const margin = calculateMargin(purchasePrice, salePrice || 0)
      item.margin_percentage = margin.percentage
      item.margin_amount = margin.amount
    }

    // Calculate total
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? value : item.quantity
      const unitPrice = field === 'unit_price' ? value : item.unit_price
      item.total = quantity * unitPrice
    }

    newItems[index] = item
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!supplierId && !supplierName.trim()) {
      newErrors.supplier = 'Please select a supplier or enter supplier name'
    }

    if (items.length === 0) {
      newErrors.items = 'Please add at least one product'
    }

    items.forEach((item, index) => {
      if (!item.product_id) {
        newErrors[`item_${index}_product`] = 'Please select a product'
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
      }
      if (item.unit_price <= 0) {
        newErrors[`item_${index}_price`] = 'Price must be greater than 0'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!hasPermission(isEditing ? 'purchases:update' : 'purchases:create')) {
      alert(`You do not have permission to ${isEditing ? 'update' : 'create'} purchases`)
      return
    }

    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      const supplier = supplierId ? suppliers.find(s => s.id === supplierId) : null

      if (isEditing && id) {
        // Update existing purchase
        const itemsWithBarcodes = ensureBarcodesGenerated(items.filter(item => item.product_id > 0))
        await purchaseService.update(parseInt(id), {
          purchase_date: purchaseDate,
          supplier_id: supplierId ? supplierId as number : undefined,
          supplier_name: supplierId ? undefined : supplierName.trim() || undefined,
          invoice_number: invoiceNumber.trim() || undefined,
          items: itemsWithBarcodes.map(item => ({
            ...item,
            product_name: products.find(p => p.id === item.product_id)?.name,
          })),
          total_amount: calculateTotal(),
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          notes,
          return_remarks: items.some(item => item.purchase_type === 'return') ? returnRemarks.trim() || undefined : undefined,
        } as Partial<SimplePurchase>)
        
        alert('Purchase updated successfully!')
        navigate('/purchases/history')
      } else {
        const itemsWithBarcodes = ensureBarcodesGenerated(items.filter(item => item.product_id > 0))
        const finalItems = itemsWithBarcodes.map(item => ({
          ...item,
          product_name: products.find(p => p.id === item.product_id)?.name,
        }))
        
        await purchaseService.createSimple({
          type: 'simple',
          purchase_date: purchaseDate,
          supplier_id: supplierId ? supplierId as number : undefined,
          supplier_name: supplier?.name || supplierName,
          invoice_number: invoiceNumber || undefined,
          items: finalItems,
          total_amount: calculateTotal(),
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          notes,
          return_remarks: items.some(item => item.purchase_type === 'return') ? returnRemarks.trim() || undefined : undefined,
          company_id: getCurrentCompanyId() ?? undefined,
          created_by: parseInt(user?.id || '1'),
        })
        
        alert('Purchase created successfully!')
        // Optionally show print modal after save
        const itemsWithNames = finalItems.map(item => ({
          ...item,
          product_name: item.product_name || products.find(p => p.id === item.product_id)?.name,
        }))
        setSavedPurchaseItems(itemsWithNames)
        setBarcodePrintModalOpen(true)
      }
    } catch (error) {
      console.error('Error creating purchase:', error)
      alert('Failed to create purchase. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = calculateTotal()

  return (
    <ProtectedRoute requiredPermission="purchases:create">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/purchases/history')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Purchase History"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Dashboard"
                >
                  <Home className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? 'Edit Simple Purchase' : 'Simple Purchase'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update purchase without GST details' : 'Create a purchase without GST details'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50">
            {/* Supplier & Invoice Details */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Supplier & Invoice Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => {
                      setSupplierId(e.target.value ? parseInt(e.target.value) : '')
                      if (e.target.value) {
                        const supplier = suppliers.find(s => s.id === parseInt(e.target.value))
                        setSupplierName(supplier?.name || '')
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white mb-2"
                  >
                    <option value="">Select Supplier (or enter name below)</option>
                    {suppliers.length === 0 ? (
                      <option value="" disabled>No suppliers available. Please add suppliers first.</option>
                    ) : (
                      suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSupplierModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors mb-2 w-full justify-center"
                    title="Add New Supplier"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Supplier</span>
                  </button>
                  {suppliers.length === 0 && (
                    <p className="mt-1 text-sm text-yellow-600">
                      No suppliers found. <button type="button" onClick={() => navigate('/suppliers/new')} className="text-blue-600 hover:underline">Add a supplier</button>
                    </p>
                  )}
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => {
                      setSupplierName(e.target.value)
                      setSupplierId('')
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.supplier ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Or enter supplier name"
                  />
                  {errors.supplier && <p className="mt-1 text-sm text-red-600">{errors.supplier}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Number (Optional)</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter invoice number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g., Cash"
                  />
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="mb-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Calculator className="w-6 h-6" />
                    Products
                  </h2>
                  <button
                    type="button"
                    onClick={() => setProductModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Add New Product"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Product</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{items.filter(i => i.product_id > 0).length} items</span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Row
                  </button>
                </div>
              </div>

              {errors.items && <p className="text-sm text-red-600 mb-4">{errors.items}</p>}

              {/* Barcode Generation Options */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto_generate_barcode"
                      checked={autoGenerateBarcode}
                      onChange={(e) => setAutoGenerateBarcode(e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="auto_generate_barcode" className="text-sm font-semibold text-gray-700">
                      Auto-generate barcode when product is selected
                    </label>
                  </div>
                  {autoGenerateBarcode && (
                    <select
                      value={barcodeFormat}
                      onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="EAN13">EAN-13</option>
                      <option value="CODE128">Code 128</option>
                      <option value="UPC_A">UPC-A</option>
                      <option value="CODE39">Code 39</option>
                      <option value="CUSTOM">Custom Numeric</option>
                    </select>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2">Note: Barcodes will be auto-generated on save if not manually entered or scanned.</p>
              </div>

              {/* Simplified Table Format for Bulk Entry */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[200px]">Product</th>
                      <th className="px-6 py-5 text-center text-xs font-semibold text-gray-700 uppercase min-w-[120px]">Type</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[140px]">Article</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[170px]">Barcode</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[100px]">Color</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[100px]">Size</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[100px]">Qty</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[120px]">Remaining Qty</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[160px]">Purchase Price</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[160px]">MRP</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[160px]">Sale Price</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[140px]">Margin</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[120px]">Min Stock</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[160px]">Total</th>
                      <th className="px-6 py-5 text-center text-xs font-semibold text-gray-700 uppercase min-w-[80px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, index) => {
                      const isReturn = item.purchase_type === 'return'
                      return (
                      <tr key={index} className={`transition-colors ${isReturn ? 'bg-red-50/50 hover:bg-red-100/50 border-l-4 border-red-400' : 'hover:bg-blue-50/50'}`}>
                        <td className="px-6 py-5">
                          <select
                            value={item.product_id || ''}
                            onChange={(e) => updateItem(index, 'product_id', parseInt(e.target.value) || 0)}
                            className={`w-full min-w-[180px] px-5 py-4 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                              errors[`item_${index}_product`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select...</option>
                            {products.length === 0 ? (
                              <option value="" disabled>No products available. Please add products first.</option>
                            ) : (
                              products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name} {product.barcode && `[${product.barcode}]`}
                                </option>
                              ))
                            )}
                          </select>
                          {products.length === 0 && (
                            <p className="text-xs text-yellow-600 mt-1">
                              No products found. <button type="button" onClick={() => navigate('/products/new')} className="text-blue-600 hover:underline">Add a product</button>
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2 items-center">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => updateItem(index, 'purchase_type', 'purchase')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                                  !isReturn
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                                title="Purchase"
                              >
                                Purchase
                              </button>
                              <button
                                type="button"
                                onClick={() => updateItem(index, 'purchase_type', 'return')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                                  isReturn
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                                title="Return to Supplier"
                              >
                                Return
                              </button>
                            </div>
                            {isReturn && (
                              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                RETURN
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="text"
                            value={item.article || ''}
                            onChange={(e) => updateItem(index, 'article', e.target.value)}
                            className="w-full min-w-[140px] px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Article code"
                            title="Supplier's article number/code (optional)"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="text"
                            value={item.barcode || ''}
                            onChange={(e) => updateItem(index, 'barcode', e.target.value)}
                            className="w-full min-w-[140px] px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Scan or enter barcode"
                            readOnly={autoGenerateBarcode && item.product_id > 0}
                            title="Scan barcode with scanner or type manually"
                          />
                          {!autoGenerateBarcode && item.product_id > 0 && !item.barcode && (
                            <button
                              type="button"
                              onClick={() => {
                                const barcode = generateBarcodeForItem(item, index)
                                updateItem(index, 'barcode', barcode)
                              }}
                              className="mt-1 w-full px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
                              title="Generate barcode"
                            >
                              Generate
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="text"
                            value={item.color || ''}
                            onChange={(e) => updateItem(index, 'color', e.target.value)}
                            className="w-full min-w-[100px] px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Color (optional)"
                            title="Product color variant (e.g., Red, Blue, Black)"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="text"
                            value={item.size || ''}
                            onChange={(e) => updateItem(index, 'size', e.target.value)}
                            className="w-full min-w-[100px] px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Size (optional)"
                            title="Product size variant (e.g., S, M, L, XL, 38, 40)"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className={`w-full min-w-[100px] px-5 py-4 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                              errors[`item_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="w-full min-w-[120px] px-5 py-4 text-base font-semibold text-red-600">
                            {item.quantity - (item.sold_quantity || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className={`w-full min-w-[140px] px-5 py-4 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                              errors[`item_${index}_price`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.mrp || 0}
                            onChange={(e) => updateItem(index, 'mrp', parseFloat(e.target.value) || 0)}
                            className="w-full min-w-[140px] px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.sale_price || 0}
                            onChange={(e) => updateItem(index, 'sale_price', parseFloat(e.target.value) || 0)}
                            className="w-full min-w-[140px] px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm">
                            <div className="font-semibold text-base text-green-700">{item.margin_percentage?.toFixed(1) || '0.0'}%</div>
                            <div className="text-gray-600">₹{item.margin_amount?.toFixed(2) || '0.00'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            min="0"
                            value={item.min_stock_level || ''}
                            onChange={(e) => updateItem(index, 'min_stock_level', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full min-w-[140px] px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Min"
                            title="Minimum stock level for alerts"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-base text-gray-900">₹{item.total.toFixed(2)}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            {items.length > 0 && (
              <div className="mb-8 pt-8 border-t border-gray-200">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-semibold text-gray-900">Total Amount</p>
                    <p className="font-bold text-green-600 text-2xl">₹{totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Return Remarks - Only show if there are return items */}
            {items.some(item => item.purchase_type === 'return') && (
              <div className="mb-8 p-4 bg-red-50 rounded-xl border border-red-200">
                <label className="block text-sm font-semibold text-red-700 mb-2">
                  Return Remarks <span className="text-xs text-red-600 font-normal">(Required for returns)</span>
                </label>
                <textarea
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="Enter details about why items are being returned to supplier (e.g., defective items, wrong items received, quality issues)..."
                  required={items.some(item => item.purchase_type === 'return')}
                />
                <p className="text-xs text-red-600 mt-2">
                  Please provide details about the items being returned to the supplier.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="Additional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/purchases/history')}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const itemsWithNames = items.map(item => ({
                    ...item,
                    product_name: item.product_name || products.find(p => p.id === item.product_id)?.name,
                  }))
                  setSavedPurchaseItems(itemsWithNames)
                  setBarcodePrintModalOpen(true)
                }}
                disabled={items.length === 0}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={items.length === 0 ? 'Add items to print barcodes' : 'Print barcode labels'}
              >
                <Printer className="w-5 h-5" />
                Print Barcodes
              </button>
              <button
                type="button"
                onClick={handleGenerateAllBarcodes}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Barcode className="w-5 h-5" />
                Generate Barcode
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isEditing ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {isEditing ? 'Update Purchase' : 'Save Purchase'}
                  </>
                )}
              </button>
            </div>
          </form>
        </main>

        {/* Supplier Modal */}
        <SupplierModal
          isOpen={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          onSupplierAdded={handleSupplierAdded}
        />

        {/* Product Modal */}
        <ProductModal
          isOpen={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          onProductAdded={handleProductAdded}
        />
        
        {/* Barcode Print Modal */}
        <BarcodePrintModal
          isOpen={barcodePrintModalOpen}
          onClose={() => {
            setBarcodePrintModalOpen(false)
            navigate('/purchases/history')
          }}
          items={savedPurchaseItems}
          purchaseDate={purchaseDate}
          companyName={companyName}
        />
      </div>
    </ProtectedRoute>
  )
}

export default SimplePurchaseForm

