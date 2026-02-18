# Database scripts – run order (Supabase)

Use this order so the app has all required tables and columns.

## 1. Base schema (run first, once)

**`RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT.sql`**

- Creates/updates: `users`, `companies`, `products`, `suppliers`, `customers`, `purchases`, `sales`, `expenses`, `registration_requests`, `salary_payments`, `employee_goods_purchases`, `rentals`, `purchase_reorders` / `purchase_reorder_items`, `scheduled_export_configs`, `user_devices`, `sales_persons`, `technicians`, `services`
- Adds RLS, triggers, indexes
- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS where used)

## 2. Subscription, registration, price segments (run after base)

**`APPLY_MISSING_SUPABASE_COLUMNS_AND_TABLES.sql`**

- **companies:** `email`, `phone`, `address`, `city`, `state`, `pincode`, `country`, `gstin`, `pan`, `website`, `logo`, `valid_from`, `valid_to`, `created_by`; `subscription_tier`, `max_users`, `subscription_start_date`, `subscription_end_date`, `subscription_status`; allows `premium_plus`, `premium_plus_plus`
- **registration_requests:** `subscription_tier`, `is_free_trial`, `communication_initiated`, `agreement_done`, `payment_done`, `registration_done`, `company_activated`, `company_rejected`
- **customers:** `price_segment_id`
- **Creates:** `price_segments`, `product_segment_prices`
- Safe to re-run

## 2.5. Starter tier and device limits (run after step 2)

**`ADD_STARTER_TIER_AND_DEVICE_LIMITS.sql`**

- **companies:** allow `subscription_tier = 'starter'`
- **users:** allow `subscription_tier` in `('starter', 'basic', 'standard', 'premium', 'premium_plus', 'premium_plus_plus')`
- **get_max_devices_for_tier:** starter=1, basic=1, standard=3, premium/premium_plus/premium_plus_plus=unlimited  
- Safe to re-run

## 2.6. Access type – device choice (Mobile / Desktop / Combo)

**`ADD_ACCESS_TYPE_COLUMN.sql`**

- **registration_requests:** `access_type` TEXT DEFAULT 'combo' (mobile | desktop | combo)
- **companies:** `access_type` TEXT DEFAULT 'combo'
- Safe to re-run

## 3. App-specific columns and constraints (run after 1 and 2)

**`APPLY_REMAINING_SUPABASE_MIGRATIONS.sql`** (single script that applies everything below)

Run this **after** both `RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT.sql` and `APPLY_MISSING_SUPABASE_COLUMNS_AND_TABLES.sql`. It adds only what is still missing:

- **services:** `discount_percentage`, `discount_amount`, `parts_total`, and status `'booked'`
- **sales:** `service_id` (link parts sale to service)
- **customers:** `id_type`, `id_number` (ID proof for rentals/customer form)

All statements use `IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS` so the script is **safe to re-run**.

## 4. Maintenance / alert (optional – for Settings > Maintenance & Alerts to sync to all users)

**`ADD_MAINTENANCE_CONFIG_TABLE.sql`**

- Creates **`maintenance_config`** (single row) so the maintenance/alert message is stored in Supabase and **all users on all devices** see the same banner or maintenance page.
- If you skip this, maintenance is stored only in local settings (per device); after running it, admin’s message syncs to the cloud and everyone sees it.

---

## Optional / legacy scripts

These are **not required** if you have run the three steps above (RUN_ALL → APPLY_MISSING → APPLY_REMAINING):

| Script | Why optional |
|--------|----------------------|
| `ADD_SALES_PERSON_COLUMNS_TO_SALES.sql` | Already in RUN_ALL (`sales_person_id`, `sales_person_name`) |
| `ADD_INTERNAL_REMARKS_TO_SALES.sql` | Already in RUN_ALL (`internal_remarks`) |
| `ADD_EMPLOYEE_GOODS_PURCHASE_EXPENSE_TYPE.sql` | Already in RUN_ALL (expense_type check includes `employee_goods_purchase`) |
| `ADD_PRICE_SEGMENT_SUPPORT.sql` | Same as APPLY_MISSING (price_segments, product_segment_prices, customers.price_segment_id) |
| `ADD_SERVICE_DISCOUNT.sql` | Included in APPLY_REMAINING |
| `ADD_PARTS_TOTAL_TO_SERVICES.sql` | Included in APPLY_REMAINING |
| `ADD_SERVICE_ID_TO_SALES.sql` | Included in APPLY_REMAINING |
| `ADD_SERVICE_BOOKED_STATUS.sql` | Included in APPLY_REMAINING |
| `UPDATE_CUSTOMERS_TABLE_ID_PROOF.sql` | Included in APPLY_REMAINING |
| `UPDATE_COMPANIES_TABLE_SCHEMA.sql` | Same columns added by APPLY_MISSING (companies profile: email, phone, address, etc.) |

---

## Quick checklist

- [ ] Run **RUN_ALL_SUPABASE_TABLES_ONE_SCRIPT.sql**
- [ ] Run **APPLY_MISSING_SUPABASE_COLUMNS_AND_TABLES.sql**
- [ ] Run **ADD_STARTER_TIER_AND_DEVICE_LIMITS.sql** (Starter plan + device limits for all tiers)
- [ ] Run **ADD_ACCESS_TYPE_COLUMN.sql** (Mobile / Desktop / Combo device choice)
- [ ] Run **APPLY_REMAINING_SUPABASE_MIGRATIONS.sql**

After these, the database has everything the app expects for Supabase sync.
