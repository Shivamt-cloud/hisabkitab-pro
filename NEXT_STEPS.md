# ✅ Next Steps - Supabase Setup

**Status:** ✅ Environment Variables Configured

---

## ✅ **What's Done**

1. ✅ Supabase project created: `hisabkitab-pro`
2. ✅ `.env` file created with your credentials
3. ✅ Project URL: `https://uywqvyohahdadrlcbkzb.supabase.co`
4. ✅ Anon key configured

---

## ⏳ **What You Need to Do Next**

### **Step 1: Create Database Tables** (3 minutes)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/uywqvyohahdadrlcbkzb
2. In the left sidebar, click **"SQL Editor"**
3. Click **"New query"** button (top right)
4. **Copy and paste this SQL code:**

```sql
-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  company_id INTEGER,
  user_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  unique_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_unique_code ON companies(unique_code);
```

5. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
6. Wait for success message: **"Success. No rows returned"**

### ✅ **Checkpoint:**
- [ ] SQL query ran successfully
- [ ] No error messages

---

### **Step 2: Verify Tables Created** (1 minute)

1. In Supabase dashboard, click **"Table Editor"** in left sidebar
2. You should see two tables:
   - `users` ✅
   - `companies` ✅
3. Click on each table to see its structure

### ✅ **Checkpoint:**
- [ ] `users` table exists
- [ ] `companies` table exists

---

### **Step 3: Create Storage Buckets** (5 minutes)

#### 3.1 Navigate to Storage
1. In Supabase dashboard, click **"Storage"** in left sidebar
2. You'll see a page with "Buckets" section

#### 3.2 Create Admin Bucket
1. Click **"New bucket"** button (top right, green button)
2. Fill the form:

   **Name:**
   - Type exactly: `backups-admin`
   - **Important:** Must be lowercase, with hyphen

   **Public bucket:**
   - **UNCHECK** this box (make it private)
   - Backups should be private for security

   **File size limit:**
   - Leave as default or type: `10485760` (10 MB)

   **Allowed MIME types:**
   - Leave empty (or type: `application/json, application/gzip`)

3. Click **"Create bucket"** button
4. Wait for confirmation

### ✅ **Checkpoint:**
- [ ] `backups-admin` bucket created
- [ ] Bucket shows as "Private" (not Public)

#### 3.3 Find Your Company IDs

**Method 1: Check in Your App**
1. Start your app: Open terminal, run `npm run dev`
2. Open browser, go to `http://localhost:5173`
3. Log in to your app
4. Go to **System Settings** → **Companies** tab
5. Look at the **ID** column for each company
6. **Write down the IDs** (usually numbers like 1, 2, 3, etc.)

**Method 2: Check in Supabase (if you have data)**
1. In Supabase dashboard, go to **"Table Editor"**
2. Click on `companies` table
3. Look at the `id` column
4. **Write down the IDs**

### ✅ **Checkpoint:**
- [ ] You know your company IDs
- [ ] IDs are written down

#### 3.4 Create Company Buckets

For **each company**, create a bucket:

1. Click **"New bucket"** button again
2. Fill the form:

   **Name:**
   - Type: `backups-company-{ID}`
   - Replace `{ID}` with actual company ID
   - **Example:** If company ID is `1`, type: `backups-company-1`
   - **Example:** If company ID is `2`, type: `backups-company-2`

   **Public bucket:**
   - **UNCHECK** this box

   **File size limit:**
   - Leave as default or type: `10485760`

   **Allowed MIME types:**
   - Leave empty

3. Click **"Create bucket"**
4. **Repeat for each company**

### Example:
- Company ID = 1 → Create bucket: `backups-company-1`
- Company ID = 2 → Create bucket: `backups-company-2`
- Company ID = 3 → Create bucket: `backups-company-3`

### ✅ **Checkpoint:**
- [ ] All company buckets created
- [ ] Each bucket is private
- [ ] Bucket names match exactly: `backups-company-{ID}`

#### 3.5 Verify All Buckets

1. In Storage page, you should see:
   - `backups-admin` ✅
   - `backups-company-1` ✅ (or your company IDs)
   - `backups-company-2` ✅ (if you have multiple)

2. Make sure all show **"Private"** (not "Public")

### ✅ **Checkpoint:**
- [ ] All buckets visible
- [ ] All buckets are private
- [ ] Bucket names are correct

---

### **Step 4: Restart Your App** (1 minute)

1. If your app is running, **stop it:**
   - Go to terminal
   - Press `Ctrl+C` (or `Cmd+C` on Mac)

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. Wait for app to start
4. Open browser console (Press `F12`)
5. Look for messages:
   - Should see: Supabase client initialized
   - Should NOT see: "Supabase not configured"

### ✅ **Checkpoint:**
- [ ] App restarted
- [ ] No errors in console
- [ ] Supabase connection working

---

### **Step 5: Test the Setup** (5 minutes)

#### Test 1: Check Environment Variables
1. Open browser console (F12)
2. Look for error messages
3. Should NOT see: "Supabase not configured"

#### Test 2: Create a Test User/Company
1. In your app, try to:
   - Create a new user
   - Create a new company
2. Go to Supabase dashboard → Table Editor
3. Check `users` and `companies` tables
4. Verify data appears

#### Test 3: Test Backup Upload
1. In your app, go to **Backup & Restore** page
2. Click **"Create Backup"** or **"Export All Data"**
3. Check browser console (F12):
   - Should see: `✅ Backup created successfully`
   - Should see: `✅ Cloud backup uploaded`
4. Go to Supabase dashboard → Storage
5. Click on `backups-admin` bucket
6. You should see folders and files

### ✅ **Checkpoint:**
- [ ] Environment variables working
- [ ] Data syncs to Supabase
- [ ] Backup uploads to cloud

---

## 🎉 **You're Done!**

### Final Checklist:
- [ ] Database tables created
- [ ] Storage buckets created
- [ ] App restarted
- [ ] Everything tested

---

## 🐛 **Troubleshooting**

### Issue: SQL query fails
**Solution:**
- Make sure you copied the entire SQL code
- Check for typos
- Try running each CREATE TABLE separately

### Issue: Can't create buckets
**Solution:**
- Check bucket name is exactly correct (lowercase, with hyphens)
- Make sure bucket is private (unchecked)
- Try refreshing the page

### Issue: Backups not uploading
**Solution:**
- Check `.env` file has correct values
- Verify buckets exist in Supabase
- Check browser console for errors
- Restart the app

---

## 📞 **Need Help?**

If you're stuck:
1. Check the troubleshooting section above
2. Check browser console for error messages
3. Verify each step was completed correctly
4. Make sure you didn't skip any steps

---

## 🚀 **After Setup**

Once everything is working:
1. ✅ **Setup Complete** ← You are here
2. ⏳ **Test Backups** (See `TESTING_GUIDE.md`)
3. ⏳ **Monitor Backups** (Check daily)

---

**Ready to continue?** Start with Step 1: Create Database Tables! 🚀
