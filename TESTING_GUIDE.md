# 🧪 Cloud Backup Testing Guide

**Status:** Ready for Testing

---

## ✅ **Prerequisites**

Before testing, make sure:

- [x] ✅ Supabase Storage buckets are created (see `SUPABASE_BUCKET_SETUP.md`)
- [x] ✅ Time-based backup service is enabled (already done)
- [x] ✅ `.env` file has Supabase credentials:
  ```env
  VITE_SUPABASE_URL=https://your-project-id.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```
- [x] ✅ App is running (`npm run dev`)

---

## 🧪 **Test 1: Manual Backup Upload**

### Purpose:
Verify that backups can be created and uploaded to cloud storage.

### Steps:

1. **Open the app** and log in
2. **Navigate to:** Backup & Restore page
3. **Click:** "Create Backup" or "Export All Data" button
4. **Wait** for backup to complete
5. **Check browser console** for messages:
   - Should see: `✅ Backup created successfully`
   - Should see: `✅ Cloud backup uploaded: auto/{date}/{filename}.gz`

### Expected Result:
- ✅ Backup file created locally
- ✅ Backup uploaded to Supabase Storage
- ✅ File is compressed (`.gz` extension)
- ✅ File is in correct bucket (`backups-admin` or `backups-company-{id}`)

### Verify in Supabase:
1. Go to Supabase Dashboard → Storage → Buckets
2. Click on `backups-admin` (or your company bucket)
3. You should see a folder structure like:
   ```
   auto/
     └── 2024-01-15/
         └── backup_2024-01-15_12-00_1234567890.json.gz
   ```

### ✅ **Test 1 Pass Criteria:**
- [ ] Backup created successfully
- [ ] Backup uploaded to cloud
- [ ] File visible in Supabase Storage
- [ ] File is compressed (`.gz`)

---

## 🧪 **Test 2: List Cloud Backups**

### Purpose:
Verify that cloud backups can be listed in the UI.

### Steps:

1. **Navigate to:** Backup & Restore page
2. **Look for:** "Cloud Backups" section
3. **Click:** "Refresh" button (if available)
4. **Wait** for backups to load

### Expected Result:
- ✅ Cloud backups are listed
- ✅ Shows date, time, file name, size
- ✅ Each backup has "Restore" and "Delete" buttons

### ✅ **Test 2 Pass Criteria:**
- [ ] Cloud backups section visible
- [ ] Backups are listed
- [ ] Date, time, size are displayed correctly
- [ ] Restore and Delete buttons are visible

---

## 🧪 **Test 3: Restore from Cloud**

### Purpose:
Verify that data can be restored from a cloud backup.

### Steps:

1. **Navigate to:** Backup & Restore page
2. **Find:** A cloud backup in the list
3. **Click:** "Restore" button (or download icon)
4. **Confirm:** Restore operation
5. **Wait** for restore to complete
6. **Check:** Data is restored correctly

### Expected Result:
- ✅ Backup downloaded from cloud
- ✅ Backup decompressed automatically
- ✅ Data imported successfully
- ✅ App shows success message
- ✅ Data is visible in the app

### ⚠️ **Important:**
- **Test with a small dataset first**
- **Backup current data** before restoring
- Restore will **merge** with existing data (not replace)

### ✅ **Test 3 Pass Criteria:**
- [ ] Backup downloaded successfully
- [ ] Data restored correctly
- [ ] No errors in console
- [ ] App shows success message

---

## 🧪 **Test 4: Time-Based Scheduling**

### Purpose:
Verify that backups are created automatically at 12 PM and 6 PM.

### Steps:

**Option A: Wait for Scheduled Time**
1. **Check current time**
2. **Wait** until 12:00 PM or 6:00 PM
3. **Check browser console** for backup messages
4. **Verify** backup appears in Supabase Storage

**Option B: Test with Modified Time (Development)**
1. **Temporarily modify** `timeBasedBackupService.ts` to schedule a backup in 1-2 minutes
2. **Wait** for backup to trigger
3. **Check** console and Supabase Storage

### Expected Result:
- ✅ Backup created automatically at scheduled time
- ✅ Backup uploaded to cloud
- ✅ Console shows: `✅ Time-based backup created`
- ✅ Backup visible in Supabase Storage

### ✅ **Test 4 Pass Criteria:**
- [ ] Backup created at scheduled time
- [ ] Backup uploaded automatically
- [ ] No manual intervention needed
- [ ] Next backup scheduled correctly

---

## 🧪 **Test 5: 3-Day Retention Cleanup**

### Purpose:
Verify that old backups (older than 3 days) are automatically deleted.

### Steps:

1. **Create backups** for multiple days (or manually upload old backups)
2. **Wait** for cleanup to run (runs after each backup)
3. **Check Supabase Storage** for old backups
4. **Verify** backups older than 3 days are deleted

### Expected Result:
- ✅ Backups older than 3 days are deleted
- ✅ Only 6 backups remain (3 days × 2 backups/day)
- ✅ Cleanup runs automatically
- ✅ Console shows cleanup messages

### ✅ **Test 5 Pass Criteria:**
- [ ] Old backups deleted automatically
- [ ] Only 6 backups remain per company
- [ ] Cleanup runs after each backup
- [ ] No manual cleanup needed

---

## 🧪 **Test 6: Company-Wise Backups**

### Purpose:
Verify that each company has separate backups.

### Steps:

1. **Log in** as Company 1 user
2. **Create a backup**
3. **Check Supabase Storage** → `backups-company-1` bucket
4. **Log in** as Company 2 user
5. **Create a backup**
6. **Check Supabase Storage** → `backups-company-2` bucket

### Expected Result:
- ✅ Company 1 backups in `backups-company-1` bucket
- ✅ Company 2 backups in `backups-company-2` bucket
- ✅ No mixing of data between companies
- ✅ Admin backups in `backups-admin` bucket

### ✅ **Test 6 Pass Criteria:**
- [ ] Each company has separate bucket
- [ ] Backups are isolated by company
- [ ] Admin backups in separate bucket
- [ ] No data leakage between companies

---

## 🧪 **Test 7: Compression**

### Purpose:
Verify that backups are compressed to reduce size.

### Steps:

1. **Create a backup**
2. **Check file size** in Supabase Storage
3. **Compare** with uncompressed size (if available)
4. **Verify** file extension is `.gz`

### Expected Result:
- ✅ Backup file is compressed (`.gz` extension)
- ✅ File size is 60-70% smaller than uncompressed
- ✅ Restore works with compressed files

### ✅ **Test 7 Pass Criteria:**
- [ ] Backup file has `.gz` extension
- [ ] File size is reduced
- [ ] Restore works correctly

---

## 🧪 **Test 8: Error Handling**

### Purpose:
Verify that errors are handled gracefully.

### Test Scenarios:

1. **Offline Mode:**
   - Disconnect internet
   - Try to create backup
   - **Expected:** Falls back to local backup, no crash

2. **Supabase Unavailable:**
   - Temporarily disable Supabase
   - Try to create backup
   - **Expected:** Falls back to local backup, no crash

3. **Bucket Missing:**
   - Delete a bucket in Supabase
   - Try to create backup
   - **Expected:** Error message, falls back to local backup

4. **Large Backup:**
   - Create backup with large dataset
   - **Expected:** Handles large files correctly

### ✅ **Test 8 Pass Criteria:**
- [ ] App doesn't crash on errors
- [ ] Error messages are clear
- [ ] Falls back to local backup when cloud fails
- [ ] User is notified of issues

---

## 📊 **Testing Checklist**

### Core Functionality:
- [ ] Test 1: Manual Backup Upload ✅
- [ ] Test 2: List Cloud Backups ✅
- [ ] Test 3: Restore from Cloud ✅
- [ ] Test 4: Time-Based Scheduling ✅
- [ ] Test 5: 3-Day Retention Cleanup ✅
- [ ] Test 6: Company-Wise Backups ✅
- [ ] Test 7: Compression ✅
- [ ] Test 8: Error Handling ✅

### Additional Tests:
- [ ] Test with multiple companies
- [ ] Test with large datasets
- [ ] Test restore after PC format (simulate)
- [ ] Test backup during app usage
- [ ] Test concurrent backups

---

## 🐛 **Common Issues & Solutions**

### Issue: Backups not uploading
**Solution:**
- Check Supabase credentials in `.env`
- Verify buckets exist
- Check browser console for errors
- Verify internet connection

### Issue: Backups not listing
**Solution:**
- Check bucket names match exactly
- Verify bucket permissions
- Check browser console for errors
- Refresh the page

### Issue: Restore fails
**Solution:**
- Check backup file is valid
- Verify data format
- Check browser console for errors
- Try downloading backup manually first

### Issue: Time-based backups not running
**Solution:**
- Check service is enabled in `DatabaseProvider.tsx`
- Verify user is logged in
- Check browser console for errors
- Verify scheduled times are correct

---

## 📝 **Test Results Template**

```
Date: ___________
Tester: ___________

Test 1: Manual Backup Upload
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 2: List Cloud Backups
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 3: Restore from Cloud
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 4: Time-Based Scheduling
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 5: 3-Day Retention
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 6: Company-Wise Backups
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 7: Compression
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Test 8: Error Handling
- Status: [ ] Pass [ ] Fail
- Notes: ___________

Overall Status: [ ] All Pass [ ] Some Fail [ ] All Fail
```

---

## 🚀 **Next Steps After Testing**

1. **If all tests pass:**
   - ✅ System is ready for production
   - Monitor backups for a few days
   - Check Supabase Storage usage

2. **If tests fail:**
   - Document issues
   - Fix bugs
   - Re-test

3. **Production Deployment:**
   - Ensure `.env` variables are set in production
   - Create buckets in production Supabase project
   - Monitor backup creation
   - Set up alerts for backup failures (optional)

---

**Ready to test?** Start with Test 1 and work through each test systematically! 🧪




