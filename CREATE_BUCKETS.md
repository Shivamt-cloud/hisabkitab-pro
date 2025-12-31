# 🪣 Create Storage Buckets - Step by Step

**Status:** ✅ Tables Created | ⏳ Create Buckets

---

## ✅ **Step 1: Verify Tables Created** (30 seconds)

1. In Supabase dashboard, click **"Table Editor"** in left sidebar
2. You should see:
   - `users` table ✅
   - `companies` table ✅
3. Click on each to verify they exist

**If you see both tables, proceed to Step 2!**

---

## ✅ **Step 2: Navigate to Storage** (30 seconds)

1. In Supabase dashboard, click **"Storage"** in left sidebar
2. You'll see a page with "Buckets" section
3. If you see "No buckets yet" or empty list, that's normal

---

## ✅ **Step 3: Create Admin Bucket** (1 minute)

1. Click **"New bucket"** button (top right, green button)
2. Fill the form:

   **Name:**
   - Type exactly: `backups-admin`
   - ⚠️ **Important:** Must be lowercase, with hyphen
   - ⚠️ **No spaces, no uppercase letters**

   **Public bucket:**
   - **UNCHECK** this box (make it private)
   - Backups should be private for security

   **File size limit:**
   - Leave as default (or type: `10485760` for 10 MB)

   **Allowed MIME types:**
   - Leave empty (or type: `application/json, application/gzip`)

3. Click **"Create bucket"** button
4. Wait for confirmation message

**✅ Checkpoint:**
- [ ] `backups-admin` bucket created
- [ ] Bucket shows as "Private" (not "Public")

---

## ✅ **Step 4: Find Your Company IDs** (2 minutes)

You need to know your company IDs to create company buckets.

### **Method 1: Check in Your App** (Recommended)

1. **Start your app** (if not running):
   ```bash
   npm run dev
   ```

2. Open browser: `http://localhost:5173`

3. **Log in** to your app

4. Go to **System Settings** → **Companies** tab

5. Look at the **ID** column for each company
   - Example: Company "CS01" might have ID = 1
   - Example: Company "Test Company" might have ID = 2

6. **Write down the IDs** (usually numbers like 1, 2, 3, etc.)

### **Method 2: Check in Supabase** (If you have data)

1. In Supabase dashboard, go to **"Table Editor"**
2. Click on `companies` table
3. Look at the `id` column
4. **Write down the IDs**

### **Method 3: If You Don't Have Companies Yet**

If you don't have any companies yet:
- You can create company buckets later
- For now, just create the `backups-admin` bucket
- When you create companies, come back and create their buckets

**✅ Checkpoint:**
- [ ] You know your company IDs (or you'll create them later)
- [ ] IDs are written down

---

## ✅ **Step 5: Create Company Buckets** (2 minutes per company)

For **each company**, create a bucket:

1. Click **"New bucket"** button again
2. Fill the form:

   **Name:**
   - Type: `backups-company-{ID}`
   - Replace `{ID}` with actual company ID
   - **Example:** If company ID is `1`, type: `backups-company-1`
   - **Example:** If company ID is `2`, type: `backups-company-2`
   - ⚠️ **Important:** Must be lowercase, with hyphens

   **Public bucket:**
   - **UNCHECK** this box (make it private)

   **File size limit:**
   - Leave as default (or type: `10485760`)

   **Allowed MIME types:**
   - Leave empty

3. Click **"Create bucket"**
4. **Repeat for each company**

### **Examples:**

- Company ID = 1 → Create: `backups-company-1`
- Company ID = 2 → Create: `backups-company-2`
- Company ID = 3 → Create: `backups-company-3`

**✅ Checkpoint:**
- [ ] All company buckets created
- [ ] Each bucket is private
- [ ] Bucket names match exactly: `backups-company-{ID}`

---

## ✅ **Step 6: Verify All Buckets** (30 seconds)

1. In Storage page, you should see:
   - `backups-admin` ✅
   - `backups-company-1` ✅ (or your company IDs)
   - `backups-company-2` ✅ (if you have multiple)

2. Make sure all show **"Private"** (not "Public")

**✅ Checkpoint:**
- [ ] All buckets visible
- [ ] All buckets are private
- [ ] Bucket names are correct

---

## 🎉 **You're Done with Buckets!**

### Final Checklist:
- [ ] `backups-admin` bucket created ✅
- [ ] Company buckets created (if you have companies) ✅
- [ ] All buckets are private ✅

---

## 🚀 **Next Steps After Buckets**

1. ✅ **Buckets Created** ← You are here
2. ⏳ **Restart App** (see below)
3. ⏳ **Test Backup Upload** (see below)

---

## ✅ **Step 7: Restart Your App** (1 minute)

1. **Stop your app** (if running):
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

**✅ Checkpoint:**
- [ ] App restarted
- [ ] No errors in console
- [ ] Supabase connection working

---

## ✅ **Step 8: Test Backup Upload** (2 minutes)

1. In your app, go to **Backup & Restore** page
2. Click **"Create Backup"** or **"Export All Data"** button
3. **Check browser console** (F12):
   - Should see: `✅ Backup created successfully`
   - Should see: `✅ Cloud backup uploaded`
4. **Go to Supabase dashboard** → Storage
5. Click on `backups-admin` bucket
6. You should see a folder structure with backup files

**✅ Checkpoint:**
- [ ] Backup created successfully
- [ ] Backup uploaded to cloud
- [ ] File visible in Supabase Storage

---

## 🐛 **Troubleshooting**

### Issue: Can't create bucket
**Solution:**
- Check bucket name is exactly correct (lowercase, with hyphens)
- Make sure bucket is private (unchecked)
- Try refreshing the page

### Issue: Bucket name already exists
**Solution:**
- Bucket already exists, you're good to go!
- Or delete the existing bucket and create again

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
3. Verify bucket names are exactly correct
4. Make sure buckets are private

---

**Ready?** Start with Step 1: Verify Tables! 🚀




