/**
 * Shared message for WhatsApp/Email notify customer – status-aware, all details, Powered by hisabkitabpro.com
 */
import type { ServiceRecord, ServiceVehicleType } from '../types/serviceRecord'
import { SERVICE_PAYMENT_METHODS, SERVICE_STATUS_LABELS, getServiceTotal } from '../types/serviceRecord'
import { POWERED_BY_TEXT } from './exportUtils'

const VEHICLE_LABEL: Record<ServiceVehicleType, string> = {
  bike: 'Bike',
  car: 'Car',
  ebike: 'E-bike',
  ecar: 'E-car',
}

export function getServiceNotifyMessage(
  record: ServiceRecord,
  companyName: string = 'HisabKitab Pro',
  companyAddress?: string
): string {
  const receiptNum = record.receipt_number || `SR-${record.id}`
  const serviceDate = record.service_date
    ? new Date(record.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const nextServiceDate = record.next_service_date
    ? new Date(record.next_service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  const vehicleLabel = VEHICLE_LABEL[record.vehicle_type] || record.vehicle_type
  const paymentMethod =
    record.payment_method && SERVICE_PAYMENT_METHODS[record.payment_method]
      ? SERVICE_PAYMENT_METHODS[record.payment_method]
      : record.payment_method || '—'
  const paymentStatus = record.payment_status === 'paid' ? 'Paid' : 'Pending'
  const statusLabel = record.status && SERVICE_STATUS_LABELS[record.status as keyof typeof SERVICE_STATUS_LABELS]
    ? SERVICE_STATUS_LABELS[record.status as keyof typeof SERVICE_STATUS_LABELS]
    : record.status || '—'

  let message = `*${companyName}*\n`
  if (companyAddress) message += `${companyAddress}\n`
  message += `\n*SERVICE UPDATE #${receiptNum}*\n`
  message += `Date: ${serviceDate}\n`
  message += `*Status: ${statusLabel}*\n`
  message += `Customer: ${record.customer_name || '—'}\n`
  message += `Vehicle: ${vehicleLabel} · ${record.vehicle_number || '—'}\n`
  message += `Service: ${record.service_type || '—'}\n`
  if (record.description) message += `Details: ${record.description}\n`
  if (record.technician_name) message += `Technician: ${record.technician_name}\n`
  if (nextServiceDate) message += `Next service due: ${nextServiceDate}\n`
  message += `\n*Total: ₹${getServiceTotal(record).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`
  if (record.status === 'completed') {
    message += `Payment: ${paymentMethod} · ${paymentStatus}\n`
  }
  message += `\nThank you for your business! 🙏\n\n`
  message += POWERED_BY_TEXT
  return message
}

/** Days left until next service (0 = today, positive = future) */
export function getDaysUntilNextService(nextServiceDate: string | null | undefined): number | null {
  if (!nextServiceDate) return null
  const due = new Date(nextServiceDate)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  return diff >= 0 ? diff : null
}

/**
 * Message for upcoming service reminder – "X days left for your next service", due date, company. Premium Plus only.
 */
export function getUpcomingServiceReminderMessage(
  record: ServiceRecord,
  companyName: string = 'HisabKitab Pro',
  companyAddress?: string
): string {
  const vehicleLabel = VEHICLE_LABEL[record.vehicle_type] || record.vehicle_type
  const nextDate = record.next_service_date
    ? new Date(record.next_service_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const daysLeft = getDaysUntilNextService(record.next_service_date)
  const customerName = (record.customer_name || '').trim() || 'Customer'
  const vehicleInfo = `${vehicleLabel}${record.vehicle_number ? ` · ${record.vehicle_number}` : ''}`

  let message = `Hi ${customerName}! 👋\n\n`
  message += `*Reminder: Your next service is coming up*\n\n`
  if (daysLeft !== null) {
    if (daysLeft === 0) message += `📅 *Your vehicle is due for service today!*\n\n`
    else if (daysLeft === 1) message += `📅 *Only 1 day left* for your next service.\n\n`
    else message += `📅 *${daysLeft} days left* for your next service.\n\n`
  }
  message += `Vehicle: ${vehicleInfo}\n`
  message += `Due date: ${nextDate}\n`
  if (record.service_type) message += `Last service: ${record.service_type}\n`
  message += `\nPlease visit us for your next service. We look forward to serving you! 🙏\n\n`
  if (companyAddress) message += `${companyName}\n${companyAddress}\n\n`
  else message += `${companyName}\n\n`
  message += POWERED_BY_TEXT
  return message
}
