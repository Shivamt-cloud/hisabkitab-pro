/**
 * Netlify Function: Create Razorpay order (server-side).
 * POST body: { amount: number, currency?: string, receipt?: string }
 * Returns: Razorpay order object (id, amount, currency, ...)
 *
 * Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (set in Netlify Dashboard or .env for netlify dev)
 */

const Razorpay = require('razorpay')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

exports.handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const amount = body.amount
  const currency = (body.currency || 'INR').toUpperCase()
  const receipt = body.receipt || `rcpt_${Date.now()}`

  if (typeof amount !== 'number' || amount <= 0) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid amount. Send amount in main unit (e.g. 500 for ₹500).' }),
    }
  }

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
    // Razorpay expects amount in paise (smallest currency unit)
    const amountPaise = Math.round(amount * 100)
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt: String(receipt).slice(0, 40),
    })
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(order),
    }
  } catch (err) {
    console.error('Razorpay create order error:', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: err.message || 'Failed to create order',
      }),
    }
  }
}
