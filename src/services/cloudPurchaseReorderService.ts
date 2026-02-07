// Cloud Purchase Reorder Service - purchase_reorders and purchase_reorder_items (Supabase + local fallback)
import { supabase, isSupabaseAvailable, isOnline } from './supabaseClient'
import { PurchaseReorder, PurchaseReorderItem, PurchaseReorderStatus } from '../types/purchaseReorder'
import { getAll, getById, put, deleteById, getByIndex, STORES } from '../database/db'

export const cloudPurchaseReorderService = {
  async getAll(companyId?: number | null, status?: PurchaseReorderStatus): Promise<PurchaseReorder[]> {
    if (!isSupabaseAvailable() || !isOnline()) {
      let list = await getAll<PurchaseReorder>(STORES.PURCHASE_REORDERS)
      if (companyId != null) {
        list = list.filter(r => r.company_id === companyId)
      }
      if (status) {
        list = list.filter(r => r.status === status)
      }
      list.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
      for (const reorder of list) {
        reorder.items = await getByIndex<PurchaseReorderItem>(STORES.PURCHASE_REORDER_ITEMS, 'purchase_reorder_id', reorder.id)
      }
      return list
    }

    try {
      let query = supabase!.from('purchase_reorders').select('*')
      if (companyId != null) query = query.eq('company_id', companyId)
      if (status) query = query.eq('status', status)
      const { data: rows, error } = await query.order('order_date', { ascending: false })

      if (error) {
        console.error('Error fetching purchase_reorders:', error)
        let list = await getAll<PurchaseReorder>(STORES.PURCHASE_REORDERS)
        if (companyId != null) list = list.filter(r => r.company_id === companyId)
        if (status) list = list.filter(r => r.status === status)
        list.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
        for (const reorder of list) {
          reorder.items = await getByIndex<PurchaseReorderItem>(STORES.PURCHASE_REORDER_ITEMS, 'purchase_reorder_id', reorder.id)
        }
        return list
      }

      const reorders = (rows || []) as PurchaseReorder[]
      for (const reorder of reorders) {
        const { data: items } = await supabase!
          .from('purchase_reorder_items')
          .select('*')
          .eq('purchase_reorder_id', reorder.id)
          .order('id')
        reorder.items = (items || []) as PurchaseReorderItem[]
        await put(STORES.PURCHASE_REORDERS, reorder)
        for (const item of reorder.items) {
          await put(STORES.PURCHASE_REORDER_ITEMS, item)
        }
      }
      return reorders
    } catch (e) {
      console.error('cloudPurchaseReorderService.getAll:', e)
      let list = await getAll<PurchaseReorder>(STORES.PURCHASE_REORDERS)
      if (companyId != null) list = list.filter(r => r.company_id === companyId)
      if (status) list = list.filter(r => r.status === status)
      list.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
      for (const reorder of list) {
        reorder.items = await getByIndex<PurchaseReorderItem>(STORES.PURCHASE_REORDER_ITEMS, 'purchase_reorder_id', reorder.id)
      }
      return list
    }
  },

  async getById(id: number): Promise<PurchaseReorder | undefined> {
    if (!isSupabaseAvailable() || !isOnline()) {
      const reorder = await getById<PurchaseReorder>(STORES.PURCHASE_REORDERS, id)
      if (!reorder) return undefined
      reorder.items = await getByIndex<PurchaseReorderItem>(STORES.PURCHASE_REORDER_ITEMS, 'purchase_reorder_id', id)
      return reorder
    }

    try {
      const { data: reorder, error } = await supabase!
        .from('purchase_reorders')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !reorder) return undefined

      const { data: items } = await supabase!
        .from('purchase_reorder_items')
        .select('*')
        .eq('purchase_reorder_id', id)
        .order('id')
      const out = { ...reorder, items: (items || []) as PurchaseReorderItem[] } as PurchaseReorder
      await put(STORES.PURCHASE_REORDERS, out)
      for (const item of out.items!) {
        await put(STORES.PURCHASE_REORDER_ITEMS, item)
      }
      return out
    } catch (e) {
      console.error('cloudPurchaseReorderService.getById:', e)
      const reorder = await getById<PurchaseReorder>(STORES.PURCHASE_REORDERS, id)
      if (!reorder) return undefined
      reorder.items = await getByIndex<PurchaseReorderItem>(STORES.PURCHASE_REORDER_ITEMS, 'purchase_reorder_id', id)
      return reorder
    }
  },

  async create(reorder: Omit<PurchaseReorder, 'id' | 'created_at' | 'updated_at'>): Promise<PurchaseReorder> {
    const items = reorder.items || []
    const now = new Date().toISOString()

    if (isSupabaseAvailable() && isOnline()) {
      try {
        const insertHeader = {
          company_id: reorder.company_id,
          type: reorder.type,
          supplier_id: reorder.supplier_id ?? null,
          supplier_name: reorder.supplier_name ?? null,
          supplier_gstin: reorder.supplier_gstin ?? null,
          reorder_number: reorder.reorder_number,
          order_date: reorder.order_date,
          expected_date: reorder.expected_date ?? null,
          status: reorder.status,
          notes: reorder.notes ?? null,
          subtotal: reorder.subtotal,
          total_tax: reorder.total_tax,
          grand_total: reorder.grand_total,
          created_by: reorder.created_by ?? null,
        }
        const { data: header, error: headerError } = await supabase!
          .from('purchase_reorders')
          .insert([insertHeader])
          .select()
          .single()

        if (headerError || !header) {
          console.error('Error creating purchase_reorder:', headerError)
          throw headerError
        }

        const reorderId = (header as PurchaseReorder).id
        if (items.length) {
          const insertItems = items.map(it => ({
            purchase_reorder_id: reorderId,
            product_id: it.product_id,
            product_name: it.product_name ?? null,
            hsn_code: it.hsn_code ?? null,
            gst_rate: it.gst_rate ?? null,
            unit_price: it.unit_price,
            mrp: it.mrp ?? null,
            sale_price: it.sale_price ?? null,
            discount_percentage: it.discount_percentage ?? 0,
            ordered_qty: it.ordered_qty,
            received_qty: it.received_qty ?? 0,
            total: it.total,
            article: it.article ?? null,
            barcode: it.barcode ?? null,
            size: it.size ?? null,
            color: it.color ?? null,
            batch_no: it.batch_no ?? null,
            expiry_date: it.expiry_date ?? null,
          }))
          const { data: insertedItems, error: itemsError } = await supabase!
            .from('purchase_reorder_items')
            .insert(insertItems)
            .select()

          if (itemsError) {
            console.error('Error creating purchase_reorder_items:', itemsError)
            // Header already created; items may be partial – still return header with items we have
          }

          const savedItems = (insertedItems || []) as PurchaseReorderItem[]
          const result: PurchaseReorder = { ...header, items: savedItems } as PurchaseReorder
          await put(STORES.PURCHASE_REORDERS, result)
          for (const item of savedItems) {
            await put(STORES.PURCHASE_REORDER_ITEMS, item)
          }
          return result
        }

        const result = { ...header, items: [] } as PurchaseReorder
        await put(STORES.PURCHASE_REORDERS, result)
        return result
      } catch (e) {
        console.error('cloudPurchaseReorderService.create:', e)
      }
    }

    const newId = Date.now()
    const newReorder: PurchaseReorder = {
      ...reorder,
      id: newId,
      items: [],
      created_at: now,
      updated_at: now,
    }
    const itemsWithReorderId = items.map((it, idx) => ({
      ...it,
      id: newId * 10000 + idx,
      purchase_reorder_id: newId,
      received_qty: it.received_qty ?? 0,
      created_at: now,
      updated_at: now,
    }))
    newReorder.items = itemsWithReorderId
    await put(STORES.PURCHASE_REORDERS, newReorder)
    for (const item of itemsWithReorderId) {
      await put(STORES.PURCHASE_REORDER_ITEMS, item)
    }
    return newReorder
  },

  async update(id: number, data: Partial<PurchaseReorder>): Promise<PurchaseReorder | null> {
    const existing = await this.getById(id)
    if (!existing) return null

    const updated: PurchaseReorder = {
      ...existing,
      ...data,
      id,
      updated_at: new Date().toISOString(),
    }
    if (data.items) updated.items = data.items

    await put(STORES.PURCHASE_REORDERS, updated)

    if (isSupabaseAvailable() && isOnline()) {
      try {
        const headerUpdate: Record<string, unknown> = {
          type: updated.type,
          supplier_id: updated.supplier_id ?? null,
          supplier_name: updated.supplier_name ?? null,
          supplier_gstin: updated.supplier_gstin ?? null,
          reorder_number: updated.reorder_number,
          order_date: updated.order_date,
          expected_date: updated.expected_date ?? null,
          status: updated.status,
          notes: updated.notes ?? null,
          subtotal: updated.subtotal,
          total_tax: updated.total_tax,
          grand_total: updated.grand_total,
          linked_purchase_id: updated.linked_purchase_id ?? null,
          updated_at: updated.updated_at,
        }
        await supabase!.from('purchase_reorders').update(headerUpdate).eq('id', id)

        if (updated.items && updated.items.length) {
          // Delete existing items and re-insert (simplest for sync)
          await supabase!.from('purchase_reorder_items').delete().eq('purchase_reorder_id', id)
          const insertItems = updated.items.map(it => ({
            purchase_reorder_id: id,
            product_id: it.product_id,
            product_name: it.product_name ?? null,
            hsn_code: it.hsn_code ?? null,
            gst_rate: it.gst_rate ?? null,
            unit_price: it.unit_price,
            mrp: it.mrp ?? null,
            sale_price: it.sale_price ?? null,
            discount_percentage: it.discount_percentage ?? 0,
            ordered_qty: it.ordered_qty,
            received_qty: it.received_qty ?? 0,
            total: it.total,
            article: it.article ?? null,
            barcode: it.barcode ?? null,
            size: it.size ?? null,
            color: it.color ?? null,
            batch_no: it.batch_no ?? null,
            expiry_date: it.expiry_date ?? null,
          }))
          await supabase!.from('purchase_reorder_items').insert(insertItems)
        }
      } catch (e) {
        console.error('cloudPurchaseReorderService.update:', e)
      }
    }

    if (updated.items) {
      const existingItems = await getByIndex<PurchaseReorderItem>(STORES.PURCHASE_REORDER_ITEMS, 'purchase_reorder_id', id)
      for (const old of existingItems) {
        await deleteById(STORES.PURCHASE_REORDER_ITEMS, old.id!)
      }
      for (const item of updated.items) {
        const toPut = { ...item, purchase_reorder_id: id, id: item.id ?? Date.now() + Math.random() }
        await put(STORES.PURCHASE_REORDER_ITEMS, toPut)
      }
    }
    return updated
  },

  async delete(id: number): Promise<boolean> {
    const items = await getByIndex<PurchaseReorderItem>(STORES.PURCHASE_REORDER_ITEMS, 'purchase_reorder_id', id)
    for (const item of items) {
      await deleteById(STORES.PURCHASE_REORDER_ITEMS, item.id!)
    }
    await deleteById(STORES.PURCHASE_REORDERS, id)

    if (isSupabaseAvailable() && isOnline()) {
      try {
        await supabase!.from('purchase_reorder_items').delete().eq('purchase_reorder_id', id)
        await supabase!.from('purchase_reorders').delete().eq('id', id)
      } catch (e) {
        console.error('cloudPurchaseReorderService.delete:', e)
      }
    }
    return true
  },
}
