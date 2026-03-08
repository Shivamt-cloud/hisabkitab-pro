/**
 * Shared helpers for sale payment breakdown.
 * Used by Sales Report and Daily Report so Cash/UPI/etc. = sum of Payment column amounts (paid sales only).
 */
import type { Sale } from '../types/sale'

/** Parse payment methods from edit audit in internal_remarks (e.g. "Payment: cash ₹220 → card ₹100, cash ₹100, upi ₹20") */
export function parsePaymentMethodsFromRemarks(
  internalRemarks: string | undefined
): Array<{ method: string; amount: number }> | null {
  if (!internalRemarks || typeof internalRemarks !== 'string') return null
  const regex = /Payment:\s*[^→]+→\s*([^\n━]+)/g
  const matches = [...internalRemarks.matchAll(regex)]
  const lastMatch = matches[matches.length - 1]
  if (!lastMatch) return null
  const rightSide = lastMatch[1].trim()
  const pairRegex = /(\w+)\s*₹\s*([\d.]+)/g
  const pairs: Array<{ method: string; amount: number }> = []
  let m: RegExpExecArray | null
  while ((m = pairRegex.exec(rightSide)) !== null) {
    pairs.push({ method: m[1].toLowerCase(), amount: parseFloat(m[2]) || 0 })
  }
  return pairs.length > 0 ? pairs : null
}

/** Normalize payment_methods (may be string from DB/IndexedDB). Drops received_at for display. Returns array or null. */
export function normalizePaymentMethods(
  sale: Sale
): Array<{ method: string; amount: number }> | null {
  let raw = sale.payment_methods
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as Array<{ method: string; amount: number; received_at?: string }>
    } catch {
      return null
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(p => ({
      method: String(p?.method || '').trim() || 'other',
      amount: Number(p?.amount) || 0,
    }))
  }
  return null
}

/**
 * Get balance collections (payments with received_at) in a date range.
 * Used by Daily Report to show "collections received today" (e.g. balance on collection).
 */
export function getBalanceCollectionsInDateRange(
  sales: Sale[],
  dateStartMs: number,
  dateEndMs: number
): Array<{ method: string; amount: number }> {
  const methodMap = new Map<string, number>()
  sales.forEach(sale => {
    let raw = sale.payment_methods
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw) as Array<{ method: string; amount: number; received_at?: string }>
      } catch {
        return
      }
    }
    if (!Array.isArray(raw)) return
    raw.forEach((p: { method?: string; amount?: number; received_at?: string }) => {
      const receivedAt = p?.received_at
      if (!receivedAt) return
      const t = new Date(receivedAt).getTime()
      if (t < dateStartMs || t >= dateEndMs) return
      const amount = Number(p?.amount) || 0
      if (amount <= 0) return
      const key = (String(p?.method || '').trim() || 'other').toLowerCase()
      methodMap.set(key, (methodMap.get(key) || 0) + amount)
    })
  })
  return Array.from(methodMap.entries())
    .map(([method, amount]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Get payments for a single sale that were received in the date range.
 * For alteration sales: ONLY payments with received_at count (balance on collection) - initial payment was taken earlier.
 * For regular sales: payments without received_at are attributed to sale_date.
 */
export function getPaymentsReceivedInDateRangeForSale(
  sale: Sale,
  dateStartMs: number,
  dateEndMs: number
): Array<{ method: string; amount: number }> {
  if (sale.payment_status !== 'paid') return []
  const saleDateMs = new Date(sale.sale_date).getTime()
  const isAlteration = !!sale.hold_for_alteration
  let raw: unknown = sale.payment_methods
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = []
    }
  }
  const arr = Array.isArray(raw) ? raw : []
  const result: Array<{ method: string; amount: number }> = []
  if (arr.length > 0) {
    arr.forEach((p: { method?: string; amount?: number; received_at?: string }) => {
      const amount = Number(p?.amount) || 0
      if (amount <= 0) return
      if (isAlteration && !p?.received_at) return // Alteration: only count balance (received_at), not initial payment
      const dateMs = p?.received_at ? new Date(p.received_at).getTime() : saleDateMs
      if (dateMs >= dateStartMs && dateMs < dateEndMs) {
        const key = (String(p?.method || '').trim() || 'other').toLowerCase()
        result.push({ method: key.charAt(0).toUpperCase() + key.slice(1), amount })
      }
    })
    return result
  }
  if (!isAlteration && saleDateMs >= dateStartMs && saleDateMs < dateEndMs && sale.payment_method && sale.grand_total != null) {
    const returnAmount = Number(sale.return_amount) || 0
    const net = Math.max(0, sale.grand_total - returnAmount)
    if (net > 0) {
      const key = (sale.payment_method || '').toLowerCase().trim() || 'cash'
      result.push({ method: key.charAt(0).toUpperCase() + key.slice(1), amount: net })
    }
  }
  return result
}

/**
 * Get collections for a date range, attributing each payment to the day it was actually received:
 * - Alteration sales: ONLY payments with received_at (balance on collection) - initial was taken earlier
 * - Regular sales: payments without received_at attributed to sale_date
 */
export function getCollectionsForDateRange(
  allSales: Sale[],
  dateStartMs: number,
  dateEndMs: number
): Array<{ method: string; amount: number }> {
  const methodMap = new Map<string, number>()
  allSales.forEach(sale => {
    if (sale.payment_status !== 'paid') return
    const saleDateMs = new Date(sale.sale_date).getTime()
    const isAlteration = !!sale.hold_for_alteration
    let raw: unknown = sale.payment_methods
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw)
      } catch {
        raw = []
      }
    }
    const arr = Array.isArray(raw) ? raw : []
    if (arr.length > 0) {
      arr.forEach((p: { method?: string; amount?: number; received_at?: string }) => {
        const amount = Number(p?.amount) || 0
        if (amount <= 0) return
        if (isAlteration && !p?.received_at) return
        const dateMs = p?.received_at ? new Date(p.received_at).getTime() : saleDateMs
        if (dateMs < dateStartMs || dateMs >= dateEndMs) return
        const key = (String(p?.method || '').trim() || 'other').toLowerCase()
        methodMap.set(key, (methodMap.get(key) || 0) + amount)
      })
      return
    }
    if (!isAlteration && saleDateMs >= dateStartMs && saleDateMs < dateEndMs && sale.payment_method && sale.grand_total != null) {
      const returnAmount = Number(sale.return_amount) || 0
      const net = Math.max(0, sale.grand_total - returnAmount)
      if (net > 0) {
        const key = (sale.payment_method || '').toLowerCase().trim() || 'cash'
        methodMap.set(key, (methodMap.get(key) || 0) + net)
      }
    }
  })
  return Array.from(methodMap.entries())
    .map(([method, amount]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Get effective payment methods for a sale = same as Payment column in Sales Report.
 * From payment_methods, or parsed from internal_remarks, or null (then use payment_method + grand_total).
 */
export function getPaymentMethodsForDisplay(
  sale: Sale
): Array<{ method: string; amount: number }> | null {
  const fromColumn = normalizePaymentMethods(sale)
  if (fromColumn && fromColumn.length > 0) return fromColumn
  return parsePaymentMethodsFromRemarks(sale.internal_remarks)
}

const PAYMENT_METHOD_ORDER = ['cash', 'upi', 'card', 'credit', 'other']

/**
 * Net payment per method after deducting return_amount (money given back to customer).
 * Return is allocated in order: cash first, then upi, card, etc.
 */
function netPaymentMethods(
  methods: Array<{ method: string; amount: number }>,
  returnAmount: number
): Array<{ key: string; amount: number }> {
  if (returnAmount <= 0) {
    return methods.map(p => ({
      key: (p.method || '').toLowerCase().trim() || 'other',
      amount: Number(p.amount) || 0,
    }))
  }
  const list = methods.map(p => ({
    key: (p.method || '').toLowerCase().trim() || 'other',
    amount: Number(p.amount) || 0,
  }))
  list.sort((a, b) => {
    const ai = PAYMENT_METHOD_ORDER.indexOf(a.key)
    const bi = PAYMENT_METHOD_ORDER.indexOf(b.key)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  let remaining = returnAmount
  return list.map(({ key, amount }) => {
    const deduct = Math.min(amount, Math.max(0, remaining))
    remaining -= deduct
    return { key, amount: Math.max(0, amount - deduct) }
  })
}

/**
 * Net payment methods for one sale (after deducting return_amount).
 * Use for aggregation so Cash/UPI show actual amount kept, not gross payment.
 */
export function getNetPaymentMethodsForSale(
  sale: Sale
): Array<{ method: string; amount: number }> {
  const returnAmount = Number(sale.return_amount) || 0
  const methods = getPaymentMethodsForDisplay(sale)
  if (methods && methods.length > 0) {
    const net = netPaymentMethods(methods, returnAmount)
    return net
      .filter(n => n.amount > 0)
      .map(n => ({ method: n.key.charAt(0).toUpperCase() + n.key.slice(1), amount: n.amount }))
  }
  if (sale.payment_method && sale.grand_total != null) {
    const net = Math.max(0, sale.grand_total - returnAmount)
    if (net > 0) {
      const key = (sale.payment_method || '').toLowerCase().trim() || 'cash'
      return [{ method: key.charAt(0).toUpperCase() + key.slice(1), amount: net }]
    }
  }
  return []
}

/**
 * Build payment-by-method totals from sales (paid only) = net received per method.
 * Deducts return_amount (money given back) so Cash/UPI show actual amount kept.
 * e.g. Customer paid ₹3000 cash, return ₹600 → Cash shows ₹2400.
 */
export function aggregatePaymentMethodsFromSales(
  sales: Sale[]
): Array<{ method: string; amount: number }> {
  const methodMap = new Map<string, number>()
  sales.forEach(sale => {
    if (sale.payment_status !== 'paid') return
    const returnAmount = Number(sale.return_amount) || 0
    const methods = getPaymentMethodsForDisplay(sale)
    if (methods && methods.length > 0) {
      const net = netPaymentMethods(methods, returnAmount)
      net.forEach(({ key, amount }) => {
        if (amount > 0) methodMap.set(key, (methodMap.get(key) || 0) + amount)
      })
    } else if (sale.payment_method && sale.grand_total != null) {
      const key = (sale.payment_method || '').toLowerCase().trim() || 'cash'
      const net = Math.max(0, sale.grand_total - returnAmount)
      if (net > 0) methodMap.set(key, (methodMap.get(key) || 0) + net)
    }
  })
  return Array.from(methodMap.entries())
    .map(([method, amount]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
}
