# How to Create a Razorpay API (Backend)

Your app currently creates Razorpay orders **on the client** (mock/fake). For real payments you need a **backend API** that:

1. **Creates orders** using your Razorpay **secret key** (never expose this in the browser).
2. **Verifies payment** by checking the signature Razorpay returns after payment.

Below are two ways to do it. **Option A (Netlify Functions)** fits your current setup (Netlify + same repo).

---

## Option A: Netlify Functions (Recommended)

Same repo, same deploy. No separate server.

### 1. Install Razorpay Node SDK

```bash
npm install razorpay
```

### 2. Create the API functions

- **Create order:** `netlify/functions/razorpay-create-order.js`
- **Verify payment:** `netlify/functions/razorpay-verify-payment.js`

(These files are added in the repo; see contents below.)

### 3. Configure Netlify

In `netlify.toml` you only need build + publish (already there). Functions are auto-discovered from `netlify/functions/`.

### 4. Set environment variables (Netlify)

In **Netlify Dashboard → Site → Environment variables** add:

| Variable | Value | Notes |
|----------|--------|--------|
| `RAZORPAY_KEY_ID` | `rzp_test_xxxx` or `rzp_live_xxxx` | Same as frontend key |
| `RAZORPAY_KEY_SECRET` | Your secret | **Never** put this in frontend / .env committed to git |

For local testing, create `.env` in project root (and add `.env` to `.gitignore` if not already):

```env
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your_secret_here
```

Netlify CLI can load `.env` when you run `netlify dev`.

### 5. API endpoints (after deploy)

- **Create order:** `POST https://your-site.netlify.app/.netlify/functions/razorpay-create-order`
- **Verify payment:** `POST https://your-site.netlify.app/.netlify/functions/razorpay-verify-payment`

Locally with `netlify dev`: `http://localhost:8888/.netlify/functions/razorpay-create-order` (and same for verify).

### 6. Frontend (already wired)

The app’s `razorpayService` already uses the API when available:

- **Create order:** Calls `POST /.netlify/functions/razorpay-create-order` (same-origin or `VITE_RAZORPAY_API_BASE`).
- **Verify payment:** Calls `POST /.netlify/functions/razorpay-verify-payment` and trusts the backend result when the API is configured.

**Env (optional):** Set `VITE_RAZORPAY_API_BASE` only if the frontend is on a different domain than the API (e.g. `https://your-app.netlify.app`). For same-origin (app and functions on same Netlify site), leave it unset so the app uses relative paths.

---

## Option B: Separate Node/Express server

Use this if you host the backend elsewhere (e.g. Railway, Render, VPS).

### 1. New project

```bash
mkdir razorpay-api && cd razorpay-api
npm init -y
npm install express razorpay cors
```

### 2. Create order (Express)

```js
// server.js
const express = require('express')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Create order
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
    })
    res.json(order)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Verify payment
app.post('/api/razorpay/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
  const secret = process.env.RAZORPAY_KEY_SECRET
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const ok = expected === razorpay_signature
  res.json({ verified: ok })
})

app.listen(process.env.PORT || 4000)
```

Run with `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` set. Then point the frontend to this server’s base URL for create-order and verify-payment.

---

## Razorpay flow (recap)

1. **Frontend:** User clicks “Proceed to Payment” → you call your **create-order** API with amount, currency, receipt.
2. **Backend:** Create order via Razorpay SDK (`razorpay.orders.create`) → return `order.id` (and optionally amount/currency) to frontend.
3. **Frontend:** Open Razorpay Checkout with that `order_id` and your **key_id** (public). User pays.
4. **Razorpay:** Calls your `handler` with `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
5. **Frontend:** Sends those three to your **verify-payment** API.
6. **Backend:** Computes `HMAC-SHA256(order_id + "|" + payment_id, key_secret)` and compares to `razorpay_signature`. If match → payment is authentic.
7. **Backend/Frontend:** Update subscription / show success.

---

## Security checklist

- Never put `RAZORPAY_KEY_SECRET` in frontend or in repo.
- Always verify signature on the backend before trusting a payment.
- Use HTTPS in production.
- For production, use Razorpay **live** keys and ensure webhooks (optional but recommended) are set up from Razorpay dashboard.

---

## Files added in this repo (Option A)

- `netlify/functions/razorpay-create-order.js` – creates order via Razorpay SDK.
- `netlify/functions/razorpay-verify-payment.js` – verifies signature with Node `crypto`.

After adding these and env vars, wire the frontend `razorpayService` to call these endpoints (see “Frontend” in Option A above).
