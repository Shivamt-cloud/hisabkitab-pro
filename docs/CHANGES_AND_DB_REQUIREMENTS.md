# Summary of changes and Supabase/DB requirements

This document lists the features and changes made and whether any Supabase (or database) change is required.

---

## 1. Reorder: Ordered qty (Box × Piece) and Received (Box/Piece)

**What:** Reorder forms and receive flow support Box/Piece for ordered and received qty; ordered qty = Box × Piece when both set.

**Supabase/DB required?** **Yes.** Run these migrations on your Supabase project if not already done:

- `ADD_ORDERED_QTY_BOX_PIECE.sql` – adds `ordered_qty_box`, `ordered_qty_piece` to reorder items.
- `ADD_RECEIVED_QTY_BOX_PIECE.sql` – adds `received_qty_box`, `received_qty_piece` to reorder items.

---

## 2. Reorder PDF/Excel: Rs. instead of ₹, columns, Powered by, Order from

**What:** Reorder export uses “Rs.”, correct columns, powered-by contact, and “Order from: [Company Name]”.

**Supabase/DB required?** **No.** Only frontend and export utils.

---

## 3. Add product: all products + search suggestions

**What:** Add product in Reorder forms shows all products (not filtered by supplier) with search and suggestions.

**Supabase/DB required?** **No.**

---

## 4. Reorder PDF/Excel: company name (Order from) from list/edit

**What:** Purchase Reorders list and Reorder Edit pass company name so PDF/Excel show “Order from: [Business Name]”.

**Supabase/DB required?** **No.** Company is already loaded from existing API.

---

## 5. Daily Report: filename with date/time and HisabKitabPro

**What:** Print/Download use a filename like `HisabKitabPro_Daily_Report_YYYYMMDD_HHmm`.

**Supabase/DB required?** **No.**

---

## 6. GST / Simple Purchase: additional discount (%, amount)

**What:** Purchase Summary has Discount (%) and Discount (₹); discount is deducted from total. Only the final `grand_total` / `total_amount` is stored.

**Supabase/DB required?** **No.** Existing purchase tables already store the final total. Discount is not stored as separate columns.

---

## 7. Discount field: allow decimals (e.g. 4.762)

**What:** Discount % and ₹ inputs use `step="any"` so values like 4.762 are accepted.

**Supabase/DB required?** **No.**

---

## 8. Products list: HSN, GST %, Save, filters (Status, Stock)

**What:** Products table has HSN and GST % columns (editable), Save button per row, and Status and Stock filters.

**Supabase/DB required?** **No.** Product schema already has `hsn_code` and `gst_rate`; they are updated via existing `productService.update`.

---

## 9. Purchase formula (=200-45%), Enter to apply, show formula on focus

**What:** In GST/Simple Purchase, Purchase/MRP/Sale fields accept formulas (e.g. `=180-45%`); result is applied on Enter (or blur). Clicking the field again shows the last formula.

**Supabase/DB required?** **No.** Formula is evaluated in the frontend; only the numeric value is stored in items.

---

## 10. Daily Report: Customer details (purchased, returned, return reason, expectation, remark)

**What:** Daily Report has a “Customer details” section: customers purchased, customers returned, return reason, expectation, remark. Data is saved with an explicit **Save** button and is included in print/download. Stored in **localStorage** (per company and date).

**Supabase/DB required?** **Optional.**

- **Current:** No DB. Data is in browser localStorage only (per device, per company, per date). No sync across devices or backup in Supabase.
- **If you want sync/backup:** Yes. You would add a Supabase table (e.g. `daily_customer_details`: `company_id`, `expense_date`, `customers_purchased`, `customers_returned`, `return_remark`, `expectation`, `remark`, `created_at`, `updated_at`) and an API to save/load it, then replace localStorage in Daily Report with that API.

---

## Quick reference

| # | Feature | Supabase/DB change? |
|---|--------|----------------------|
| 1 | Reorder Box/Piece (ordered + received) | **Yes** – run the two SQL migrations |
| 2 | Reorder PDF/Excel (Rs., columns, Order from) | No |
| 3 | Add product: all products + search | No |
| 4 | Reorder company name in PDF from list/edit | No |
| 5 | Daily Report filename (date + branding) | No |
| 6 | Purchase additional discount (%, amount) | No |
| 7 | Discount decimals (4.762) | No |
| 8 | Products: HSN, GST %, Save, filters | No |
| 9 | Purchase formula (=200-45%) | No |
| 10 | Daily Report customer details | No for current (localStorage); **optional** if you add a table for sync/backup |

---

**Only mandatory DB change:** Run `ADD_ORDERED_QTY_BOX_PIECE.sql` and `ADD_RECEIVED_QTY_BOX_PIECE.sql` on Supabase for reorder Box/Piece to work correctly with the backend.
