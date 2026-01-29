# Supabase Storage & When to Upgrade

Based on [Supabase pricing](https://supabase.com/pricing) and our current HisabKitab-Pro + Supabase setup.

---

## Current plan limits (typical: **Free**)

| Resource | Free | Pro ($25/mo) |
|----------|------|--------------|
| **Database size** | **500 MB** | **8 GB** (then $0.125/GB) |
| File storage | 1 GB | 100 GB (then $0.021/GB) |
| Egress (data out) | 5 GB/mo | 250 GB/mo (then $0.09/GB) |
| Monthly active users (Auth) | 50,000 | 100,000 (then $0.00325/MAU) |
| API requests | Unlimited | Unlimited |
| Automatic backups | None | 7 days |
| Project pausing | **Pauses after 1 week inactivity** | Never |
| Active projects | Max 2 | Unlimited |

---

## How much data can we store?

- **Free (500 MB database)**  
  - Your app syncs: companies, users, products, purchases, sales, customers, suppliers, expenses, devices, registration_requests, etc.  
  - Rough ballpark per row: products ~1–2 KB, sales/purchases ~2–5 KB (with JSONB items), customers/suppliers ~0.5–1 KB.  
  - **Very rough**: 500 MB can be on the order of **tens of thousands to a few hundred thousand rows** across all tables (depends on columns, indexes, and JSONB size).  
  - So: **you can store a fair amount of operational data on Free**, but growth (many companies, long history) will eventually approach 500 MB.

- **Pro (8 GB database)**  
  - About **16×** the Free DB size.  
  - Plenty of room for many companies and long-term history before needing more disk (Pro allows adding more disk at $0.125/GB).

---

## When to upgrade to Pro

Consider upgrading when **any** of these are true:

1. **Database size** is approaching **500 MB** (check in Supabase Dashboard → Project Settings → Usage, or Database size).
2. You **cannot afford 1 week of inactivity** – Free projects **pause after 1 week** with no traffic; Pro never pauses.
3. You need **automatic backups** – Free has none; Pro includes 7-day backups.
4. **Egress** is consistently near or over **5 GB/month** (e.g. many devices syncing often).
5. You need **more than 1 GB file storage** (e.g. many uploaded files/images).
6. You expect **more than 50,000 monthly active users** (Auth MAU limit on Free).

**Practical recommendation:**  
- For **production** and **no pause risk**: move to **Pro** once you rely on the app for real users.  
- For **development / light use**: Free is fine until you hit the 500 MB DB limit or need no pause/backups.

---

## How to check current usage

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Go to **Project Settings** → **Usage** (or **Billing**).
4. Check:
   - **Database size** (how much of 500 MB or 8 GB you use).
   - **Egress**, **Storage**, **MAU** if shown.

---

## Summary

| Question | Answer |
|----------|--------|
| How much can we store on **Free**? | **500 MB** database + 1 GB file storage. Enough for a lot of products/sales/customers; watch usage as data grows. |
| When to upgrade? | When DB nears 500 MB, when you need no pause (production), or when you need backups / more egress / more storage / more MAU. |
| What does **Pro** give? | 8 GB DB, no pause, 7-day backups, 250 GB egress, 100 GB storage, 100k MAU — **$25/month** (plus overages if you enable them). |

For exact numbers and overage pricing, always refer to: [Supabase Pricing](https://supabase.com/pricing).
