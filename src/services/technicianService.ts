import type { Technician, TechnicianCreate } from '../types/technician'
import { cloudTechnicianService } from './cloudTechnicianService'

/**
 * Technician service – delegates to cloud (Supabase) when available,
 * with IndexedDB fallback for offline. Data is global/synced via Supabase.
 */
export const technicianService = {
  getAll: (companyId?: number | null): Promise<Technician[]> => {
    return cloudTechnicianService.getAll(companyId)
  },

  getById: (id: number): Promise<Technician | undefined> => {
    return cloudTechnicianService.getById(id)
  },

  create: (data: TechnicianCreate): Promise<Technician> => {
    return cloudTechnicianService.create(data)
  },

  update: (id: number, data: Partial<TechnicianCreate>): Promise<Technician | null> => {
    return cloudTechnicianService.update(id, data)
  },

  delete: (id: number): Promise<boolean> => {
    return cloudTechnicianService.delete(id)
  },
}
