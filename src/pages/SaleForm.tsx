import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { productService, Product } from '../services/productService'
import { saleService } from '../services/saleService'
import { salesPersonService } from '../services/salespersonService'
import { customerService } from '../services/customerService'
import { SalesPerson } from '../types/salesperson'
import { Customer } from '../types/customer'
import { X, Plus, Trash2, Search, ShoppingCart, Home, User } from 'lucide-react'
import { SaleItem } from '../types/sale'

const SaleForm = () => {
  const navigate = useNavigate()
  const { hasPermission, user, getCurrentCompanyId } = useAuth()
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [salesPersonId, setSalesPersonId] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'other'>('cash')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const companyId = getCurrentCompanyId()
        // Load only active products (exclude sold/archived)
        const allProducts = await productService.getAll(false, companyId || undefined)
        const products = allProducts.filter(p => p.status === 'active' && p.stock_quantity > 0)
        setAvailableProducts(products)
        
        // Load active sales persons
        const activeSalesPersons = await salesPersonService.getAll(false)
        setSalesPersons(activeSalesPersons)
        
        // Load active customers
        const activeCustomers = await customerService.getAll(false, companyId || undefined)
        setCustomers(activeCustomers)
        
        // Set default "Walk-in Customer" if available
        const walkInCustomer = activeCustomers.find(c => c.name.toLowerCase().includes('walk-in'))
        if (walkInCustomer) {
          setCustomerId(walkInCustomer.id)
        }
      } catch (error) {
        console.error('Error loading sale form data:', error)
      }
    }
    loadData()
  }, [])

  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addProductToSale = (product: Product) => {
    const existingItem = saleItems.find(item => item.product_id === product.id)
    
    if (existingItem) {
      // Increase quantity if product already in cart
      if (existingItem.quantity < product.stock_quantity) {
        updateItemQuantity(existingItem.product_id, existingItem.quantity + 1)
      } else {
        alert(`Only ${product.stock_quantity} units available in stock`)
      }
    } else {
      // Add new item
      if (product.stock_quantity > 0) {
        // Use selling_price as both MRP and unit_price initially (no discount by default)
        // If selling_price not set, default to 0 (user will need to set it)
        const mrp = product.selling_price || 0
        const unitPrice = product.selling_price || 0
        const newItem: SaleItem = {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          mrp: mrp,
          unit_price: unitPrice,
          purchase_price: product.purchase_price || 0, // Store purchase price for profit calculation
          discount: 0,
          discount_percentage: 0,
          sale_type: 'sale', // Default to sale
          total: unitPrice,
          barcode: product.barcode || ''
        }
        setSaleItems([...saleItems, newItem])
      } else {
        alert('Product is out of stock')
      }
    }
    setSearchQuery('')
  }

  const updateItemQuantity = (productId: number, quantity: number) => {
    const product = availableProducts.find(p => p.id === productId)
    if (product && quantity > product.stock_quantity) {
      alert(`Only ${product.stock_quantity} units available in stock`)
      return
    }

    setSaleItems(saleItems.map(item => {
      if (item.product_id === productId) {
        const newQuantity = Math.max(1, Math.min(quantity, product?.stock_quantity || 1))
        return {
          ...item,
          quantity: newQuantity,
          total: item.unit_price * newQuantity
        }
      }
      return item
    }))
  }

  const removeItem = (productId: number) => {
    setSaleItems(saleItems.filter(item => item.product_id !== productId))
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
    const grandTotal = subtotal

    const selectedSalesPerson = salesPersonId ? salesPersons.find(sp => sp.id === salesPersonId) : null

    const selectedCustomer = customerId ? customers.find(c => c.id === customerId) : null

    const sale = {
      customer_id: customerId ? customerId as number : undefined,
      customer_name: selectedCustomer?.name || 'Walk-in Customer',
      sales_person_id: salesPersonId ? salesPersonId as number : undefined,
      sales_person_name: selectedSalesPerson?.name,
      invoice_number: `INV-${Date.now()}`,
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
        total: item.total
      })),
      subtotal: subtotal,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      payment_status: 'paid' as const,
      payment_method: paymentMethod,
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
                    placeholder="Search by name, barcode, or SKU..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                
                {/* Product List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No products found</p>
                  ) : (
                    filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => addProductToSale(product)}
                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>Stock: {product.stock_quantity} {product.unit}</span>
                            {product.barcode && <span>Barcode: {product.barcode}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">₹{(product.selling_price || 0).toFixed(2)}</div>
                          <button
                            type="button"
                            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))
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
                              {product && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Available: {product.stock_quantity} {product.unit}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.product_id)}
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
                                  setSaleItems(saleItems.map(i => 
                                    i.product_id === item.product_id 
                                      ? { ...i, sale_type: 'sale' }
                                      : i
                                  ))
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
                                  setSaleItems(saleItems.map(i => 
                                    i.product_id === item.product_id 
                                      ? { ...i, sale_type: 'return' }
                                      : i
                                  ))
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
                                  setSaleItems(saleItems.map(i => 
                                    i.product_id === item.product_id 
                                      ? { ...i, mrp: newMrp, discount, discount_percentage: discountPct }
                                      : i
                                  ))
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
                                  setSaleItems(saleItems.map(i => 
                                    i.product_id === item.product_id 
                                      ? { 
                                          ...i, 
                                          unit_price: newPrice, 
                                          discount, 
                                          discount_percentage: discountPct,
                                          total: newPrice * i.quantity
                                        }
                                      : i
                                  ))
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
                                  onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
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
                        onClick={() => navigate('/customers/new')}
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
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="other">Other</option>
                    </select>
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
                <button
                  type="submit"
                  disabled={saleItems.length === 0}
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

