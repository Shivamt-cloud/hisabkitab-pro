# 🔍 Check Registration Requests Table

## Quick Check - Browser Console

1. Open your browser and go to: http://localhost:5173
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Type this command and press Enter:

```javascript
// Check if registration_requests store exists
(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('hisabkitab_db', 10);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const storeNames = Array.from(db.objectStoreNames);
  console.log('Available stores:', storeNames);
  console.log('Has registration_requests?', storeNames.includes('registration_requests'));
  
  if (storeNames.includes('registration_requests')) {
    const tx = db.transaction('registration_requests', 'readonly');
    const store = tx.objectStore('registration_requests');
    const count = await new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    console.log('Registration requests count:', count);
  }
})();
```

5. Check the output - it will show if the table exists

---

## View in Application Tab

1. Press `F12` to open Developer Tools
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In left sidebar: **Storage** → **IndexedDB** → **hisabkitab_db**
4. Look for **registration_requests** store
5. Click on it to see data

---

## If Table Doesn't Exist

The table is created automatically when:
- Database version changes (we changed from 9 to 10)
- Page loads and `onupgradeneeded` event fires

**To force table creation:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or clear IndexedDB and reload:
   - DevTools → Application → IndexedDB → hisabkitab_db → Delete database
   - Refresh page
