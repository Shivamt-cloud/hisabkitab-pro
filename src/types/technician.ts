export interface Technician {
  id: number
  company_id?: number
  name: string
  phone?: string
  notes?: string
}

export type TechnicianCreate = Omit<Technician, 'id'>
