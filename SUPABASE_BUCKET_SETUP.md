# 🪣 Supabase Storage Bucket Setup Guide

**Status:** ⏳ **SETUP REQUIRED**

---

## 📋 **Step-by-Step Instructions**

### Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project (or create a new one if needed)

---

### Step 2: Navigate to Storage

1. In the left sidebar, click **"Storage"**
2. You'll see a list of buckets (if any exist)

---

### Step 3: Create Buckets

You need to create **at least 2 buckets**:

#### Bucket 1: `backups-admin`
- **Name:** `backups-admin`
- **Public:** ❌ **No** (Private)
- **File size limit:** 10 MB (or as needed)
- **Allowed MIME types:** `application/json`, `application/gzip`

**Steps:**
1. Click **"New bucket"** button
2. Enter name: `backups-admin`
3. **Uncheck** "Public bucket" (make it private)
4. Click **"Create bucket"**

#### Bucket 2: `backups-company-{id}` (for each company)

For each company in your system, create a bucket:
- **Name pattern:** `backups-company-{companyId}`
- **Example:** If company ID is `1`, create `backups-company-1`
- **Example:** If company ID is `2`, create `backups-company-2`

**Steps:**
1. Click **"New bucket"** button
2. Enter name: `backups-company-{id}` (replace `{id}` with actual company ID)
3. **Uncheck** "Public bucket" (make it private)
4. Click **"Create bucket"**
5. Repeat for each company

**How to find Company IDs:**
- Go to your app → System Settings → Companies
- Each company has an ID (usually a number like 1, 2, 3, etc.)

---

### Step 4: Configure Bucket Policies (Optional but Recommended)

For each bucket, you can set up Row Level Security (RLS) policies:

1. Click on the bucket name
2. Go to **"Policies"** tab
3. Create policies to restrict access (optional)

**Note:** For now, you can skip this step. The app will handle access control.

---

## 🎯 **Quick Checklist**

- [ ] Created `backups-admin` bucket
- [ ] Created `backups-company-{id}` bucket for Company 1
- [ ] Created `backups-company-{id}` bucket for Company 2
- [ ] Created buckets for all other companies
- [ ] All buckets are **private** (not public)
- [ ] Verified bucket names match exactly (case-sensitive)

---

## ⚠️ **Important Notes**

1. **Bucket Names Must Match Exactly**
   - `backups-admin` (lowercase, with hyphen)
   - `backups-company-{id}` (lowercase, with hyphens)
   - Case-sensitive!

2. **Private Buckets**
   - All backup buckets should be **private**
   - This ensures only authorized users can access backups

3. **Automatic Bucket Creation**
   - The app will try to create buckets automatically if they don't exist
   - However, this may fail if you don't have admin privileges
   - **Best practice:** Create buckets manually in Supabase dashboard

4. **Company IDs**
   - You need to know your company IDs to create the right buckets
   - Check in your app: System Settings → Companies

---

## 🔍 **Verify Setup**

After creating buckets:

1. Go to **Storage** → **Buckets** in Supabase dashboard
2. You should see:
   - `backups-admin`
   - `backups-company-1` (or your company IDs)
   - `backups-company-2` (if you have multiple companies)
   - etc.

---

## 🚀 **Next Steps**

Once buckets are created:

1. ✅ **Buckets Created** ← You are here
2. ⏳ **Enable Service** (Already done - service is now enabled)
3. ⏳ **Test Backups** (See TESTING_GUIDE.md)

---

## ❓ **Troubleshooting**

### Bucket Creation Fails
- **Error:** "Bucket already exists"
  - **Solution:** Bucket already exists, you're good to go!

### Can't See Buckets
- **Error:** Buckets not showing in dashboard
  - **Solution:** Refresh the page, check you're in the right project

### Access Denied
- **Error:** "Access denied" when creating buckets
  - **Solution:** Make sure you have admin/owner access to the Supabase project

### Wrong Bucket Name
- **Error:** Backups not uploading
  - **Solution:** Check bucket names match exactly (case-sensitive)

---

## 📞 **Need Help?**

If you encounter issues:
1. Check Supabase documentation: [https://supabase.com/docs/guides/storage](https://supabase.com/docs/guides/storage)
2. Verify your Supabase project settings
3. Check browser console for error messages

---

**Ready to test?** See `TESTING_GUIDE.md` for next steps! 🚀





