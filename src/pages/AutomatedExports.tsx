import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { cloudScheduledExportService } from '../services/cloudScheduledExportService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Home, Save, Mail, Calendar, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react'
import {
  type ScheduledExportConfig,
  type ScheduledExportReportType,
  SCHEDULED_EXPORT_REPORT_OPTIONS,
  DAYS_OF_WEEK,
} from '../types/scheduledExport'

const AutomatedExports = () => {
  const { getCurrentCompanyId } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const companyId = getCurrentCompanyId()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<ScheduledExportConfig | null>(null)
  const [formData, setFormData] = useState({
    report_types: [] as ScheduledExportReportType[],
    schedule_type: 'daily' as 'daily' | 'weekly',
    schedule_time: '08:00',
    schedule_day_of_week: 1,
    email_recipients: '',
    format: 'excel' as 'pdf' | 'excel',
    is_active: false,
  })

  useEffect(() => {
    loadConfig()
  }, [companyId])

  const loadConfig = async () => {
    if (!companyId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const c = await cloudScheduledExportService.getByCompany(companyId)
      if (c) {
        setConfig(c)
        setFormData({
          report_types: c.report_types || [],
          schedule_type: c.schedule_type || 'daily',
          schedule_time: c.schedule_time || '08:00',
          schedule_day_of_week: c.schedule_day_of_week ?? 1,
          email_recipients: (c.email_recipients || []).join(', '),
          format: c.format || 'excel',
          is_active: c.is_active ?? false,
        })
      }
    } catch (e) {
      console.error('Failed to load automated export config', e)
      toast.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const toggleReport = (value: ScheduledExportReportType) => {
    setFormData(prev => ({
      ...prev,
      report_types: prev.report_types.includes(value)
        ? prev.report_types.filter(r => r !== value)
        : [...prev.report_types, value],
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    const emails = formData.email_recipients
      .split(/[,;\s]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
    if (formData.is_active && formData.report_types.length === 0) {
      toast.error('Select at least one report type')
      return
    }
    if (formData.is_active && emails.length === 0) {
      toast.error('Enter at least one email address')
      return
    }
    setSaving(true)
    try {
      const payload: ScheduledExportConfig = {
        company_id: companyId,
        report_types: formData.report_types,
        schedule_type: formData.schedule_type,
        schedule_time: formData.schedule_time,
        schedule_day_of_week: formData.schedule_type === 'weekly' ? formData.schedule_day_of_week : undefined,
        email_recipients: emails,
        format: formData.format,
        is_active: formData.is_active,
      }
      const saved = await cloudScheduledExportService.upsert(payload)
      if (saved) {
        setConfig(saved)
        toast.success('Automated export settings saved')
      } else {
        toast.error('Failed to save. Ensure Supabase is configured and run CREATE_SCHEDULED_EXPORTS_TABLE.sql')
      }
    } catch (e) {
      console.error('Failed to save', e)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute requiredPermission="settings:update">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center border border-gray-200 bg-white"
                  title="Back to Dashboard"
                >
                  <Home className="w-5 h-5 text-gray-700" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Automated Exports</h1>
                    <p className="text-sm text-gray-600">Schedule daily or weekly reports by email</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Backend setup required</p>
                  <p>
                    Automated exports need a backend to run on schedule and send emails. After saving your preferences,
                    configure the Netlify scheduled function and external cron (e.g. cron-job.org). See{' '}
                    <code className="bg-amber-100 px-1 rounded">AUTOMATED_EXPORTS_SETUP.md</code> for setup instructions.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Enable Automated Exports</h2>
                  <p className="text-sm text-gray-600 mt-1">Reports will be generated and sent to your email on schedule.</p>
                  <label className="flex items-center gap-3 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="font-medium text-gray-900">Enable scheduled reports</span>
                  </label>
                </div>

                <div className="p-6 border-b border-gray-200 space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Report types</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SCHEDULED_EXPORT_REPORT_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.report_types.includes(opt.value)}
                            onChange={() => toggleReport(opt.value)}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Schedule</h3>
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Frequency</label>
                        <select
                          value={formData.schedule_type}
                          onChange={e => setFormData({ ...formData, schedule_type: e.target.value as 'daily' | 'weekly' })}
                          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                      {formData.schedule_type === 'weekly' && (
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Day of week</label>
                          <select
                            value={formData.schedule_day_of_week}
                            onChange={e => setFormData({ ...formData, schedule_day_of_week: parseInt(e.target.value) })}
                            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                          >
                            {DAYS_OF_WEEK.map(d => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Time (24h)</label>
                        <input
                          type="time"
                          value={formData.schedule_time}
                          onChange={e => setFormData({ ...formData, schedule_time: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email recipients
                    </h3>
                    <input
                      type="text"
                      value={formData.email_recipients}
                      onChange={e => setFormData({ ...formData, email_recipients: e.target.value })}
                      placeholder="email1@example.com, email2@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas or spaces</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Format</h3>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value="excel"
                          checked={formData.format === 'excel'}
                          onChange={() => setFormData({ ...formData, format: 'excel' })}
                          className="text-violet-600 focus:ring-violet-500"
                        />
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        <span>Excel (.xlsx)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value="pdf"
                          checked={formData.format === 'pdf'}
                          onChange={() => setFormData({ ...formData, format: 'pdf' })}
                          className="text-violet-600 focus:ring-violet-500"
                        />
                        <FileText className="w-5 h-5 text-red-600" />
                        <span>PDF</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </div>

              {config?.last_run_at && (
                <p className="text-sm text-gray-500">
                  Last run: {new Date(config.last_run_at).toLocaleString()}
                </p>
              )}
            </form>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default AutomatedExports
