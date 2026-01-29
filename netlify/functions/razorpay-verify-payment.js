/**
 * Netlify Function: Verify Razorpay payment signature (server-side).
 * POST body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Returns: { verified: boolean }
 *
 * Env: RAZORPAY_KEY_SECRET (set in Netlify Dashboard or .env for netlify dev)
 */

const crypto = require('crypto')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

exports.handler = async (event, context) => {
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

  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Razorpay key secret not configured. Set RAZORPAY_KEY_SECRET.',
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

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Missing razorpay_order_id, razorpay_payment_id or razorpay_signature',
      }),
    }
  }

  // Razorpay: HMAC-SHA256(order_id + "|" + payment_id, secret) = signature
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const verified = expectedSignature === razorpay_signature

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ verified }),
  }
}
