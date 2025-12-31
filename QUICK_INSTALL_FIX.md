# Quick Fix: Install App Not Showing

## ✅ Quick Solution (30 seconds)

**The easiest way to install after uninstalling:**

1. **Look at the Chrome address bar** (top right)
2. **Click the ➕ (plus) icon** - This is always available!
3. Click "Install" in the dialog

**OR**

1. Click the **three dots menu (⋮)** in Chrome (top right)
2. Look for **"Install HisabKitab-Pro"** in the menu
3. Click it to install

---

## 🔧 Alternative: Reset Install Prompt

If you want the bottom-right corner prompt to appear again:

1. Open the app in Chrome
2. Press **F12** (opens Developer Tools)
3. Click the **Console** tab
4. Copy and paste this command:
   ```javascript
   localStorage.removeItem('pwa-install-dismissed'); location.reload()
   ```
5. Press Enter
6. The page will reload and the install prompt should appear

---

## 📱 New Feature: Install Button in User Menu

I've added an **"Install App"** button in your user menu (top right):

1. Click your **profile picture/name** (top right)
2. Look for **"Install App"** button
3. Click it for install instructions or to trigger install

---

## 🎯 Why This Happens

Chrome has a "cooldown period" after uninstalling a PWA. The automatic install prompt might not appear immediately, but Chrome's built-in install option (➕ icon) is always available.

---

## ✅ Summary

**Best Solution**: Use the ➕ icon in Chrome's address bar - it's always there!

**If you want the prompt back**: Run the console command above to reset it.

