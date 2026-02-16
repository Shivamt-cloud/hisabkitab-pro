# Supabase Tables – Cross-Check & Final SQLs

This document lists **all app functionality** (IndexedDB stores), whether each has a **Supabase table** and **cloud service**, and which **SQL scripts** you need to run in Supabase if not already executed.

---

## 1. Summary: Has Supabase table? (Y/N)

| # | Functionality (IndexedDB store) | Supabase table? | Cloud service | SQL file to run (if not executed) |
|---|--------------------------------|-----------------|---------------|-----------------------------------|
| 1 | **companies** | ✅ Yes | cloudCompanyService | SQL_QUERY.sql (or create manually) |
| 2 | **users** | ✅ Yes | cloudUserService | SQL_QUERY.sql (or create manually) |
| 3 | **products** | ✅ Yes | cloudProductService | CREATE_ALL_SUPABASE_TABLES.sql |
| 4 | **customers** | ✅ Yes | cloudCustomerService | CREATE_ALL_SUPABASE_TABLES.sql |
| 5 | **suppliers** | ✅ Yes | cloudSupplierService | CREATE_ALL_SUPABASE_TABLES.sql |
| 6 | **purchases** | ✅ Yes | cloudPurchaseService | CREATE_ALL_SUPABASE_TABLES.sql |
| 7 | **sales** | ✅ Yes | cloudSaleService | CREATE_ALL_SUPABASE_TABLES.sql |
| 8 | **expenses** | ✅ Yes | cloudExpenseService | CREATE_ALL_SUPABASE_TABLES.sql |
| 9 | **registration_requests** | ✅ Yes | cloudRegistrationRequestService | CREATE_REGISTRATION_REQUESTS_TABLE.sql |
| 10 | **sales_persons** | ✅ Yes | cloudSalesPersonService | **CREATE_SALES_PERSONS_TABLE.sql** |
| 11 | **services** | ✅ Yes | cloudServiceRecordService | **CREATE_SERVICES_AND_TECHNICIANS_TABLES.sql** |
| 12 | **technicians** | ✅ Yes | cloudTechnicianService | **CREATE_SERVICES_AND_TECHNICIANS_TABLES.sql** |
| 13 | **rentals** | ✅ Yes | cloudRentalService | CREATE_RENTALS_TABLE.sql |
| 14 | **salary_payments** | ✅ Yes | cloudSalaryPaymentService | CREATE_EMPLOYEE_SALARY_TABLES.sql |
| 15 | **employee_goods_purchases** | ✅ Yes | cloudEmployeeGoodsPurchaseService | CREATE_EMPLOYEE_SALARY_TABLES.sql |
| 16 | **purchase_reorders** | ✅ Yes | cloudPurchaseReorderService | CREATE_TABLE_PURCHASE_REORDERS.sql |
| 17 | **purchase_reorder_items** | ✅ Yes | cloudPurchaseReorderService | CREATE_TABLE_PURCHASE_REORDERS.sql |
| 18 | **scheduled_export_configs** (exports) | ✅ Yes | cloudScheduledExportService | CREATE_SCHEDULED_EXPORTS_TABLE.sql |
| 19 | **user_devices** | ✅ Yes | cloudDeviceService | DEVICE_RESTRICTION_SQL_SETUP.sql |
| 20 | **categories** | ❌ No | — | *No SQL (IndexedDB only)* |
| 21 | **stock_adjustments** | ❌ No | — | *IndexedDB only* |
| 22 | **settings** | ❌ No | — | *IndexedDB only* |
| 23 | **payment_records** | ❌ No | — | *Derived from sales/purchases in app* |
| 24 | **payment_transactions** | ❌ No | — | *Derived in app* |
| 25 | **category_commissions** | ❌ No | — | *IndexedDB only* |
| 26 | **sales_commissions** | ❌ No | — | *IndexedDB only* |
| 27 | **sales_person_category_assignments** | ❌ No | — | *IndexedDB only* |
| 28 | **user_permissions** | ❌ No | — | *IndexedDB only* |
| 29 | **supplier_payments** | ❌ No | — | *IndexedDB only* |
| 30 | **supplier_checks** | ❌ No | — | *IndexedDB only* |
| 31 | **subscription_payments** | ❌ No | — | *IndexedDB only* |
| 32 | **price_segments** | ❌ No | — | *IndexedDB only* (ADD_PRICE_SEGMENT_SUPPORT.sql exists) |
| 33 | **product_segment_prices** | ❌ No | — | *IndexedDB only* (ADD_PRICE_SEGMENT_SUPPORT.sql) |
| 34 | **audit_logs** | ❌ No | — | *IndexedDB only* |
| 35 | **notifications** | ❌ No | — | *IndexedDB only* |
| 36 | **automatic_backups** | N/A | cloudBackupService (storage bucket) | *Uses Supabase Storage, not a table* |

---

## 2. Functionality that does NOT have a Supabase table (local only)

These are **only in IndexedDB**; no cloud sync:

- **categories** – product categories
- **stock_adjustments**
- **settings** – company/app settings
- **payment_records** / **payment_transactions** – built from sales/purchases in app
- **category_commissions** – commission config per category
- **sales_commissions** – calculated commission per sale
- **sales_person_category_assignments** – which sales person is assigned to which category
- **user_permissions** – custom permissions per user
- **supplier_payments** / **supplier_checks**
- **subscription_payments**
- **price_segments** / **product_segment_prices**
- **audit_logs** / **notifications**

If you want any of these in Supabase later, new tables and cloud services would need to be added.

---

## 3. Final SQLs to run (in order)

Run these in the **Supabase SQL Editor** if you have **not** already run them. Order matters where one script depends on another (e.g. `users` before `user_devices`).

| Order | SQL file | Creates / updates |
|-------|----------|--------------------|
| 1 | **SQL_QUERY.sql** | `users`, `companies` (base tables) |
| 2 | **CREATE_ALL_SUPABASE_TABLES.sql** | `products`, `suppliers`, `customers`, `purchases`, `sales`, `expenses` + RLS + triggers |
| 3 | **CREATE_REGISTRATION_REQUESTS_TABLE.sql** | `registration_requests` |
| 4 | **CREATE_EMPLOYEE_SALARY_TABLES.sql** | `salary_payments`, `employee_goods_purchases` |
| 5 | **CREATE_RENTALS_TABLE.sql** | `rentals` |
| 6 | **CREATE_TABLE_PURCHASE_REORDERS.sql** | `purchase_reorders`, `purchase_reorder_items` |
| 7 | **CREATE_SCHEDULED_EXPORTS_TABLE.sql** | `scheduled_export_configs` |
| 8 | **DEVICE_RESTRICTION_SQL_SETUP.sql** | `user_devices` + alters `users` (subscription_tier, max_devices, etc.) |
| 9 | **CREATE_SALES_PERSONS_TABLE.sql** | `sales_persons` |
| 10 | **CREATE_SERVICES_AND_TECHNICIANS_TABLES.sql** | `technicians`, `services` |

Optional / as needed:

- **ADD_***.sql** – use when you need new columns or fixes (e.g. ADD_MANUAL_EXTRA_TO_EXPENSES.sql, ADD_RENTALS_PAYMENT.sql, ADD_PRICE_SEGMENT_SUPPORT.sql, etc.).

---

## 4. Quick checklist: “Have I run this?”

Copy and tick as you run each in Supabase:

```
[ ] SQL_QUERY.sql
[ ] CREATE_ALL_SUPABASE_TABLES.sql
[ ] CREATE_REGISTRATION_REQUESTS_TABLE.sql
[ ] CREATE_EMPLOYEE_SALARY_TABLES.sql
[ ] CREATE_RENTALS_TABLE.sql
[ ] CREATE_TABLE_PURCHASE_REORDERS.sql
[ ] CREATE_SCHEDULED_EXPORTS_TABLE.sql
[ ] DEVICE_RESTRICTION_SQL_SETUP.sql
[ ] CREATE_SALES_PERSONS_TABLE.sql
[ ] CREATE_SERVICES_AND_TECHNICIANS_TABLES.sql
```

---

## 5. Verify in Supabase

After running the scripts, in Supabase go to **Table Editor** and confirm these tables exist:

- users, companies  
- products, suppliers, customers, purchases, sales, expenses  
- registration_requests  
- salary_payments, employee_goods_purchases  
- rentals  
- purchase_reorders, purchase_reorder_items  
- scheduled_export_configs  
- user_devices  
- sales_persons  
- technicians, services  

If any of these are missing, run the corresponding SQL file from section 3.
