# 🔍 Find Your Company IDs - Quick Guide

**Status:** ✅ Admin Bucket Created | ⏳ Find Company IDs & Create Company Buckets

---

## ✅ **Step 1: Find Your Company IDs**

You have **2 options** to find your company IDs:

### **Option A: Check in Your App** (Recommended)

1. **Start your app** (if not running):
   ```bash
   npm run dev
   ```

2. **Open browser:** `http://localhost:5173`

3. **Log in** to your app

4. **Navigate to:** System Settings → **Companies** tab

5. **Look at the table:**
   - Find the **ID** column
   - Note down each company's ID number
   - Example: Company "CS01" might have ID = `1`
   - Example: Company "Test Company" might have ID = `2`

6. **Write down all company IDs** (you'll need them)

### **Option B: Check in Supabase Dashboard**

1. Go to Supabase dashboard
2. Click **"Table Editor"** in left sidebar
3. Click on **`companies`** table
4. Look at the **`id`** column
5. **Write down all company IDs**

---

## ✅ **Step 2: Create Company Buckets**

For **each company ID** you found, create a bucket:

### **Example:**
- If you have Company ID = `1` → Create bucket: `backups-company-1`
- If you have Company ID = `2` → Create bucket: `backups-company-2`
- If you have Company ID = `3` → Create bucket: `backups-company-3`

### **Steps for Each Company:**

1. In Supabase → Storage, click **"New bucket"** button

2. Fill the form:

   **Name:**
   - Type: `backups-company-{ID}`
   - Replace `{ID}` with actual company ID
   - **Example:** If company ID is `1`, type: `backups-company-1`
   - ⚠️ **Important:** Must be lowercase, with hyphens
   - ⚠️ **No spaces, no uppercase letters**

   **Public bucket:**
   - **UNCHECK** this box (make it private)

   **File size limit:**
   - Leave as default (or type: `10485760` for 10 MB)

   **Allowed MIME types:**
   - Leave empty

3. Click **"Create bucket"**

4. **Repeat for each company**

---

## ✅ **Step 3: Verify All Buckets**

1. In Storage page, you should see:
   - `backups-admin` ✅
   - `backups-company-1` ✅ (or your company IDs)
   - `backups-company-2` ✅ (if you have multiple)

2. Make sure all show **"Private"** (not "Public")

---

## ⚠️ **Important Notes**

### **If You Don't Have Companies Yet:**
- That's okay! You can create company buckets later
- For now, just having `backups-admin` is fine
- When you create companies in your app, come back and create their buckets

### **If You Have Companies:**
- You **must** create a bucket for each company
- Bucket name format: `backups-company-{ID}` (exact match)
- All buckets must be **private**

---

## 🎯 **Quick Checklist**

- [ ] Found all company IDs
- [ ] Created `backups-company-{id}` for each company
- [ ] All buckets are private
- [ ] Verified all buckets in Storage page

---

## 🚀 **After Buckets Are Created**

1. ✅ **Buckets Created** ← You are here
2. ⏳ **Restart App** (next step)
3. ⏳ **Test Backup Upload** (final step)

---

**Ready?** Find your company IDs and create the buckets! 🚀


