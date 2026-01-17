# 🔧 Setup .env File for Supabase

## ✅ **Current Status**
- ❌ `.env` file **NOT FOUND** in your project
- ✅ Code is ready to use Supabase when configured
- ✅ Currently works with local IndexedDB (no setup needed)

---

## 🚀 **Quick Setup (Choose One)**

### **Option 1: Use Local Database Only (No Setup Needed)**
- ✅ **Works immediately** - Google sign-in will use local IndexedDB
- ✅ No configuration required
- ⚠️ Data stays on user's device only
- ⚠️ No cloud sync

**Status:** Your app already works this way! No action needed.

---

### **Option 2: Set Up Supabase Cloud Database (Recommended)**

#### **Step 1: Create Supabase Project** (5 minutes)

1. Go to: https://supabase.com
2. Sign up / Log in
3. Click **"New Project"**
4. Fill in:
   - **Name:** `hisabkitab-pro`
   - **Database Password:** (create strong password, save it!)
   - **Region:** Choose closest to you
   - **Plan:** Free
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup

---

#### **Step 2: Get Your API Keys** (2 minutes)

1. In Supabase dashboard, go to **"Settings"** (gear icon, left sidebar)
2. Click **"API"**
3. Copy these values:

   **Project URL:**
   ```
   https://xxxxx.supabase.co
   ```

   **anon public key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

#### **Step 3: Create .env File** (1 minute)

1. In your project folder, create a new file named `.env`
2. Add these lines (replace with your actual values):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file

---

#### **Step 4: Create Database Tables** (3 minutes)

1. In Supabase dashboard, go to **"SQL Editor"**
2. Click **"New query"**
3. Copy and paste this SQL:

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

4. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)
5. Wait for success message

---

#### **Step 5: Verify Setup** (1 minute)

1. In Supabase dashboard, go to **"Table Editor"**
2. You should see:
   - ✅ `users` table
   - ✅ `companies` table

---

#### **Step 6: Restart Dev Server**

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ **Verification Checklist**

- [ ] Supabase project created
- [ ] `.env` file created in project root
- [ ] `VITE_SUPABASE_URL` set in `.env`
- [ ] `VITE_SUPABASE_ANON_KEY` set in `.env`
- [ ] `users` table exists in Supabase
- [ ] `companies` table exists in Supabase
- [ ] Dev server restarted

---

## 🧪 **Test Your Setup**

1. Open browser console (F12)
2. Go to login page
3. Look for console messages:
   - ✅ No "Supabase not configured" warning = Success!
   - ❌ Warning appears = Check `.env` file

---

## 📝 **Notes**

- `.env` file is in `.gitignore` (won't be committed to git)
- The `anon` key is safe to use in frontend code
- Never share your `service_role` key publicly
- If Supabase is not configured, app falls back to local IndexedDB automatically

---

**Need Help?**
- See `SUPABASE_SETUP_GUIDE.md` for detailed instructions
- See `COMPLETE_SUPABASE_SETUP.md` for step-by-step guide
