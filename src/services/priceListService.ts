import { getAll, put, getById, deleteById, getByIndex, STORES } from '../database/db'
import type { PriceSegment, ProductSegmentPrice } from '../types/priceList'

const DEFAULT_SEGMENTS: Omit<PriceSegment, 'id'>[] = [
  { name: 'Retail', description: 'Standard retail pricing', is_default: true, sort_order: 1 },
  { name: 'Wholesale', description: 'Bulk/wholesale pricing', is_default: false, sort_order: 2 },
  { name: 'VIP', description: 'VIP / preferred customer pricing', is_default: false, sort_order: 3 },
  { name: 'Distributor', description: 'Distributor pricing', is_default: false, sort_order: 4 },
  { name: 'Corporate', description: 'Corporate / B2B pricing', is_default: false, sort_order: 5 },
  { name: 'Walk-in', description: 'Walk-in customer pricing', is_default: false, sort_order: 6 },
  { name: 'Online', description: 'Online / e-commerce pricing', is_default: false, sort_order: 7 },
]

async function ensureDefaultSegments(companyId?: number): Promise<void> {
  const existing = await getAll<PriceSegment>(STORES.PRICE_SEGMENTS)
  if (existing.length > 0) return
  for (let i = 0; i < DEFAULT_SEGMENTS.length; i++) {
    const seg = DEFAULT_SEGMENTS[i]
    await put(STORES.PRICE_SEGMENTS, {
      ...seg,
      id: Date.now() + i,
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
}

export const priceSegmentService = {
  getAll: async (companyId?: number | null): Promise<PriceSegment[]> => {
    await ensureDefaultSegments(companyId ?? undefined)
    let segments = await getAll<PriceSegment>(STORES.PRICE_SEGMENTS)
    if (companyId != null) {
      segments = segments.filter(s => s.company_id == null || s.company_id === companyId)
    }
    segments = segments.sort((a, b) => a.sort_order - b.sort_order)
    // Deduplicate by name (keep first occurrence to avoid duplicate dropdown options)
    const seen = new Set<string>()
    return segments.filter(s => {
      const key = (s.name || '').toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  },

  getById: async (id: number): Promise<PriceSegment | undefined> => {
    return await getById<PriceSegment>(STORES.PRICE_SEGMENTS, id)
  },

  getDefault: async (companyId?: number | null): Promise<PriceSegment | undefined> => {
    const segments = await priceSegmentService.getAll(companyId)
    return segments.find(s => s.is_default) ?? segments[0]
  },

  create: async (segment: Omit<PriceSegment, 'id' | 'created_at' | 'updated_at'>): Promise<PriceSegment> => {
    const newSeg: PriceSegment = {
      ...segment,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await put(STORES.PRICE_SEGMENTS, newSeg)
    return newSeg
  },

  update: async (id: number, segment: Partial<PriceSegment>): Promise<PriceSegment | null> => {
    const existing = await getById<PriceSegment>(STORES.PRICE_SEGMENTS, id)
    if (!existing) return null
    const updated: PriceSegment = {
      ...existing,
      ...segment,
      updated_at: new Date().toISOString(),
    }
    await put(STORES.PRICE_SEGMENTS, updated)
    return updated
  },

  delete: async (id: number): Promise<boolean> => {
    try {
      await deleteById(STORES.PRICE_SEGMENTS, id)
      return true
    } catch {
      return false
    }
  },
}

export const productSegmentPriceService = {
  getAll: async (companyId?: number | null): Promise<ProductSegmentPrice[]> => {
    let prices = await getAll<ProductSegmentPrice>(STORES.PRODUCT_SEGMENT_PRICES)
    if (companyId != null) {
      prices = prices.filter(p => p.company_id == null || p.company_id === companyId)
    }
    return prices
  },

  getByProduct: async (productId: number, companyId?: number | null): Promise<ProductSegmentPrice[]> => {
    const all = await productSegmentPriceService.getAll(companyId)
    return all.filter(p => p.product_id === productId)
  },

  getPrice: async (
    productId: number,
    segmentId: number,
    companyId?: number | null,
    article?: string | null
  ): Promise<number | undefined> => {
    const all = await productSegmentPriceService.getAll(companyId)
    const articleNorm = (article ?? '').toString().trim() || undefined
    // Item-wise: look for product+segment+article first, then product+segment (product-level fallback)
    const exact = all.find(
      p =>
        p.product_id === productId &&
        p.segment_id === segmentId &&
        ((articleNorm && ((p.article ?? '').toString().trim()) === articleNorm) ||
          (!articleNorm && !(p.article ?? '').toString().trim()))
    )
    if (exact) return exact.price
    if (articleNorm) {
      const productLevel = all.find(
        p =>
          p.product_id === productId &&
          p.segment_id === segmentId &&
          !(p.article ?? '').toString().trim()
      )
      return productLevel?.price
    }
    return undefined
  },

  /** Key for product-level price (no article) */
  priceKey: (productId: number, segmentId: number, article?: string | null): string => {
    const a = article?.trim() || ''
    return a ? `p${productId}_s${segmentId}_a${a}` : `p${productId}_s${segmentId}`
  },

  getPricesMap: async (companyId?: number | null): Promise<Map<string, number>> => {
    const all = await productSegmentPriceService.getAll(companyId)
    const map = new Map<string, number>()
    all.forEach(p => {
      const key = productSegmentPriceService.priceKey(p.product_id, p.segment_id, p.article)
      map.set(key, p.price)
    })
    return map
  },

  setPrice: async (
    productId: number,
    segmentId: number,
    price: number,
    companyId?: number,
    article?: string | null
  ): Promise<ProductSegmentPrice> => {
    const all = await productSegmentPriceService.getAll(companyId ?? null)
    const articleNorm = (article ?? '').toString().trim() || undefined
    const existing = all.find(p => {
      if (p.product_id !== productId || p.segment_id !== segmentId) return false
      const pArticle = (p.article ?? '').toString().trim() || undefined
      return (articleNorm === undefined && pArticle === undefined) || (articleNorm !== undefined && articleNorm === pArticle)
    })
    const now = new Date().toISOString()
    if (existing) {
      const updated: ProductSegmentPrice = { ...existing, price, article: articleNorm, updated_at: now }
      await put(STORES.PRODUCT_SEGMENT_PRICES, updated)
      return updated
    }
    const newPrice: ProductSegmentPrice = {
      id: Date.now(),
      product_id: productId,
      segment_id: segmentId,
      price,
      article: articleNorm,
      company_id: companyId,
      created_at: now,
      updated_at: now,
    }
    await put(STORES.PRODUCT_SEGMENT_PRICES, newPrice)
    return newPrice
  },

  setPrices: async (
    productId: number,
    prices: { segment_id: number; price: number }[],
    companyId?: number
  ): Promise<void> => {
    for (const { segment_id, price } of prices) {
      await productSegmentPriceService.setPrice(productId, segment_id, price, companyId)
    }
  },

  deleteByProduct: async (productId: number): Promise<void> => {
    const all = await getAll<ProductSegmentPrice>(STORES.PRODUCT_SEGMENT_PRICES)
    for (const p of all.filter(x => x.product_id === productId)) {
      await deleteById(STORES.PRODUCT_SEGMENT_PRICES, p.id)
    }
  },
}
