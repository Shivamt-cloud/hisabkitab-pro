/** Purpose type for alteration (e.g. Alteration, Tailor, Repair) */
export interface AlterationType {
  id: number
  name: string
  company_id?: number
  created_at?: string
}

/** Contact to send goods to (tailor, technician) */
export interface AlterationContact {
  id: number
  name: string
  phone?: string
  address?: string
  company_id?: number
  created_at?: string
}
