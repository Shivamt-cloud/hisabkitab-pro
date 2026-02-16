# Local Business WhatsApp Automation App – Planning Document (Review Only)

**Status:** Plan only. No development started. Review and approve before any build.

---

## 1. Product idea (summary)

A **mobile/web app for local businesses** (medical store, boutique, kirana, electronics, coaching, salon, etc.) that:

- Automatically replies to customer WhatsApp messages  
- Sends product catalog  
- Sends payment link  
- Sends order status  
- Sends daily offers  

**Why it can sell:** In India almost every small business uses WhatsApp and spends a lot of time replying. The product sells **time saving + more sales**, not “an app”.  

**Target pricing (your revenue):** ₹499–₹999/month per business.  
**Target scale:** e.g. 50 paying customers ≈ ₹25,000–₹50,000 MRR.

---

## 2. Is it possible? (Feasibility)

**Yes, it is possible**, using the **official WhatsApp Business API** and a **Business Solution Provider (BSP)**. It is not possible to do this legally and sustainably with the normal WhatsApp app or unofficial APIs (against ToS, high ban risk).

### How it works technically (high level)

- Business has a **WhatsApp Business number** (or number provided by BSP).
- Your app talks to WhatsApp **only via the Business API** (you don’t use the WhatsApp app on a phone for automation).
- A **BSP** (e.g. Gupshup, Wati, Interakt, Twilio in India) gives you:
  - API access
  - Webhooks for incoming messages
  - Ability to send messages, catalogs, buttons, lists, templates
- Your app:
  - Receives every message via **webhook**
  - Identifies the business (by number / API key)
  - Runs your **automation logic** (keywords, simple bot, or later NLU)
  - Sends replies, catalog, payment link, order status, or scheduled “daily offers”

So: **technically feasible and aligned with WhatsApp’s official channel.**

---

## 3. What the app would do (features)

| Feature | What it means | Feasibility |
|--------|----------------|------------|
| **Auto-reply** | Reply to common questions (hours, address, “price of X”, “is Y available”) with predefined or dynamic answers | ✅ Supported (within 24h “conversation” window) |
| **Send catalog** | Send product list / catalog (images + name + price) | ✅ Via WhatsApp catalog (Meta) or list/product messages |
| **Send payment link** | Send a link (e.g. Razorpay / Paytm / your payment page) so customer can pay online | ✅ Link in message; no need for WhatsApp Pay in MVP |
| **Order status** | “Your order is confirmed / shipped / out for delivery” | ✅ Template or session message |
| **Daily offers** | Send offers to a list of opted-in customers (e.g. morning message) | ✅ Via template messages (after Meta approval) or within-session if recent chat |

---

## 4. Challenges and risks (you must know before building)

### 4.1 WhatsApp policy and rules

- **24-hour rule:** After last customer message, you have 24 hours to send **free-form** messages. After that, only **approved templates** (e.g. “Your order is shipped”) are allowed.
- **Opt-in for marketing:** Promotional / offer messages need consent. You must store “opted in” and only send to them.
- **Templates:** “Daily offers” and some order updates need template approval (Meta can take days; wording must follow guidelines).
- **No spam:** Automation must not be abusive; otherwise number/account can be banned.

So: **fully possible**, but design and copy must follow WhatsApp’s rules.

### 4.2 Cost (your side)

- **BSP + Meta:** Cost per conversation or per message (user-initiated vs business-initiated). In India, rough range **₹0.05–₹0.25+** per conversation (varies by BSP and type).
- **Implication:** At ₹499–999/month per shop, you need to keep message/conversation volume per business in a reasonable range, or add usage-based pricing.
- **Phone number:** Each business typically needs a number linked to WhatsApp Business API (BSPs often provide or help with this).

### 4.3 Multi-tenant and operations

- One app, **many businesses** (50, 100, 500…).
- Each business = one tenant: own number, own catalog, own orders, own auto-replies and offers.
- You need: tenant signup, number linking, onboarding (catalog setup, welcome message, basic rules).

### 4.4 Catalog and products

- **Option A:** Catalog created in **Meta Business Manager** and linked to the WhatsApp number; your app triggers “send catalog” via API.
- **Option B:** Products live only in **your app**; you send product list as formatted messages (or list messages) until catalog is set up.
- **Option C (if same user):** Sync products from **HisabKitab-Pro** so shopkeeper doesn’t maintain two places (optional, for later).

---

## 5. High-level architecture (no code, concept only)

```
[Customer WhatsApp]  <-->  [WhatsApp / Meta]  <-->  [BSP: Gupshup/Wati/Interakt]
                                                              |
                                                         Webhooks
                                                              |
                                                              v
[Your backend: Node/Python, etc.]  <-->  [Database: tenants, products, orders, messages]
         |
         +-- Bot / automation logic (keywords, catalog, order status, payment link)
         +-- Cron: daily offers (templates to opted-in users)
         |
         v
[Admin dashboard: Web or PWA]
         |
         +-- Shopkeeper: set auto-replies, catalog, payment link, view orders, send offers
         +-- Optional: mobile app (React Native / Flutter) or same as PWA
```

- **Backend:** Receives webhooks, identifies tenant (business), runs automation, sends replies via BSP API, stores orders/messages.
- **Database:** Tenants (businesses), users, products, orders, conversation state, opt-ins for marketing.
- **Frontend:** Web app (and/or PWA) for shopkeeper to configure and monitor. No development started; this is only the idea.

---

## 6. Tech stack (suggestion only)

| Layer | Option | Note |
|-------|--------|------|
| Backend | Node.js (Express/Fastify) or Python (FastAPI) | Webhooks + API; you already use Node/TS in HisabKitab-Pro |
| Database | PostgreSQL (e.g. Supabase) | Same as current project; separate DB or separate schema for this product |
| BSP | Gupshup / Wati / Interakt | India-focused; compare pricing and WhatsApp features |
| Frontend | React (or Next.js) / PWA | Can reuse skills from HisabKitab-Pro |
| Hosting | Same as current (e.g. Vercel + Supabase) or small VPS | Depends on webhook and cron needs |

Nothing is decided; this is for discussion.

---

## 7. Scope (MVP vs later)

**MVP (Phase 1)**  
- One business (single tenant) or 2–3 test tenants.  
- Connect one WhatsApp number via BSP.  
- Incoming message → keyword-based auto-reply.  
- “Send catalog” (catalog or list message).  
- “Send payment link” (one link per business or per product).  
- Simple order flow: customer says “I want X”; you create order and send status + payment link.  
- No daily offers yet (or one manual “send offer” button).

**Phase 2**  
- Multi-tenant (many businesses).  
- Daily/weekly offers (template messages to opted-in users).  
- Better order status (confirmed, packed, out for delivery).  
- Optional: product sync from HisabKitab-Pro for shops that use both.

**Phase 3**  
- Optional: simple NLU or menu-based flows (“Press 1 for prices, 2 for order status”).  
- Analytics (messages, orders, revenue per business).  
- Mobile app if needed.

---

## 8. Relation to HisabKitab-Pro

- **Option A – Standalone:** New product, new codebase, new branding. Only “same founder”; no shared login or data.
- **Option B – Same ecosystem:** Same domain/brand (e.g. “HisabKitab WhatsApp”), optional same login (e.g. company from HisabKitab-Pro), and later sync products/orders so one shopkeeper uses both inventory and WhatsApp from one place.

Recommendation: Start **standalone MVP**; add “same ecosystem” later if you want to cross-sell to existing HisabKitab-Pro users.

---

## 9. Pricing (for your customer) and your cost

- **You charge:** ₹499–₹999/month per business (as you said).  
- **Your cost:** BSP + Meta (per conversation/message). Need to:  
  - Define a “fair use” message limit per plan, or  
  - Add a small usage fee beyond X conversations.  
- **Number:** Clarify with BSP: number provisioning cost and who pays (you or the business).

---

## 10. Next steps (only after you review and approve)

1. **You review** this document and decide: go / no-go / change scope.  
2. **If go:**  
   - Choose BSP (e.g. shortlist Gupshup, Wati, Interakt; compare pricing and docs).  
   - Finalize MVP feature list (exact flows: e.g. which keywords, how catalog is sent).  
   - One-page UX flow (customer sends “Hi” → what happens; “price of X” → what happens; “I want to order” → what happens).  
3. **Then** we plan development (sprints, tasks, no code until you say start).

---

## 11. Summary

| Question | Answer |
|----------|--------|
| Is it possible? | **Yes**, with WhatsApp Business API + BSP. |
| Legal/sustainable? | **Yes**, if you follow WhatsApp policy (templates, opt-in, 24h rule). |
| Build complexity? | **Medium** (webhooks, multi-tenant, templates, catalog). |
| Can you charge ₹499–999/month? | **Yes**, if usage per business is bounded and BSP cost is controlled. |
| Start now? | **No.** Review this plan first; development only after your approval and scope freeze.

---

*Document version: 1.0 – Plan only, no development started. For review.*
