# Database setup for Employee Salary & related features

## 1. Supabase (for global / synced data)

Run these in **Supabase Dashboard → SQL Editor**, in order.

### Step A: Create Employee Salary tables (one-time)

Run the entire file **`CREATE_EMPLOYEE_SALARY_TABLES.sql`**.

This creates:

- **`salary_payments`** – salary and commission payments per employee
- **`employee_goods_purchases`** – amounts to deduct from pay (goods/advance) per month

Without these tables, the app will still work locally (IndexedDB), but data will not sync across devices or to the cloud.

---

### Step B: Allow new expense types on `expenses` table (one-time)

If your **`expenses`** table has a CHECK constraint on `expense_type`, you must allow the new values. Run **`ADD_EMPLOYEE_GOODS_PURCHASE_EXPENSE_TYPE.sql`** (see that file for the exact SQL).

If you **don’t** run this and the constraint is strict, saving an expense with type **Employee Salary**, **Employee Commission**, or **Employee Goods Purchase** can fail with a constraint error.

---

## 2. Local (IndexedDB)

No manual step. The app already bumps the DB version and creates the object stores **`salary_payments`** and **`employee_goods_purchases`** in the browser. If you’ve opened the app after the update, local DB is ready.

---

## Summary

| What                         | Where        | Action |
|-----------------------------|-------------|--------|
| `salary_payments` table      | Supabase    | Run `CREATE_EMPLOYEE_SALARY_TABLES.sql` |
| `employee_goods_purchases`   | Supabase    | Same file as above |
| New expense types allowed   | Supabase    | Run `ADD_EMPLOYEE_GOODS_PURCHASE_EXPENSE_TYPE.sql` if you get constraint errors |
| Local stores                | IndexedDB   | Automatic (no action) |
