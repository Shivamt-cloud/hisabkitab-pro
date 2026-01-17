# 📋 Registration Requests Table - Supabase Setup

## ✅ **SQL Query to Create Table**

Copy and paste this SQL query in your Supabase SQL Editor:

```sql
-- Create Registration Requests Table for Supabase
-- This table stores user registration requests before accounts are created

CREATE TABLE IF NOT EXISTS registration_requests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT,
  registration_method TEXT NOT NULL CHECK (registration_method IN ('google', 'direct')),
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  gstin TEXT,
  website TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_requests_registration_method ON registration_requests(registration_method);

-- Optional: Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER trigger_update_registration_requests_updated_at
  BEFORE UPDATE ON registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_requests_updated_at();
```

---

## 📝 **Step-by-Step Instructions**

### **Step 1: Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Select your project: `hisabkitab-pro` (or your project name)
3. Project URL: `https://uywqvyohahdadrlcbkzb.supabase.co`

---

### **Step 2: Open SQL Editor**

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** button (top right)

---

### **Step 3: Copy and Paste SQL Query**

1. Copy the entire SQL query from above (or from `CREATE_REGISTRATION_REQUESTS_TABLE.sql` file)
2. Paste it into the SQL Editor
3. Make sure all lines are copied correctly

---

### **Step 4: Run the Query**

1. Click **"Run"** button (top right, or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for success message: **"Success. No rows returned"**
3. This is normal - the query creates the table structure, not data

---

### **Step 5: Verify Table Created**

1. In the left sidebar, click **"Table Editor"**
2. You should see **`registration_requests`** table in the list
3. Click on it to see the structure
4. Verify all columns are present

---

## 📊 **Table Structure**

| Column Name | Type | Nullable | Default | Description |
|------------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NO | Auto-increment | Primary key |
| `name` | TEXT | NO | - | User's full name |
| `email` | TEXT | NO | - | User's email address |
| `password` | TEXT | YES | - | Password (for direct registration) |
| `registration_method` | TEXT | NO | - | 'google' or 'direct' |
| `business_name` | TEXT | NO | - | Business/company name |
| `business_type` | TEXT | NO | - | Type of business |
| `address` | TEXT | NO | - | Business address |
| `city` | TEXT | NO | - | City |
| `state` | TEXT | NO | - | State |
| `pincode` | TEXT | NO | - | Postal code |
| `country` | TEXT | NO | - | Country |
| `phone` | TEXT | NO | - | Phone number |
| `gstin` | TEXT | YES | - | GSTIN (optional) |
| `website` | TEXT | YES | - | Website URL (optional) |
| `description` | TEXT | YES | - | Additional information (optional) |
| `status` | TEXT | NO | 'pending' | 'pending', 'approved', or 'rejected' |
| `created_at` | TIMESTAMP | NO | NOW() | Record creation time |
| `updated_at` | TIMESTAMP | NO | NOW() | Last update time |

---

## 🔍 **Indexes Created**

- `idx_registration_requests_email` - Fast email lookups
- `idx_registration_requests_status` - Filter by status (pending/approved/rejected)
- `idx_registration_requests_created_at` - Sort by creation date
- `idx_registration_requests_registration_method` - Filter by registration method

---

## ✅ **What Happens Next**

After creating the table:
1. Registration requests will be saved to Supabase
2. You can view requests in Supabase Table Editor
3. You can query/approve/reject requests
4. Data is stored in cloud (accessible from anywhere)

---

## 🔒 **Row Level Security (Optional)**

If you want to restrict access, you can add RLS policies:

```sql
-- Enable RLS (if not already enabled)
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (for admin operations)
CREATE POLICY "Service role full access" ON registration_requests
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 📝 **Notes**

- The `id` field uses `BIGSERIAL` (auto-incrementing integer)
- `password` is optional (only for direct registration, not Google)
- `status` defaults to 'pending'
- `created_at` and `updated_at` are automatically managed
- Indexes help with fast queries

---

**Ready to create the table?** Follow the steps above! 🚀
