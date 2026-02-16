import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import type { MaintenanceSettings } from '../types/settings'

const ROW_ID = 1

export const cloudMaintenanceService = {
  async get(): Promise<MaintenanceSettings | null> {
    if (!isSupabaseAvailable() || !isOnline()) return null
    try {
      const { data, error } = await supabase!
        .from('maintenance_config')
        .select('enabled, show_as, message, end_time_ist')
        .eq('id', ROW_ID)
        .maybeSingle()
      if (error) {
        console.warn('[cloudMaintenanceService] get error:', error)
        return null
      }
      if (!data) return null
      return {
        enabled: !!data.enabled,
        show_as: (data.show_as === 'page' ? 'page' : 'banner') as 'banner' | 'page',
        message: data.message ?? '',
        end_time_ist: data.end_time_ist ?? '',
      }
    } catch (e) {
      console.warn('[cloudMaintenanceService] get exception:', e)
      return null
    }
  },

  async update(m: MaintenanceSettings): Promise<boolean> {
    if (!isSupabaseAvailable() || !isOnline()) return false
    try {
      const { error } = await supabase!
        .from('maintenance_config')
        .upsert(
          {
            id: ROW_ID,
            enabled: m.enabled,
            show_as: m.show_as,
            message: m.message ?? '',
            end_time_ist: m.end_time_ist ?? '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
      if (error) {
        console.warn('[cloudMaintenanceService] update error:', error)
        return false
      }
      return true
    } catch (e) {
      console.warn('[cloudMaintenanceService] update exception:', e)
      return false
    }
  },
}
