export type ScheduledExportReportType =
  | 'sales_summary'
  | 'purchase_summary'
  | 'daily_report'
  | 'profit_analysis'
  | 'expense_summary'

export type ScheduledExportFormat = 'pdf' | 'excel'

export type ScheduledExportScheduleType = 'daily' | 'weekly'

export interface ScheduledExportConfig {
  id?: number
  company_id: number
  report_types: ScheduledExportReportType[]
  schedule_type: ScheduledExportScheduleType
  schedule_time: string // "HH:mm" e.g. "08:00"
  schedule_day_of_week?: number // 0=Sun, 1=Mon, ... 6=Sat (weekly only)
  email_recipients: string[]
  format: ScheduledExportFormat
  is_active: boolean
  last_run_at?: string
  created_at?: string
  updated_at?: string
}

export const SCHEDULED_EXPORT_REPORT_OPTIONS: { value: ScheduledExportReportType; label: string }[] = [
  { value: 'sales_summary', label: 'Sales Summary' },
  { value: 'purchase_summary', label: 'Purchase Summary' },
  { value: 'daily_report', label: 'Daily Report (Sales, Purchases, Expenses)' },
  { value: 'profit_analysis', label: 'Profit Analysis' },
  { value: 'expense_summary', label: 'Expense Summary' },
]

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]
