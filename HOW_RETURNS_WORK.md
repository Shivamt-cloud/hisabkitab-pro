# How Returns Work in HisabKitab-Pro

## 📋 Overview

The return feature allows you to process customer returns within the same sale form. When an item is marked as a return, it adds the stock back to your inventory and adjusts the sale total accordingly.

---

## 🎯 Key Concepts

### **1. Sale vs Return**
- **Sale**: Normal sale - stock is deducted from inventory
- **Return**: Customer returns item - stock is added back to inventory

### **2. Mixed Transactions**
- You can have both **sales** and **returns** in the same transaction
- For example: Customer buys 5 items and returns 2 items in the same transaction

---

## 📝 How to Process a Return

### **Step 1: Add Item to Cart**
1. Go to **Sales** → **New Sale**
2. Search for the product (by name, barcode, or article code)
3. Add the product to cart as usual

### **Step 2: Toggle to Return**
1. In the cart, find the item you want to return
2. You'll see a **"Type"** section with two buttons:
   - **"Sale"** button (green) - for normal sales
   - **"Return"** button (red) - for returns
3. Click the **"Return"** button
4. The item card will turn **red** and show **"RETURN"** badge

### **Step 3: Set Quantity**
- Enter the quantity to return
- For returns, you can return items even if current stock is 0 (because you're adding stock back)

### **Step 4: Complete Transaction**
- The return items will have **negative values** in the total
- The grand total will be adjusted (reduced) by the return amount
- Complete the sale as usual

---

## 🔄 What Happens When You Process a Return?

### **1. Stock Management**
When an item is marked as "return":
- **Stock is added back** to the inventory
- The system tries to add stock back to the **original purchase item** if available
- If original purchase item not found, it uses **LIFO (Last In First Out)** - adds to most recently sold items first

### **2. Purchase Item Tracking**
- If the item has a **purchase_item_id**, stock is added back to that specific purchase item
- The `sold_quantity` of that purchase item is **decreased**
- This maintains accurate inventory tracking

### **3. Financial Calculation**
- Return items have **negative values** in calculations
- **Subtotal** = Sum of all items (sales are positive, returns are negative)
- **Grand Total** = Adjusted total after returns

### **Example:**
```
Sale Items:
- Product A: 10 units × ₹100 = ₹1,000 (SALE)
- Product B: 5 units × ₹50 = ₹250 (SALE)

Return Items:
- Product A: 2 units × ₹100 = -₹200 (RETURN)

Subtotal: ₹1,000 + ₹250 - ₹200 = ₹1,050
Grand Total: ₹1,050
```

---

## 🎨 Visual Indicators

### **In the Cart:**
- **SALE items**: 
  - Background: Light gray (`bg-gray-50`)
  - Border: Gray (`border-gray-200`)
  - Badge: Green with "SALE" text

- **RETURN items**:
  - Background: Light red (`bg-red-50`)
  - Border: Red (`border-red-200`)
  - Badge: Red with "RETURN" text

### **Type Toggle Buttons:**
- **"Sale" button**: 
  - Active: Green background (`bg-green-500`)
  - Inactive: Gray background (`bg-gray-200`)

- **"Return" button**:
  - Active: Red background (`bg-red-500`)
  - Inactive: Gray background (`bg-gray-200`)

---

## 📊 Stock Behavior

### **For Sale Items:**
- System checks if stock is available
- Shows warning if stock is insufficient
- Deducts stock from purchase items

### **For Return Items:**
- **No stock check required** - you can return items even if current stock is 0
- Stock is **added back** to the purchase items
- The `sold_quantity` of purchase items is **decreased**

---

## 🔍 Technical Details

### **Return Logic in Code:**

1. **When creating a sale with returns:**
   ```typescript
   if (item.sale_type === 'return') {
     // Find original purchase item
     // Decrease sold_quantity
     // Add stock back to inventory
   }
   ```

2. **Stock Restoration:**
   - First tries to find the **original purchase item** using `purchase_id` and `purchase_item_id`
   - If found, decreases `sold_quantity` of that specific item
   - If not found, uses **LIFO** - adds to most recently sold items first

3. **LIFO (Last In First Out) Logic:**
   - Finds purchases with this product
   - Sorts by purchase date (most recent first)
   - Sorts purchase items by sold_quantity (most sold first)
   - Distributes return quantity across these items

---

## 💡 Use Cases

### **1. Same-Day Returns**
- Customer buys items in the morning
- Returns some items in the afternoon
- Process both in the same transaction

### **2. Partial Returns**
- Customer buys 10 units
- Returns 3 units
- Net sale: 7 units

### **3. Multiple Product Returns**
- Customer buys Product A, B, and C
- Returns Product A and B
- Keeps Product C

---

## ⚠️ Important Notes

1. **Stock Tracking:**
   - Returns add stock back to the **original purchase items** when possible
   - This maintains accurate inventory tracking per purchase batch

2. **Article/Barcode Tracking:**
   - If the item has an article code or barcode, the system tries to return to the same article
   - This ensures proper batch tracking

3. **No Stock Check for Returns:**
   - Unlike sales, returns don't check if stock is available
   - You can return items even if current stock is 0
   - This is because you're adding stock back, not removing it

4. **Negative Totals:**
   - If returns exceed sales, the grand total can be negative
   - This represents a refund to the customer

5. **Payment Handling:**
   - If grand total is negative (more returns than sales), you may need to process a refund
   - The system calculates `return_amount` if customer overpays

---

## 📱 User Interface

### **Cart Item Display:**
```
┌─────────────────────────────────────┐
│ Product Name              [RETURN] │
│ Remaining Stock: 8 pcs              │
│                                     │
│ Type: [Sale] [Return] ← Toggle     │
│                                     │
│ MRP per unit: ₹100                  │
│ Selling Price per unit: ₹90         │
│ Qty: [ - ] 2 [ + ]                  │
│ Total: ₹180                          │
└─────────────────────────────────────┘
```

### **Order Summary:**
```
Order Summary
─────────────────
Subtotal: ₹1,000
  - Sale items: ₹1,200
  - Return items: -₹200
─────────────────
Total: ₹1,000
```

---

## 🔧 Technical Implementation

### **SaleItem Type:**
```typescript
interface SaleItem {
  sale_type: 'sale' | 'return'  // Key field for return
  quantity: number              // Can be positive for returns too
  // ... other fields
}
```

### **Return Processing:**
1. User toggles item to "return"
2. `sale_type` is set to `'return'`
3. When sale is saved:
   - System finds original purchase items
   - Decreases `sold_quantity`
   - Adds stock back to inventory
   - Calculates negative total for return items

---

## ✅ Summary

**Returns allow you to:**
- ✅ Process customer returns in the same sale form
- ✅ Add stock back to inventory automatically
- ✅ Track returns to original purchase items
- ✅ Mix sales and returns in one transaction
- ✅ Maintain accurate inventory records

**Key Points:**
- Click "Return" button to mark item as return
- Return items show in red with "RETURN" badge
- Stock is automatically added back
- Grand total is adjusted for returns
- No stock check needed for returns (you're adding stock back)

---

**That's how returns work in HisabKitab-Pro!** 🎉

