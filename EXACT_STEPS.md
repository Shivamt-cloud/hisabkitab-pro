# 📋 Exact Steps - Test Setup

**Follow these steps exactly in order**

---

## ✅ **STEP 1: Create Test Data in Supabase** (2 minutes)

### 1.1 Go to SQL Editor
1. Open your Supabase dashboard: https://supabase.com/dashboard/project/uywqvyohahdadrlcbkzb
2. In the **left sidebar**, click **"SQL Editor"**
3. Click **"New query"** button (top right)

### 1.2 Copy and Paste SQL
1. **Copy this entire SQL code:**

```sql
-- Insert Test Company
INSERT INTO companies (id, name, unique_code, is_active)
VALUES (1, 'Test Company', 'TEST001', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Test Admin User
INSERT INTO users (id, name, email, password, role, company_id)
VALUES ('1', 'Test Admin', 'admin@test.com', 'admin123', 'admin', 1)
ON CONFLICT (id) DO NOTHING;
```

2. **Paste it** into the SQL Editor text area

### 1.3 Run the Query
1. Click **"Run"** button (top right, or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for success message: **"Success. 2 rows inserted"** (or similar)

### 1.4 Verify Data Created
1. Click **"Table Editor"** in left sidebar
2. Click on **`companies`** table
3. You should see: **ID = 1, Name = "Test Company"** ✅
4. Click on **`users`** table
5. You should see: **ID = 1, Name = "Test Admin"** ✅

**✅ Checkpoint:**
- [ ] SQL query ran successfully
- [ ] Company with ID = 1 exists
- [ ] User exists

---

## ✅ **STEP 2: Create Company Bucket** (1 minute)

### 2.1 Go to Storage
1. In Supabase dashboard, click **"Storage"** in left sidebar
2. You should see `backups-admin` bucket already created

### 2.2 Create Company Bucket
1. Click **"New bucket"** button (top right, green button)
2. Fill the form:

   **Name:**
   - Type exactly: `backups-company-1`
   - ⚠️ **Important:** Must be lowercase, with hyphen
   - ⚠️ **No spaces, no uppercase letters**

   **Public bucket:**
   - **UNCHECK** this box (make it private)
   - The checkbox should be **empty/unchecked**

   **File size limit:**
   - Leave as default (or type: `10485760`)

   **Allowed MIME types:**
   - Leave empty

3. Click **"Create bucket"** button
4. Wait for confirmation

### 2.3 Verify Bucket Created
1. In Storage page, you should see:
   - `backups-admin` ✅
   - `backups-company-1` ✅
2. Both should show **"Private"** (not "Public")

**✅ Checkpoint:**
- [ ] `backups-company-1` bucket created
- [ ] Bucket shows as "Private"
- [ ] Both buckets visible in Storage

---

## ✅ **STEP 3: Verify .env File** (1 minute)

### 3.1 Check .env File Exists
1. Go to your project folder: `/Users/shivamgarima/inventory-system`
2. Look for file named `.env` (with dot at beginning)
3. If it doesn't exist, create it

### 3.2 Check .env File Content
1. Open `.env` file in a text editor
2. It should contain:

```env
VITE_SUPABASE_URL=https://uywqvyohahdadrlcbkzb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d3F2eW9oYWhkYWRybGNia3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NDkwMjgsImV4cCI6MjA4MjIyNTAyOH0.cC7u1znzYmwLEfkHQBxvjeI6aAjhsCk2HsiYRMdJ6sQ
```

3. **If missing or incorrect, update it**

**✅ Checkpoint:**
- [ ] `.env` file exists
- [ ] Contains correct Supabase URL
- [ ] Contains correct anon key

---

## ✅ **STEP 4: Restart Your App** (1 minute)

### 4.1 Stop the App (if running)
1. Go to your terminal/command prompt
2. If you see the app running, press **`Ctrl+C`** (or `Cmd+C` on Mac)
3. Wait for it to stop

### 4.2 Start the App
1. Make sure you're in the project folder:
   ```bash
   cd /Users/shivamgarima/inventory-system
   ```

2. Start the app:
   ```bash
   npm run dev
   ```

3. Wait for it to start
4. You should see: **"Local: http://localhost:5173"**

### 4.3 Open Browser
1. Open your browser
2. Go to: `http://localhost:5173`
3. The app should load

### 4.4 Check Browser Console
1. Press **`F12`** to open browser console (or right-click → Inspect → Console)
2. Look for messages:
   - Should see: Supabase client initialized
   - Should NOT see: "Supabase not configured"
   - Should NOT see any red error messages

**✅ Checkpoint:**
- [ ] App is running
- [ ] App loads in browser
- [ ] No errors in console
- [ ] Supabase connection working

---

## ✅ **STEP 5: Test Backup Upload** (2 minutes)

### 5.1 Log In to Your App
1. In the app, log in with your admin account
2. If you don't have an account, you may need to create one first

### 5.2 Go to Backup & Restore Page
1. Navigate to **"Backup & Restore"** page
   - Usually in menu: Settings → Backup & Restore
   - Or go to: `http://localhost:5173/backup-restore`

### 5.3 Create a Backup
1. Look for **"Create Backup"** or **"Export All Data"** button
2. Click the button
3. Wait for backup to complete (may take a few seconds)

### 5.4 Check Browser Console
1. Keep browser console open (F12)
2. Look for these messages:
   - ✅ `✅ Backup created successfully`
   - ✅ `✅ Cloud backup uploaded`
   - ✅ `Uploaded to: auto/{date}/{filename}.gz`

### 5.5 Verify in Supabase Storage
1. Go back to Supabase dashboard
2. Click **"Storage"** → **"Buckets"**
3. Click on **`backups-admin`** bucket
4. You should see:
   - A folder named `auto/`
   - Inside: A date folder (e.g., `2025-01-XX/`)
   - Inside that: A backup file (e.g., `backup_*.json.gz`)

**✅ Checkpoint:**
- [ ] Backup created successfully
- [ ] Console shows success messages
- [ ] Backup file visible in Supabase Storage
- [ ] File has `.gz` extension (compressed)

---

## ✅ **STEP 6: Verify Everything Works** (1 minute)

### 6.1 Check All Buckets
1. In Supabase → Storage
2. Verify you see:
   - `backups-admin` ✅
   - `backups-company-1` ✅

### 6.2 Check Tables Have Data
1. In Supabase → Table Editor
2. Check:
   - `companies` table has 1 row ✅
   - `users` table has 1 row ✅

### 6.3 Check App is Working
1. In your app, try to:
   - View companies (should see "Test Company")
   - View users (should see "Test Admin")
   - Create another backup

**✅ Checkpoint:**
- [ ] All buckets exist
- [ ] Tables have data
- [ ] App is working correctly

---

## 🎉 **You're Done!**

### Final Checklist:
- [ ] Test data created (company + user)
- [ ] Company bucket created (`backups-company-1`)
- [ ] `.env` file configured
- [ ] App restarted
- [ ] Backup uploaded successfully
- [ ] Backup visible in Supabase Storage

---

## 🐛 **Troubleshooting**

### Issue: SQL query fails
**Solution:**
- Make sure you copied the entire SQL code
- Check for typos
- Try running each INSERT separately

### Issue: Can't create bucket
**Solution:**
- Check bucket name is exactly: `backups-company-1` (lowercase, with hyphen)
- Make sure "Public bucket" is unchecked
- Try refreshing the page

### Issue: App won't start
**Solution:**
- Check `.env` file exists and has correct values
- Make sure you're in the project folder
- Try: `npm install` (if needed)

### Issue: Backup not uploading
**Solution:**
- Check browser console for errors
- Verify buckets exist in Supabase
- Check `.env` file has correct values
- Restart the app

### Issue: Can't see backup in Storage
**Solution:**
- Wait a few seconds (upload may take time)
- Refresh the Storage page
- Check browser console for errors
- Verify you're looking in the correct bucket (`backups-admin`)

---

## 📞 **Need Help?**

If you're stuck at any step:
1. Check the troubleshooting section above
2. Check browser console for error messages
3. Verify each step was completed correctly
4. Make sure you didn't skip any steps

---

**Follow each step exactly, and you'll be done in 5-7 minutes!** 🚀





