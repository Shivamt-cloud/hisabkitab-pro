# Cloud Backup Setup Guide

## ✅ Status: Code Ready, Manual Setup Required

The cloud backup functionality is **fully implemented** in code. You just need to complete the manual setup steps in Supabase Dashboard.

---

## 📋 Quick Setup Checklist (5-10 minutes)

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project (or create a new one if needed)

### Step 2: Create Storage Buckets

You need to create storage buckets for backups. Go to **Storage** → **Buckets** in the Supabase dashboard.

#### Required Buckets:

1. **`backups-admin`** (for admin/system backups)
   - Click "New bucket"
   - Name: `backups-admin`
   - **Uncheck** "Public bucket" (make it private)
   - Click "Create bucket"

2. **`backups-company-{id}`** (one for each company)
   - You need to create a bucket for each company
   - Example: If you have Company ID `1`, create: `backups-company-1`
   - Example: If you have Company ID `2`, create: `backups-company-2`
   
   **To find Company IDs:**
   - Open your app → System Settings → Companies
   - Each company has an ID (usually 1, 2, 3, etc.)

   **For each company:**
   - Click "New bucket"
   - Name: `backups-company-{id}` (replace `{id}` with actual company ID)
   - **Uncheck** "Public bucket" (make it private)
   - Click "Create bucket"

### Step 3: Verify Service is Enabled

The time-based backup service is **already enabled** in code (`DatabaseProvider.tsx` line 68-69).

Backups will automatically run at:
- **12:00 PM** (noon) daily
- **6:00 PM** (evening) daily

---

## 🧪 Testing (After Setup)

Once buckets are created, test the system:

### Test 1: Manual Backup
1. Go to **Backup & Restore** page in your app
2. Click "Create Backup" or "Export All Data"
3. Check browser console for success messages
4. Verify backup appears in Supabase Storage

### Test 2: Verify Cloud Backup List
1. Go to **Backup & Restore** page
2. Look for "Cloud Backups" section
3. Verify backups are listed
4. Try downloading a backup

### Test 3: Test Restore
1. Select a cloud backup
2. Click "Restore"
3. Verify data is restored correctly

### Test 4: Verify Automatic Backups
- Wait for 12:00 PM or 6:00 PM
- Check Supabase Storage to see if backup was created
- Verify backup file exists in the appropriate bucket

---

## 📊 What Happens After Setup

### Automatic Backups:
- ✅ Backups created at **12:00 PM** daily
- ✅ Backups created at **6:00 PM** daily
- ✅ Each company backed up separately
- ✅ Backups uploaded to cloud automatically
- ✅ 3-day rolling retention (keeps 6 backups per company)

### Storage Structure:
```
backups-admin/
  └── 2025-01-15/
      ├── backup_2025-01-15_12-00_1234567890.json.gz
      └── backup_2025-01-15_18-00_1234567890.json.gz

backups-company-1/
  └── 2025-01-15/
      ├── backup_2025-01-15_12-00_1234567890.json.gz
      └── backup_2025-01-15_18-00_1234567890.json.gz
```

---

## 🔧 Configuration

### Time-Based Backup Schedule:
- **Times:** 12:00 PM and 6:00 PM (daily)
- **Service:** Already enabled in code
- **Location:** `src/components/DatabaseProvider.tsx` (line 68-69)

### Backup Retention:
- **Policy:** 3-day rolling retention
- **Keeps:** 6 backups per company (2 per day × 3 days)
- **Cleanup:** Automatic (old backups deleted after 3 days)

---

## ⚠️ Important Notes

1. **Buckets Must Be Private:**
   - Always uncheck "Public bucket" when creating buckets
   - Backups contain sensitive business data

2. **Company IDs:**
   - Bucket names must match exactly: `backups-company-{id}`
   - Use actual company ID numbers (1, 2, 3, etc.)

3. **Storage Limits:**
   - Supabase Free Tier: 1 GB storage
   - Each backup is compressed (gzip), typically 100-500 KB
   - Can store many backups within free tier limits

4. **Backup Service:**
   - Already enabled in code
   - Runs automatically when app loads
   - No additional configuration needed

---

## 🆘 Troubleshooting

### "Bucket not found" error:
- **Solution:** Create the bucket in Supabase Dashboard
- Make sure bucket name matches exactly (case-sensitive)

### "Permission denied" error:
- **Solution:** Check that buckets are private (not public)
- Verify Supabase API keys are correct

### Backups not uploading:
- **Solution:** Check browser console for errors
- Verify internet connection
- Check Supabase project status

### Backups not listing:
- **Solution:** Wait a few seconds and refresh
- Check browser console for errors
- Verify bucket exists in Supabase Dashboard

---

## 📝 Files Reference

**Cloud Backup Service:**
- `src/services/cloudBackupService.ts` - Upload, download, list, delete

**Time-Based Scheduling:**
- `src/services/timeBasedBackupService.ts` - Automatic scheduling

**Database Provider:**
- `src/components/DatabaseProvider.tsx` - Service initialization (line 68-69)

**Backup & Restore UI:**
- `src/pages/BackupRestore.tsx` - User interface

---

## ✅ Setup Complete Checklist

- [ ] Created `backups-admin` bucket
- [ ] Created `backups-company-{id}` bucket(s) for each company
- [ ] Verified buckets are private (not public)
- [ ] Tested manual backup upload
- [ ] Tested cloud backup listing
- [ ] Tested restore from cloud
- [ ] Verified automatic backups are running

---

**Status:** Code is ready! Just complete the manual Supabase setup steps above. 🚀
