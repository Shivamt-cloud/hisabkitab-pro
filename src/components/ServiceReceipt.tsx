import { useRef } from 'react'
import type { ServiceRecord, ServiceVehicleType } from '../types/serviceRecord'
import { SERVICE_PAYMENT_METHODS, SERVICE_STATUS_LABELS, getServiceSubtotal, getServiceDiscountValue, getServiceTotal } from '../types/serviceRecord'
import { Printer, MessageCircle, Mail, CalendarClock } from 'lucide-react'
import { LockIcon } from './icons/LockIcon'
import { exportHTMLToPDF, POWERED_BY_TEXT, POWERED_BY_URL } from '../utils/exportUtils'
import { getServiceNotifyMessage, getUpcomingServiceReminderMessage, getDaysUntilNextService } from '../utils/serviceNotifyMessage'

function formatPhoneForWhatsApp(phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) return '91' + digits
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits.length >= 10 ? '91' + digits.slice(-10) : null
}

const VEHICLE_LABEL: Record<ServiceVehicleType, string> = {
  bike: 'Bike',
  car: 'Car',
  ebike: 'E-bike',
  ecar: 'E-car',
}

interface ServiceReceiptProps {
  record: ServiceRecord
  companyName?: string
  companyAddress?: string
  onClose?: () => void
  canNotifyCustomer?: boolean
  onUpgradePlan?: () => void
}

export function ServiceReceipt({ record, companyName = 'HisabKitab', companyAddress, onClose, canNotifyCustomer, onUpgradePlan }: ServiceReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const serviceDate = record.service_date
    ? new Date(record.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const nextServiceDate = record.next_service_date
    ? new Date(record.next_service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  const paymentMethod =
    record.payment_method && SERVICE_PAYMENT_METHODS[record.payment_method]
      ? SERVICE_PAYMENT_METHODS[record.payment_method]
      : record.payment_method || '—'
  const paymentStatus = record.payment_status === 'paid' ? 'Paid' : 'Pending'
  const vehicleLabel = VEHICLE_LABEL[record.vehicle_type] || record.vehicle_type

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return
    const id = `service-receipt-${record.id}-${Date.now()}`
    receiptRef.current.setAttribute('id', id)
    try {
      await exportHTMLToPDF(id, `Service_Receipt_${record.receipt_number || record.id}`, {
        format: 'a4',
        orientation: 'portrait',
        margin: 12,
      })
    } finally {
      receiptRef.current.removeAttribute('id')
    }
  }

  const getReceiptMessage = () =>
    getServiceNotifyMessage(record, companyName, companyAddress)

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getReceiptMessage())}`, '_blank')
  }

  const handleWhatsAppToCustomer = () => {
    const phone = record.customer_phone && formatPhoneForWhatsApp(record.customer_phone)
    if (!phone) return
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(getReceiptMessage())}`, '_blank')
  }

  const handleEmailToCustomer = () => {
    const email = (record.customer_email || '').trim()
    if (!email) return
    const statusLabel = record.status && SERVICE_STATUS_LABELS[record.status as keyof typeof SERVICE_STATUS_LABELS]
      ? SERVICE_STATUS_LABELS[record.status as keyof typeof SERVICE_STATUS_LABELS]
      : record.status || 'Update'
    const subject = `Service ${statusLabel} #${record.receipt_number || record.id} - ${companyName}`
    const body = getReceiptMessage().replace(/\*/g, '')
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const daysUntilNext = getDaysUntilNextService(record.next_service_date)
  const upcomingMessage = getUpcomingServiceReminderMessage(record, companyName, companyAddress)

  const handleUpcomingWhatsApp = () => {
    const phone = record.customer_phone && formatPhoneForWhatsApp(record.customer_phone)
    if (!phone) return
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(upcomingMessage)}`, '_blank')
  }

  const handleUpcomingEmail = () => {
    const email = (record.customer_email || '').trim()
    if (!email) return
    const subject = `Reminder: Your next service in ${daysUntilNext === 0 ? 'today' : `${daysUntilNext} day${daysUntilNext === 1 ? '' : 's'}`} - ${companyName}`
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(upcomingMessage.replace(/\*/g, ''))}`
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <h2 className="text-lg font-semibold text-gray-900 shrink-0">Service receipt</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            title="Share via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            Share WhatsApp
          </button>
          {(record.customer_phone || record.customer_email) && (
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2 ml-2">
              <span className="text-xs text-gray-500 font-medium">Notify customer:</span>
              {canNotifyCustomer ? (
                <>
                  {record.customer_phone && formatPhoneForWhatsApp(record.customer_phone) && (
                    <button
                      type="button"
                      onClick={handleWhatsAppToCustomer}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium"
                      title="Send receipt to customer via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  )}
                  {(record.customer_email || '').trim() && (
                    <button
                      type="button"
                      onClick={handleEmailToCustomer}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                      title="Email receipt to customer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onUpgradePlan}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 text-xs font-medium border border-gray-300"
                  title="Upgrade to Premium Plus to notify customer"
                >
                  <LockIcon className="w-3.5 h-3.5" />
                  Premium Plus
                </button>
              )}
            </div>
          )}
          {(record.customer_phone || record.customer_email) && daysUntilNext !== null && (
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2 ml-2">
              <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5" />
                {daysUntilNext === 0 ? 'Due today' : `${daysUntilNext} day${daysUntilNext === 1 ? '' : 's'} left`}:
              </span>
              {canNotifyCustomer ? (
                <>
                  {record.customer_phone && formatPhoneForWhatsApp(record.customer_phone) && (
                    <button
                      type="button"
                      onClick={handleUpcomingWhatsApp}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-xs font-medium"
                      title="Remind customer about upcoming service via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  )}
                  {(record.customer_email || '').trim() && (
                    <button
                      type="button"
                      onClick={handleUpcomingEmail}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium"
                      title="Remind customer about upcoming service via Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onUpgradePlan}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 text-xs font-medium border border-gray-300"
                  title="Upgrade to Premium Plus to remind customer"
                >
                  <LockIcon className="w-3.5 h-3.5" />
                  Premium Plus
                </button>
              )}
            </div>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Close
            </button>
          )}
        </div>
      </div>

      <div ref={receiptRef} className="p-6 md:p-8 print:p-4" id={`service-receipt-${record.id}`}>
        <div className="max-w-md mx-auto">
          <div className="text-center border-b border-gray-300 pb-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
            {companyAddress && <p className="text-sm text-gray-600 mt-1">{companyAddress}</p>}
            <p className="text-sm font-semibold text-gray-700 mt-3">SERVICE RECEIPT</p>
          </div>

          <div className="space-y-2 text-sm">
            {(record.receipt_number || record.id) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Receipt #</span>
                <span className="font-medium">{record.receipt_number || `SR-${record.id}`}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Service date</span>
              <span className="font-medium">{serviceDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicle type</span>
              <span className="font-medium">{vehicleLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer</span>
              <span className="font-medium">{record.customer_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vehicle number</span>
              <span className="font-medium">{record.vehicle_number || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service type</span>
              <span className="font-medium">{record.service_type || '—'}</span>
            </div>
            {record.description && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Description</span>
                <span className="font-medium text-right max-w-[60%]">{record.description}</span>
              </div>
            )}
            {nextServiceDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Next service due</span>
                <span className="font-medium">{nextServiceDate}</span>
              </div>
            )}
            {daysUntilNext !== null && (record.customer_phone || record.customer_email) && (
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 p-4 mt-4 print:hidden">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  {daysUntilNext === 0 ? 'Due today' : daysUntilNext === 1 ? '1 day left' : `${daysUntilNext} days left`} for next service
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  {canNotifyCustomer ? 'Send a reminder to the customer via WhatsApp or Email using the buttons above.' : 'Upgrade to Premium Plus to send reminder via WhatsApp or Email.'}
                </p>
              </div>
            )}
            {(record.technician_name || record.technician_phone) && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Serviced by</span>
                <span className="font-medium text-right">
                  {[record.technician_name, record.technician_phone].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
            {record.status && (
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-medium capitalize">{record.status.replace(/_/g, ' ')}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 mt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service amount</span>
                <span>₹{record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {(record.parts_total ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Parts / products</span>
                  <span>₹{(record.parts_total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {getServiceDiscountValue(record) > 0 && (
                <div className="flex justify-between text-sm text-amber-700">
                  <span>Discount{(record.discount_percentage ?? 0) > 0 && (record.discount_amount ?? 0) > 0 ? '' : (record.discount_percentage ?? 0) > 0 ? ' (%)' : ' (₹)'}</span>
                  <span>− ₹{getServiceDiscountValue(record).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1">
                <span>Total</span>
                <span>₹{getServiceTotal(record).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-600">Payment method</span>
              <span className="font-medium">{paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment status</span>
              <span className={`font-medium ${record.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                {paymentStatus}
              </span>
            </div>
            {record.payment_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Payment date</span>
                <span className="font-medium">
                  {new Date(record.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">Thank you for your business</p>
          <p className="text-center mt-2 text-xs">
            <a
              href={POWERED_BY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {POWERED_BY_TEXT}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
