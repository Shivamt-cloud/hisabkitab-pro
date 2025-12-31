# 🚀 Complete Supabase Setup Guide - Step by Step

**For users who don't have Supabase set up yet**

---

## 📋 **Overview**

This guide will help you:
1. Create a Supabase account (if you don't have one)
2. Create a Supabase project
3. Get your API keys
4. Configure environment variables
5. Create storage buckets for backups
6. Test the setup

**Time Required:** 15-20 minutes

---

## ✅ **Step 1: Create Supabase Account**

### 1.1 Go to Supabase Website

1. Open your web browser
2. Go to: [https://supabase.com](https://supabase.com)
3. Click **"Start your project"** or **"Sign In"** button (top right)

### 1.2 Sign Up / Sign In

**If you don't have an account:**
1. Click **"Sign Up"**
2. Choose one of these options:
   - Sign up with **GitHub** (recommended)
   - Sign up with **Google**
   - Sign up with **Email**
3. Complete the sign-up process
4. Verify your email if required

**If you already have an account:**
1. Click **"Sign In"**
2. Enter your credentials

---

## ✅ **Step 2: Create a New Project**

### 2.1 Access Dashboard

1. After signing in, you'll see the **Supabase Dashboard**
2. If you have existing projects, you'll see a list
3. Click **"New Project"** button (usually green, top right)

### 2.2 Fill Project Details

You'll see a form with these fields:

**Organization:**
- Select your organization (or create a new one)
- If this is your first project, you'll create an organization

**Project Name:**
- Enter: `hisabkitab-pro` (or any name you prefer)
- Example: `hisabkitab-inventory`

**Database Password:**
- **IMPORTANT:** Create a strong password
- **SAVE THIS PASSWORD** - you'll need it later
- Minimum 12 characters
- Example: `MySecurePass123!@#`

**Region:**
- Choose the region closest to you
- For India: Choose **"Southeast Asia (Singapore)"** or **"South Asia (Mumbai)"**
- For USA: Choose **"US East"** or **"US West"**

**Pricing Plan:**
- Select **"Free"** plan (for testing)
- You can upgrade later if needed

### 2.3 Create Project

1. Click **"Create new project"** button
2. **Wait 2-3 minutes** - Supabase is setting up your project
3. You'll see a loading screen with progress

**Note:** Don't close the browser during this time!

---

## ✅ **Step 3: Get Your API Keys**

### 3.1 Access Project Settings

Once your project is created:

1. You'll be redirected to your project dashboard
2. In the left sidebar, click **"Settings"** (gear icon at the bottom)
3. Click **"API"** in the settings menu

### 3.2 Find Your Keys

You'll see a page with several sections:

**Project URL:**
- Look for **"Project URL"**
- It looks like: `https://xxxxxxxxxxxxx.supabase.co`
- **Copy this URL** - you'll need it

**API Keys:**
- Look for **"Project API keys"** section
- Find **"anon"** or **"anon public"** key
- It's a long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Copy this key** - you'll need it

**Important:** 
- The **anon** key is safe to use in frontend code
- Never share your **service_role** key publicly

---

## ✅ **Step 4: Configure Environment Variables**

### 4.1 Find Your .env File

1. Go to your project folder: `/Users/shivamgarima/inventory-system`
2. Look for a file named `.env` in the root directory
3. If it doesn't exist, create it

### 4.2 Create/Update .env File

Open the `.env` file and add these lines:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace:**
- `https://your-project-id.supabase.co` with your **Project URL** from Step 3.2
- `your-anon-key-here` with your **anon key** from Step 3.2

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxOTU1NjY2NjY2fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.3 Save the File

1. Save the `.env` file
2. **Important:** Make sure `.env` is in `.gitignore` (it should be already)
3. Restart your development server if it's running:
   - Stop the server (Ctrl+C)
   - Run `npm run dev` again

---

## ✅ **Step 5: Create Storage Buckets**

### 5.1 Navigate to Storage

1. In your Supabase project dashboard
2. In the left sidebar, click **"Storage"**
3. You'll see a page with "Buckets" section

### 5.2 Create Admin Bucket

1. Click **"New bucket"** button (usually top right)
2. A form will appear:

   **Name:**
   - Enter: `backups-admin`
   - **Important:** Must be exactly `backups-admin` (lowercase, with hyphen)

   **Public bucket:**
   - **UNCHECK** this box (make it private)
   - Backups should be private for security

   **File size limit:**
   - Leave default or set to `10485760` (10 MB)

   **Allowed MIME types:**
   - Leave empty or add: `application/json, application/gzip`

3. Click **"Create bucket"** button
4. Wait for confirmation

### 5.3 Find Your Company IDs

Before creating company buckets, you need to know your company IDs:

**Option A: Check in Your App**
1. Start your app: `npm run dev`
2. Log in to your app
3. Go to **System Settings** → **Companies**
4. Note down the **ID** of each company (usually numbers like 1, 2, 3, etc.)

**Option B: Check in Supabase Database**
1. In Supabase dashboard, go to **"Table Editor"**
2. Find the `companies` table
3. Check the `id` column for each company

### 5.4 Create Company Buckets

For each company, create a bucket:

1. Click **"New bucket"** button again
2. Fill the form:

   **Name:**
   - Enter: `backups-company-{id}`
   - Replace `{id}` with actual company ID
   - Example: If company ID is `1`, enter: `backups-company-1`
   - Example: If company ID is `2`, enter: `backups-company-2`

   **Public bucket:**
   - **UNCHECK** this box (make it private)

   **File size limit:**
   - Leave default or set to `10485760` (10 MB)

   **Allowed MIME types:**
   - Leave empty or add: `application/json, application/gzip`

3. Click **"Create bucket"**
4. Repeat for each company

**Example:**
- Company ID 1 → Bucket: `backups-company-1`
- Company ID 2 → Bucket: `backups-company-2`
- Company ID 3 → Bucket: `backups-company-3`

### 5.5 Verify Buckets

1. In the Storage page, you should see:
   - `backups-admin` ✅
   - `backups-company-1` ✅ (or your company IDs)
   - `backups-company-2` ✅ (if you have multiple companies)

2. Make sure all buckets show **"Private"** (not "Public")

---

## ✅ **Step 6: Set Up Database Tables (If Not Already Done)**

### 6.1 Check if Tables Exist

1. In Supabase dashboard, go to **"Table Editor"**
2. Check if you see these tables:
   - `users` ✅
   - `companies` ✅

If these tables don't exist, you need to create them.

### 6.2 Create Users Table

1. Go to **"SQL Editor"** in Supabase dashboard
2. Click **"New query"**
3. Paste this SQL:

```sql
-- Create users table
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

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on company_id for filtering
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
```

4. Click **"Run"** button (or press Ctrl+Enter)
5. Wait for success message

### 6.3 Create Companies Table

1. In SQL Editor, click **"New query"**
2. Paste this SQL:

```sql
-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  unique_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on unique_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_unique_code ON companies(unique_code);
```

3. Click **"Run"** button
4. Wait for success message

### 6.4 Enable Row Level Security (RLS) - Optional

For better security, enable RLS:

1. In SQL Editor, create a new query
2. Paste this SQL:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - you can restrict later)
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on companies" ON companies
  FOR ALL USING (true) WITH CHECK (true);
```

3. Click **"Run"** button
4. Wait for success message

**Note:** These policies allow all operations. You can restrict them later for better security.

---

## ✅ **Step 7: Test the Setup**

### 7.1 Test Environment Variables

1. Start your app: `npm run dev`
2. Open browser console (F12)
3. Look for messages:
   - Should NOT see: `Supabase not configured`
   - Should see: Supabase client initialized

### 7.2 Test Database Connection

1. In your app, try to:
   - Create a new user
   - Create a new company
2. Check Supabase dashboard → Table Editor
3. Verify data appears in `users` and `companies` tables

### 7.3 Test Storage Buckets

1. In your app, go to **Backup & Restore** page
2. Click **"Create Backup"** or **"Export All Data"**
3. Check browser console for messages:
   - Should see: `✅ Backup created successfully`
   - Should see: `✅ Cloud backup uploaded`
4. Check Supabase dashboard → Storage → Buckets
5. Click on a bucket (e.g., `backups-admin`)
6. You should see a folder structure with backup files

---

## ✅ **Step 8: Verify Everything Works**

### Checklist:

- [ ] Supabase account created
- [ ] Supabase project created
- [ ] API keys copied
- [ ] `.env` file configured
- [ ] Storage buckets created:
  - [ ] `backups-admin`
  - [ ] `backups-company-{id}` (for each company)
- [ ] Database tables created:
  - [ ] `users` table
  - [ ] `companies` table
- [ ] Test backup upload works
- [ ] Test data sync works (users/companies)

---

## 🐛 **Troubleshooting**

### Issue: Can't create Supabase account
**Solution:**
- Try a different sign-up method (GitHub, Google, Email)
- Check your email for verification link
- Clear browser cache and try again

### Issue: Project creation stuck
**Solution:**
- Wait 5-10 minutes (sometimes takes longer)
- Refresh the page
- Check your internet connection
- Try creating project again

### Issue: Can't find API keys
**Solution:**
- Go to Settings → API
- Look for "Project URL" and "anon" key
- Make sure you're in the correct project

### Issue: .env file not working
**Solution:**
- Make sure file is named exactly `.env` (not `.env.txt`)
- Make sure file is in project root directory
- Restart development server after changes
- Check for typos in URL or key

### Issue: Can't create storage buckets
**Solution:**
- Check bucket name is correct (lowercase, with hyphens)
- Make sure bucket is private (not public)
- Try refreshing the page
- Check you have proper permissions

### Issue: Tables don't exist
**Solution:**
- Run the SQL queries in Step 6
- Check for error messages in SQL Editor
- Verify you're in the correct project

### Issue: Backups not uploading
**Solution:**
- Check `.env` file has correct values
- Verify buckets exist in Supabase
- Check browser console for errors
- Verify internet connection

---

## 📚 **Additional Resources**

- **Supabase Documentation:** [https://supabase.com/docs](https://supabase.com/docs)
- **Storage Guide:** [https://supabase.com/docs/guides/storage](https://supabase.com/docs/guides/storage)
- **SQL Editor:** [https://supabase.com/docs/guides/database/overview](https://supabase.com/docs/guides/database/overview)

---

## 🎯 **Next Steps**

Once setup is complete:

1. ✅ **Setup Complete** ← You are here
2. ⏳ **Test Backups** (See `TESTING_GUIDE.md`)
3. ⏳ **Monitor Backups** (Check daily)

---

## ❓ **Need Help?**

If you encounter any issues:
1. Check the troubleshooting section above
2. Check Supabase documentation
3. Check browser console for error messages
4. Verify all steps were completed correctly

---

**Ready to start?** Begin with Step 1! 🚀




