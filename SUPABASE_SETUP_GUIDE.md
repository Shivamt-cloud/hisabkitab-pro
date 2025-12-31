# 🚀 Supabase Setup Guide

## Step 1: Create Supabase Account

1. Go to: https://supabase.com
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

---

## Step 2: Create New Project

1. Click **"New Project"** (top right)
2. Fill in project details:
   - **Name:** `hisabkitab-pro` (or any name)
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to you (e.g., `Southeast Asia (Singapore)`)
   - **Pricing Plan:** Select **"Free"**
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to be created

---

## Step 3: Get API Keys

1. Once project is ready, go to **"Settings"** (gear icon, left sidebar)
2. Click **"API"** in the settings menu
3. You'll see:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key:** (keep this secret!)

4. **Copy these values** - you'll need them!

---

## Step 4: Create Database Tables

1. Go to **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  company_id INTEGER,
  user_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  unique_code TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  gstin TEXT,
  pan TEXT,
  website TEXT,
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_unique_code ON companies(unique_code);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
-- Allow all authenticated users to read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id OR auth.role() = 'service_role');

-- Allow service role to do everything (for admin operations)
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for Companies
-- Allow all authenticated users to read companies
CREATE POLICY "Users can read companies" ON companies
  FOR SELECT USING (true);

-- Allow service role to do everything
CREATE POLICY "Service role full access companies" ON companies
  FOR ALL USING (auth.role() = 'service_role');
```

4. Click **"Run"** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

---

## Step 5: Configure Environment Variables

1. Create a `.env` file in your project root (if not exists)
2. Add these variables:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Replace with your actual values from Step 3
4. **Important:** Add `.env` to `.gitignore` (don't commit secrets!)

---

## Step 6: Verify Setup

1. Go to **"Table Editor"** (left sidebar)
2. You should see `users` and `companies` tables
3. Click on them to verify structure

---

## Troubleshooting

### Issue: "Project creation failed"
- **Solution:** Try again, or use a different project name

### Issue: "SQL query failed"
- **Solution:** Make sure you're in the SQL Editor and copied the full SQL

### Issue: "RLS policy error"
- **Solution:** For now, we can disable RLS or use service_role key (we'll configure properly later)

---

## Next Steps

After setup:
1. ✅ Share your Supabase URL and anon key (I'll help configure)
2. ✅ I'll implement the cloud services
3. ✅ We'll test together

---

## Security Note

- **anon key:** Safe to use in frontend (has RLS protection)
- **service_role key:** Keep secret! Only use in backend/server
- **Database password:** Keep secret! Only needed for direct DB access

---

Ready? Let me know when you've completed the setup! 🚀




