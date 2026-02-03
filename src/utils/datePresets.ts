/**
 * Quick Win #5 – Shared date preset logic (Today, Yesterday, This Week, Last Week, etc.)
 */

export type DatePresetId =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'all'
  | 'custom'

export interface DatePresetOption {
  id: DatePresetId
  label: string
}

export const DATE_PRESET_OPTIONS: DatePresetOption[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'thisYear', label: 'This Year' },
  { id: 'lastYear', label: 'Last Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
]

export function getDateRangeForPreset(
  preset: DatePresetId,
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string } {
  const now = new Date()
  let startDate: string | undefined
  let endDate: string | undefined

  switch (preset) {
    case 'today': {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      startDate = endDate = today.toISOString().split('T')[0]
      break
    }
    case 'yesterday': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      startDate = endDate = yesterday.toISOString().split('T')[0]
      break
    }
    case 'thisWeek': {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      startDate = weekStart.toISOString().split('T')[0]
      endDate = now.toISOString().split('T')[0]
      break
    }
    case 'lastWeek': {
      const lastWeekEnd = new Date(now)
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekStart.getDate() - 6)
      startDate = lastWeekStart.toISOString().split('T')[0]
      endDate = lastWeekEnd.toISOString().split('T')[0]
      break
    }
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      endDate = now.toISOString().split('T')[0]
      break
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      break
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      endDate = now.toISOString().split('T')[0]
      break
    case 'lastYear':
      startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]
      endDate = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
      break
    case 'custom':
      startDate = customStart
      endDate = customEnd
      break
    default:
      // 'all'
      startDate = endDate = undefined
  }

  return { startDate, endDate }
}

/** Single-date presets (e.g. for Daily Report) */
export function getSingleDateForPreset(preset: 'today' | 'yesterday'): string {
  const now = new Date()
  if (preset === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0]
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}
