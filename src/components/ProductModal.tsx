import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { productService, categoryService, Product, Category } from '../services/productService'
import { X, Save, Package } from 'lucide-react'
import { GST_RATES, validateHSNCode } from '../utils/taxCalculator'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductAdded: (product: Product) => void
}

const ProductModal = ({ isOpen, onClose, onProductAdded }: ProductModalProps) => {
  const { hasPermission, getCurrentCompanyId } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: undefined as number | undefined,
    description: '',
    unit: 'pcs',
    hsn_code: '',
    gst_rate: 18,
    tax_type: 'exclusive' as 'inclusive' | 'exclusive',
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const loadCategories = async () => {
    try {
      const allCategories = await categoryService.getAll()
      setCategories(allCategories)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    // Validate HSN code if provided
    if (formData.hsn_code) {
      const hsnValidation = validateHSNCode(formData.hsn_code)
      if (!hsnValidation.valid && hsnValidation.message) {
        newErrors.hsn_code = hsnValidation.message
      }
    }

    // Validate GST rate
    if (formData.gst_rate < 0 || formData.gst_rate > 100) {
      newErrors.gst_rate = 'GST rate must be between 0 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleGSTRateChange = (rate: number) => {
    setFormData({
      ...formData,
      gst_rate: rate,
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    if (!hasPermission('products:create')) {
      alert('You do not have permission to create products')
      return
    }

    setLoading(true)

    try {
      const companyId = getCurrentCompanyId()
      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        category_id: formData.category_id,
        description: formData.description.trim() || undefined,
        unit: formData.unit,
        hsn_code: formData.hsn_code.trim() || undefined,
        gst_rate: formData.gst_rate,
        tax_type: formData.tax_type,
        cgst_rate: formData.gst_rate / 2,
        sgst_rate: formData.gst_rate / 2,
        igst_rate: undefined,
        stock_quantity: 0,
        is_active: true,
        status: 'active' as const,
        company_id: companyId ?? undefined,
      } as Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category_name'>

      const newProduct = await productService.create(productData)
      onProductAdded(newProduct)

      // Reset form
      setFormData({
        name: '',
        sku: '',
        category_id: undefined,
        description: '',
        unit: 'pcs',
        hsn_code: '',
        gst_rate: 18,
        tax_type: 'exclusive',
      })
      setErrors({})
      onClose()
    } catch (error) {
      alert('Error saving product: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      sku: '',
      category_id: undefined,
      description: '',
      unit: 'pcs',
      hsn_code: '',
      gst_rate: 18,
      tax_type: 'exclusive',
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter SKU"
                />
              </div>

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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                <select
                  value={formData.unit}
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

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Enter product description"
                />
              </div>
            </div>
          </div>

          {/* GST & Tax Information */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">GST & Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">HSN Code</label>
                <input
                  type="text"
                  value={formData.hsn_code}
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  GST Rate (%)
                </label>
                <select
                  value={formData.gst_rate}
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

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tax Type</label>
                <select
                  value={formData.tax_type}
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
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Pricing (Purchase Price, MRP, Sale Price) and stock quantities will be managed during purchase entry. 
              Barcodes will be generated during purchase entry.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
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
                  Add Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductModal
