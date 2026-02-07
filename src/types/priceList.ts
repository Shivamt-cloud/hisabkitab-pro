export interface PriceSegment {
  id: number
  name: string
  description?: string
  is_default: boolean
  sort_order: number
  company_id?: number
  created_at?: string
  updated_at?: string
}

export interface ProductSegmentPrice {
  id: number
  product_id: number
  segment_id: number
  price: number
  article?: string // Item-wise: price for product+article. When null, applies to whole product.
  company_id?: number
  created_at?: string
  updated_at?: string
}
