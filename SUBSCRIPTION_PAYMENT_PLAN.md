# Subscription Payment Integration Plan

## Overview
This document outlines the plan for integrating payment gateways to enable subscription recharge/renewal for HisabKitab-Pro.

## Current State
- **Subscription Plans**: Basic, Standard, Premium
- **Pricing**: Country-based pricing (India: ₹6,000/year, US: $720/year, etc.)
- **Display Location**: Subscription info shown below user menu in Dashboard
- **Current Flow**: Manual payment processing (no online payment integration)

## Proposed Payment Gateway Options

### 1. **Razorpay** (Recommended Primary Option)
**Pros:**
- ✅ Most popular in India (supports 100+ payment methods)
- ✅ Supports UPI, Cards, Net Banking, Wallets, EMI
- ✅ Good documentation and SDK
- ✅ Supports international payments
- ✅ Subscription/recurring payment support
- ✅ Webhook support for payment verification

**Cons:**
- ⚠️ Requires business verification
- ⚠️ Transaction fees (~2% + GST)

**Best For:** Primary payment gateway, especially for Indian market

### 2. **PhonePe Payment Gateway**
**Pros:**
- ✅ Very popular in India
- ✅ UPI-first approach
- ✅ Good for UPI payments

**Cons:**
- ⚠️ Limited international support
- ⚠️ Less comprehensive than Razorpay

**Best For:** Secondary option, UPI-focused payments

### 3. **Stripe** (For International)
**Pros:**
- ✅ Excellent international support
- ✅ Supports cards, Apple Pay, Google Pay globally
- ✅ Subscription management built-in
- ✅ Strong security

**Cons:**
- ⚠️ Higher fees for Indian cards
- ⚠️ Less popular in India

**Best For:** International customers (US, UK, EU, etc.)

### 4. **Direct UPI Integration**
**Pros:**
- ✅ No gateway fees
- ✅ Direct payment

**Cons:**
- ⚠️ Requires manual verification
- ⚠️ No automatic payment confirmation
- ⚠️ More complex implementation

**Best For:** Small businesses, manual processing

## Recommended Approach: Hybrid Model

### Primary: Razorpay (India & International)
- Supports all Indian payment methods (UPI, Cards, Wallets, Net Banking)
- Supports international cards
- Good for 80% of users

### Secondary: Stripe (International Focus)
- For users in US, UK, EU who prefer Stripe
- Better international card support

## Implementation Plan

### Phase 1: UI/UX Design

#### 1.1 Add "Recharge/Renew" Button
**Location:** Dashboard → Subscription Details Section (below user menu)

**UI Flow:**
```
[Subscription Info Card]
├── Plan: Premium Plan
├── Status: Active
├── End Date: 29 Jan 2027
├── Days Remaining: 365 days
└── [🔄 Recharge/Renew] Button (New)
```

**Button States:**
- **Active Subscription**: "Recharge" (add more days)
- **Expiring Soon (<30 days)**: "Renew Now" (prominent, orange/red)
- **Expired**: "Activate Subscription" (prominent, red)

#### 1.2 Payment Modal/Page
**Components Needed:**
1. **Plan Selection** (if upgrading/downgrading)
2. **Duration Selection** (1 month, 3 months, 6 months, 1 year)
3. **Payment Method Selection**
4. **Payment Gateway Integration**
5. **Payment Status/Confirmation**

**UI Structure:**
```
┌─────────────────────────────────────┐
│  Subscription Recharge             │
├─────────────────────────────────────┤
│  Current Plan: Premium              │
│  Select Duration:                   │
│  ○ 1 Month  - ₹500                 │
│  ○ 3 Months - ₹1,350 (10% off)    │
│  ● 1 Year   - ₹6,000 (50% off)    │
│                                     │
│  Total: ₹6,000                      │
│  GST (18%): ₹1,080                 │
│  ─────────────────────             │
│  Final Amount: ₹7,080               │
│                                     │
│  Payment Method:                    │
│  ○ UPI                              │
│  ○ Credit/Debit Card                │
│  ○ Net Banking                      │
│  ○ Wallets (Paytm, PhonePe)        │
│                                     │
│  [Proceed to Payment]               │
└─────────────────────────────────────┘
```

### Phase 2: Backend/Database Changes

#### 2.1 Database Schema Updates

**New Table: `subscription_payments`**
```sql
CREATE TABLE subscription_payments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  user_id INTEGER REFERENCES users(id),
  subscription_tier VARCHAR(20) NOT NULL, -- 'basic', 'standard', 'premium'
  amount DECIMAL(10, 2) NOT NULL,
  gst_amount DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_gateway VARCHAR(50), -- 'razorpay', 'stripe', 'phonepe', 'manual'
  payment_method VARCHAR(50), -- 'upi', 'card', 'netbanking', 'wallet'
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'refunded'
  gateway_order_id VARCHAR(255), -- Razorpay order ID
  gateway_payment_id VARCHAR(255), -- Razorpay payment ID
  gateway_signature VARCHAR(500), -- For verification
  duration_months INTEGER NOT NULL, -- 1, 3, 6, 12
  subscription_start_date DATE,
  subscription_end_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Update `companies` table:**
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_payments DECIMAL(10, 2) DEFAULT 0;
```

#### 2.2 IndexedDB Updates

**New Store: `SUBSCRIPTION_PAYMENTS`**
```typescript
interface SubscriptionPayment {
  id: number
  company_id?: number
  user_id?: number
  subscription_tier: 'basic' | 'standard' | 'premium'
  amount: number
  gst_amount: number
  total_amount: number
  currency: string
  payment_gateway?: 'razorpay' | 'stripe' | 'phonepe' | 'manual'
  payment_method?: string
  payment_status: 'pending' | 'success' | 'failed' | 'refunded'
  gateway_order_id?: string
  gateway_payment_id?: string
  gateway_signature?: string
  duration_months: number
  subscription_start_date?: string
  subscription_end_date?: string
  notes?: string
  created_at: string
  updated_at: string
}
```

### Phase 3: Payment Gateway Integration

#### 3.1 Razorpay Integration

**Setup Required:**
1. Create Razorpay account
2. Get API keys (Key ID & Key Secret)
3. Configure webhook URL
4. Set up test mode for development

**Implementation Steps:**

**Step 1: Install Razorpay SDK**
```bash
npm install razorpay
```

**Step 2: Create Razorpay Service**
```typescript
// src/services/razorpayService.ts
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: import.meta.env.VITE_RAZORPAY_KEY_ID,
  key_secret: import.meta.env.VITE_RAZORPAY_KEY_SECRET,
})

export const razorpayService = {
  createOrder: async (amount: number, currency: string = 'INR') => {
    // Create order in Razorpay
  },
  
  verifyPayment: async (orderId: string, paymentId: string, signature: string) => {
    // Verify payment signature
  },
  
  capturePayment: async (paymentId: string, amount: number) => {
    // Capture payment
  }
}
```

**Step 3: Payment Flow**
```
1. User clicks "Recharge"
2. Select plan & duration
3. Calculate amount (with GST)
4. Create Razorpay order
5. Open Razorpay checkout
6. User completes payment
7. Verify payment via webhook/callback
8. Update subscription dates
9. Show confirmation
```

#### 3.2 Stripe Integration (Optional, for International)

**Setup Required:**
1. Create Stripe account
2. Get publishable key & secret key
3. Configure webhook

**Implementation:**
```typescript
// src/services/stripeService.ts
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export const stripeService = {
  createCheckoutSession: async (amount: number, currency: string) => {
    // Create Stripe checkout session
  },
  
  verifyPayment: async (sessionId: string) => {
    // Verify payment
  }
}
```

### Phase 4: Frontend Implementation

#### 4.1 New Components

**1. `SubscriptionRechargeModal.tsx`**
- Plan selection
- Duration selection
- Amount calculation
- Payment method selection
- Payment gateway integration

**2. `PaymentStatusPage.tsx`**
- Payment success/failure page
- Payment history

**3. `PaymentHistory.tsx`**
- List of all subscription payments
- Filter by status, date range

#### 4.2 Update Existing Components

**Update `Dashboard.tsx`:**
- Add "Recharge" button in subscription details
- Show payment history link

**Update `UserMenu.tsx`:**
- Optionally show quick recharge option

### Phase 5: Payment Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User Clicks "Recharge"                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  1. Open Recharge Modal                                 │
│     - Show current plan                                 │
│     - Select duration (1/3/6/12 months)                │
│     - Calculate amount (with GST)                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  2. Select Payment Method                               │
│     - UPI / Card / Net Banking / Wallets               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  3. Create Payment Order                                │
│     - Call backend API                                  │
│     - Create Razorpay order                            │
│     - Get order ID                                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  4. Open Payment Gateway                                │
│     - Razorpay Checkout                                │
│     - User completes payment                           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  5. Payment Callback                                    │
│     - Razorpay redirects to success page               │
│     - Verify payment signature                         │
│     - Update subscription dates                        │
│     - Save payment record                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  6. Show Confirmation                                    │
│     - Payment success message                           │
│     - Updated subscription dates                       │
│     - Download receipt (optional)                      │
└─────────────────────────────────────────────────────────┘
```

### Phase 6: Security & Verification

#### 6.1 Payment Verification
- **Server-side verification**: Always verify payment on backend
- **Signature verification**: Verify Razorpay signature
- **Webhook handling**: Handle payment status updates via webhooks
- **Idempotency**: Prevent duplicate payments

#### 6.2 Environment Variables
```env
# Razorpay
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
VITE_RAZORPAY_KEY_SECRET=xxxxx
VITE_RAZORPAY_WEBHOOK_SECRET=xxxxx

# Stripe (Optional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_STRIPE_SECRET_KEY=sk_test_xxxxx
```

### Phase 7: Features to Implement

#### 7.1 Core Features
- ✅ Recharge existing subscription
- ✅ Upgrade/downgrade plan
- ✅ Multiple payment methods (UPI, Card, Net Banking, Wallets)
- ✅ Payment history
- ✅ Receipt generation
- ✅ Email confirmation

#### 7.2 Advanced Features (Future)
- 🔄 Auto-renewal (recurring payments)
- 🔄 Payment reminders (before expiry)
- 🔄 Promo codes/discounts
- 🔄 Payment plans (monthly/yearly)
- 🔄 Refund handling
- 🔄 Payment analytics

### Phase 8: Testing Plan

#### 8.1 Test Scenarios
1. **Successful Payment**
   - UPI payment
   - Card payment
   - Net banking payment

2. **Failed Payment**
   - Payment declined
   - Network error
   - Timeout

3. **Edge Cases**
   - Duplicate payment prevention
   - Payment verification failure
   - Webhook handling

#### 8.2 Test Payment Methods
- Use Razorpay test mode
- Test with test UPI IDs
- Test with test cards

## Recommended Implementation Order

### Sprint 1: Foundation
1. Database schema updates
2. IndexedDB store creation
3. Basic UI components (Recharge button, modal)

### Sprint 2: Razorpay Integration
1. Razorpay SDK integration
2. Order creation
3. Payment checkout flow
4. Payment verification

### Sprint 3: Payment Processing
1. Webhook handling
2. Subscription date updates
3. Payment history
4. Receipt generation

### Sprint 4: Polish & Testing
1. Error handling
2. Loading states
3. Success/failure pages
4. Testing & bug fixes

## Cost Considerations

### Razorpay Fees
- **UPI**: 0% (for transactions < ₹2,000), then 0.5-1%
- **Cards**: 2% + GST
- **Net Banking**: 2% + GST
- **Wallets**: 2% + GST

### Pricing Strategy
- Include gateway fees in pricing OR
- Add gateway fees on top (transparent)

## Next Steps

1. **Decide on Payment Gateway**: Razorpay (primary) + Stripe (optional)
2. **Create Razorpay Account**: Get API keys
3. **Design UI Mockups**: Payment flow screens
4. **Start Implementation**: Begin with Sprint 1

## Questions to Answer

1. **Gateway Fees**: Include in price or add separately?
2. **Auto-renewal**: Enable automatic renewal?
3. **Refund Policy**: What's the refund policy?
4. **Payment Methods**: Which methods to support initially?
5. **International**: Support Stripe for international users?

---

**Document Version**: 1.0  
**Last Updated**: January 29, 2026  
**Status**: Planning Phase
