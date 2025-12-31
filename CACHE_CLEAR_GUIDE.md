# Cache Clear Guide - Fix Stock Display Issue

## 🔧 Issue
Still seeing aggregated stock (18) instead of specific purchase item stock (10 or 8).

## ✅ Solution Steps

### Step 1: Hard Refresh Browser

**Chrome/Edge (Windows):**
- Press `Ctrl + Shift + R` or `Ctrl + F5`

**Chrome/Edge (Mac):**
- Press `Cmd + Shift + R`

**Firefox:**
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

**Safari:**
- Press `Cmd + Option + R`

### Step 2: Clear Browser Cache

**Chrome:**
1. Press `F12` to open DevTools
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Or manually:**
1. Settings → Privacy and Security → Clear browsing data
2. Select "Cached images and files"
3. Click "Clear data"

### Step 3: Check Console Logs

1. Open browser console (`F12` or `Cmd+Option+I`)
2. Go to Console tab
3. Search for "test3" in the sale form
4. Look for these logs:

```
🔍 addProductToSale: product="test3" (ID: X), searchQuery="test3"
  → Product name search detected (searchQuery: "test3"), finding purchase items for product (FIFO)
    Checking Purchase 1, Item X: Qty=10, Sold=0, Available=10
    Checking Purchase 2, Item Y: Qty=8, Sold=0, Available=8
  → Found 2 purchase items with available stock
  ✅ Selected purchase item (FIFO): Purchase 1, Item X, Stock: 10, MRP: ..., Sale: ...
  ✅ Stock from purchase item: 10 - 0 = 10
📦 Adding item to cart:
  purchase_id: 1
  purchase_item_id: X
  remainingStock: 10
  Will use stock: Purchase Item Stock ✅
```

### Step 4: Verify the Fix

**What to check:**
1. ✅ Console shows "Product name search detected"
2. ✅ Console shows "Selected purchase item (FIFO)"
3. ✅ Console shows correct stock (10 or 8, not 18)
4. ✅ Cart shows correct stock (10 or 8, not 18)
5. ✅ MRP and Sale Price match the purchase item

---

## 🐛 If Still Not Working

### Check Console for Errors

Look for:
- ❌ "Purchase not found"
- ❌ "Purchase item not found"
- ❌ "Using product stock (aggregated)"

### Verify Purchase Data

1. Go to Purchases page
2. Check if purchases have:
   - Correct product_id
   - Correct quantity
   - sold_quantity field
   - purchase_date field

### Check Network Tab

1. Open DevTools → Network tab
2. Refresh page
3. Check if `SaleForm.tsx` is loading the latest version
4. Look for cache headers (should not be cached)

---

## 🔍 Debug Information

The code now logs:
- Which purchase items are found
- Which one is selected (FIFO)
- Stock calculation details
- Whether using purchase item stock or product stock

**Share console logs if issue persists!**

---

## 📝 Quick Test

1. **Clear cache** (Step 1 & 2)
2. **Open console** (F12)
3. **Search "test3"** in sale form
4. **Check console logs** - should show:
   - FIFO selection
   - Purchase item stock (10 or 8)
   - Not product stock (18)
5. **Check cart** - should show correct stock

---

**If still showing 18, share the console logs and I'll investigate further!**



