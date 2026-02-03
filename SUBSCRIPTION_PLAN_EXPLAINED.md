# Subscription Plan – How It Works & Where to Change It

This doc explains how subscription plans are defined and where to change them.

---

## 1. The Three Plans (Tiers)

| Tier      | Display Name   | Devices   | Max Users | Price vs Basic   |
|-----------|----------------|-----------|-----------|-------------------|
| **basic** | Basic Plan     | 1 device + 1 mobile | 3 users   | Base price (1×)   |
| **standard** | Standard Plan | 3 devices + 1 mobile | 10 users  | ~33% more (1.33×) |
| **premium** | Premium Plan  | Unlimited | Unlimited | 2× basic          |

These are the only three tiers in the app. The type is `SubscriptionTier = 'basic' | 'standard' | 'premium'`.

---

## 2. Where Plans Are Defined (What You Can Change)

### A. Tier info: name, device limit, price multiplier

**File:** `src/utils/tierPricing.ts`

- **TIER_PRICING** – name, device limit, and **multiplier** (used to get price from base yearly price).
- **Basic:** multiplier `1.0`, 1 device.
- **Standard:** multiplier `1.33`, 3 devices.
- **Premium:** multiplier `2.0`, unlimited devices.

Change here if you want to:
- Rename plans (e.g. "Starter" instead of "Basic").
- Change device limits (e.g. Standard = 5 devices).
- Change relative pricing (e.g. Standard = 1.5× basic).

---

### B. Max users per plan

**File:** `src/utils/planUserLimits.ts`

- **PLAN_USER_LIMITS** – `maxUsers` per tier (Basic: 3, Standard: 10, Premium: unlimited).

Change here if you want different user limits per plan (e.g. Basic: 5, Standard: 20).

---

### C. Country-wise base price (yearly, discounted)

**File:** `src/utils/pricing.ts`

- **COUNTRY_PRICING** – per country:
  - **yearlyPrice** – discounted yearly price (what users pay per year for **Basic**).
  - **originalPrice** – “strikethrough” price before discount.
  - **discount** (e.g. 50), **currencySymbol**, etc.

Tier prices are computed as: **yearlyPrice × tier multiplier** (e.g. India Basic ₹6000, Standard ₹7980, Premium ₹12000).

Change here to:
- Change base price for a country.
- Add a new country.
- Change discount % or display text.

---

### D. Recharge durations & India-specific prices (1 / 3 / 6 / 12 months)

**File:** `src/services/subscriptionPaymentService.ts`

- **IN_PLAN_PRICES** – India only: fixed “full” and “discounted” price per duration (1, 3, 6, 12 months).
  - Example: 1 Year = full 24000, discounted 12000.
- **getRechargePlans()** – for India uses `IN_PLAN_PRICES`; for other countries builds from `yearlyPrice` × tier multiplier and duration.

Change here to:
- Change 1/3/6/12 month prices for India.
- Add or remove a duration (e.g. 2 years) – would need type `DurationMonths` and UI support.

---

## 3. Where Plans Appear in the UI

| Place | What’s shown | Source of data |
|-------|----------------|-----------------|
| **Login (hero, left)** | All 3 tiers with device count & price/year | `tierPricing.ts` + `pricing.ts` (country) |
| **Registration form** | 3 selectable cards: name, price/year, devices, max users | `tierPricing.ts`, `planUserLimits.ts`, `pricing.ts` |
| **Dashboard** | Current company’s plan name & status | Company’s `subscription_tier` from DB |
| **Subscription Recharge modal** | Duration options (1/3/6/12 months) and price | `subscriptionPaymentService.getRechargePlans()` |
| **Subscription Payments page** | List of past payments (tier, duration, amount) | Stored payment records |

So:
- **Tier choice** (Basic/Standard/Premium) and **display** → `tierPricing.ts`, `planUserLimits.ts`, `pricing.ts`.
- **Recharge duration and amount** → `subscriptionPaymentService.ts` (and for India, `IN_PLAN_PRICES`).

---

## 4. Flow in Short

1. **Registration:** User picks a tier (Basic/Standard/Premium). Stored on company as `subscription_tier`.
2. **Pricing:** Base yearly price comes from `pricing.ts` (by country). Tier price = base × multiplier from `tierPricing.ts`.
3. **Recharge:** User picks duration (1/3/6/12 months). Price comes from `getRechargePlans(tier, country)` (India uses `IN_PLAN_PRICES`; others use yearly × duration).
4. **Limits:** Device limit from `tierPricing.ts`; max users from `planUserLimits.ts` (enforced when creating users).

---

## 5. Quick change checklist

| What you want to change | File(s) to edit |
|-------------------------|------------------|
| Plan names (e.g. “Starter” instead of “Basic”) | `src/utils/tierPricing.ts` |
| Device limits (e.g. Standard = 5 devices) | `src/utils/tierPricing.ts` |
| Relative tier pricing (e.g. Standard = 1.5× basic) | `src/utils/tierPricing.ts` (multipliers) |
| Max users per plan | `src/utils/planUserLimits.ts` |
| Base yearly price or discount for a country | `src/utils/pricing.ts` |
| India 1/3/6/12 month recharge prices | `src/services/subscriptionPaymentService.ts` (`IN_PLAN_PRICES`) |
| Add a new country | `src/utils/pricing.ts` (and optionally country selector in UI) |
| “Most Popular” or styling of a plan | `src/pages/Login.tsx` (hero + registration plan cards) |

---

## 6. Types (for reference)

- **SubscriptionTier:** `src/types/device.ts` and `src/types/subscriptionPayment.ts` (`'basic' | 'standard' | 'premium'`).
- **Company** stores `subscription_tier`; see `src/types/company.ts`.

If you add a fourth tier (e.g. `'enterprise'`), you need to:
1. Add it to the type `SubscriptionTier` in both type files.
2. Add an entry in `TIER_PRICING` and `PLAN_USER_LIMITS`.
3. Update Login/Registration UI to show the new plan.
4. Update any place that switches on `tier === 'basic' | 'standard' | 'premium'` to include the new tier.

---

If you tell me what you want to change (e.g. “Standard should be 5 devices and ₹9,000/year in India”), I can point to the exact lines and suggest the code changes.
