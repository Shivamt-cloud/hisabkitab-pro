import { AlterationContact } from '../types/alteration'
import { getAll, getById, put, deleteById, STORES } from '../database/db'

export const alterationContactService = {
  getAll: async (companyId?: number | null): Promise<AlterationContact[]> => {
    const all = await getAll<AlterationContact>(STORES.ALTERATION_CONTACTS)
    if (companyId === undefined || companyId === null) return all
    return all.filter(c => c.company_id === companyId)
  },

  getById: async (id: number): Promise<AlterationContact | undefined> => {
    return await getById<AlterationContact>(STORES.ALTERATION_CONTACTS, id)
  },

  create: async (contact: Omit<AlterationContact, 'id' | 'created_at'>): Promise<AlterationContact> => {
    const now = new Date().toISOString()
    const newContact: AlterationContact = {
      ...contact,
      id: Date.now(),
      created_at: now,
    }
    await put(STORES.ALTERATION_CONTACTS, newContact)
    return newContact
  },

  update: async (id: number, contact: Partial<AlterationContact>): Promise<AlterationContact | null> => {
    const existing = await getById<AlterationContact>(STORES.ALTERATION_CONTACTS, id)
    if (!existing) return null
    const updated: AlterationContact = { ...existing, ...contact }
    await put(STORES.ALTERATION_CONTACTS, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.ALTERATION_CONTACTS, id)
      return true
    } catch (e) {
      console.error('Error deleting alteration contact:', e)
      return false
    }
  },
}

