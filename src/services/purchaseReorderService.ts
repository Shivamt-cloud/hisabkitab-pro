// Purchase Reorder Service - place order, history, mark received → create purchase + update stock
import { cloudPurchaseReorderService } from './cloudPurchaseReorderService'
import { cloudPurchaseService } from './cloudPurchaseService'
import { productService } from './productService'
import { PurchaseReorder, PurchaseReorderItem, PurchaseReorderType } from '../types/purchaseReorder'
import { PurchaseItem, GSTPurchase, SimplePurchase } from '../types/purchase'
import { generateReorderNumber } from '../utils/companyCodeHelper'

export const purchaseReorderService = {
  getAll: (companyId?: number | null, status?: import('../types/purchaseReorder').PurchaseReorderStatus) =>
    cloudPurchaseReorderService.getAll(companyId, status),

  getById: (id: number) => cloudPurchaseReorderService.getById(id),

  async getNextReorderNumber(companyId: number | undefined | null): Promise<string> {
    const list = await cloudPurchaseReorderService.getAll(companyId ?? undefined)
    const existing = list.map(r => r.reorder_number).filter(Boolean)
    return generateReorderNumber(companyId, existing)
  },

  create: (reorder: Omit<PurchaseReorder, 'id' | 'created_at' | 'updated_at'>) =>
    cloudPurchaseReorderService.create(reorder),

  update: (id: number, data: Partial<PurchaseReorder>) =>
    cloudPurchaseReorderService.update(id, data),

  delete: (id: number) => cloudPurchaseReorderService.delete(id),

  /**
   * Mark reorder as received: create Purchase (GST or Simple) from items with received_qty > 0,
   * update stock, set reorder.linked_purchase_id and status (received or partial_received).
   */
  async markReceived(
    reorderId: number,
    itemsWithReceivedQty: { id?: number; product_id: number; received_qty: number; unit_price?: number; product_name?: string; hsn_code?: string; gst_rate?: number }[]
  ): Promise<{ purchase: GSTPurchase | SimplePurchase; reorder: PurchaseReorder } | null> {
    const reorder = await cloudPurchaseReorderService.getById(reorderId)
    if (!reorder || !reorder.items || reorder.items.length === 0) return null
    if (reorder.status === 'cancelled') return null

    const receivedMap = new Map(
      itemsWithReceivedQty.map(it => [`${it.product_id}`, { received_qty: it.received_qty, unit_price: it.unit_price, product_name: it.product_name, hsn_code: it.hsn_code, gst_rate: it.gst_rate }])
    )
    const purchaseItems: PurchaseItem[] = []
    const updatedReorderItems: PurchaseReorderItem[] = []

    for (const line of reorder.items) {
      const rec = receivedMap.get(String(line.product_id))
      const receivedQty = rec ? rec.received_qty : (line.received_qty ?? 0)
      const unitPrice = rec?.unit_price ?? line.unit_price
      updatedReorderItems.push({
        ...line,
        received_qty: receivedQty,
        unit_price: unitPrice,
        total: Math.round(receivedQty * unitPrice * 100) / 100,
      })
      if (receivedQty > 0) {
        purchaseItems.push({
          product_id: line.product_id,
          product_name: line.product_name ?? rec?.product_name,
          quantity: receivedQty,
          unit_price: unitPrice,
          total: Math.round(receivedQty * unitPrice * 100) / 100,
          hsn_code: line.hsn_code ?? rec?.hsn_code,
          gst_rate: line.gst_rate ?? rec?.gst_rate,
          tax_amount: 0,
          purchase_type: 'purchase',
        })
      }
    }

    if (purchaseItems.length === 0) return null

    const subtotal = purchaseItems.reduce((s, i) => s + i.total, 0)
    const totalTax = reorder.type === 'gst'
      ? purchaseItems.reduce((s, i) => s + (i.gst_rate ?? 0) / 100 * i.total, 0)
      : 0
    const grandTotal = Math.round((subtotal + totalTax) * 100) / 100

    const purchaseDate = new Date().toISOString().slice(0, 10)
    const companyId = reorder.company_id
    const createdBy = (reorder as any).created_by

    let purchase: GSTPurchase | SimplePurchase

    if (reorder.type === 'gst') {
      const gstPurchase: Omit<GSTPurchase, 'id' | 'created_at' | 'updated_at'> = {
        type: 'gst',
        purchase_date: purchaseDate,
        supplier_id: reorder.supplier_id!,
        supplier_name: reorder.supplier_name,
        supplier_gstin: reorder.supplier_gstin,
        invoice_number: `RO-${reorder.reorder_number}`,
        items: purchaseItems,
        subtotal,
        total_tax: totalTax,
        cgst_amount: totalTax / 2,
        sgst_amount: totalTax / 2,
        igst_amount: 0,
        grand_total: grandTotal,
        payment_status: 'pending',
        company_id: companyId,
        created_by: createdBy ?? 0,
      }
      purchase = await cloudPurchaseService.create(gstPurchase) as GSTPurchase
    } else {
      const simplePurchase: Omit<SimplePurchase, 'id' | 'created_at' | 'updated_at'> = {
        type: 'simple',
        purchase_date: purchaseDate,
        supplier_id: reorder.supplier_id,
        supplier_name: reorder.supplier_name,
        invoice_number: `RO-${reorder.reorder_number}`,
        items: purchaseItems,
        total_amount: grandTotal,
        payment_status: 'pending',
        company_id: companyId,
        created_by: createdBy ?? 0,
      }
      purchase = await cloudPurchaseService.create(simplePurchase) as SimplePurchase
    }

    // Update product stock
    for (const item of purchase.items) {
      const product = await productService.getById(item.product_id, true)
      if (product) {
        await productService.updateStock(item.product_id, item.quantity, 'add')
        const updates: Record<string, unknown> = {}
        if (item.unit_price || item.sale_price) {
          updates.purchase_price = item.unit_price ?? product.purchase_price
          updates.selling_price = item.sale_price ?? product.selling_price
        }
        if (Object.keys(updates).length > 0) {
          await productService.update(item.product_id, updates)
        }
      }
    }

    const allReceived = updatedReorderItems.every(it => (it.received_qty ?? 0) >= (it.ordered_qty ?? 0))
    const newStatus = allReceived ? 'received' : 'partial_received'
    const updatedReorder = await cloudPurchaseReorderService.update(reorderId, {
      status: newStatus,
      linked_purchase_id: purchase.id,
      items: updatedReorderItems,
    })

    return updatedReorder ? { purchase, reorder: updatedReorder } : null
  },
}
