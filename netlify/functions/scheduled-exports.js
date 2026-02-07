/**
 * Netlify Function: Scheduled Exports
 * Generates reports and sends by email for companies with active scheduled export configs.
 *
 * Trigger: Call via external cron (e.g. cron-job.org) - recommended: every hour
 * GET or POST with header: x-cron-secret: <CRON_SECRET>
 *
 * Env vars (set in Netlify Dashboard):
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
 * - RESEND_API_KEY (from resend.com)
 * - CRON_SECRET (optional, for auth)
 */

const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-cron-secret',
  'Content-Type': 'application/json',
}

// Check if a config is due to run (simplified: run if last_run was >24h ago for daily, >7d for weekly)
function isConfigDue(config, now) {
  if (!config.is_active || !config.email_recipients?.length || !config.report_types?.length) return false
  const lastRun = config.last_run_at ? new Date(config.last_run_at).getTime() : 0
  const [hour, min] = (config.schedule_time || '08:00').split(':').map(Number)
  const configHour = hour * 60 + min
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  // Run if within the same hour (cron runs hourly)
  if (Math.abs(nowMinutes - configHour) > 30) return false
  if (config.schedule_type === 'daily') {
    return now.getTime() - lastRun > 23 * 60 * 60 * 1000
  }
  if (config.schedule_type === 'weekly') {
    const day = config.schedule_day_of_week ?? 1
    if (now.getUTCDay() !== day) return false
    return now.getTime() - lastRun > 6 * 24 * 60 * 60 * 1000
  }
  return false
}

async function fetchReportData(supabase, companyId, reportTypes, startDate, endDate) {
  const sheets = []
  if (reportTypes.includes('sales_summary')) {
    const { data } = await supabase.from('sales').select('*').eq('company_id', companyId)
      .gte('sale_date', startDate).lte('sale_date', endDate).order('sale_date', { ascending: false })
    const rows = (data || []).map(s => [
      s.sale_date,
      s.invoice_number,
      s.customer_name || '',
      s.grand_total,
      s.payment_status,
    ])
    sheets.push({ name: 'Sales Summary', headers: ['Date', 'Invoice', 'Customer', 'Amount', 'Status'], rows })
  }
  if (reportTypes.includes('purchase_summary')) {
    const { data } = await supabase.from('purchases').select('*').eq('company_id', companyId)
      .gte('purchase_date', startDate).lte('purchase_date', endDate).order('purchase_date', { ascending: false })
    const rows = (data || []).map(p => [
      p.purchase_date,
      p.invoice_number || '',
      p.supplier_name || '',
      p.grand_total ?? p.total_amount ?? 0,
      p.payment_status,
    ])
    sheets.push({ name: 'Purchase Summary', headers: ['Date', 'Invoice', 'Supplier', 'Amount', 'Status'], rows })
  }
  if (reportTypes.includes('expense_summary')) {
    const { data } = await supabase.from('expenses').select('*').eq('company_id', companyId)
      .gte('expense_date', startDate).lte('expense_date', endDate).order('expense_date', { ascending: false })
    const rows = (data || []).map(e => [e.expense_date, e.category || e.expense_type || '', e.amount, e.description || ''])
    sheets.push({ name: 'Expenses', headers: ['Date', 'Category', 'Amount', 'Notes'], rows })
  }
  if (reportTypes.includes('daily_report')) {
    const { data: sales } = await supabase.from('sales').select('*').eq('company_id', companyId)
      .gte('sale_date', startDate).lte('sale_date', endDate)
    const { data: purchases } = await supabase.from('purchases').select('*').eq('company_id', companyId)
      .gte('purchase_date', startDate).lte('purchase_date', endDate)
    const { data: expenses } = await supabase.from('expenses').select('*').eq('company_id', companyId)
      .gte('expense_date', startDate).lte('expense_date', endDate)
    const salesRows = (sales || []).map(s => ['Sales', s.sale_date, s.invoice_number, s.grand_total])
    const purchaseRows = (purchases || []).map(p => ['Purchase', p.purchase_date, p.invoice_number, p.grand_total ?? p.total_amount])
    const expenseRows = (expenses || []).map(e => ['Expense', e.expense_date, e.category || e.expense_type || '', e.amount])
    sheets.push({ name: 'Daily Report', headers: ['Type', 'Date', 'Ref', 'Amount'], rows: [...salesRows, ...purchaseRows, ...expenseRows] })
  }
  if (reportTypes.includes('profit_analysis')) {
    const { data: sales } = await supabase.from('sales').select('*').eq('company_id', companyId)
      .gte('sale_date', startDate).lte('sale_date', endDate)
    const rows = (sales || []).map(s => [s.sale_date, s.invoice_number, s.subtotal, s.tax_amount, s.grand_total])
    sheets.push({ name: 'Profit Analysis', headers: ['Date', 'Invoice', 'Subtotal', 'Tax', 'Total'], rows })
  }
  return sheets
}

function buildExcelBuffer(sheets) {
  const wb = XLSX.utils.book_new()
  for (const { name, headers, rows } of sheets) {
    const wsData = [headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, (name || 'Sheet').substring(0, 31))
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

async function sendEmail(resendApiKey, recipients, subject, buffer, filename) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HisabKitab Reports <reports@resend.dev>',
      to: recipients,
      subject,
      attachments: [{ filename, content: Buffer.from(buffer).toString('base64') }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend API error: ${res.status} ${err}`)
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && event.headers['x-cron-secret'] !== cronSecret) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Supabase not configured' }) }
  }
  if (!resendKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Resend API key not configured' }) }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: configs } = await supabase.from('scheduled_export_configs').select('*').eq('is_active', true)
  const results = { processed: 0, skipped: 0, errors: [] }

  for (const config of configs || []) {
    if (!isConfigDue(config, now)) {
      results.skipped++
      continue
    }

    try {
      const startDate = config.schedule_type === 'weekly' ? weekAgo : today
      const sheets = await fetchReportData(supabase, config.company_id, config.report_types || [], startDate, today)
      if (sheets.length === 0) {
        sheets.push({ name: 'Summary', headers: ['Info'], rows: [['No data for the selected period']] })
      }

      const buffer = buildExcelBuffer(sheets)
      const filename = `HisabKitab_Report_${today}.xlsx`
      await sendEmail(resendKey, config.email_recipients, `HisabKitab Report - ${today}`, buffer, filename)

      await supabase
        .from('scheduled_export_configs')
        .update({ last_run_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('company_id', config.company_id)

      results.processed++
    } catch (err) {
      results.errors.push({ company_id: config.company_id, error: err.message })
      console.error('Scheduled export error:', err)
    }
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(results) }
}
