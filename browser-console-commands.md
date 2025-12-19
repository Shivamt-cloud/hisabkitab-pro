# Browser Console Commands for Troubleshooting Login

If you're unable to login, open the browser console (F12) and try these commands:

## 1. Check if admin user exists:
```javascript
(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('hisabkitab_db', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const tx = db.transaction('users', 'readonly');
  const store = tx.objectStore('users');
  const request = store.getAll();
  
  request.onsuccess = () => {
    const users = request.result;
    console.log('All users:', users.map(u => ({ email: u.email, hasPassword: !!u.password })));
    const admin = users.find(u => u.email === 'hisabkitabpro@hisabkitab.com');
    console.log('Admin user:', admin ? { email: admin.email, hasPassword: !!admin.password } : 'NOT FOUND');
  };
})();
```

## 2. Reset/Delete Database:
```javascript
indexedDB.deleteDatabase('hisabkitab_db').onsuccess = () => {
  console.log('Database deleted. Refresh the page.');
  location.reload();
};
```

## 3. Check IndexedDB directly:
- Open DevTools (F12)
- Go to Application > Storage > IndexedDB > hisabkitab_db > users
- Check if the admin user exists with email: `hisabkitabpro@hisabkitab.com`
