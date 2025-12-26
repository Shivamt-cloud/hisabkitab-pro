# 📝 Step-by-Step: Supabase Setup & Storage Buckets

**Complete beginner-friendly guide - Follow each step carefully**

---

## 🎯 **What We'll Do**

1. Create Supabase account
2. Create a project
3. Get API keys
4. Set up environment variables
5. Create database tables
6. Create storage buckets
7. Test everything

---

## ✅ **STEP 1: Create Supabase Account**

### What to do:
1. Open browser and go to: **https://supabase.com**
2. Click **"Start your project"** button (top right, green button)
3. Choose sign-up method:
   - **Option A:** Sign up with GitHub (recommended)
   - **Option B:** Sign up with Google
   - **Option C:** Sign up with Email
4. Complete the sign-up process
5. Verify your email if asked

### ✅ Checkpoint:
- [ ] You have a Supabase account
- [ ] You can log in to Supabase dashboard

---

## ✅ **STEP 2: Create a New Project**

### What to do:
1. After logging in, you'll see the dashboard
2. Click **"New Project"** button (green button, top right)
3. Fill in the form:

   **Organization:**
   - If first time, create a new organization
   - Name it: `My Organization` (or any name)

   **Project Name:**
   - Enter: `hisabkitab-pro`
   - (Or any name you like)

   **Database Password:**
   - Create a strong password
   - **WRITE IT DOWN** - you'll need it later
   - Example: `MySecurePass123!@#`
   - Minimum 12 characters

   **Region:**
   - Choose closest to you:
     - India: **"Southeast Asia (Singapore)"** or **"South Asia (Mumbai)"**
     - USA: **"US East"** or **"US West"**
     - Europe: **"West Europe"**

   **Pricing Plan:**
   - Select **"Free"** (for now)

4. Click **"Create new project"** button
5. **WAIT 2-3 minutes** - Don't close the browser!

### ✅ Checkpoint:
- [ ] Project is created
- [ ] You see the project dashboard
- [ ] Project status shows "Active"

---

## ✅ **STEP 3: Get Your API Keys**

### What to do:
1. In your project dashboard, look at the **left sidebar**
2. Scroll down and click **"Settings"** (gear icon ⚙️ at the bottom)
3. In the settings menu, click **"API"**
4. You'll see a page with your project details

### Find these two things:

**1. Project URL:**
- Look for **"Project URL"** section
- It looks like: `https://abcdefghijklmnop.supabase.co`
- **COPY THIS** - Click the copy icon or select and copy

**2. API Key (anon public):**
- Look for **"Project API keys"** section
- Find the key labeled **"anon"** or **"anon public"**
- It's a very long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **COPY THIS** - Click the copy icon or select and copy

### ✅ Checkpoint:
- [ ] You have copied Project URL
- [ ] You have copied anon key
- [ ] Both are saved somewhere safe (notepad, notes app, etc.)

---

## ✅ **STEP 4: Create .env File**

### What to do:
1. Go to your project folder on your computer:
   - Path: `/Users/shivamgarima/inventory-system`
2. Look for a file named `.env` in this folder
3. **If it doesn't exist:**
   - Create a new file
   - Name it exactly: `.env` (with the dot at the beginning)
   - **Important:** Not `.env.txt`, just `.env`

4. **Open the `.env` file** in a text editor
5. **Add these two lines:**

```env
VITE_SUPABASE_URL=PASTE_YOUR_PROJECT_URL_HERE
VITE_SUPABASE_ANON_KEY=PASTE_YOUR_ANON_KEY_HERE
```

6. **Replace:**
   - `PASTE_YOUR_PROJECT_URL_HERE` with your Project URL from Step 3
   - `PASTE_YOUR_ANON_KEY_HERE` with your anon key from Step 3

### Example:
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxOTU1NjY2NjY2fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

7. **Save the file**

### ✅ Checkpoint:
- [ ] `.env` file exists in project root
- [ ] File contains both variables
- [ ] Values are correct (no typos)

---

## ✅ **STEP 5: Create Database Tables**

### What to do:
1. In Supabase dashboard, click **"SQL Editor"** in left sidebar
2. Click **"New query"** button (top right)
3. **Copy this entire SQL code:**

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

4. **Paste it** into the SQL editor
5. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
6. Wait for success message: **"Success. No rows returned"**

### ✅ Checkpoint:
- [ ] SQL query ran successfully
- [ ] No error messages

---

## ✅ **STEP 6: Verify Tables Created**

### What to do:
1. In Supabase dashboard, click **"Table Editor"** in left sidebar
2. You should see two tables:
   - `users` ✅
   - `companies` ✅
3. Click on each table to see its structure

### ✅ Checkpoint:
- [ ] `users` table exists
- [ ] `companies` table exists

---

## ✅ **STEP 7: Create Storage Buckets**

### What to do:

#### 7.1 Navigate to Storage
1. In Supabase dashboard, click **"Storage"** in left sidebar
2. You'll see a page with "Buckets" section

#### 7.2 Create Admin Bucket
1. Click **"New bucket"** button (top right, green button)
2. Fill the form:

   **Name:**
   - Type exactly: `backups-admin`
   - **Important:** Must be lowercase, with hyphen

   **Public bucket:**
   - **UNCHECK** this box (make it private)
   - Backups should be private

   **File size limit:**
   - Leave as default or type: `10485760` (10 MB)

   **Allowed MIME types:**
   - Leave empty (or type: `application/json, application/gzip`)

3. Click **"Create bucket"** button
4. Wait for confirmation

### ✅ Checkpoint:
- [ ] `backups-admin` bucket created
- [ ] Bucket shows as "Private" (not Public)

#### 7.3 Find Your Company IDs

Before creating company buckets, you need to know your company IDs:

**Method 1: Check in Your App**
1. Start your app: Open terminal, run `npm run dev`
2. Open browser, go to `http://localhost:5173`
3. Log in to your app
4. Go to **System Settings** → **Companies** tab
5. Look at the **ID** column for each company
6. **Write down the IDs** (usually numbers like 1, 2, 3, etc.)

**Method 2: Check in Supabase**
1. In Supabase dashboard, go to **"Table Editor"**
2. Click on `companies` table
3. Look at the `id` column
4. **Write down the IDs**

### ✅ Checkpoint:
- [ ] You know your company IDs
- [ ] IDs are written down

#### 7.4 Create Company Buckets

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

### ✅ Checkpoint:
- [ ] All company buckets created
- [ ] Each bucket is private
- [ ] Bucket names match exactly: `backups-company-{ID}`

#### 7.5 Verify All Buckets

1. In Storage page, you should see:
   - `backups-admin` ✅
   - `backups-company-1` ✅ (or your company IDs)
   - `backups-company-2` ✅ (if you have multiple)

2. Make sure all show **"Private"** (not "Public")

### ✅ Checkpoint:
- [ ] All buckets visible
- [ ] All buckets are private
- [ ] Bucket names are correct

---

## ✅ **STEP 8: Restart Your App**

### What to do:
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

### ✅ Checkpoint:
- [ ] App restarted
- [ ] No errors in console
- [ ] Supabase connection working

---

## ✅ **STEP 9: Test the Setup**

### Test 1: Check Environment Variables
1. Open browser console (F12)
2. Look for error messages
3. Should NOT see: "Supabase not configured"

### Test 2: Create a Test User/Company
1. In your app, try to:
   - Create a new user
   - Create a new company
2. Go to Supabase dashboard → Table Editor
3. Check `users` and `companies` tables
4. Verify data appears

### Test 3: Test Backup Upload
1. In your app, go to **Backup & Restore** page
2. Click **"Create Backup"** or **"Export All Data"**
3. Check browser console (F12):
   - Should see: `✅ Backup created successfully`
   - Should see: `✅ Cloud backup uploaded`
4. Go to Supabase dashboard → Storage
5. Click on `backups-admin` bucket
6. You should see folders and files

### ✅ Checkpoint:
- [ ] Environment variables working
- [ ] Data syncs to Supabase
- [ ] Backup uploads to cloud

---

## 🎉 **You're Done!**

### Final Checklist:
- [ ] Supabase account created
- [ ] Project created
- [ ] API keys copied
- [ ] `.env` file configured
- [ ] Database tables created
- [ ] Storage buckets created
- [ ] App restarted
- [ ] Everything tested

---

## 🐛 **Common Issues & Solutions**

### Issue: Can't find .env file
**Solution:**
- Make sure file is in project root: `/Users/shivamgarima/inventory-system`
- File name must be exactly `.env` (with dot, no extension)
- On Mac/Linux, hidden files start with `.` - make sure you can see hidden files

### Issue: Bucket creation fails
**Solution:**
- Check bucket name is exactly correct (lowercase, with hyphens)
- Make sure bucket is private (unchecked)
- Try refreshing the page

### Issue: SQL query fails
**Solution:**
- Make sure you copied the entire SQL code
- Check for typos
- Try running each CREATE TABLE separately

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

## 🚀 **Next Steps**

After setup is complete:
1. ✅ **Setup Complete** ← You are here
2. ⏳ **Test Backups** (See `TESTING_GUIDE.md`)
3. ⏳ **Monitor Backups** (Check daily)

---

**Follow each step carefully, and you'll be done in 15-20 minutes!** 🎯


