# Customer Credit Balance System

## 📋 Overview

The credit balance system allows customers to accumulate credit from returns/exchanges, which can then be applied to future purchases. This is useful for stores with exchange policies where customers receive store credit instead of cash refunds.

---

## 🎯 How It Works

### **1. Credit Accumulation (Returns)**
- When a customer returns an item, the return amount is **automatically added** to their credit balance
- Credit is stored as a **positive balance** on the customer account
- Example: Customer returns ₹500 worth of items → Credit balance increases by ₹500

### **2. Credit Application (Sales)**
- When a customer makes a purchase, they can **apply available credit** to reduce the amount due
- Credit is **deducted** from the customer's balance when applied
- Example: Customer has ₹500 credit, applies ₹300 to a ₹1000 purchase → Pays ₹700, Credit balance becomes ₹200

### **3. Credit Display**
- Customer credit balance is shown in the **Sales Form** when a customer is selected
- If no credit available, shows **₹0.00**
- Credit balance updates automatically after each transaction

---

## 📝 User Interface

### **In Sales Form:**

1. **Customer Selection:**
   - When a customer is selected, their credit balance is displayed below customer details
   - Format: `Available Credit: ₹XXX.XX` (green if > 0, gray if 0)

2. **Credit Application Section:**
   - Appears when customer has credit balance > 0
   - Shows available credit amount
   - **"Apply Full Credit"** button: Applies maximum credit (up to grand total)
   - **"Clear"** button: Removes applied credit
   - Manual input field: Enter specific credit amount to apply
   - Shows "Credit Applied" amount in green

3. **Payment Calculation:**
   - **Grand Total**: Original subtotal
   - **Credit Applied**: Amount deducted from grand total (shown in green)
   - **Amount Due**: Grand Total - Credit Applied - Payments
   - **Total Paid**: Sum of all payment methods

### **Visual Flow:**
```
Customer Selected → Credit Balance Shown
                    ↓
              (If credit > 0)
                    ↓
         Credit Application Section
                    ↓
         [Apply Full Credit] [Clear]
         [Manual Input Field]
                    ↓
         Credit Applied: ₹XXX.XX
                    ↓
         Amount Due: ₹XXX.XX
```

---

## 🔄 Transaction Flow

### **Scenario 1: Customer Returns Items**

1. Customer brings items for return
2. Salesperson processes return in Sales Form:
   - Adds items to cart
   - Toggles items to "RETURN" type
   - Completes sale
3. **System automatically:**
   - Calculates return amount (sum of return items)
   - Adds return amount to customer's credit balance
   - Updates customer record
4. Customer's credit balance increases

**Example:**
```
Return Items:
- Product A: 2 units × ₹100 = ₹200 (RETURN)
- Product B: 1 unit × ₹150 = ₹150 (RETURN)

Total Return: ₹350
→ Customer Credit Balance: +₹350
```

### **Scenario 2: Customer Uses Credit on Purchase**

1. Customer makes a purchase
2. Salesperson selects customer (credit balance shown)
3. Salesperson applies credit:
   - Clicks "Apply Full Credit" OR
   - Enters specific amount
4. **System calculates:**
   - Grand Total: ₹1,000
   - Credit Applied: ₹300
   - Amount Due: ₹700
5. Customer pays ₹700
6. **System automatically:**
   - Deducts ₹300 from customer's credit balance
   - Updates customer record
7. Customer's credit balance decreases

**Example:**
```
Sale Items:
- Product C: 5 units × ₹200 = ₹1,000 (SALE)

Customer Credit Balance: ₹500
Credit Applied: ₹300
Amount Due: ₹700
Customer Pays: ₹700

→ Customer Credit Balance: ₹200 (₹500 - ₹300)
```

---

## 💻 Technical Implementation

### **Database Schema:**

**Customer Table:**
```typescript
interface Customer {
  id: number
  name: string
  credit_balance?: number  // Positive balance from returns
  // ... other fields
}
```

**Sale Table:**
```typescript
interface Sale {
  id: number
  customer_id?: number
  credit_applied?: number  // Credit used in this sale
  credit_added?: number     // Credit added from returns
  // ... other fields
}
```

### **Service Functions:**

**Customer Service:**
```typescript
updateCreditBalance(customerId: number, amount: number): Promise<boolean>
// Adds or deducts credit from customer balance
// amount > 0: Add credit (returns)
// amount < 0: Deduct credit (sales)
```

**Sale Service:**
- On sale creation:
  1. Calculate return items total
  2. If returns > 0 and customer selected:
     - Add return amount to customer credit balance
  3. If credit applied > 0:
     - Deduct credit from customer balance

---

## 📊 Calculation Examples

### **Example 1: Mixed Sale and Return**

```
Sale Items:
- Product A: 10 units × ₹100 = ₹1,000 (SALE)
- Product B: 5 units × ₹50 = ₹250 (SALE)

Return Items:
- Product A: 2 units × ₹100 = -₹200 (RETURN)

Subtotal: ₹1,000 + ₹250 - ₹200 = ₹1,050

Customer Credit Balance (before): ₹0
→ Credit Added: ₹200 (from returns)
→ Customer Credit Balance (after): ₹200
```

### **Example 2: Using Credit on Purchase**

```
Sale Items:
- Product C: 3 units × ₹500 = ₹1,500 (SALE)

Customer Credit Balance (before): ₹200
Credit Applied: ₹200
Amount Due: ₹1,300

Customer Pays: ₹1,300

→ Customer Credit Balance (after): ₹0 (₹200 - ₹200)
```

### **Example 3: Partial Credit Application**

```
Sale Items:
- Product D: 2 units × ₹400 = ₹800 (SALE)

Customer Credit Balance (before): ₹500
Credit Applied: ₹300 (partial)
Amount Due: ₹500

Customer Pays: ₹500

→ Customer Credit Balance (after): ₹200 (₹500 - ₹300)
```

---

## ✅ Key Features

1. **Automatic Credit Addition:**
   - Returns automatically add credit to customer balance
   - No manual intervention needed

2. **Flexible Credit Application:**
   - Apply full credit or partial amount
   - Credit cannot exceed grand total
   - Credit cannot exceed available balance

3. **Real-time Balance Display:**
   - Credit balance shown immediately when customer selected
   - Updates after each transaction

4. **Transaction History:**
   - Each sale records:
     - `credit_applied`: Credit used in sale
     - `credit_added`: Credit added from returns

5. **Validation:**
   - Cannot apply more credit than available
   - Cannot apply more credit than grand total
   - Credit balance never goes negative

---

## 🎨 UI Components

### **Customer Credit Display:**
```
┌─────────────────────────────────┐
│ Customer: John Doe              │
│ Email: john@example.com         │
│ Available Credit: ₹500.00       │ ← Green if > 0
└─────────────────────────────────┘
```

### **Credit Application Section:**
```
┌─────────────────────────────────┐
│ Available Credit: ₹500.00       │
│                                 │
│ [Apply Full Credit] [Clear]    │
│                                 │
│ Apply Credit Amount:            │
│ [________300.00________]         │
│                                 │
│ Credit Applied: ₹300.00         │
└─────────────────────────────────┘
```

### **Payment Summary:**
```
Grand Total:        ₹1,000.00
Credit Applied:     -₹300.00
─────────────────────────────
Amount Due:         ₹700.00
Total Paid:         ₹700.00
```

---

## ⚠️ Important Notes

1. **Credit is Non-Refundable:**
   - Credit is store credit, not cash
   - Cannot be converted to cash refund

2. **Credit Expiration:**
   - Currently, credit does not expire
   - Can be used indefinitely until exhausted

3. **Credit Balance Tracking:**
   - Credit balance is stored on customer record
   - Updated automatically on each transaction
   - Visible in sales form when customer selected

4. **Return Policy:**
   - Returns add credit automatically
   - No manual credit entry needed
   - Credit amount = sum of return items

5. **Multiple Returns:**
   - Multiple returns accumulate credit
   - Credit balance is cumulative

---

## 🔧 Future Enhancements (Optional)

1. **Credit Expiration:**
   - Set expiration dates for credit
   - Show expired credit separately

2. **Credit History:**
   - View credit transaction history
   - Track when credit was added/used

3. **Credit Limits:**
   - Set maximum credit balance per customer
   - Prevent excessive credit accumulation

4. **Credit Reports:**
   - Total credit issued
   - Total credit used
   - Outstanding credit balance

---

**That's how the Customer Credit Balance System works!** 🎉




