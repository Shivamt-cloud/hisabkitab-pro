# Database vs UI Verification

Quick reference for DB columns/entities used in the UI and their SQL status.

## SQL Syntax Fix Applied

- **ADD_RETURN_REMARKS_TO_PURCHASES.sql** – Fixed typo: `ALTERe` → full statement:
  ```sql
  ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS return_remarks TEXT;
  ```

## Tables in CREATE_ALL_SUPABASE_TABLES.sql

| Table       | UI-used columns verified in schema |
|------------|-------------------------------------|
| **products**  | All standard columns; color/size are in `purchases.items` JSONB (no extra column). |
| **suppliers** | company_id, etc. ✓ |
| **customers** | company_id, etc. ✓ |
| **purchases** | `return_remarks` ✓ (also in ADD_RETURN_REMARKS for incremental migrations). `items` is JSONB – color/size live inside items (ADD_COLOR_SIZE doc explains; no ALTER needed). |
| **sales**      | `internal_remarks` ✓ (also in ADD_INTERNAL_REMARKS for incremental migrations). `payment_methods` JSONB ✓. |
| **expenses**   | company_id, cash_denominations JSONB, etc. ✓ |

## Companies table (subscription fields)

- **CREATE_ALL_SUPABASE_TABLES.sql** does **not** create `companies` (only products, suppliers, customers, purchases, sales, expenses).
- Subscription-related fields used in UI: `subscription_tier`, `subscription_start_date`, `subscription_end_date`, `subscription_status`, `max_users`, `valid_from`, `valid_to`.
- Ensure your `companies` table has these columns by running:
  - **UPDATE_COMPANIES_TABLE_SCHEMA.sql** (adds base company columns), and
  - **UPDATE_SUBSCRIPTION_PLAN.sql** (examples for subscription_tier, dates, status, max_users).

If `companies` was created from an older script that lacks subscription columns, add them with:

```sql
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS max_users INTEGER;
```

## Trigger syntax

- **CREATE_ALL_SUPABASE_TABLES.sql** uses `EXECUTE FUNCTION` for triggers. This is valid in PostgreSQL 11+ (Supabase uses PG 15+). No change needed.

## Summary

- One syntax error fixed: **ADD_RETURN_REMARKS_TO_PURCHASES.sql**.
- No missing columns found for the entities in CREATE_ALL_SUPABASE_TABLES; `return_remarks` and `internal_remarks` are present there and in ADD_* scripts.
- Color/size for purchase items are in JSONB (ADD_COLOR_SIZE_TO_PURCHASE_ITEMS.sql documents this; no ALTER required).
- Companies subscription fields: ensure they exist via UPDATE_COMPANIES_TABLE_SCHEMA / UPDATE_SUBSCRIPTION_PLAN or the ALTER snippet above.
