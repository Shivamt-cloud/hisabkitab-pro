import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import { purchaseService, supplierService } from '../services/purchaseService'
import { productService } from '../services/productService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { GSTPurchase, PurchaseItem, Supplier } from '../types/purchase'
import { Product } from '../services/productService'
import { ArrowLeft, Save, Plus, Trash2, Calculator, Package, Home, RefreshCw, Barcode } from 'lucide-react'
import { calculateTax, GST_RATES } from '../utils/taxCalculator'
import { generateBarcode, BarcodeFormat, validateBarcode, BARCODE_FORMAT_INFO } from '../utils/barcodeGenerator'

const GSTPurchaseForm = () => {
  const { hasPermission, user, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<number | ''>('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'partial'>('pending')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoGenerateBarcode, setAutoGenerateBarcode] = useState(false)
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('EAN13')

  useEffect(() => {
    loadData()
    if (isEditing && id) {
      loadPurchaseData(parseInt(id))
    } else if (!isEditing && items.length === 0) {
      // Auto-add first empty row for new purchases
      addItem()
    }
  }, [id, isEditing])

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

  const loadPurchaseData = async (purchaseId: number) => {
    try {
      const purchase = await purchaseService.getById(purchaseId)
      if (purchase && purchase.type === 'gst') {
        const gstPurchase = purchase as GSTPurchase
        setSelectedSupplier(gstPurchase.supplier_id)
        setInvoiceNumber(gstPurchase.invoice_number)
        setPurchaseDate(gstPurchase.purchase_date)
        setItems(gstPurchase.items.map(item => ({
          ...item,
          mrp: item.mrp || 0,
          sale_price: item.sale_price || 0,
          margin_percentage: item.margin_percentage || 0,
          margin_amount: item.margin_amount || 0,
          min_stock_level: item.min_stock_level,
          sold_quantity: item.sold_quantity || 0, // Ensure sold_quantity is initialized
        })))
        setPaymentStatus(gstPurchase.payment_status)
        setPaymentMethod(gstPurchase.payment_method || '')
        setNotes(gstPurchase.notes || '')
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
        article: '',
        barcode: '',
        quantity: 1,
        unit_price: 0,
        mrp: 0,
        sale_price: 0,
        margin_percentage: 0,
        margin_amount: 0,
        min_stock_level: undefined,
        gst_rate: 18,
        tax_amount: 0,
        total: 0,
      }])
    }
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

  // Auto-generate barcode when product is selected and auto-generate is enabled
  // This is handled in updateItem when product_id changes

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
        item.hsn_code = product.hsn_code
        item.gst_rate = product.gst_rate || 18
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
            gst_rate: 18,
            tax_amount: 0,
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
    if (field === 'quantity' || field === 'unit_price' || field === 'gst_rate') {
      const quantity = field === 'quantity' ? value : item.quantity
      const unitPrice = field === 'unit_price' ? value : item.unit_price
      const gstRate = field === 'gst_rate' ? value : item.gst_rate

      const subtotal = quantity * unitPrice
      const tax = (subtotal * gstRate) / 100
      item.tax_amount = tax
      item.total = subtotal + tax
    }

    newItems[index] = item
    setItems(newItems)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const totalTax = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
    const grandTotal = subtotal + totalTax

    // Calculate CGST/SGST (assuming intrastate - split GST)
    const cgstAmount = totalTax / 2
    const sgstAmount = totalTax / 2

    return { subtotal, totalTax, cgstAmount, sgstAmount, grandTotal }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedSupplier) {
      newErrors.supplier = 'Please select a supplier'
    }

    if (!invoiceNumber.trim()) {
      newErrors.invoice = 'Invoice number is required'
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

    if (!hasPermission('purchases:create')) {
      alert('You do not have permission to create purchases')
      return
    }

    if (!validate()) {
      return
    }

    setLoading(true)

    try {
      const supplier = suppliers.find(s => s.id === selectedSupplier)
      const totals = calculateTotals()

      if (isEditing && id) {
        // Update existing purchase
        const itemsWithBarcodes = ensureBarcodesGenerated(items.filter(item => item.product_id > 0))
        await purchaseService.update(parseInt(id), {
          purchase_date: purchaseDate,
          supplier_id: selectedSupplier as number,
          supplier_name: supplier?.name,
          supplier_gstin: supplier?.gstin,
          invoice_number: invoiceNumber,
          items: itemsWithBarcodes.map(item => ({
            ...item,
            product_name: products.find(p => p.id === item.product_id)?.name,
          })),
          subtotal: totals.subtotal,
          total_tax: totals.totalTax,
          cgst_amount: totals.cgstAmount,
          sgst_amount: totals.sgstAmount,
          grand_total: totals.grandTotal,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          notes,
        })
        alert('Purchase updated successfully!')
      } else {
        // Create new purchase
        const itemsWithBarcodes = ensureBarcodesGenerated(items.filter(item => item.product_id > 0))
        await purchaseService.createGST({
          type: 'gst',
          purchase_date: purchaseDate,
          supplier_id: selectedSupplier as number,
          supplier_name: supplier?.name,
          supplier_gstin: supplier?.gstin,
          invoice_number: invoiceNumber,
          items: itemsWithBarcodes.map(item => ({
            ...item,
            product_name: products.find(p => p.id === item.product_id)?.name,
          })),
          subtotal: totals.subtotal,
          total_tax: totals.totalTax,
          cgst_amount: totals.cgstAmount,
          sgst_amount: totals.sgstAmount,
          grand_total: totals.grandTotal,
          company_id: getCurrentCompanyId() ?? undefined,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          notes,
          created_by: parseInt(user?.id || '1'),
        })
        alert('Purchase created successfully!')
      }

      navigate('/purchases/history')
    } catch (error) {
      console.error('Error saving purchase:', error)
      alert('Failed to save purchase. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

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
                    {isEditing ? 'Edit GST Purchase' : 'GST Purchase'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEditing ? 'Update purchase with GST details' : 'Create a purchase with GST details'}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value ? parseInt(e.target.value) : '')}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white ${
                      errors.supplier ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.length === 0 ? (
                      <option value="" disabled>No suppliers available. Please add suppliers first.</option>
                    ) : (
                      <>
                        {suppliers.filter(s => s.is_registered || s.gstin).map(supplier => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} {supplier.gstin && `(${supplier.gstin})`}
                          </option>
                        ))}
                        {suppliers.filter(s => s.is_registered || s.gstin).length === 0 && (
                          <option value="" disabled>No GST registered suppliers found. Showing all suppliers...</option>
                        )}
                        {suppliers.filter(s => !s.is_registered && !s.gstin).map(supplier => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} (Not GST Registered)
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {errors.supplier && <p className="mt-1 text-sm text-red-600">{errors.supplier}</p>}
                  {suppliers.length > 0 && suppliers.filter(s => s.is_registered || s.gstin).length === 0 && (
                    <p className="mt-1 text-sm text-yellow-600">
                      ⚠️ No GST registered suppliers found. For GST purchases, suppliers should have a GSTIN.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.invoice ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter invoice number"
                  />
                  {errors.invoice && <p className="mt-1 text-sm text-red-600">{errors.invoice}</p>}
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
                    placeholder="e.g., Cash, Bank Transfer"
                  />
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="mb-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-6 h-6" />
                  Products
                </h2>
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

              {/* Simplified Table Format for Bulk Entry */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[200px]">Product</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[140px]">Article</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[170px]">Barcode</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[100px]">Qty</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[120px]">Remaining Qty</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[160px]">Purchase Price</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[160px]">MRP</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[160px]">Sale Price</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[120px]">GST%</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[140px]">Margin</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[120px]">Min Stock</th>
                      <th className="px-6 py-5 text-left text-xs font-semibold text-gray-700 uppercase min-w-[160px]">Total</th>
                      <th className="px-6 py-5 text-center text-xs font-semibold text-gray-700 uppercase min-w-[80px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-blue-50/50 transition-colors">
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
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={item.barcode || ''}
                              onChange={(e) => updateItem(index, 'barcode', e.target.value)}
                              className="flex-1 px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="Scan/Enter"
                              readOnly={autoGenerateBarcode && item.product_id > 0}
                            />
                            {!autoGenerateBarcode && item.product_id > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const barcode = generateBarcodeForItem(item, index)
                                  updateItem(index, 'barcode', barcode)
                                }}
                                className="px-1.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
                                title="Generate barcode"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
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
                          <select
                            value={item.gst_rate || 18}
                            onChange={(e) => updateItem(index, 'gst_rate', parseFloat(e.target.value))}
                            className="w-full min-w-[140px] px-5 py-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            {GST_RATES.map((rate) => (
                              <option key={rate.value} value={rate.value}>{rate.value}%</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm">
                            <div className="font-semibold text-green-700">{item.margin_percentage?.toFixed(1) || '0.0'}%</div>
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
                          {item.hsn_code && <div className="text-sm text-gray-500">HSN: {item.hsn_code}</div>}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            {items.length > 0 && (
              <div className="mb-8 pt-8 border-t border-gray-200">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-bold text-gray-900 mb-4">Purchase Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Subtotal</p>
                      <p className="font-bold text-gray-900 text-lg">₹{totals.subtotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">CGST</p>
                      <p className="font-bold text-gray-900 text-lg">₹{totals.cgstAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">SGST</p>
                      <p className="font-bold text-gray-900 text-lg">₹{totals.sgstAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Tax</p>
                      <p className="font-bold text-gray-900 text-lg">₹{totals.totalTax.toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-gray-600">Grand Total</p>
                      <p className="font-bold text-blue-600 text-xl">₹{totals.grandTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
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
                onClick={handleGenerateAllBarcodes}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Barcode className="w-5 h-5" />
                Generate Barcode
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      </div>
    </ProtectedRoute>
  )
}

export default GSTPurchaseForm

