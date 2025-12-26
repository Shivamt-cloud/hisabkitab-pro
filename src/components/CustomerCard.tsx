import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerService } from '../services/customerService'
import { Customer } from '../types/customer'
import { Edit, Trash2, Mail, Phone, MapPin, Building2 } from 'lucide-react'

interface CustomerSummary {
  sale_count: number
  total_sales: number
}

interface CustomerCardProps {
  customer: Customer
  hasPermission: (permission: string) => boolean
  onDelete: (id: number) => void
}

export function CustomerCard({ customer, hasPermission, onDelete }: CustomerCardProps) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<CustomerSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const customerSummary = await customerService.getSummary(customer.id)
        setSummary(customerSummary)
      } catch (error) {
        console.error('Error loading customer summary:', error)
      } finally {
        setLoadingSummary(false)
      }
    }
    loadSummary()
  }, [customer.id])

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
            {customer.contact_person && (
              <p className="text-sm text-gray-500">Contact: {customer.contact_person}</p>
            )}
          </div>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${
            customer.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {customer.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {customer.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-blue-600" />
            <span>{customer.phone}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-blue-600" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.gstin && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>{customer.gstin}</span>
          </div>
        )}
        {(customer.city || customer.state) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>
              {[customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {!loadingSummary && summary && summary.sale_count > 0 && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Total Sales</p>
              <p className="font-semibold text-gray-900">₹{summary.total_sales.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-gray-500">Orders</p>
              <p className="font-semibold text-gray-900">{summary.sale_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Credit Balance Display */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Available Credit Balance</p>
              <p className={`text-lg font-bold mt-1 ${
                (customer.credit_balance || 0) > 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                ₹{(customer.credit_balance || 0).toFixed(2)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              (customer.credit_balance || 0) > 0 ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <span className="text-2xl">💰</span>
            </div>
          </div>
          {(customer.credit_balance || 0) > 0 && (
            <p className="text-xs text-green-600 mt-2">Can be used on future purchases</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        {hasPermission('sales:update') && (
          <button
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        )}
        {hasPermission('sales:delete') && (
          <button
            onClick={() => onDelete(customer.id)}
            className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

