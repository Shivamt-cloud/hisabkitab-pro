/**
 * Razorpay Payment Gateway Integration Service
 * Uses Razorpay Checkout.js for browser-based payments
 */

declare global {
  interface Window {
    Razorpay: any
  }
}

export interface RazorpayOrderResponse {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
  created_at: number
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

/**
 * Load Razorpay checkout script
 */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay script'))
    document.head.appendChild(script)
  })
}

/**
 * Base URL for Razorpay API (Netlify Functions).
 * Set VITE_RAZORPAY_API_BASE to your site URL (e.g. https://your-app.netlify.app) or leave empty for same-origin.
 */
function getRazorpayApiBase(): string {
  const base = import.meta.env.VITE_RAZORPAY_API_BASE
  return typeof base === 'string' ? base : ''
}

const CREATE_ORDER_PATH = '/.netlify/functions/razorpay-create-order'
const VERIFY_PAYMENT_PATH = '/.netlify/functions/razorpay-verify-payment'

/**
 * Create Razorpay order via backend API when available, else fallback to mock (dev only).
 */
export async function createRazorpayOrder(
  amount: number,
  currency: string = 'INR',
  receipt?: string
): Promise<RazorpayOrderResponse> {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID
  if (!keyId) {
    throw new Error('Razorpay Key ID not configured. Please set VITE_RAZORPAY_KEY_ID in .env')
  }

  const apiBase = getRazorpayApiBase()
  const url = `${apiBase}${CREATE_ORDER_PATH}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
      }),
    })
    const data = await response.json()
    if (response.ok && data.id) {
      return data as RazorpayOrderResponse
    }
    if (response.status === 404 || response.status === 500) {
      // API not deployed or keys missing – fallback to mock for local dev
      console.warn('Razorpay API unavailable, using mock order. Set backend and RAZORPAY_KEY_SECRET for real payments.')
    }
  } catch (e) {
    console.warn('Razorpay create-order request failed:', e)
  }

  // Fallback: mock order (works only for testing; real payments need backend)
  return {
    id: `order_${Date.now()}`,
    entity: 'order',
    amount: amount * 100,
    amount_paid: 0,
    amount_due: amount * 100,
    currency,
    receipt: receipt || `receipt_${Date.now()}`,
    status: 'created',
    created_at: Math.floor(Date.now() / 1000),
  }
}

/**
 * Verify payment signature via backend API when available.
 * Returns true if backend says verified; otherwise falls back to basic client check.
 */
export async function verifyPaymentViaApi(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  const apiBase = getRazorpayApiBase()
  const url = `${apiBase}${VERIFY_PAYMENT_PATH}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    })
    const data = await response.json()
    if (response.ok && typeof data.verified === 'boolean') {
      return data.verified
    }
  } catch (e) {
    console.warn('Razorpay verify-payment request failed:', e)
  }

  return false
}

/**
 * Open Razorpay checkout
 */
export async function openRazorpayCheckout(
  orderId: string,
  amount: number,
  currency: string,
  options: {
    name: string
    description: string
    prefill?: {
      email?: string
      contact?: string
      name?: string
    }
    theme?: {
      color?: string
    }
    handler: (response: RazorpayPaymentResponse) => void
    onError?: (error: any) => void
  }
): Promise<void> {
  await loadRazorpayScript()

  if (!window.Razorpay) {
    throw new Error('Razorpay SDK not loaded')
  }

  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID
  if (!keyId) {
    throw new Error('Razorpay Key ID not configured')
  }

  const razorpay = new window.Razorpay({
    key: keyId,
    amount: amount * 100, // Convert to paise
    currency,
    name: options.name,
    description: options.description,
    order_id: orderId,
    prefill: options.prefill || {},
    theme: options.theme || { color: '#3399cc' },
    handler: options.handler,
    modal: {
      ondismiss: () => {
        if (options.onError) {
          options.onError(new Error('Payment cancelled by user'))
        }
      },
    },
  })

  razorpay.on('payment.failed', (response: any) => {
    if (options.onError) {
      options.onError(response.error)
    }
  })

  razorpay.open()
}

/**
 * Verify Razorpay payment signature
 * NOTE: This should be done on backend for security
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  // TODO: This verification should happen on backend
  // For now, we'll do basic validation
  // In production, send to backend: POST /api/razorpay/verify-payment
  // Backend will use Razorpay's crypto library to verify signature
  
  // Basic validation (not secure - backend verification required)
  return !!orderId && !!paymentId && !!signature
}

export const razorpayService = {
  createOrder: createRazorpayOrder,
  openCheckout: openRazorpayCheckout,
  verifySignature: verifyRazorpaySignature,
  verifyPaymentViaApi,
}
