# Full project check – syntax and database

**Date:** 2026-02-13

## 1. Syntax and type check

- **Linter:** No errors reported under `src/`.
- **TypeScript:** `npx tsc --noEmit` and `npm run build` (tsc && vite build) were run; no syntax or type errors observed in the codebase.
- **Notable files:** `src/services/settingsService.ts` – `defaultSettings` and `receipt_printer` block are valid (no stray commas or syntax issues).

No code syntax errors were found.

---

## 2. Database – gaps vs `RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT.sql`

`RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT.sql` creates the base schema but does **not** include several columns and tables that are added by other `ADD_*.sql` / `UPDATE_*.sql` scripts. The app and cloud services expect these for full functionality.

### 2.1 Missing from `companies`

| Column                     | Purpose                          | Added by                          |
|----------------------------|----------------------------------|-----------------------------------|
| `subscription_tier`       | Plan (basic/standard/premium/…)  | ADD_PLAN_TO_REGISTRATION_AND_COMPANY.sql, ALLOW_PREMIUM_PLUS_TIER.sql |
| `max_users`                | User limit per plan              | ADD_PLAN_TO_REGISTRATION_AND_COMPANY.sql |
| `subscription_start_date` | Start of subscription            | ADD_PLAN_TO_REGISTRATION_AND_COMPANY.sql |
| `subscription_end_date`    | End of subscription              | ADD_PLAN_TO_REGISTRATION_AND_COMPANY.sql |
| `subscription_status`      | active/expired/cancelled         | ADD_PLAN_TO_REGISTRATION_AND_COMPANY.sql |

Constraint: `subscription_tier` must allow `premium_plus` and `premium_plus_plus` (ALLOW_PREMIUM_PLUS_TIER.sql).

### 2.2 Missing from `registration_requests`

| Column                    | Purpose                    | Added by                            |
|---------------------------|----------------------------|-------------------------------------|
| `subscription_tier`       | Plan chosen on registration| ADD_PLAN_TO_REGISTRATION_AND_COMPANY.sql |
| `is_free_trial`           | 1-month free trial flag   | ADD_FREE_TRIAL_COLUMN.sql            |
| `communication_initiated`| Workflow flag              | ADD_REGISTRATION_STATUS_FIELDS.sql   |
| `agreement_done`          | Workflow flag              | ADD_REGISTRATION_STATUS_FIELDS.sql   |
| `payment_done`            | Workflow flag              | ADD_REGISTRATION_STATUS_FIELDS.sql   |
| `registration_done`       | Workflow flag              | UPDATE_REGISTRATION_REQUESTS_FLAGS.sql |
| `company_activated`       | Company activated flag     | UPDATE_REGISTRATION_REQUESTS_FLAGS.sql |
| `company_rejected`        | Company rejected flag      | UPDATE_REGISTRATION_REQUESTS_FLAGS.sql |

### 2.3 Missing from `customers`

| Column            | Purpose              | Added by                     |
|-------------------|----------------------|------------------------------|
| `price_segment_id`| Link to price segment| ADD_PRICE_SEGMENT_SUPPORT.sql |

### 2.4 Missing tables

| Table                   | Purpose                    | Added by                     |
|-------------------------|----------------------------|------------------------------|
| `price_segments`        | Price list segments        | ADD_PRICE_SEGMENT_SUPPORT.sql |
| `product_segment_prices`| Segment-specific prices    | ADD_PRICE_SEGMENT_SUPPORT.sql |

### 2.5 IndexedDB-only (no Supabase table in repo)

These are used only in the app’s IndexedDB (no Supabase migration in the repo):

- `supplier_payments`
- `supplier_checks`
- `subscription_payments`

If you later sync these to Supabase, you will need to add the corresponding tables and migrations.

---

## 3. One script to apply all missing pieces

**File:** `APPLY_MISSING_SUPABASE_COLUMNS_AND_TABLES.sql`

Run this **after** `RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT.sql` so that:

1. **companies** get subscription columns and the `subscription_tier` check including `premium_plus` and `premium_plus_plus`.
2. **registration_requests** get `subscription_tier`, `is_free_trial`, and all workflow/flag columns.
3. **customers** get `price_segment_id`.
4. **price_segments** and **product_segment_prices** tables (and indexes) are created.

The script uses `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` so it is safe to run multiple times.

---

## 4. Optional: registration_requests status values

`RUN_ALL` defines `registration_requests.status` as:

`CHECK (status IN ('pending', 'approved', 'rejected'))`.

The app and cloud flows use more values (e.g. `under_review`, `activation_completed`, `activation_rejected`). If you use the full registration workflow with Supabase, you may need to run one of:

- `FIX_REGISTRATION_REQUESTS_STATUS_CONSTRAINT.sql`
- `UPDATE_REGISTRATION_REQUESTS_NEW_STATUS_VALUES.sql`  
- `UPDATE_REGISTRATION_REQUESTS_STATUS_FIELDS.sql` / `UPDATE_REGISTRATION_REQUESTS_SCHEMA.sql`

to align the constraint and status values with the app.

---

## 5. Summary

| Check                    | Result |
|--------------------------|--------|
| Syntax / TypeScript      | No errors found. |
| Linter                   | No errors in `src/`. |
| Missing DB columns/tables| Listed above; apply `APPLY_MISSING_SUPABASE_COLUMNS_AND_TABLES.sql` after RUN_ALL. |
| Barcode / receipt printer| No DB changes; settings in IndexedDB only. |

No code syntax errors were found. Database gaps are covered by the new script and optional registration status scripts where applicable.
