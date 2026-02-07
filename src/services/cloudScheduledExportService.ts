// Cloud Scheduled Export Service - Handles scheduled report config with Supabase
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import type { ScheduledExportConfig } from '../types/scheduledExport'

export const cloudScheduledExportService = {
  getByCompany: async (companyId: number): Promise<ScheduledExportConfig | null> => {
    if (!isSupabaseAvailable() || !isOnline()) return null
    try {
      const { data, error } = await supabase!
        .from('scheduled_export_configs')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle()
      if (error) {
        console.error('Error fetching scheduled export config:', error)
        return null
      }
      return data as ScheduledExportConfig | null
    } catch (e) {
      console.error('cloudScheduledExportService.getByCompany:', e)
      return null
    }
  },

  upsert: async (config: ScheduledExportConfig): Promise<ScheduledExportConfig | null> => {
    if (!isSupabaseAvailable() || !isOnline()) return null
    try {
      const payload = {
        company_id: config.company_id,
        report_types: config.report_types,
        schedule_type: config.schedule_type,
        schedule_time: config.schedule_time,
        schedule_day_of_week: config.schedule_day_of_week ?? null,
        email_recipients: config.email_recipients,
        format: config.format,
        is_active: config.is_active,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase!
        .from('scheduled_export_configs')
        .upsert(payload, {
          onConflict: 'company_id',
          ignoreDuplicates: false,
        })
        .select()
        .single()
      if (error) {
        console.error('Error upserting scheduled export config:', error)
        return null
      }
      return data as ScheduledExportConfig
    } catch (e) {
      console.error('cloudScheduledExportService.upsert:', e)
      return null
    }
  },

  delete: async (companyId: number): Promise<boolean> => {
    if (!isSupabaseAvailable() || !isOnline()) return false
    try {
      const { error } = await supabase!
        .from('scheduled_export_configs')
        .delete()
        .eq('company_id', companyId)
      return !error
    } catch (e) {
      console.error('cloudScheduledExportService.delete:', e)
      return false
    }
  },
}
