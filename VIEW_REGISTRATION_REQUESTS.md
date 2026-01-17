# 📋 How to View Registration Requests

## ✅ **Current Implementation**

The registration requests are stored in **IndexedDB** (local browser database), not Supabase. This is the local database that runs in the user's browser.

---

## 🔍 **How to View Registration Requests**

### **Option 1: Browser DevTools (Recommended)**

1. Open your browser and go to: http://localhost:5173
2. Press `F12` (or `Cmd+Option+I` on Mac) to open DevTools
3. Go to **"Application"** tab (Chrome) or **"Storage"** tab (Firefox)
4. In the left sidebar, expand **"IndexedDB"**
5. Click on **"hisabkitab_db"**
6. You should see **"registration_requests"** store
7. Click on it to see all registration requests

---

### **Option 2: Use IndexedDB Inspector Page (If Available)**

1. Go to: http://localhost:5173/indexeddb-inspector (if this route exists)
2. View all database stores including registration_requests

---

### **Option 3: Create Admin Page to View Requests**

We can create an admin page to view registration requests in the app interface.

---

## 📊 **Database Structure**

**Store Name:** `registration_requests`

**Fields:**
- `id` (number) - Unique ID
- `name` (string) - User name
- `email` (string) - User email
- `password` (string, optional) - Password (for direct registration)
- `registration_method` (string) - 'google' or 'direct'
- `business_name` (string)
- `business_type` (string)
- `address` (string)
- `city` (string)
- `state` (string)
- `pincode` (string)
- `country` (string)
- `phone` (string)
- `gstin` (string, optional)
- `website` (string, optional)
- `description` (string, optional)
- `status` (string) - 'pending', 'approved', 'rejected'
- `created_at` (string) - ISO timestamp
- `updated_at` (string) - ISO timestamp

---

## ⚠️ **Important Notes**

1. **IndexedDB is Local**: The data is stored in the browser's local database
2. **Per Browser/Device**: Each browser/device has its own IndexedDB
3. **Not Synced**: Currently not synced to Supabase (cloud database)
4. **To Sync to Cloud**: We would need to create a Supabase table and sync service

---

## 🚀 **Next Steps (Optional)**

If you want registration requests in **Supabase** (cloud database) for:
- Viewing from admin dashboard
- Multi-device access
- Backup and sync

We would need to:
1. Create `registration_requests` table in Supabase
2. Create cloud service to sync requests
3. Optionally create admin page to view/manage requests

---

## 🧪 **Test Registration Request**

1. Go to login page
2. Click "Create New Account" or use Google sign-in
3. Fill out the registration form
4. Submit the form
5. Check IndexedDB (see Option 1 above) to see the request saved

---

**Current Status:** ✅ Table structure created in code
**Storage Location:** IndexedDB (browser local database)
**To View:** Use Browser DevTools → Application → IndexedDB → hisabkitab_db → registration_requests
