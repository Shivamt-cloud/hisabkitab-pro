# Article Tracking Solution - Better Approach

**Understanding the Real Problem:**

Your scenario:
- Product "test3" purchased twice:
  1. **Purchase 1:** No article, quantity 10
  2. **Purchase 2:** Article "test1", quantity 8

- Same product can have multiple articles (different batches)
- Each article represents a different batch/lot
- Need to track each batch separately

**The Real Solution:**

Instead of auto-generating unique articles, we should:
1. **Track by Purchase Item ID** - Each purchase item is already unique
2. **Allow duplicate articles** - Same product can have same article in different purchases
3. **Match by product_id + article + purchase_item_id** - This ensures correct tracking
4. **Show stock per purchase item** - Not aggregated

---

## 🎯 The Correct Approach

### Current System (What We Have):
- Each purchase item has a unique `id` (purchase_item_id)
- Each purchase item tracks: `product_id`, `article`, `quantity`, `sold_quantity`
- Stock = `quantity - sold_quantity` per purchase item

### What's Wrong:
- When searching by article, system might match wrong purchase item
- Stock might be aggregated incorrectly
- Need to ensure we match the correct purchase item

### What's Right:
- System already tracks each purchase item separately ✅
- Each purchase item has unique ID ✅
- Stock is tracked per purchase item ✅

---

## 🔧 The Fix Needed

### Issue: Article Search Matching

When you search by article "test1" for product "test3":
- System should find the purchase item from Purchase 2
- Should show stock: 8 (not 18, not 10)
- Should show MRP/Sale price from that specific purchase item

### Solution:
1. **Improve article matching** - Match by product_id + article + purchase_item_id
2. **Show correct purchase item** - Display the specific purchase item being searched
3. **Track stock correctly** - Use purchase_item_id to get exact stock

---

## 💡 Better Solution: Purchase Item-Based Tracking

### How It Should Work:

```
Purchase 1 (ID: 100)
├── Item 1: Product "test3", No article, Qty: 10, Sold: 0, Stock: 10

Purchase 2 (ID: 200)  
├── Item 1: Product "test3", Article "test1", Qty: 8, Sold: 0, Stock: 8
```

### When Searching:
- Search "test3" → Shows both purchase items (with/without article)
- Search "test1" → Shows Purchase 2, Item 1 (Stock: 8)
- Search "test3" + Article "test1" → Shows Purchase 2, Item 1 (Stock: 8)

### Key Points:
- ✅ Don't auto-generate unique articles
- ✅ Allow same article for same product (different batches)
- ✅ Track by purchase_item_id (already unique)
- ✅ Match by product_id + article when searching
- ✅ Show stock for the specific purchase item

---

## 🛠️ Implementation: Fix Article Matching

The issue is in the article matching logic. We need to:

1. **When searching by article:**
   - Find ALL purchase items with that article + product_id
   - Show them as separate options (if multiple)
   - Or show the most recent one (if user preference)

2. **When adding to cart:**
   - Store purchase_item_id (not just article)
   - This ensures we track the correct batch

3. **When displaying stock:**
   - Use purchase_item_id to get exact stock
   - Don't aggregate across purchase items

---

## 📋 Recommended Changes

### 1. Improve Article Search Display

When multiple purchase items have same article:
- Show all options
- Or show most recent
- Or let user choose

### 2. Ensure Purchase Item ID is Stored

When adding product to sale:
- Always store purchase_item_id
- This ensures correct stock tracking

### 3. Fix Stock Calculation

Use purchase_item_id to get stock:
```typescript
const purchaseItem = purchase.items.find(pi => pi.id === purchase_item_id)
const stock = purchaseItem.quantity - (purchaseItem.sold_quantity || 0)
```

---

## 🎯 My Recommendation

**Don't auto-generate unique articles.** Instead:

1. **Fix the matching logic** - Ensure we match the correct purchase item
2. **Track by purchase_item_id** - This is already unique
3. **Allow duplicate articles** - They represent different batches
4. **Show stock per purchase item** - Not aggregated

The system already has the right structure. We just need to fix the matching logic to ensure we're getting the correct purchase item when searching by article.

---

**Should I implement the fix for article matching instead of auto-generating articles?** This will properly handle your scenario where:
- Same product can have multiple articles
- Same article can be used for same product in different purchases
- Each purchase item is tracked separately

