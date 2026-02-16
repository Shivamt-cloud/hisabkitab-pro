import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { serviceRecordService } from '../services/serviceRecordService'
import { companyService } from '../services/companyService'
import { useAuth } from '../context/AuthContext'
import { usePlanUpgrade } from '../context/PlanUpgradeContext'
import { ServiceReceipt } from '../components/ServiceReceipt'
import type { ServiceRecord, ServiceVehicleType } from '../types/serviceRecord'
import { Home, ChevronRight } from 'lucide-react'

const VALID_VEHICLE_TYPES: ServiceVehicleType[] = ['bike', 'car', 'ebike', 'ecar']

export default function ServiceReceiptView() {
  const navigate = useNavigate()
  const { vehicleType: paramVehicleType, id } = useParams<{ vehicleType: string; id: string }>()
  const { getCurrentCompanyId, hasPlanFeature } = useAuth()
  const { showPlanUpgrade } = usePlanUpgrade()
  const [record, setRecord] = useState<ServiceRecord | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [loading, setLoading] = useState(true)

  const vehicleType = (VALID_VEHICLE_TYPES.includes((paramVehicleType as ServiceVehicleType)) ? paramVehicleType : 'bike') as ServiceVehicleType

  useEffect(() => {
    if (!id) {
      navigate('/services/bike')
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const r = await serviceRecordService.getById(parseInt(id))
        if (!r || r.vehicle_type !== vehicleType) {
          navigate(`/services/${vehicleType}`)
          return
        }
        setRecord(r)
        const companyId = getCurrentCompanyId() ?? r.company_id
        if (companyId) {
          const company = await companyService.getById(companyId)
          if (company) {
            setCompanyName(company.name || '')
            const parts = [company.address, company.city, company.state, company.pincode].filter(Boolean)
            setCompanyAddress(parts.join(', '))
          }
        }
      } catch {
        navigate(`/services/${vehicleType}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, vehicleType, getCurrentCompanyId, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (!record) return null

  const label = vehicleType === 'ebike' ? 'E-bike' : vehicleType === 'ecar' ? 'E-car' : vehicleType

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-lg shadow border-b border-gray-200/50 sticky top-0 z-10 print:hidden">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <button type="button" onClick={() => navigate('/')} className="hover:text-blue-600 font-medium">
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button type="button" onClick={() => navigate('/services/bike')} className="hover:text-blue-600 font-medium">
              Services
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button type="button" onClick={() => navigate(`/services/${vehicleType}`)} className="hover:text-blue-600 font-medium">
              {label}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">Receipt</span>
          </nav>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(`/services/${vehicleType}/${id}/edit`)}
              className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200 bg-white"
              title="Back to edit"
            >
              <Home className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">{label} service receipt</h1>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <ServiceReceipt
          record={record}
          companyName={companyName}
          companyAddress={companyAddress}
          onClose={() => navigate(`/services/${vehicleType}/${id}/edit`)}
          canNotifyCustomer={hasPlanFeature('services_customer_notify')}
          onUpgradePlan={() => showPlanUpgrade('services_customer_notify')}
        />
      </main>
    </div>
  )
}
