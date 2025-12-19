# Admin User Login Credentials

If you're unable to login, here are the correct credentials:

**Email:** `hisabkitabpro@hisabkitab.com`
**Password:** `Shiv845496!@#`

## Troubleshooting Steps:

1. **Clear Browser Data:**
   - Open DevTools (F12)
   - Go to Application > IndexedDB
   - Delete the `hisabkitab_db` database
   - Refresh the page

2. **Verify User Creation:**
   - The admin user should be automatically created on first database initialization
   - Check browser console for "Default admin user created/updated" message

3. **Manual Reset (if needed):**
   - Open browser console (F12)
   - Run: `indexedDB.deleteDatabase('hisabkitab_db')`
   - Refresh the page
   - The admin user will be recreated automatically
