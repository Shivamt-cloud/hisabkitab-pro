import { PaymentRecord, PaymentTransaction, OutstandingPayment, PaymentType, PaymentStatus, PaymentMethod } from '../types/payment'
import { saleService } from './saleService'
import { purchaseService } from './purchaseService'
import { getAll, getById, put, STORES } from '../database/db'

export const paymentService = {
  // Initialize payment records from sales and purchases
  initializeFromSalesAndPurchases: async (): Promise<void> => {
    const [sales, purchases] = await Promise.all([
      saleService.getAll(true),
      purchaseService.getAll()
    ])

    const existingRecords = await getAll<PaymentRecord>(STORES.PAYMENT_RECORDS)

    // Process sales
    for (const sale of sales) {
      const existing = existingRecords.find(p => p.type === 'sale' && p.reference_id === sale.id)
      if (!existing) {
        const paidAmount = sale.payment_status === 'paid' ? sale.grand_total : 0
        const pendingAmount = sale.grand_total - paidAmount
        
        const record: PaymentRecord = {
          id: Date.now() + Math.random(), // Unique ID
          type: 'sale',
          reference_id: sale.id,
          reference_number: sale.invoice_number,
          customer_id: sale.customer_id,
          customer_name: sale.customer_name,
          total_amount: sale.grand_total,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          payment_status: sale.payment_status as PaymentStatus,
          payment_method: sale.payment_method as PaymentMethod,
          payment_date: sale.payment_status === 'paid' ? sale.sale_date : undefined,
          created_at: sale.created_at,
          updated_at: sale.updated_at,
        }
        await put(STORES.PAYMENT_RECORDS, record)
      }
    }

    // Process purchases
    for (const purchase of purchases) {
      const existing = existingRecords.find(p => p.type === 'purchase' && p.reference_id === purchase.id)
      if (!existing) {
        const totalAmount = purchase.type === 'gst' 
          ? (purchase as any).grand_total 
          : (purchase as any).total_amount
        const paidAmount = purchase.payment_status === 'paid' ? totalAmount :
                          purchase.payment_status === 'partial' ? (totalAmount * 0.5) : 0
        const pendingAmount = totalAmount - paidAmount

        const record: PaymentRecord = {
          id: Date.now() + Math.random(), // Unique ID
          type: 'purchase',
          reference_id: purchase.id,
          reference_number: (purchase as any).invoice_number || `PUR-${purchase.id}`,
          supplier_id: purchase.type === 'gst' ? (purchase as any).supplier_id : undefined,
          supplier_name: purchase.type === 'gst' ? (purchase as any).supplier_name : 
                        (purchase as any).supplier_name,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          payment_status: purchase.payment_status as PaymentStatus,
          payment_method: purchase.payment_method as PaymentMethod,
          payment_date: purchase.payment_status === 'paid' ? purchase.purchase_date : undefined,
          created_at: purchase.created_at,
          updated_at: (purchase as any).updated_at,
        }
        await put(STORES.PAYMENT_RECORDS, record)
      }
    }
  },

  // Get all payment records
  getAll: async (type?: PaymentType): Promise<PaymentRecord[]> => {
    await paymentService.initializeFromSalesAndPurchases()
    let records = await getAll<PaymentRecord>(STORES.PAYMENT_RECORDS)
    if (type) {
      records = records.filter(p => p.type === type)
    }
    return records
  },

  // Get outstanding payments
  getOutstandingPayments: async (type?: PaymentType): Promise<OutstandingPayment[]> => {
    await paymentService.initializeFromSalesAndPurchases()
    let records = await getAll<PaymentRecord>(STORES.PAYMENT_RECORDS)
    records = records.filter(p => p.pending_amount > 0)
    
    if (type) {
      records = records.filter(p => p.type === type)
    }

    const now = new Date()
    const outstanding = records.map(record => {
      const invoiceDate = new Date(record.created_at)
      const dueDate = record.due_date ? new Date(record.due_date) : null
      const daysOverdue = dueDate && dueDate < now 
        ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined

      return {
        payment_record_id: record.id,
        type: record.type,
        reference_number: record.reference_number,
        customer_id: record.customer_id,
        customer_name: record.customer_name,
        supplier_id: record.supplier_id,
        supplier_name: record.supplier_name,
        total_amount: record.total_amount,
        paid_amount: record.paid_amount,
        pending_amount: record.pending_amount,
        payment_status: record.pending_amount === 0 ? 'paid' : 
                       (dueDate && daysOverdue && daysOverdue > 0 ? 'overdue' : record.payment_status) as PaymentStatus,
        due_date: record.due_date,
        days_overdue: daysOverdue,
        invoice_date: record.created_at,
      }
    }).sort((a, b) => {
      // Sort by overdue first, then by pending amount (highest first)
      if (a.payment_status === 'overdue' && b.payment_status !== 'overdue') return -1
      if (b.payment_status === 'overdue' && a.payment_status !== 'overdue') return 1
      return b.pending_amount - a.pending_amount
    })

    return outstanding
  },

  // Get payment record by ID
  getById: async (id: number): Promise<PaymentRecord | undefined> => {
    await paymentService.initializeFromSalesAndPurchases()
    return await getById<PaymentRecord>(STORES.PAYMENT_RECORDS, id)
  },

  // Get payments by customer
  getByCustomer: async (customerId: number): Promise<PaymentRecord[]> => {
    const records = await paymentService.getAll()
    return records.filter(p => p.customer_id === customerId)
  },

  // Get payments by supplier
  getBySupplier: async (supplierId: number): Promise<PaymentRecord[]> => {
    const records = await paymentService.getAll()
    return records.filter(p => p.supplier_id === supplierId)
  },

  // Add payment transaction
  addPayment: async (paymentRecordId: number, amount: number, paymentMethod: PaymentMethod, 
               paymentDate: string, referenceNumber?: string, notes?: string, userId?: number, userName?: string): Promise<PaymentTransaction> => {
    const record = await paymentService.getById(paymentRecordId)
    if (!record) {
      throw new Error('Payment record not found')
    }

    const transaction: PaymentTransaction = {
      id: Date.now(),
      payment_record_id: paymentRecordId,
      amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      reference_number: referenceNumber,
      notes,
      created_by: userId || 0,
      created_by_name: userName,
      created_at: new Date().toISOString(),
    }

    await put(STORES.PAYMENT_TRANSACTIONS, transaction)

    // Update payment record
    const updatedPaidAmount = record.paid_amount + amount
    const updatedPendingAmount = Math.max(0, record.total_amount - updatedPaidAmount)
    const updatedStatus: PaymentStatus = updatedPendingAmount === 0 ? 'paid' :
                                        updatedPaidAmount > 0 ? 'partial' : 'pending'

    record.paid_amount = updatedPaidAmount
    record.pending_amount = updatedPendingAmount
    record.payment_status = updatedStatus
    record.payment_method = paymentMethod
    if (updatedStatus === 'paid') {
      record.payment_date = paymentDate
    }
    record.updated_at = new Date().toISOString()

    await put(STORES.PAYMENT_RECORDS, record)

    // Update the source record (sale or purchase)
    if (record.type === 'sale') {
      // Update sale payment status
      const sale = await saleService.getById(record.reference_id)
      if (sale) {
        await saleService.update(record.reference_id, {
          payment_status: updatedStatus as any,
          payment_method: paymentMethod as any,
        })
      }
    } else if (record.type === 'purchase') {
      // Update purchase payment status
      const purchase = await purchaseService.getById(record.reference_id)
      if (purchase) {
        await purchaseService.update(record.reference_id, {
          payment_status: updatedStatus as any,
          payment_method: paymentMethod as any,
        })
      }
    }

    return transaction
  },

  // Get payment transactions for a payment record
  getTransactions: async (paymentRecordId: number): Promise<PaymentTransaction[]> => {
    const transactions = await getAll<PaymentTransaction>(STORES.PAYMENT_TRANSACTIONS)
    return transactions
      .filter(t => t.payment_record_id === paymentRecordId)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  },

  // Get all transactions
  getAllTransactions: async (): Promise<PaymentTransaction[]> => {
    const transactions = await getAll<PaymentTransaction>(STORES.PAYMENT_TRANSACTIONS)
    return transactions.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  },

  // Get statistics
  getStats: async () => {
    await paymentService.initializeFromSalesAndPurchases()
    const outstanding = await paymentService.getOutstandingPayments()
    const customerOutstanding = outstanding.filter(p => p.type === 'sale')
    const supplierOutstanding = outstanding.filter(p => p.type === 'purchase')

    return {
      totalOutstanding: outstanding.reduce((sum, p) => sum + p.pending_amount, 0),
      customerOutstanding: customerOutstanding.reduce((sum, p) => sum + p.pending_amount, 0),
      supplierOutstanding: supplierOutstanding.reduce((sum, p) => sum + p.pending_amount, 0),
      customerCount: customerOutstanding.length,
      supplierCount: supplierOutstanding.length,
      overdueCount: outstanding.filter(p => p.payment_status === 'overdue').length,
    }
  },

  // Initialize with existing data (for migration compatibility)
  init: async (records: PaymentRecord[], transactions: PaymentTransaction[]): Promise<void> => {
    for (const record of records) {
      await put(STORES.PAYMENT_RECORDS, record)
    }
    for (const transaction of transactions) {
      await put(STORES.PAYMENT_TRANSACTIONS, transaction)
    }
  },
}
