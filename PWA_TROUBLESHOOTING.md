# PWA Install Prompt Troubleshooting 🔧

## Why Install Prompt Might Not Show

### **Common Reasons:**

1. **App Already Installed**
   - If app is already installed, prompt won't show
   - Check: Open in standalone window? (No browser UI = installed)

2. **Browser Requirements**
   - Needs Chrome, Edge, or Firefox (latest versions)
   - Safari has limited support
   - Must be on HTTPS or localhost

3. **PWA Requirements Not Met**
   - Service worker must be registered
   - Manifest must be valid
   - App must be visited at least twice

4. **User Previously Dismissed**
   - If user clicked "X" before, it's stored in localStorage
   - Clear: `localStorage.removeItem('pwa-install-dismissed')`

5. **Event Not Fired Yet**
   - Browser might need time to evaluate installability
   - Try refreshing the page
   - Wait a few seconds

---

## 🔍 Debugging Steps

### **Step 1: Check Browser Console**

Open DevTools (F12) → Console tab, look for:
- `[PWA] Setting up install prompt listener`
- `[PWA] beforeinstallprompt event fired!`
- `[InstallPrompt] Component mounted`
- `[InstallPrompt] Rendering install prompt!`

### **Step 2: Check Service Worker**

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Should see: "activated and is running"

**If not registered:**
- Check console for errors
- Try hard refresh (Ctrl+F5 / Cmd+Shift+R)
- Clear cache and reload

### **Step 3: Check Manifest**

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Manifest** in left sidebar
4. Should see app details (name, icons, etc.)

**If missing:**
- Check `vite.config.ts` configuration
- Rebuild: `npm run build`

### **Step 4: Check Installability**

Run in browser console (F12):
```javascript
// Check if app is installable
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length)
  console.log('Is installed?', window.matchMedia('(display-mode: standalone)').matches)
})
```

### **Step 5: Force Show Prompt (Testing)**

If you want to test the UI even if prompt isn't available:

1. Open browser console (F12)
2. Run:
```javascript
// Simulate install prompt
window.dispatchEvent(new CustomEvent('pwa-installable'))
```

Or manually show:
```javascript
// Force show (for testing)
localStorage.removeItem('pwa-install-dismissed')
window.location.reload()
```

---

## 🛠️ Quick Fixes

### **Fix 1: Clear Dismissal State**

```javascript
// In browser console (F12)
localStorage.removeItem('pwa-install-dismissed')
location.reload()
```

### **Fix 2: Re-register Service Worker**

```javascript
// In browser console (F12)
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister())
  location.reload()
})
```

### **Fix 3: Clear All Cache**

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Clear storage** in left sidebar
4. Check all boxes
5. Click **Clear site data**
6. Reload page

### **Fix 4: Check Browser Support**

```javascript
// In browser console (F12)
console.log('Service Worker:', 'serviceWorker' in navigator)
console.log('BeforeInstallPrompt:', 'onbeforeinstallprompt' in window)
```

---

## 📱 Browser-Specific Notes

### **Chrome/Edge:**
- Full support
- Prompt appears after 2-3 visits
- Must meet PWA criteria

### **Firefox:**
- Full support
- Similar to Chrome

### **Safari (iOS):**
- Limited support
- Can add to home screen manually
- No automatic prompt

### **Safari (Mac):**
- Limited support
- Can add to dock manually
- No automatic prompt

---

## ✅ Expected Behavior

### **First Visit:**
- Service worker registers
- App caches files
- No install prompt yet (browser evaluating)

### **Second Visit:**
- Service worker active
- Browser evaluates installability
- Install prompt may appear

### **After Login:**
- Install prompt should appear (if conditions met)
- Bottom-right corner
- Blue gradient card with "Install" button

---

## 🎯 Testing Checklist

- [ ] Service worker registered? (DevTools → Application → Service Workers)
- [ ] Manifest valid? (DevTools → Application → Manifest)
- [ ] Console shows setup messages?
- [ ] Not already installed?
- [ ] Not previously dismissed?
- [ ] Using supported browser?
- [ ] On HTTPS or localhost?
- [ ] Visited page at least twice?

---

## 💡 Manual Test

If automatic prompt doesn't work, you can manually test the UI:

1. Open browser console (F12)
2. Run:
```javascript
// Simulate the prompt being available
window.dispatchEvent(new CustomEvent('pwa-installable'))
```

This should trigger the install prompt to appear.

---

## 🚀 Still Not Working?

1. **Check console for errors** - Look for red error messages
2. **Try different browser** - Chrome/Edge recommended
3. **Check network tab** - Make sure service worker loads
4. **Try production build** - `npm run build` then `npm run preview`
5. **Clear everything** - Clear cache, cookies, IndexedDB

Let me know what you see in the console! 🔍


