// Cloud Daily Report Details – sale target + customer details per day (Supabase)
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'

export interface DailyReportDetailsRow {
  id?: number
  company_id: number
  report_date: string // YYYY-MM-DD
  sale_target: number | null
  customers_purchased: number
  customers_returned: number
  return_reason: string | null
  expectation: string | null
  remark: string | null
  created_at?: string
  updated_at?: string
}

export interface DailyReportDetailsPayload {
  sale_target?: number | null
  customers_purchased: number
  customers_returned: number
  return_reason: string
  expectation: string
  remark: string
}

export const cloudDailyReportDetailsService = {
  /**
   * Get details for one day (company + date). Returns null if not found or offline.
   */
  getByDate: async (
    companyId: number,
    reportDate: string
  ): Promise<DailyReportDetailsRow | null> => {
    if (!isSupabaseAvailable() || !isOnline()) return null
    try {
      const { data, error } = await supabase!
        .from('daily_report_details')
        .select('*')
        .eq('company_id', companyId)
        .eq('report_date', reportDate)
        .maybeSingle()
      if (error) {
        console.warn('cloudDailyReportDetailsService.getByDate:', error)
        return null
      }
      return data as DailyReportDetailsRow | null
    } catch (e) {
      console.warn('cloudDailyReportDetailsService.getByDate:', e)
      return null
    }
  },

  /**
   * Get details for a date range (for time-wise reporting).
   */
  getByDateRange: async (
    companyId: number,
    startDate: string,
    endDate: string
  ): Promise<DailyReportDetailsRow[]> => {
    if (!isSupabaseAvailable() || !isOnline()) return []
    try {
      const { data, error } = await supabase!
        .from('daily_report_details')
        .select('*')
        .eq('company_id', companyId)
        .gte('report_date', startDate)
        .lte('report_date', endDate)
        .order('report_date', { ascending: false })
      if (error) {
        console.warn('cloudDailyReportDetailsService.getByDateRange:', error)
        return []
      }
      return (data as DailyReportDetailsRow[]) || []
    } catch (e) {
      console.warn('cloudDailyReportDetailsService.getByDateRange:', e)
      return []
    }
  },

  /**
   * Upsert details for one day (company + date). Creates or updates.
   */
  upsert: async (
    companyId: number,
    reportDate: string,
    payload: DailyReportDetailsPayload
  ): Promise<DailyReportDetailsRow | null> => {
    if (!isSupabaseAvailable() || !isOnline()) return null
    try {
      const row = {
        company_id: companyId,
        report_date: reportDate,
        sale_target: payload.sale_target ?? null,
        customers_purchased: payload.customers_purchased ?? 0,
        customers_returned: payload.customers_returned ?? 0,
        return_reason: payload.return_reason?.trim() || null,
        expectation: payload.expectation?.trim() || null,
        remark: payload.remark?.trim() || null,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase!
        .from('daily_report_details')
        .upsert(row, {
          onConflict: 'company_id,report_date',
          ignoreDuplicates: false,
        })
        .select()
        .single()
      if (error) {
        console.warn('cloudDailyReportDetailsService.upsert:', error)
        return null
      }
      return data as DailyReportDetailsRow
    } catch (e) {
      console.warn('cloudDailyReportDetailsService.upsert:', e)
      return null
    }
  },
}
