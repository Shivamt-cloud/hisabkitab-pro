# Cloud Backup Testing Guide

This guide will help you test the cloud backup functionality after setting up Supabase Storage buckets.

---

## Prerequisites

✅ **Completed:**
- Supabase Storage buckets created (`backups-admin`, `backups-company-1`)
- Database tables created (`users`, `companies`)
- Time-based backup service enabled

---

## Test 1: Manual Backup Upload

### Steps:
1. **Open your application** in the browser
2. **Navigate to:** Backup & Restore page (`/backup-restore`)
3. **Click:** "Export All Data" or "Create Backup" button
4. **Check Browser Console** (Press F12):
   - Look for: `✅ Backup created successfully`
   - Look for: `✅ Cloud backup uploaded`
   - Look for: `✅ Backup uploaded to cloud successfully`

### Expected Result:
- ✅ Backup file created locally
- ✅ Backup uploaded to Supabase Storage
- ✅ Success messages in console

### Verify in Supabase:
1. Go to Supabase Dashboard → Storage
2. Click on `backups-admin` or `backups-company-1` bucket
3. You should see:
   - A folder with today's date (e.g., `2025-01-15`)
   - Backup files inside (e.g., `backup_2025-01-15_12-00_1234567890.json.gz`)

---

## Test 2: List Cloud Backups

### Steps:
1. **Navigate to:** Backup & Restore page
2. **Scroll to:** "Cloud Backups" section
3. **Click:** "Refresh" button (if available)
4. **Check:** List of backups should appear

### Expected Result:
- ✅ List of cloud backups displayed
- ✅ Shows backup date, time, and file size
- ✅ Shows compression status

---

## Test 3: Download Cloud Backup

### Steps:
1. **In Cloud Backups section:**
2. **Click:** "Download" or "View" button on a backup
3. **Check:** Backup should download or display

### Expected Result:
- ✅ Backup file downloads successfully
- ✅ File is valid JSON (or gzip compressed)

---

## Test 4: Restore from Cloud Backup

### Steps:
1. **In Cloud Backups section:**
2. **Click:** "Restore" button on a backup
3. **Confirm:** Click "Yes" when prompted
4. **Wait:** For restore to complete
5. **Check:** Success message appears

### Expected Result:
- ✅ Restore completes successfully
- ✅ Data is restored to IndexedDB
- ✅ Success message: "Successfully restored X records"

### Verify Data:
1. Check if restored data appears in:
   - Products page
   - Sales page
   - Customers page
   - etc.

---

## Test 5: Automatic Backup (Time-Based)

### Steps:
1. **Wait for scheduled time** (12 PM or 6 PM)
   - OR manually trigger by checking console logs
2. **Check Browser Console:**
   - Look for: `🔄 Starting scheduled backup at 12:00`
   - Look for: `✅ Backup created successfully`
   - Look for: `✅ Cloud backup uploaded`

### Expected Result:
- ✅ Backup created automatically at scheduled time
- ✅ Backup uploaded to cloud
- ✅ Old backups cleaned up (3-day retention)

---

## Test 6: Cleanup Old Backups (3-Day Retention)

### Steps:
1. **Wait 4 days** after creating backups
2. **Check Supabase Storage:**
   - Go to bucket
   - Verify backups older than 3 days are deleted
3. **Check Console:**
   - Look for: `🧹 Cleaned up X old backups`

### Expected Result:
- ✅ Backups older than 3 days are automatically deleted
- ✅ Only last 3 days of backups remain (6 backups total: 2 per day × 3 days)

---

## Test 7: Error Handling

### Test Offline Scenario:
1. **Disconnect internet**
2. **Try to create backup**
3. **Expected:** Backup saved locally, error message about cloud upload

### Test Invalid Bucket:
1. **Rename bucket in Supabase** (temporarily)
2. **Try to create backup**
3. **Expected:** Error message, backup saved locally only

---

## Troubleshooting

### Issue: Backups not uploading
**Solution:**
- Check `.env` file has correct Supabase credentials
- Verify buckets exist in Supabase
- Check browser console for errors
- Verify internet connection

### Issue: Can't list backups
**Solution:**
- Check bucket permissions (should be private)
- Verify Supabase client is initialized
- Check browser console for errors

### Issue: Restore fails
**Solution:**
- Verify backup file is valid JSON
- Check if backup file is compressed (gzip)
- Verify all required services are available
- Check browser console for detailed error

---

## Test Checklist

- [ ] Manual backup upload works
- [ ] Cloud backups list correctly
- [ ] Download backup works
- [ ] Restore from cloud works
- [ ] Automatic backups run at scheduled times
- [ ] Old backups are cleaned up (3-day retention)
- [ ] Error handling works (offline scenario)
- [ ] Data integrity maintained after restore

---

## Success Criteria

✅ **All tests pass:**
- Backups upload to cloud successfully
- Backups can be listed and downloaded
- Restore from cloud works correctly
- Automatic backups run on schedule
- Cleanup works as expected

---

## Next Steps After Testing

1. ✅ **Monitor backups daily** - Check Supabase Storage regularly
2. ✅ **Verify backup sizes** - Ensure backups are compressed (60-70% reduction)
3. ✅ **Test restore process** - Periodically test restoring from cloud
4. ✅ **Check storage usage** - Monitor Supabase Storage usage (1 GB free tier)

---

**Ready to test?** Start with Test 1: Manual Backup Upload! 🚀

