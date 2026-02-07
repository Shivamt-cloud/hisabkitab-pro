/**
 * Plan-wise feature mapping – Basic, Standard, Premium
 * System Settings: Admin only (not plan-based)
 * Free trial: Premium features for 1 month, then switch to selected plan
 */

export type PlanTier = 'basic' | 'standard' | 'premium'

/** Feature keys for plan-based gating */
export type PlanFeature =
  // Report Summary Cards
  | 'report_total_sales'
  | 'report_total_purchases'
  | 'report_total_profit'
  | 'report_total_products'
  | 'report_low_stock'
  | 'report_out_of_stock'
  | 'report_upcoming_checks'
  // Sales Options
  | 'sales_quick_sale'
  | 'sales_new_sale'
  | 'sales_new_sale_tab'
  | 'sales_history'
  // Purchase Options
  | 'purchase_customers'
  | 'purchase_suppliers'
  | 'purchase_gst'
  | 'purchase_simple'
  | 'purchase_history'
  | 'purchase_upcoming_checks'
  | 'purchase_sales_category_mgmt'
  // Expense Options
  | 'expense_daily_expenses'
  | 'expense_daily_report'
  // Dashboard sections
  | 'dashboard_cash_flow'
  | 'dashboard_top_5_products'
  | 'dashboard_top_5_customers'
  | 'dashboard_outstanding_summary'
  | 'dashboard_sales_target'
  // Reports (pages)
  | 'report_daily_activity'
  | 'report_sales'
  | 'report_purchases'
  | 'report_profit_analysis'
  | 'report_expenses'
  | 'report_comparative'
  | 'report_commission'
  | 'report_ca'
  | 'report_customer_insights'
  | 'report_outstanding'
  // Reorder (list + form): not on basic
  | 'purchase_reorder'
  // Settings / admin-only (show with lock for non-admin)
  | 'settings_barcode_label'
  | 'settings_receipt_printer'
  | 'settings_automated_exports'
  | 'settings_backup_restore'
  | 'report_business_overview'

/** Minimum plan required for each feature. Used by PlanUpgradeModal and ProtectedRoute to show "Standard" or "Premium" correctly. */
export const PLAN_FEATURE_MAP: Record<PlanFeature, PlanTier | 'admin'> = {
  // Report cards: Basic gets 4, Standard gets 6, Premium gets all 7
  report_total_sales: 'basic',
  report_total_purchases: 'basic',
  report_total_profit: 'standard',
  report_total_products: 'basic',
  report_low_stock: 'basic',
  report_out_of_stock: 'standard',
  report_upcoming_checks: 'premium',
  // Sales options
  sales_quick_sale: 'standard',
  sales_new_sale: 'basic',
  sales_new_sale_tab: 'basic',
  sales_history: 'standard',
  // Purchase options
  purchase_customers: 'basic',
  purchase_suppliers: 'basic',
  purchase_gst: 'basic',
  purchase_simple: 'basic',
  purchase_history: 'standard',
  purchase_upcoming_checks: 'premium',
  purchase_sales_category_mgmt: 'standard',
  // Expense options
  expense_daily_expenses: 'basic',
  expense_daily_report: 'standard',
  // Dashboard sections – only Cash flow for Standard; rest Premium
  dashboard_cash_flow: 'standard',
  dashboard_top_5_products: 'premium',
  dashboard_top_5_customers: 'premium',
  dashboard_outstanding_summary: 'premium',
  dashboard_sales_target: 'premium',
  // Reports
  report_daily_activity: 'standard',
  report_sales: 'basic',
  report_purchases: 'basic',
  report_profit_analysis: 'standard',
  report_expenses: 'standard',
  report_comparative: 'premium',
  report_commission: 'premium',
  report_ca: 'premium',
  report_customer_insights: 'premium',
  report_outstanding: 'premium',
  purchase_reorder: 'standard',
  settings_barcode_label: 'admin',
  settings_receipt_printer: 'admin',
  settings_automated_exports: 'admin',
  settings_backup_restore: 'basic',
  report_business_overview: 'standard',
}

/** Human-readable labels for upgrade modal (only for plan-gated features we show in UI) */
export const PLAN_FEATURE_LABELS: Partial<Record<PlanFeature, string>> = {
  report_total_sales: 'Total Sales',
  report_total_purchases: 'Total Purchases',
  report_total_profit: 'Total Profit',
  report_total_products: 'Total Products',
  report_low_stock: 'Low Stock Alert',
  report_out_of_stock: 'Out of Stock',
  report_upcoming_checks: 'Upcoming Checks',
  report_daily_activity: 'Daily Activity Report',
  report_sales: 'Sales Reports',
  report_purchases: 'Purchase Reports',
  report_profit_analysis: 'Profit Analysis',
  report_expenses: 'Expense Reports',
  report_comparative: 'Comparative Reports',
  report_commission: 'Commission Reports',
  report_ca: 'CA Reports (GSTR-1, GSTR-2, GSTR-3B)',
  report_customer_insights: 'Customer Insights',
  report_outstanding: 'Outstanding Payments',
  purchase_reorder: 'Reorder List & Reorder Form',
  purchase_gst: 'GST Purchase',
  purchase_history: 'Purchase History',
  purchase_upcoming_checks: 'Upcoming Checks',
  purchase_sales_category_mgmt: 'Sales & Category Management',
  dashboard_cash_flow: 'Cash Flow',
  dashboard_top_5_products: 'Top 5 Products',
  dashboard_top_5_customers: 'Top 5 Customers',
  dashboard_outstanding_summary: 'Outstanding Summary',
  dashboard_sales_target: 'Sales Target',
  settings_barcode_label: 'Barcode Label Settings',
  settings_receipt_printer: 'Receipt Printer Settings',
  settings_automated_exports: 'Automated Exports',
  settings_backup_restore: 'Backup & Restore',
  report_business_overview: 'Business Overview',
  sales_quick_sale: 'Quick Sale',
  sales_history: 'Sales History',
  expense_daily_expenses: 'Daily Expenses',
  expense_daily_report: 'Daily Report',
}

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
}

export function getRequiredPlanTierForFeature(feature: PlanFeature): PlanTier | null {
  const t = PLAN_FEATURE_MAP[feature]
  return t === 'admin' ? null : (t as PlanTier)
}

const PLAN_ORDER: Record<PlanTier, number> = { basic: 1, standard: 2, premium: 3 }

export function hasPlanFeature(
  tier: PlanTier | null | undefined,
  feature: PlanFeature,
  isAdmin: boolean
): boolean {
  if (!tier) return false
  if (isAdmin) return true
  const required = PLAN_FEATURE_MAP[feature]
  if (required === 'admin') return false
  return PLAN_ORDER[tier] >= PLAN_ORDER[required]
}

/** During free trial, effective tier is premium */
export function getEffectiveTier(
  tier: PlanTier | null | undefined,
  isFreeTrial: boolean,
  trialEndDate?: string | null
): PlanTier {
  if (!tier) return 'basic'
  if (isFreeTrial && trialEndDate && new Date(trialEndDate) >= new Date()) {
    return 'premium'
  }
  return tier
}
