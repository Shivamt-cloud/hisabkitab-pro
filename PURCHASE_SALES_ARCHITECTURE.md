# Purchase & Sales History Architecture Proposal

## 📋 Overview

This document outlines the architecture for:
1. **Two Types of Purchase History** (GST-based vs Simple)
2. **Sales Archival System** (Products disappear after sale, only admin sees history)

---

## 🏗️ System Architecture

### Module Structure:

```
inventory-system/
├── Purchases Module
│   ├── GST Purchase (with tax details)
│   ├── Simple Purchase (basic purchase)
│   └── Purchase History (filtered by type)
│
├── Sales Module
│   ├── Create Sale
│   ├── Active Sales (current inventory)
│   └── Sales Archive (admin only)
│
├── Products Module
│   ├── Active Products (in stock)
│   ├── Sold Products (archived, admin only)
│   └── Product Lifecycle
```

---

## 💰 Purchase Types

### 1. **GST Purchase** (With Tax Details)
**Use Case**: Business purchases from registered suppliers with GST

**Fields**:
- Purchase Date
- Supplier (with GSTIN)
- Products with:
  - HSN Code
  - Quantity
  - Unit Price
  - GST Rate
  - CGST/SGST or IGST
  - Total Tax
  - Grand Total
- Purchase Invoice Number
- Payment Status
- Payment Method

**Where**: `/purchases/new-gst` or `/purchases/new?type=gst`

### 2. **Simple Purchase** (Without GST)
**Use Case**: Local purchases, cash purchases, unregistered suppliers

**Fields**:
- Purchase Date
- Supplier (simple, no GSTIN required)
- Products with:
  - Quantity
  - Unit Price
  - Total Amount
- Purchase Invoice Number (optional)
- Payment Status
- Payment Method

**Where**: `/purchases/new-simple` or `/purchases/new?type=simple`

---

## 🛒 Sales & Product Lifecycle

### Product Flow:

```
1. Purchase → Product Added to System
   ↓
2. Product in "Active Inventory" (visible to all with permissions)
   ↓
3. Sale Made → Product Status: "SOLD"
   ↓
4. Product Archived (removed from active inventory)
   ↓
5. Only Admin sees in "Sales History" and "Archived Products"
```

### Key Rules:
- ✅ **Once sold, product disappears from active inventory**
- ✅ **Barcode becomes inactive** (cannot be scanned again)
- ✅ **Only Admin can view sold products history**
- ✅ **Staff/Manager see only current inventory**
- ✅ **Sales history is admin-only**

---

## 📊 Data Structure

### Purchase Record Types:

```typescript
interface GSTPurchase {
  id: number
  type: 'gst'
  purchase_date: Date
  supplier_id: number
  supplier_gstin: string
  invoice_number: string
  items: GSTPurchaseItem[]
  subtotal: number
  total_tax: number
  cgst_amount?: number
  sgst_amount?: number
  igst_amount?: number
  grand_total: number
  payment_status: 'paid' | 'pending' | 'partial'
  payment_method?: string
  created_by: number
  created_at: Date
}

interface SimplePurchase {
  id: number
  type: 'simple'
  purchase_date: Date
  supplier_id: number
  supplier_name?: string // For quick entries
  invoice_number?: string
  items: SimplePurchaseItem[]
  total_amount: number
  payment_status: 'paid' | 'pending' | 'partial'
  payment_method?: string
  created_by: number
  created_at: Date
}

interface PurchaseItem {
  product_id: number
  quantity: number
  unit_price: number
  total: number
  // For GST purchases:
  hsn_code?: string
  gst_rate?: number
  tax_amount?: number
}
```

### Sales Record:

```typescript
interface Sale {
  id: number
  sale_date: Date
  customer_id?: number // Optional (walk-in customers)
  invoice_number: string
  items: SaleItem[]
  subtotal: number
  discount?: number
  tax_amount: number
  grand_total: number
  payment_status: 'paid' | 'pending'
  payment_method: string
  created_by: number
  created_at: Date
  // After sale:
  archived: boolean // Products are archived after sale
}

interface SaleItem {
  product_id: number
  barcode: string // Used barcode (becomes inactive)
  quantity: number
  unit_price: number
  total: number
  product_snapshot: ProductSnapshot // Store product details at time of sale
}
```

### Product Status:

```typescript
interface Product {
  // ... existing fields
  status: 'active' | 'sold' | 'archived'
  sold_date?: Date
  sale_id?: number // Link to sale record
  barcode_status: 'active' | 'used' | 'inactive' // Barcode lifecycle
}
```

---

## 🎯 Where to Implement

### 1. **Purchase Module** (`/purchases`)

**Navigation Structure**:
```
Purchases
├── New Purchase
│   ├── GST Purchase (default for registered suppliers)
│   └── Simple Purchase (for cash/local purchases)
├── Purchase History
│   ├── All Purchases
│   ├── GST Purchases (filter)
│   └── Simple Purchases (filter)
└── Suppliers
    └── Manage Suppliers (with/without GSTIN)
```

**Pages Needed**:
- `/purchases/new` - Purchase form with type selector
- `/purchases/new-gst` - GST Purchase form
- `/purchases/new-simple` - Simple Purchase form
- `/purchases/history` - Purchase history list
- `/purchases/:id` - Purchase detail view

### 2. **Sales Module** (`/sales`)

**Navigation Structure**:
```
Sales
├── New Sale
├── Quick Sale
├── Active Sales (current inventory only)
└── Sales History (Admin Only) ← Hidden from non-admins
```

**Pages Needed**:
- `/sales/new` - Create new sale
- `/sales/quick` - Quick checkout
- `/sales/history` - Sales history (admin only)
- `/sales/:id` - Sale detail view

### 3. **Products Module** (Update)

**Changes Needed**:
- Filter: Show only `status = 'active'` by default
- Admin view: Include `status = 'sold'` and `status = 'archived'`
- Barcode validation: Check if barcode is `active` before allowing sale

---

## 🔐 Permission System

### Purchase Permissions:

| Role | GST Purchase | Simple Purchase | Purchase History |
|------|-------------|-----------------|------------------|
| Admin | ✅ Create/View/Edit | ✅ Create/View/Edit | ✅ All History |
| Manager | ✅ Create/View | ✅ Create/View | ✅ View History |
| Staff | ✅ Create | ✅ Create | ✅ Own Purchases |
| Viewer | ❌ | ❌ | ✅ View Only |

### Sales Permissions:

| Role | Create Sale | View Sales | Sales History |
|------|------------|------------|---------------|
| Admin | ✅ | ✅ | ✅ All History (including archived) |
| Manager | ✅ | ✅ | ❌ Recent Only (last 30 days) |
| Staff | ✅ | ✅ | ❌ Recent Only (last 7 days) |
| Viewer | ❌ | ✅ | ❌ No Access |

### Product Visibility:

| Role | Active Products | Sold Products | Archived Products |
|------|----------------|---------------|-------------------|
| Admin | ✅ | ✅ | ✅ |
| Manager | ✅ | ❌ | ❌ |
| Staff | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ |

---

## 🔄 Workflow Examples

### Workflow 1: GST Purchase → Sale

```
1. Admin creates GST Purchase
   → Products added to inventory (status: 'active')
   → Barcodes generated/assigned (status: 'active')

2. Staff makes a sale
   → Products marked as 'sold'
   → Barcodes marked as 'used' (cannot reuse)
   → Products archived (removed from active view)

3. Only Admin sees:
   → Purchase record in Purchase History
   → Sale record in Sales History
   → Archived products list
```

### Workflow 2: Simple Purchase → Sale

```
1. Staff creates Simple Purchase (cash/local)
   → Products added to inventory (status: 'active')
   → No GST tracking

2. Manager makes sale
   → Same process as GST purchase
   → Products archived

3. Admin sees both purchase types in history
```

---

## 📱 UI/UX Design

### Purchase Page Layout:

```
┌─────────────────────────────────────────┐
│  New Purchase                           │
├─────────────────────────────────────────┤
│  [GST Purchase] [Simple Purchase]      │ ← Tabs or Radio buttons
│                                         │
│  GST Purchase Form:                     │
│  - Supplier (with GSTIN lookup)         │
│  - Invoice Number                       │
│  - Products (with HSN, GST rates)       │
│  - Tax Breakdown                        │
│  - Grand Total                          │
└─────────────────────────────────────────┘
```

### Purchase History Page:

```
┌─────────────────────────────────────────┐
│  Purchase History                       │
├─────────────────────────────────────────┤
│  [All] [GST] [Simple] [Date Range]     │ ← Filters
│                                         │
│  Table:                                 │
│  Date | Type | Supplier | Invoice |    │
│       |      |          | Amount  |    │
│  ────────────────────────────────────   │
│  ... purchase records ...               │
└─────────────────────────────────────────┘
```

### Sales History (Admin Only):

```
┌─────────────────────────────────────────┐
│  Sales History (Admin Only)             │
├─────────────────────────────────────────┤
│  [All Time] [This Month] [Custom]      │
│                                         │
│  Table:                                 │
│  Date | Invoice | Customer | Products | │
│       |         |          | Total    │ │
│  ────────────────────────────────────   │
│  ... sales records (including archived) │
└─────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Additions

### New Tables Needed:

```sql
-- Purchase Types
CREATE TABLE purchases (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL, -- 'gst' or 'simple'
  purchase_date DATE NOT NULL,
  supplier_id INTEGER,
  supplier_gstin TEXT, -- For GST purchases
  invoice_number TEXT,
  subtotal REAL,
  total_tax REAL, -- For GST purchases
  cgst_amount REAL,
  sgst_amount REAL,
  igst_amount REAL,
  grand_total REAL NOT NULL,
  payment_status TEXT,
  payment_method TEXT,
  created_by INTEGER,
  created_at DATETIME,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE purchase_items (
  id INTEGER PRIMARY KEY,
  purchase_id INTEGER,
  product_id INTEGER,
  hsn_code TEXT, -- For GST purchases
  quantity INTEGER,
  unit_price REAL,
  gst_rate REAL, -- For GST purchases
  tax_amount REAL, -- For GST purchases
  total REAL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Sales
CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  sale_date DATE NOT NULL,
  customer_id INTEGER,
  invoice_number TEXT UNIQUE,
  subtotal REAL,
  discount REAL,
  tax_amount REAL,
  grand_total REAL NOT NULL,
  payment_status TEXT,
  payment_method TEXT,
  created_by INTEGER,
  archived BOOLEAN DEFAULT 0,
  created_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE sale_items (
  id INTEGER PRIMARY KEY,
  sale_id INTEGER,
  product_id INTEGER,
  barcode TEXT, -- The used barcode
  quantity INTEGER,
  unit_price REAL,
  total REAL,
  product_snapshot TEXT, -- JSON snapshot of product at time of sale
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Update products table
ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE products ADD COLUMN barcode_status TEXT DEFAULT 'active';
ALTER TABLE products ADD COLUMN sold_date DATETIME;
ALTER TABLE products ADD COLUMN sale_id INTEGER;
```

---

## ✅ Implementation Checklist

### Phase 1: Purchase Types
- [ ] Create purchase type selector
- [ ] Build GST Purchase form
- [ ] Build Simple Purchase form
- [ ] Implement purchase service (with type handling)
- [ ] Add purchase history page with filters

### Phase 2: Sales Archival
- [ ] Update product service (add status field)
- [ ] Modify sale creation (mark products as sold)
- [ ] Implement barcode deactivation
- [ ] Create product archive system
- [ ] Update product listing (filter by status)

### Phase 3: Admin History
- [ ] Create admin-only sales history page
- [ ] Add permission checks
- [ ] Implement archive view
- [ ] Add data export (if needed)

---

## 🎯 Recommendation

**Suggested Implementation Order:**

1. **Start with Purchase Types** (GST vs Simple)
   - Most straightforward
   - Doesn't affect existing products
   - Can be built incrementally

2. **Then Sales Archival System**
   - Requires product status updates
   - Affects product visibility
   - Need to handle existing products

3. **Finally Admin History**
   - Depends on archival system
   - Requires permission system
   - Can be added as enhancement

**Where to Add in UI:**

- **Purchases**: Add to Dashboard → Purchase Options section
- **Sales History**: Add to Dashboard → Sales Options (admin only)
- **Product Filter**: Add to Products page (status filter)

Would you like me to start implementing this? Which part should we begin with?

