import type { Rental } from '../types/rental'
import { getAll, getById, put, STORES } from '../database/db'
import { cloudRentalService } from './cloudRentalService'

export const rentService = {
  /** Load from Supabase first for fast global loading; fallback to IndexedDB when offline. */
  getAll: async (companyId?: number | null): Promise<Rental[]> => {
    return cloudRentalService.getAll(companyId)
  },

  /** Fast list load: Supabase only, no local sync. Use for Rentals list and Report. */
  getAllFast: async (companyId?: number | null): Promise<Rental[]> => {
    return cloudRentalService.getAllFast(companyId)
  },

  getById: async (id: number): Promise<Rental | null> => {
    return cloudRentalService.getById(id)
  },

  getNextRentalNumber: async (companyId?: number | null): Promise<string> => {
    const all = await rentService.getAll(companyId)
    const prefix = 'RNT'
    const numbers = all
      .map((r) => {
        const match = r.rental_number.match(/^RNT-?(\d+)$/i)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((n) => n > 0)
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
    return `${prefix}-${String(next).padStart(4, '0')}`
  },

  create: async (
    data: Omit<Rental, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Rental> => {
    const id =
      Math.floor(performance.now() * 1000) +
      Math.floor(Math.random() * 10000000)
    const now = new Date().toISOString()
    const rental: Rental = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    }
    return cloudRentalService.create(rental)
  },

  update: async (
    id: number,
    data: Partial<Omit<Rental, 'id' | 'created_at'>>
  ): Promise<Rental> => {
    return cloudRentalService.update(id, data)
  },
}
