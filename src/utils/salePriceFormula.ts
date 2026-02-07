/**
 * Sale price suggestion formula for purchase forms.
 * User can choose how suggested sale price is calculated from purchase price and MRP.
 */

export type SaleFormulaType = 'use_mrp' | 'markup_on_cost' | 'discount_from_mrp' | 'fixed_markup' | 'fixed_discount'

export interface SaleFormulaConfig {
  type: SaleFormulaType
  /** For markup_on_cost: 30 = 30%. For discount_from_mrp: 10 = 10% off. For fixed_markup/fixed_discount: amount in ₹ */
  value: number
}

const STORAGE_KEY = 'purchase_sale_formula'

const DEFAULT_FORMULA: SaleFormulaConfig = {
  type: 'use_mrp',
  value: 30,
}

export function getSaleFormula(): SaleFormulaConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as SaleFormulaConfig
      if (parsed.type && ['use_mrp', 'markup_on_cost', 'discount_from_mrp', 'fixed_markup', 'fixed_discount'].includes(parsed.type)) {
        return { ...DEFAULT_FORMULA, ...parsed }
      }
    }
  } catch (_) {}
  return DEFAULT_FORMULA
}

export function setSaleFormula(config: SaleFormulaConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export interface SuggestedSaleResult {
  value: number
  description: string
}

/**
 * Calculate suggested sale price from purchase price and MRP.
 */
export function getSuggestedSale(purchasePrice: number, mrp: number, config?: SaleFormulaConfig): SuggestedSaleResult | null {
  const formula = config ?? getSaleFormula()
  if (purchasePrice <= 0) return null

  let value: number
  let description: string

  switch (formula.type) {
    case 'use_mrp':
      value = mrp > 0 ? mrp : purchasePrice
      description = mrp > 0 ? `MRP (₹${mrp.toFixed(2)})` : 'MRP not set, using purchase'
      break
    case 'markup_on_cost':
      value = Math.round(purchasePrice * (1 + (formula.value || 0) / 100) * 100) / 100
      description = `Purchase (₹${purchasePrice.toFixed(2)}) + ${formula.value}% markup`
      break
    case 'discount_from_mrp': {
      const baseMrpD = mrp > 0 ? mrp : purchasePrice
      value = Math.round(baseMrpD * (1 - (formula.value || 0) / 100) * 100) / 100
      description = mrp > 0
        ? `MRP (₹${mrp.toFixed(2)}) − ${formula.value}% discount`
        : `MRP not set, Purchase (₹${purchasePrice.toFixed(2)}) − ${formula.value}%`
      break
    }
    case 'fixed_markup':
      value = Math.round((purchasePrice + (formula.value || 0)) * 100) / 100
      description = `Purchase (₹${purchasePrice.toFixed(2)}) + ₹${(formula.value || 0).toFixed(2)}`
      break
    case 'fixed_discount': {
      const baseMrpF = mrp > 0 ? mrp : purchasePrice
      value = Math.round((baseMrpF - (formula.value || 0)) * 100) / 100
      description = mrp > 0
        ? `MRP (₹${mrp.toFixed(2)}) − ₹${(formula.value || 0).toFixed(2)}`
        : `Purchase (₹${purchasePrice.toFixed(2)}) − ₹${(formula.value || 0).toFixed(2)}`
      break
    }
    default:
      value = mrp > 0 ? mrp : purchasePrice
      description = 'MRP'
  }

  return { value, description }
}

export const FORMULA_OPTIONS: { type: SaleFormulaType; label: string; valueLabel: string }[] = [
  { type: 'use_mrp', label: 'Use MRP', valueLabel: '' },
  { type: 'markup_on_cost', label: 'Markup on cost (%)', valueLabel: '%' },
  { type: 'discount_from_mrp', label: 'Discount from MRP (%)', valueLabel: '% off' },
  { type: 'fixed_markup', label: 'Fixed markup (₹)', valueLabel: '₹' },
  { type: 'fixed_discount', label: 'Fixed discount (₹)', valueLabel: '₹ off' },
]
