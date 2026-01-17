# PWA Testing Guide 🧪

## 🚀 Server Running

Your dev server should be running at: **http://localhost:5173**

---

## 📋 Testing Checklist

### **1. Test Install Prompt (After Login)**

**Steps:**
1. Open browser: `http://localhost:5173`
2. **Login page should appear** (no install prompt here ✅)
3. Log in with your credentials
4. **After login**, look at **bottom-right corner**
5. You should see an **"Install HisabKitab-Pro"** prompt
6. Click **"Install"** button
7. Browser will show install dialog
8. Click **"Install"** in browser dialog
9. App should install!

**Expected Result:**
- ✅ Login page has NO install prompt
- ✅ Install prompt appears AFTER login
- ✅ Prompt is in bottom-right corner
- ✅ Clicking "Install" triggers browser install dialog

---

### **2. Test Installation**

**After clicking "Install":**

**Desktop (Chrome/Edge):**
- App appears in Start Menu (Windows) or Applications (Mac)
- Can launch app like desktop software
- Opens in standalone window (no browser UI)

**Mobile:**
- Can add to home screen
- Works like native app

**Expected Result:**
- ✅ App installs successfully
- ✅ App appears in app launcher
- ✅ Opens in standalone window

---

### **3. Test Update Banner**

**Steps:**
1. Make a small change to any file (e.g., change text in a component)
2. Save the file
3. Service worker should detect change
4. **Update banner should appear at top** (blue banner)
5. Click **"Update Now"** button
6. App should reload with changes

**Expected Result:**
- ✅ Update banner appears at top
- ✅ Shows "New version available!" message
- ✅ "Update Now" button works
- ✅ App reloads with new version

---

### **4. Test Offline Functionality**

**Steps:**
1. Install the app (or just use in browser)
2. Open DevTools (F12) → **Network** tab
3. Check **"Offline"** checkbox
4. Try using the app:
   - Create a sale
   - View products
   - Check customers
   - All features should work!

**Expected Result:**
- ✅ App works completely offline
- ✅ All features functional
- ✅ Data persists (IndexedDB)
- ✅ No errors

---

### **5. Test Caching**

**Steps:**
1. Open app in browser
2. Open DevTools (F12) → **Application** tab
3. Click **"Service Workers"** in left sidebar
4. You should see service worker registered
5. Click **"Cache Storage"** in left sidebar
6. You should see cache entries

**Expected Result:**
- ✅ Service worker is registered
- ✅ Cache storage has entries
- ✅ Files are cached

---

## 🔍 What to Look For

### **✅ Success Indicators:**

1. **Install Prompt:**
   - Appears only after login
   - Bottom-right corner
   - Nice design with gradient
   - "Install" and "X" buttons work

2. **Update Banner:**
   - Appears at top when update available
   - Blue gradient background
   - "Update Now" button works
   - Can dismiss (shows again after 1 hour)

3. **Service Worker:**
   - Registered in DevTools → Application → Service Workers
   - Status: "activated and is running"
   - No errors in console

4. **Cache:**
   - Files cached in DevTools → Application → Cache Storage
   - Cache names like "workbox-precache-..."

5. **Offline:**
   - App works when network is offline
   - No "Failed to fetch" errors
   - All features functional

---

## 🐛 Troubleshooting

### **Install Prompt Not Showing?**

**Check:**
1. Are you logged in? (Must be logged in)
2. Is app already installed? (Won't show if installed)
3. Check browser console for errors
4. Try hard refresh (Ctrl+F5 / Cmd+Shift+R)

### **Update Banner Not Showing?**

**Check:**
1. Make sure you made a change to a file
2. Service worker needs to detect change
3. Check DevTools → Application → Service Workers
4. Try unregistering service worker and reload

### **Service Worker Not Registering?**

**Check:**
1. Make sure you're on `http://localhost:5173` (HTTPS or localhost required)
2. Check browser console for errors
3. Try clearing browser cache
4. Check if service worker is supported (Chrome/Edge/Firefox)

### **Icons Missing?**

**Note:** Icons are optional. App works without them, but:
- Create `public/icons/icon-192x192.png`
- Create `public/icons/icon-512x512.png`
- Or use placeholder for now

---

## 📱 Browser Compatibility

### **Full Support:**
- ✅ Chrome (Desktop & Android)
- ✅ Edge (Desktop)
- ✅ Firefox (Desktop)

### **Partial Support:**
- ⚠️ Safari (iOS) - Can add to home screen
- ⚠️ Safari (Mac) - Can add to dock

---

## 🎯 Quick Test Commands

### **Check Service Worker:**
```javascript
// In browser console (F12)
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs))
```

### **Check if Installable:**
```javascript
// In browser console (F12)
window.matchMedia('(display-mode: standalone)').matches
```

### **Force Update Check:**
```javascript
// In browser console (F12)
navigator.serviceWorker.getRegistration().then(reg => reg?.update())
```

---

## ✅ Success Criteria

After testing, you should have:

1. ✅ Install prompt appears after login
2. ✅ App can be installed
3. ✅ Update banner appears when updates available
4. ✅ App works offline
5. ✅ Service worker is registered
6. ✅ Cache is working
7. ✅ No cache issues (values update correctly)

---

## 🎉 You're Done!

If all tests pass, your PWA is working perfectly! 🚀

**No more caching issues!** The app now:
- Manages cache intelligently
- Updates automatically
- Works offline
- Can be installed as app


