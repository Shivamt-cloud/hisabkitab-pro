# 📝 Create Test Data - Quick Guide

**Status:** ✅ Tables Created (Empty) | ⏳ Add Data

---

## ✅ **Option 1: Create Data Through Your App** (Recommended)

### Step 1: Start Your App

1. Make sure `.env` file exists with your Supabase credentials
2. Start your app:
   ```bash
   npm run dev
   ```

3. Open browser: `http://localhost:5173`

### Step 2: Log In

1. Log in with your admin account
2. If you don't have an account, you may need to create one first

### Step 3: Create a Company

1. Go to **System Settings** → **Companies** tab
2. Click **"Add New Company"** or **"New Company"** button
3. Fill in company details:
   - **Name:** e.g., "Test Company" or "CS01"
   - **Unique Code:** e.g., "COMP001" or "TEST01"
   - Other details (optional)
4. Click **"Save"** or **"Create"**

### Step 4: Check Company ID

1. After creating, note the **ID** of the company
2. This ID will be used to create the bucket: `backups-company-{ID}`

### Step 5: Create User (Optional)

1. Go to **System Settings** → **Users** tab
2. Create a user for the company
3. This will help test the full system

---

## ✅ **Option 2: Create Test Data Directly in Supabase** (Quick Test)

If you want to quickly test, you can create a test company directly in Supabase:

### Step 1: Go to Table Editor

1. In Supabase dashboard, click **"Table Editor"**
2. Click on **`companies`** table

### Step 2: Insert Test Company

1. Click **"Insert"** button (or right-click → Insert row)
2. Fill in:
   - **id:** `1` (or any number)
   - **name:** `Test Company`
   - **unique_code:** `TEST001`
   - **is_active:** `true` (checkbox)
3. Click **"Save"** or press `Enter`

### Step 3: Insert Test User (Optional)

1. Click on **`users`** table
2. Click **"Insert"** button
3. Fill in:
   - **id:** `1` (or any text/number)
   - **name:** `Test User`
   - **email:** `test@hisabkitab.com`
   - **password:** `test123` (or any password)
   - **role:** `admin` (or `user`)
   - **company_id:** `1` (match the company ID you created)
4. Click **"Save"**

---

## ✅ **Option 3: Use SQL to Insert Test Data** (Fastest)

You can run this SQL query in SQL Editor:

```sql
-- Insert Test Company
INSERT INTO companies (id, name, unique_code, is_active)
VALUES (1, 'Test Company', 'TEST001', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Test User
INSERT INTO users (id, name, email, password, role, company_id)
VALUES ('1', 'Test Admin', 'admin@test.com', 'admin123', 'admin', 1)
ON CONFLICT (id) DO NOTHING;
```

**To run:**
1. Go to **SQL Editor**
2. Paste the SQL above
3. Click **"Run"**
4. Check **Table Editor** to verify data was inserted

---

## 🎯 **After Creating Data**

Once you have at least one company:

1. ✅ **Note the Company ID** (e.g., `1`)
2. ✅ **Create Company Bucket:**
   - Name: `backups-company-1` (replace 1 with your company ID)
   - Private bucket (unchecked)
3. ✅ **Verify in Storage:**
   - You should see `backups-admin` ✅
   - You should see `backups-company-1` ✅ (or your company ID)

---

## ⚠️ **Important Notes**

### **If You Don't Want to Create Data Now:**
- That's fine! You can proceed with just `backups-admin` bucket
- Company buckets can be created later when you add companies
- The system will work, but company-specific backups won't be created until buckets exist

### **If You Want to Test Everything:**
- Create at least one company (through app or Supabase)
- Create the corresponding bucket: `backups-company-{ID}`
- Then test backup upload

---

## 🚀 **Next Steps**

1. **Create test data** (choose one option above)
2. **Note company ID**
3. **Create company bucket:** `backups-company-{ID}`
4. **Restart app and test**

---

**Which option do you prefer?** I recommend Option 1 (through your app) as it's the most realistic test! 🚀


