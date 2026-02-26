/**
 * Parse formula strings in purchase/sale/MRP fields.
 * Formulas must start with "=" and include an operator (so you can type =180- then 45%).
 * Examples:
 *   =200-45%  → 200 - 45% of 200 = 110
 *   =200+10%  → 200 + 10% of 200 = 220
 *   =200-45   → 155
 *   =200+50   → 250
 *   =200*1.5  → 300
 *   =200/2    → 100
 * @param input - Raw input (e.g. "=200-45%" or "200")
 * @returns Parsed number or null if not a valid formula/number
 */
export function parsePurchaseFormula(input: string): number | null {
  if (input == null || typeof input !== 'string') return null
  const raw = input.trim()
  if (raw === '') return null

  if (raw.startsWith('=')) {
    const expr = raw.slice(1).trim()
    if (!expr) return null

    // = number ± number%  →  e.g. 200-45% or 200+10%
    const pctMatch = expr.match(/^(\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)\s*%\s*$/)
    if (pctMatch) {
      const base = parseFloat(pctMatch[1])
      const op = pctMatch[2]
      const pct = parseFloat(pctMatch[3]) / 100
      if (op === '-') return Math.round((base * (1 - pct)) * 100) / 100
      return Math.round((base * (1 + pct)) * 100) / 100
    }

    // = number * number  or  = number / number
    const mulDivMatch = expr.match(/^(\d+(?:\.\d+)?)\s*([*/])\s*(\d+(?:\.\d+)?)\s*$/)
    if (mulDivMatch) {
      const a = parseFloat(mulDivMatch[1])
      const op = mulDivMatch[2]
      const b = parseFloat(mulDivMatch[3])
      if (b === 0 && op === '/') return null
      const result = op === '*' ? a * b : a / b
      return Math.round(result * 100) / 100
    }

    // = number ± number  (plain add/subtract)
    const addSubMatch = expr.match(/^(\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)\s*$/)
    if (addSubMatch) {
      const a = parseFloat(addSubMatch[1])
      const op = addSubMatch[2]
      const b = parseFloat(addSubMatch[3])
      const result = op === '+' ? a + b : a - b
      return Math.round(Math.max(0, result) * 100) / 100
    }

    // Do NOT parse plain "=180" - so user can continue typing "=180-45%" etc.
    return null
  }

  // No leading = : treat as plain number
  const num = parseFloat(raw)
  return isNaN(num) ? null : Math.round(num * 100) / 100
}

/**
 * Returns the numeric value to use for a field: if input looks like a formula, parse it; otherwise parse as number.
 */
export function valueFromPurchaseInput(input: string, currentNumber: number): number {
  if (input == null || input === '') return 0
  const trimmed = String(input).trim()
  if (trimmed.startsWith('=')) {
    const parsed = parsePurchaseFormula(trimmed)
    return parsed !== null ? parsed : currentNumber
  }
  const num = parseFloat(trimmed)
  return isNaN(num) ? currentNumber : Math.round(num * 100) / 100
}
