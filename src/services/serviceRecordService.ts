import type { ServiceRecord, ServiceRecordCreate, ServiceVehicleType } from '../types/serviceRecord'
import { cloudServiceRecordService } from './cloudServiceRecordService'

/**
 * Service record service – delegates to cloud (Supabase) when available,
 * with IndexedDB fallback for offline. Data is global/synced via Supabase.
 */
export const serviceRecordService = {
  getAll: (
    companyId?: number | null,
    vehicleType?: ServiceVehicleType
  ): Promise<ServiceRecord[]> => {
    return cloudServiceRecordService.getAll(companyId, vehicleType)
  },

  getById: (id: number): Promise<ServiceRecord | undefined> => {
    return cloudServiceRecordService.getById(id)
  },

  create: (data: ServiceRecordCreate): Promise<ServiceRecord> => {
    return cloudServiceRecordService.create(data)
  },

  update: (id: number, data: Partial<ServiceRecordCreate>): Promise<ServiceRecord | null> => {
    return cloudServiceRecordService.update(id, data)
  },

  delete: (id: number): Promise<boolean> => {
    return cloudServiceRecordService.delete(id)
  },
}
