import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import { productService, categoryService, Product, Category } from '../services/productService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { ArrowLeft, Save, Package, RefreshCw, Calculator, Home, Upload, X, Image as ImageIcon } from 'lucide-react'
import { validateBarcode } from '../utils/barcodeGenerator'
import { calculateTax, GST_RATES, getSplitGSTRates, validateHSNCode } from '../utils/taxCalculator'
import { compressImage, fileToBase64, validateImageFile } from '../utils/imageUtils'

const ProductForm = () => {
  const { hasPermission, getCurrentCompanyId } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    category_id: undefined,
    description: '',
    stock_quantity: 0, // Will be managed automatically
    unit: 'pcs',
    is_active: true,
    hsn_code: '',
    gst_rate: 18,
    tax_type: 'exclusive',
    cgst_rate: undefined,
    sgst_rate: undefined,
    igst_rate: undefined,
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    loadCategories()
    if (isEdit) {
      loadProduct()
    }
  }, [id])

  const loadCategories = async () => {
    const allCategories = await categoryService.getAll()
    setCategories(allCategories)
  }

  const loadProduct = async () => {
    if (id) {
      const product = await productService.getById(parseInt(id), true)
      if (product) {
        setFormData(product)
        if (product.image_url) {
          setImagePreview(product.image_url)
        }
      }
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setErrors({ ...errors, image: validation.error || 'Invalid image file' })
      return
    }

    setUploadingImage(true)
    setErrors({ ...errors, image: '' })

    try {
      // Compress image
      const compressedBlob = await compressImage(file, 800, 800, 0.8)
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' })
      
      // Convert to base64
      const base64 = await fileToBase64(compressedFile)
      
      // Update form data and preview
      setFormData({ ...formData, image_url: base64 })
      setImagePreview(base64)
    } catch (error) {
      console.error('Error uploading image:', error)
      setErrors({ ...errors, image: 'Failed to process image. Please try again.' })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: undefined })
    setImagePreview(null)
    setErrors({ ...errors, image: '' })
  }

  const handleGSTRateChange = (rate: number) => {
    setFormData({
      ...formData,
      gst_rate: rate,
      // Auto-split GST for intrastate (CGST + SGST)
      cgst_rate: rate / 2,
      sgst_rate: rate / 2,
      igst_rate: undefined, // Clear IGST if using split GST
    })
  }

  // Tax breakdown will be calculated during purchase entry when prices are set
  const taxBreakdown = null

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Product name is required'
    }

    // Note: Pricing (selling_price, purchase_price) is now optional and managed during purchase entry
    // Removed selling_price validation as it's no longer required at product creation

    if (formData.stock_quantity === undefined || formData.stock_quantity < 0) {
      newErrors.stock_quantity = 'Stock quantity cannot be negative'
    }

    if (formData.min_stock_level !== undefined && formData.min_stock_level < 0) {
      newErrors.min_stock_level = 'Minimum stock level cannot be negative'
    }

    // Barcode validation removed - barcodes are now generated during purchase entry

    // Validate HSN code if provided
    if (formData.hsn_code) {
      const hsnValidation = validateHSNCode(formData.hsn_code)
      if (!hsnValidation.valid && hsnValidation.message) {
        newErrors.hsn_code = hsnValidation.message
      }
    }

    // Validate GST rate
    if (formData.gst_rate === undefined || formData.gst_rate < 0 || formData.gst_rate > 100) {
      newErrors.gst_rate = 'GST rate must be between 0 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    const requiredPermission = isEdit ? 'products:update' : 'products:create'
    if (!hasPermission(requiredPermission)) {
      alert(`You do not have permission to ${isEdit ? 'update' : 'create'} products`)
      return
    }

    setLoading(true)

    try {
      if (isEdit && id) {
        await productService.update(parseInt(id), formData)
      } else {
        // Set company_id when creating a new product
        const companyId = getCurrentCompanyId()
        const productData = {
          ...formData,
          company_id: companyId ?? undefined,
        } as Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category_name'>
        await productService.create(productData)
      }
      navigate('/products')
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Failed to save product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredPermission={isEdit ? 'products:update' : 'products:create'}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/products')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Products"
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
                    {isEdit ? 'Edit Product' : 'Add New Product'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEdit ? 'Update product information' : 'Create a new product for your inventory'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/50">
            {/* Basic Information */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SKU</label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter SKU"
                  />
                </div>

                {/* Barcode Note */}
                <div className="md:col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Barcodes will be generated during purchase entry. You can auto-generate or manually scan barcodes when adding products to a purchase.
                    </p>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category_id || ''}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                  <select
                    value={formData.unit || 'pcs'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Liter (l)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="m">Meter (m)</option>
                    <option value="cm">Centimeter (cm)</option>
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    placeholder="Enter product description"
                  />
                </div>

                {/* Product Image */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Image
                  </label>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-48 h-48 object-cover rounded-xl border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                  {uploadingImage && (
                    <p className="mt-2 text-sm text-blue-600">Uploading and compressing image...</p>
                  )}
                  {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="mb-8 pt-8 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Pricing (Purchase Price, MRP, Sale Price) and stock quantities will be managed during purchase entry. 
                  This allows you to set different prices for each purchase batch and automatically track inventory.
                </p>
              </div>
            </div>

            {/* GST & Tax Information */}
            <div className="mb-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                GST & Tax Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* HSN Code */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsn_code || ''}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                      errors.hsn_code ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 8517"
                    maxLength={8}
                  />
                  {errors.hsn_code && <p className="mt-1 text-sm text-red-600">{errors.hsn_code}</p>}
                  <p className="mt-1 text-xs text-gray-500">4, 6, or 8 digit HSN code</p>
                </div>

                {/* GST Rate */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    GST Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gst_rate || 18}
                    onChange={(e) => handleGSTRateChange(parseFloat(e.target.value))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white ${
                      errors.gst_rate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    {GST_RATES.map(rate => (
                      <option key={rate.value} value={rate.value}>{rate.label}</option>
                    ))}
                  </select>
                  {errors.gst_rate && <p className="mt-1 text-sm text-red-600">{errors.gst_rate}</p>}
                </div>

                {/* Tax Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tax Type</label>
                  <select
                    value={formData.tax_type || 'exclusive'}
                    onChange={(e) => setFormData({ ...formData, tax_type: e.target.value as 'inclusive' | 'exclusive' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                  >
                    <option value="exclusive">GST Exclusive (GST added on top)</option>
                    <option value="inclusive">GST Inclusive (GST included in price)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.tax_type === 'exclusive' 
                      ? 'GST will be added to the selling price' 
                      : 'GST is already included in the selling price'}
                  </p>
                </div>

                {/* Tax Breakdown Toggle */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                    className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Calculator className="w-5 h-5" />
                    {showTaxBreakdown ? 'Hide' : 'Show'} Tax Breakdown
                  </button>
                </div>
              </div>

              {/* Note: Tax calculations will be shown during purchase entry when prices are set */}
            </div>

            {/* Status */}
            <div className="mb-8 pt-8 border-t border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active !== false}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-3 text-sm font-semibold text-gray-700">
                  Product is active (visible in sales/purchases)
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {isEdit ? 'Update Product' : 'Save Product'}
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

export default ProductForm

