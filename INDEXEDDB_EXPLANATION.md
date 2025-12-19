# IndexedDB Data Storage - Important Information

## Why No Data Shows in Incognito Mode

This is **expected behavior**, not a bug! Here's why:

### 1. **Incognito/Private Browsing Isolation**
- Incognito mode creates a completely separate, isolated storage environment
- Each incognito session has its own IndexedDB, localStorage, cookies, etc.
- Data from normal browsing mode is **NOT accessible** in incognito mode
- This is a browser security/privacy feature, not a limitation of our application

### 2. **Browser-Specific Storage**
- **Chrome data** is separate from **Firefox data**
- **Safari data** is separate from both
- Each browser maintains its own IndexedDB databases
- Data does NOT transfer between different browsers

### 3. **Profile-Specific Storage**
- Different browser profiles have separate IndexedDB storage
- User Profile 1 data is separate from User Profile 2 data
- This applies even within the same browser

### 4. **Data Persistence (Normal Mode)**
✅ **Data DOES persist** in normal browsing mode:
- Across browser sessions
- After closing and reopening the browser
- After computer restarts
- Across different tabs/windows (same browser, same profile)

❌ **Data DOES NOT persist**:
- In incognito mode (cleared when incognito window closes)
- When browser data is manually cleared
- When switching browsers
- When switching browser profiles

## How to Verify Your Data is in IndexedDB

### Method 1: Using the IndexedDB Inspector Page
1. Open the application in **normal (non-incognito) mode**
2. Navigate to: `http://localhost:5173/debug/indexeddb`
3. You'll see all stores and their data counts
4. This page shows exactly what's stored in IndexedDB

### Method 2: Using Browser DevTools

#### Chrome/Edge:
1. Open Developer Tools (F12)
2. Go to **Application** tab
3. In left sidebar, expand **IndexedDB**
4. Look for **`hisabkitab_db`** database
5. Expand it to see all object stores
6. Click on any store to view its data

#### Firefox:
1. Open Developer Tools (F12)
2. Go to **Storage** tab
3. In left sidebar, expand **IndexedDB**
4. Look for **`hisabkitab_db`** database
5. Expand it to see all object stores

#### Safari:
1. Enable Developer menu: Safari → Preferences → Advanced → Show Develop menu
2. Open Developer Tools (Cmd+Option+I)
3. Go to **Storage** tab
4. Expand **IndexedDB** → **`hisabkitab_db`**

## Testing Your Data Storage

### To Verify Data is Being Stored:
1. **In Normal Mode:**
   - Add a product, customer, or make a sale
   - Close the browser completely
   - Reopen the browser
   - Your data should still be there ✅

2. **In Incognito Mode:**
   - Add some data
   - Close the incognito window
   - Open a new incognito window
   - Your data will be gone (this is expected) ❌

## Database Details

- **Database Name:** `hisabkitab_db`
- **Version:** 1
- **Storage Location:** Browser's IndexedDB storage
- **Storage Limit:** Generally 50% of available disk space (varies by browser)

## Important Notes

1. **Always use normal browsing mode** for production use
2. **Incognito mode is for testing/development only**
3. **Data is stored locally** on the user's computer
4. **Each user's data is isolated** to their browser/profile
5. **Backup regularly** using the Backup/Restore feature in the app

## Troubleshooting

### If you see no data in normal mode:
1. Check if migration completed successfully (check browser console)
2. Verify IndexedDB is enabled in your browser
3. Check browser storage permissions
4. Try the IndexedDB Inspector page to see what's actually stored

### If you need to clear all data:
1. Use browser DevTools → Application → IndexedDB → Delete database
2. Or use the browser's "Clear browsing data" feature
3. Data will need to be re-imported or re-entered

